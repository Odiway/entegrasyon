from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Auth ──
class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "operator"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Material ──
class MaterialCreate(BaseModel):
    material_no: str
    description: str = ""
    kalem_tipi: str
    birim: str = ""


class MaterialUpdate(BaseModel):
    description: Optional[str] = None
    kalem_tipi: Optional[str] = None
    birim: Optional[str] = None


# ── Project ──
class ProjectResponse(BaseModel):
    id: int
    name: str
    filename: str
    status: str
    total_rows: int
    resolved_rows: int
    unresolved_rows: int
    uploaded_by: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Item Update ──
class ItemUpdate(BaseModel):
    kalem_tipi: Optional[str] = None
    siparis: Optional[str] = None
    dagitim: Optional[str] = None
    birim: Optional[str] = None
    needs_review: Optional[bool] = None


class BulkResolve(BaseModel):
    material_no: str
    kalem_tipi: str
    birim: Optional[str] = None
    save_to_master: bool = False


# ── Integration ──
class IntUploadResponse(BaseModel):
    id: int
    filename: str
    status: str
    template_version: str
    total_rows: int
    notes: str
    uploaded_by: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Calendar ──
class CalendarEventCreate(BaseModel):
    title: str
    description: str = ""
    event_type: str = "task"
    priority: str = "medium"
    status: str = "pending"
    start_date: datetime
    end_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    project_id: Optional[int] = None
    tags: str = ""
    color: str = "#3b82f6"


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    tags: Optional[str] = None
    color: Optional[str] = None
