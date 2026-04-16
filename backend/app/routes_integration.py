import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import IntegrationUpload, IntegrationItem, IntegrationApproval, User
from app.schemas import IntUploadResponse
from app.auth import require_user
from app.config import settings
from app.integration_service import parse_integration_file, export_filtered_excel, compare_reupload

router = APIRouter(prefix="/api/integration", tags=["integration"])


@router.post("/upload")
async def upload_integration(
    file: UploadFile = File(...),
    calculate_quantity: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, f"int_{file.filename}")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    upload = IntegrationUpload(
        filename=file.filename,
        uploaded_by=user.full_name,
    )
    db.add(upload)
    await db.flush()

    result = await parse_integration_file(filepath, upload, db, calculate_quantity)
    return {"id": upload.id, **result}


@router.get("/uploads", response_model=list[IntUploadResponse])
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IntegrationUpload).order_by(IntegrationUpload.created_at.desc()))
    return [IntUploadResponse.model_validate(u) for u in result.scalars().all()]


@router.get("/uploads/{upload_id}", response_model=IntUploadResponse)
async def get_upload(upload_id: int, db: AsyncSession = Depends(get_db)):
    u = await db.get(IntegrationUpload, upload_id)
    if not u:
        raise HTTPException(404, "Yükleme bulunamadı")
    return IntUploadResponse.model_validate(u)


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    u = await db.get(IntegrationUpload, upload_id)
    if not u:
        raise HTTPException(404)
    await db.delete(u)
    await db.commit()
    return {"ok": True}


