from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ── Auth ──
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    hashed_password = Column(String(300), nullable=False)
    role = Column(String(50), default="operator")  # admin, operator, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Material Master ──
class MaterialMaster(Base):
    __tablename__ = "material_master"
    id = Column(Integer, primary_key=True)
    material_no = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    kalem_tipi = Column(String(50), nullable=False)
    birim = Column(String(100), default="")
    source = Column(String(50), default="manual")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── BOM Project ──
class BomProject(Base):
    __tablename__ = "bom_project"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    filename = Column(String(500), nullable=False)
    status = Column(String(50), default="uploaded")
    total_rows = Column(Integer, default=0)
    resolved_rows = Column(Integer, default=0)
    unresolved_rows = Column(Integer, default=0)
    uploaded_by = Column(String(200), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    items = relationship("BomItem", back_populates="project", cascade="all, delete-orphan")


# ── BOM Item ──
class BomItem(Base):
    __tablename__ = "bom_item"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("bom_project.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)

    # PLM fields (31)
    level = Column(Integer, nullable=False)
    title = Column(String(300))
    revision = Column(String(20))
    quantity = Column(Float, default=1.0)
    description = Column(Text)
    maturity_state = Column(String(50))
    owner = Column(String(100))
    catia_aciklama = Column(String(300))
    yedek_parca_mi = Column(String(20))
    malzeme_standart_dokumani = Column(String(100))
    tolerans_dokumani = Column(String(100))
    dokuman_malzeme_turu = Column(String(100))
    malzeme_no = Column(String(200))
    istatistiksel_proses_kontrol = Column(String(100))
    parca_standart_dokumani = Column(String(100))
    sap_usage = Column(String(20))
    yanmazlik_parametresi = Column(String(100))
    hacim = Column(String(50))
    boya_kodu = Column(String(50))
    yuzey_alani = Column(String(50))
    homologasyon_dokumani = Column(String(100))
    emisyon_faktoru = Column(String(100))
    finishing_standart_dokumani = Column(String(100))
    referans_resim = Column(String(200))
    kutle = Column(String(50))
    sertlik = Column(String(50))
    proje_kodu = Column(String(50))
    kullanim_miktari = Column(String(50))
    ana_malzeme_grubu = Column(String(100))
    isil_islem_dokumani = Column(String(100))
    ana_malzeme = Column(String(200))

    # Derived fields (12)
    uzmanlik = Column(String(50))
    montaj = Column(String(200))
    malzeme_no_sap = Column(String(200))
    ana_malzeme_derived = Column(String(200))
    birlestirme = Column(String(500))
    kalem_tipi = Column(String(50))
    siparis = Column(String(50))
    dagitim = Column(String(10))
    birim = Column(String(100))
    toplam_miktar = Column(Float)
    kalem_tipi_source = Column(String(30))
    needs_review = Column(Boolean, default=False)

    project = relationship("BomProject", back_populates="items")


# ── Integration Upload ──
class IntegrationUpload(Base):
    __tablename__ = "integration_upload"
    id = Column(Integer, primary_key=True)
    filename = Column(String(500), nullable=False)
    source = Column(String(50), default="user")
    status = Column(String(50), default="uploaded")
    template_version = Column(String(50), default="1.0")
    total_rows = Column(Integer, default=0)
    notes = Column(Text, default="")
    uploaded_by = Column(String(200), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    items = relationship("IntegrationItem", back_populates="upload", cascade="all, delete-orphan")


# ── Integration Item ──
class IntegrationItem(Base):
    __tablename__ = "integration_item"
    id = Column(Integer, primary_key=True)
    upload_id = Column(Integer, ForeignKey("integration_upload.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)

    level = Column(Integer, nullable=False)
    title = Column(String(300))
    revision = Column(String(50))
    montaj_no = Column(String(300))
    quantity = Column(Float, default=1.0)
    description = Column(Text)
    maturity_state = Column(String(50))
    owner = Column(String(200))
    dokuman_malzeme_turu = Column(String(200))
    birim = Column(String(50))
    miktar = Column(Float)
    df_tr = Column(String(300))
    kalem_tipi = Column(String(50))
    m_turu = Column(String(100))
    malzeme_no = Column(String(200))
    sap_usage = Column(String(50))
    kullanim_miktari = Column(String(100))
    ana_malzeme = Column(String(200))

    # Computed
    siparis_durumu = Column(String(50))
    montaj_mi = Column(String(10))
    uzmanlik = Column(String(100))
    hesaplanan_miktar = Column(Float)

    # Approval
    approved = Column(Boolean, default=False)
    approved_by = Column(String(200))
    approved_at = Column(DateTime(timezone=True))
    locked = Column(Boolean, default=False)

    upload = relationship("IntegrationUpload", back_populates="items")


# ── Integration Approval Log ──
class IntegrationApproval(Base):
    __tablename__ = "integration_approval"
    id = Column(Integer, primary_key=True)
    upload_id = Column(Integer, ForeignKey("integration_upload.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    user_name = Column(String(200))
    filter_criteria = Column(Text)
    filename = Column(String(500))
    details = Column(Text)
    old_values = Column(Text)
    new_values = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Calendar Events ──
class CalendarEvent(Base):
    __tablename__ = "calendar_event"
    id = Column(Integer, primary_key=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, default="")
    event_type = Column(String(50), default="task")  # task, milestone, deadline, meeting
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    status = Column(String(30), default="pending")  # pending, in_progress, completed, cancelled
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    assigned_to = Column(String(200))
    project_id = Column(Integer)
    tags = Column(Text, default="")
    color = Column(String(20), default="#3b82f6")
    created_by = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
