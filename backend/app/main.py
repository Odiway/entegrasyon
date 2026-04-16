import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="TEMSA BOM Entegrasyon Sistemi",
    description="PLM BOM → SAP Master BOM dönüştürme ve entegrasyon platformu",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes_auth import router as auth_router
from app.routes_projects import router as projects_router
from app.routes_materials import router as materials_router
from app.routes_integration import router as integration_router
from app.routes_calendar import router as calendar_router

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(materials_router)
app.include_router(integration_router)
app.include_router(calendar_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "TEMSA BOM Entegrasyon"}