@router.get("/uploads/{upload_id}/items")
async def get_items(
    upload_id: int,
    offset: int = 0, limit: int = 100,
    siparis_durumu: str | None = None,
    montaj_mi: str | None = None,
    uzmanlik: str | None = None,
    kalem_tipi: str | None = None,
    level: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(IntegrationItem).where(IntegrationItem.upload_id == upload_id)
    if siparis_durumu:
        q = q.where(IntegrationItem.siparis_durumu == siparis_durumu)
    if montaj_mi:
        q = q.where(IntegrationItem.montaj_mi == montaj_mi)
    if uzmanlik:
        q = q.where(IntegrationItem.uzmanlik == uzmanlik)
    if kalem_tipi:
        q = q.where(IntegrationItem.kalem_tipi == kalem_tipi)
    if level is not None:
        q = q.where(IntegrationItem.level == level)
    q = q.order_by(IntegrationItem.row_number).offset(offset).limit(limit)
    result = await db.execute(q)
    return [
        {c.name: getattr(i, c.name) for c in IntegrationItem.__table__.columns}
        for i in result.scalars().all()
    ]


@router.get("/uploads/{upload_id}/items/count")
async def get_items_count(
    upload_id: int,
    siparis_durumu: str | None = None,
    montaj_mi: str | None = None,
    uzmanlik: str | None = None,
    kalem_tipi: str | None = None,
    level: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(func.count()).select_from(IntegrationItem).where(IntegrationItem.upload_id == upload_id)
    if siparis_durumu:
        q = q.where(IntegrationItem.siparis_durumu == siparis_durumu)
    if montaj_mi:
        q = q.where(IntegrationItem.montaj_mi == montaj_mi)
    if uzmanlik:
        q = q.where(IntegrationItem.uzmanlik == uzmanlik)
    if kalem_tipi:
        q = q.where(IntegrationItem.kalem_tipi == kalem_tipi)
    if level is not None:
        q = q.where(IntegrationItem.level == level)
    result = await db.execute(q)
    return {"count": result.scalar()}


@router.get("/uploads/{upload_id}/stats")
async def get_stats(upload_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IntegrationItem).where(IntegrationItem.upload_id == upload_id)
    )
    items = list(result.scalars().all())

    stats = {
        "total": len(items),
        "by_level": {},
        "by_kalem_tipi": {},
        "by_siparis_durumu": {},
        "by_montaj_mi": {},
        "by_uzmanlik": {},
        "approved_count": sum(1 for i in items if i.approved),
        "locked_count": sum(1 for i in items if i.locked),
    }
    for i in items:
        stats["by_level"][str(i.level)] = stats["by_level"].get(str(i.level), 0) + 1
        kt = i.kalem_tipi or "N/A"
        stats["by_kalem_tipi"][kt] = stats["by_kalem_tipi"].get(kt, 0) + 1
        sd = i.siparis_durumu or "N/A"
        stats["by_siparis_durumu"][sd] = stats["by_siparis_durumu"].get(sd, 0) + 1
        mm = i.montaj_mi or "N/A"
        stats["by_montaj_mi"][mm] = stats["by_montaj_mi"].get(mm, 0) + 1
        uz = i.uzmanlik or "N/A"
        stats["by_uzmanlik"][uz] = stats["by_uzmanlik"].get(uz, 0) + 1

    return stats


@router.patch("/items/{item_id}")
async def update_item(
    item_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    item = await db.get(IntegrationItem, item_id)
    if not item:
        raise HTTPException(404)
    if item.locked:
        raise HTTPException(409, "Bu satır kilitli, değiştirilemez")
    for k, v in data.items():
        if hasattr(item, k):
            setattr(item, k, v)
    await db.commit()
    return {"ok": True}


@router.get("/uploads/{upload_id}/export")
async def export_integration(
    upload_id: int,
    siparis_durumu: str | None = None,
    montaj_mi: str | None = None,
    uzmanlik: str | None = None,
    kalem_tipi: str | None = None,
    level: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    u = await db.get(IntegrationUpload, upload_id)
    if not u:
        raise HTTPException(404)
    buf = await export_filtered_excel(
        upload_id, db,
        siparis_durumu=siparis_durumu, montaj_mi=montaj_mi,
        uzmanlik=uzmanlik, kalem_tipi=kalem_tipi, level=level,
    )
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{u.filename.rsplit(".", 1)[0]}_export.xlsx"'},
    )


@router.post("/uploads/{upload_id}/reupload")
async def reupload(
    upload_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, f"reup_{file.filename}")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return await compare_reupload(upload_id, filepath, db)


@router.post("/uploads/{upload_id}/approve")
async def approve_items(
    upload_id: int,
    row_numbers: list[int],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    from datetime import datetime, timezone
    result = await db.execute(
        select(IntegrationItem)
        .where(IntegrationItem.upload_id == upload_id, IntegrationItem.row_number.in_(row_numbers))
    )
    items = list(result.scalars().all())
    count = 0
    for item in items:
        if not item.locked:
            item.approved = True
            item.approved_by = user.full_name
            item.approved_at = datetime.now(timezone.utc)
            item.locked = True
            count += 1

    db.add(IntegrationApproval(
        upload_id=upload_id,
        action="approve",
        user_name=user.full_name,
        details=f"{count} satır onaylandı",
    ))
    await db.commit()
    return {"approved": count}


@router.get("/uploads/{upload_id}/history")
async def get_history(upload_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IntegrationApproval)
        .where(IntegrationApproval.upload_id == upload_id)
        .order_by(IntegrationApproval.created_at.desc())
    )
    return [
        {c.name: getattr(a, c.name) for c in IntegrationApproval.__table__.columns}
        for a in result.scalars().all()
    ]


@router.get("/template")
async def download_template():
    template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "entegration-templatefolder")
    if not os.path.exists(template_dir):
        raise HTTPException(404, "Şablon bulunamadı")
    files = [f for f in os.listdir(template_dir) if f.endswith(".xlsx")]
    if not files:
        raise HTTPException(404, "Şablon dosyası bulunamadı")
    filepath = os.path.join(template_dir, files[0])
    from fastapi.responses import FileResponse
    return FileResponse(filepath, filename=files[0])
