import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import MaterialMaster, User
from app.schemas import MaterialCreate, MaterialUpdate
from app.auth import require_user
from app.config import settings
from app.excel_service import import_mm03_file

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("/")
async def list_materials(
    search: str = "",
    kalem_tipi: str = "",
    offset: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    q = select(MaterialMaster)
    if search:
        q = q.where(
            MaterialMaster.material_no.ilike(f"%{search}%")
            | MaterialMaster.description.ilike(f"%{search}%")
        )
    if kalem_tipi:
        q = q.where(MaterialMaster.kalem_tipi == kalem_tipi)
    q = q.order_by(MaterialMaster.id.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return [
        {c.name: getattr(m, c.name) for c in MaterialMaster.__table__.columns}
        for m in result.scalars().all()
    ]


@router.get("/count")
async def material_count(
    search: str = "",
    kalem_tipi: str = "",
    db: AsyncSession = Depends(get_db),
):
    q = select(func.count()).select_from(MaterialMaster)
    if search:
        q = q.where(
            MaterialMaster.material_no.ilike(f"%{search}%")
            | MaterialMaster.description.ilike(f"%{search}%")
        )
    if kalem_tipi:
        q = q.where(MaterialMaster.kalem_tipi == kalem_tipi)
    result = await db.execute(q)
    return {"count": result.scalar()}


@router.post("/")
async def create_material(
    data: MaterialCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    existing = await db.execute(
        select(MaterialMaster).where(MaterialMaster.material_no == data.material_no)
    )
    if existing.scalars().first():
        raise HTTPException(400, "Bu malzeme numarası zaten mevcut")
    mat = MaterialMaster(**data.model_dump(), source="manual")
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return {c.name: getattr(mat, c.name) for c in MaterialMaster.__table__.columns}


@router.patch("/{material_id}")
async def update_material(
    material_id: int,
    data: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    mat = await db.get(MaterialMaster, material_id)
    if not mat:
        raise HTTPException(404, "Malzeme bulunamadı")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(mat, field, val)
    await db.commit()
    return {"ok": True}


@router.delete("/{material_id}")
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    mat = await db.get(MaterialMaster, material_id)
    if not mat:
        raise HTTPException(404, "Malzeme bulunamadı")
    await db.delete(mat)
    await db.commit()
    return {"ok": True}


@router.post("/import-mm03")
async def import_mm03(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, f"mm03_{file.filename}")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    result = await import_mm03_file(filepath, db)
    return result
