import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import BomProject, BomItem, User
from app.schemas import ProjectResponse, ItemUpdate, BulkResolve
from app.auth import require_user
from app.config import settings
from app.excel_service import parse_bom_file, import_mm03_file, reprocess_project, export_master_excel
from app.models import MaterialMaster

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("/upload")
async def upload_project(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    project = BomProject(
        name=file.filename.rsplit(".", 1)[0],
        filename=file.filename,
        uploaded_by=user.full_name,
    )
    db.add(project)
    await db.flush()

    result = await parse_bom_file(filepath, project, db)
    return {"id": project.id, "name": project.name, **result}


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BomProject).order_by(BomProject.created_at.desc()))
    return [ProjectResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BomProject).where(BomProject.id == project_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Proje bulunamadı")
    return ProjectResponse.model_validate(p)


@router.get("/{project_id}/items")
async def get_items(
    project_id: int,
    offset: int = 0, limit: int = 500,
    needs_review: bool | None = None,
    level: int | None = None,
    uzmanlik: str | None = None,
    kalem_tipi: str | None = None,
    siparis: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(BomItem).where(BomItem.project_id == project_id)
    if needs_review is not None:
        q = q.where(BomItem.needs_review == needs_review)
    if level is not None:
        q = q.where(BomItem.level == level)
    if uzmanlik:
        q = q.where(BomItem.uzmanlik == uzmanlik)
    if kalem_tipi:
        q = q.where(BomItem.kalem_tipi == kalem_tipi)
    if siparis:
        q = q.where(BomItem.siparis == siparis)

    q = q.order_by(BomItem.row_number).offset(offset).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        {c.name: getattr(i, c.name) for c in BomItem.__table__.columns}
        for i in items
    ]


@router.get("/{project_id}/stats")
async def get_stats(project_id: int, db: AsyncSession = Depends(get_db)):
    items_q = select(BomItem).where(BomItem.project_id == project_id)
    result = await db.execute(items_q)
    items = list(result.scalars().all())

    by_kalem = {}
    by_siparis = {}
    by_uzmanlik = {}
    for i in items:
        kt = i.kalem_tipi or "N/A"
        by_kalem[kt] = by_kalem.get(kt, 0) + 1
        sip = i.siparis or "N/A"
        by_siparis[sip] = by_siparis.get(sip, 0) + 1
        uz = i.uzmanlik or "N/A"
        by_uzmanlik[uz] = by_uzmanlik.get(uz, 0) + 1

    return {"by_kalem_tipi": by_kalem, "by_siparis": by_siparis, "by_uzmanlik": by_uzmanlik}


@router.get("/{project_id}/nav")
async def get_nav(project_id: int, db: AsyncSession = Depends(get_db)):
    q = (select(BomItem)
         .where(BomItem.project_id == project_id, BomItem.level.in_([2, 3]))
         .order_by(BomItem.row_number))
    result = await db.execute(q)
    return [
        {"row_number": i.row_number, "level": i.level, "title": i.title, "uzmanlik": i.uzmanlik}
        for i in result.scalars().all()
    ]


@router.patch("/{project_id}/items/{item_id}")
async def update_item(
    project_id: int, item_id: int, data: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(select(BomItem).where(BomItem.id == item_id, BomItem.project_id == project_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(404, "Satır bulunamadı")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    if data.kalem_tipi is not None:
        item.kalem_tipi_source = "manual"

    # Recalculate project stats
    project = await db.get(BomProject, project_id)
    total_q = await db.execute(
        select(func.count()).select_from(BomItem).where(BomItem.project_id == project_id)
    )
    unresolved_q = await db.execute(
        select(func.count()).select_from(BomItem).where(BomItem.project_id == project_id, BomItem.needs_review == True)
    )
    total = total_q.scalar()
    unresolved = unresolved_q.scalar()
    project.total_rows = total
    project.unresolved_rows = unresolved
    project.resolved_rows = total - unresolved

    await db.commit()
    return {"ok": True}


@router.post("/{project_id}/bulk-resolve")
async def bulk_resolve(
    project_id: int, data: BulkResolve,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    q = (select(BomItem)
         .where(BomItem.project_id == project_id, BomItem.needs_review == True)
         .where((BomItem.malzeme_no == data.material_no) | (BomItem.title == data.material_no)))
    result = await db.execute(q)
    items = list(result.scalars().all())

    from app.rules_engine import SIPARIS_MAP, DAGITIM_MAP, KESILEREK_TYPES
    for item in items:
        item.kalem_tipi = data.kalem_tipi
        item.needs_review = False
        item.kalem_tipi_source = "manual"
        if data.birim:
            item.birim = data.birim
        if data.kalem_tipi in SIPARIS_MAP:
            item.siparis = SIPARIS_MAP[data.kalem_tipi]
            item.dagitim = DAGITIM_MAP.get(data.kalem_tipi, "")
        elif data.kalem_tipi in KESILEREK_TYPES:
            item.siparis = "KONTROL EDİLECEK"
            item.dagitim = "EVET"

    if data.save_to_master:
        existing = await db.execute(
            select(MaterialMaster).where(MaterialMaster.material_no == data.material_no)
        )
        mat = existing.scalars().first()
        if mat:
            mat.kalem_tipi = data.kalem_tipi
            if data.birim:
                mat.birim = data.birim
        else:
            db.add(MaterialMaster(
                material_no=data.material_no,
                kalem_tipi=data.kalem_tipi,
                birim=data.birim or "",
                source="bulk_resolve",
            ))

    # Update stats
    project = await db.get(BomProject, project_id)
    unresolved_q = await db.execute(
        select(func.count()).select_from(BomItem).where(BomItem.project_id == project_id, BomItem.needs_review == True)
    )
    unresolved = unresolved_q.scalar()
    project.unresolved_rows = unresolved
    project.resolved_rows = project.total_rows - unresolved

    await db.commit()
    return {"resolved": len(items)}


@router.post("/{project_id}/upload-kalem-tipi")
async def upload_kalem_tipi(
    project_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, f"kalem_{file.filename}")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    import_result = await import_mm03_file(filepath, db)
    project = await db.get(BomProject, project_id)
    reprocess_result = await reprocess_project(project, db)

    return {"import": import_result, "reprocess": reprocess_result}


@router.post("/{project_id}/reprocess")
async def reprocess(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    project = await db.get(BomProject, project_id)
    if not project:
        raise HTTPException(404, "Proje bulunamadı")
    return await reprocess_project(project, db)


@router.get("/{project_id}/export")
async def export_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(BomProject, project_id)
    if not project:
        raise HTTPException(404, "Proje bulunamadı")
    buf = await export_master_excel(project_id, db)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{project.name}_Master.xlsx"'},
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    project = await db.get(BomProject, project_id)
    if not project:
        raise HTTPException(404, "Proje bulunamadı")
    await db.delete(project)
    await db.commit()
    return {"ok": True}
