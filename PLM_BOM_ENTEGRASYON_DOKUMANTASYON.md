# PLM BOM Entegrasyon Sistemi — Kapsamlı Dokümantasyon

> **Proje:** TEMSA PLM BOM → SAP Master BOM Dönüştürme Sistemi  
> **Takım:** TEMSA Digital Solutions — Entegrasyon Takımı  
> **Son Güncelleme:** Nisan 2026

---

## İçindekiler

1. [Projenin Amacı ve Genel Bakış](#1-projenin-amacı-ve-genel-bakış)
2. [Sistemin Mimarisi](#2-sistemin-mimarisi)
3. [Veri Akış Diyagramı (Pipeline)](#3-veri-akış-diyagramı-pipeline)
4. [Excel Kaynak Dosyaları ve Formatları](#4-excel-kaynak-dosyaları-ve-formatları)
5. [PLM Dosya Oluşturma (gen_plm Scripts)](#5-plm-dosya-oluşturma-gen_plm-scripts)
6. [Backend — Detaylı Modül Açıklamaları](#6-backend--detaylı-modül-açıklamaları)
7. [Rules Engine — Tüm İş Kuralları](#7-rules-engine--tüm-iş-kuralları)
8. [Integration Module (Template-Driven Flow)](#8-integration-module-template-driven-flow)
9. [Frontend — Kullanıcı Arayüzü](#9-frontend--kullanıcı-arayüzü)
10. [Veritabanı Modelleri](#10-veritabanı-modelleri)
11. [API Endpoint'leri](#11-api-endpointleri)
12. [Deployment (Docker)](#12-deployment-docker)
13. [Araçlar ve Yardımcı Scriptler](#13-araçlar-ve-yardımcı-scriptler)
14. [Bilinen Sınırlamalar ve Gelecek Planlar](#14-bilinen-sınırlamalar-ve-gelecek-planlar)

---

## 1. Projenin Amacı ve Genel Bakış

### Problem

TEMSA'da farklı otobüs modelleri (ELECTRON, NEO, MARATON vb.) için PLM (Product Lifecycle Management) sistemi bir **BOM (Bill of Materials)** çıktısı üretir. Bu BOM, araç parça ağacının tamamını içerir — binlerce satır, 8+ seviye derinliğinde hiyerarşik yapıda.

Bu PLM BOM'un **SAP Master BOM** formatına dönüştürülmesi gerekir. Dönüşüm sürecinde:

- Her parça için **Kalem Tipi** (Item Category: F, Y, E, H, C, X DETAY vb.) belirlenmeli
- **Sipariş** ve **Dağıtım** kararları Kalem Tipine göre türetilmeli
- **Uzmanlık** alanı (GÖVDE, TRİM, MEKANİK, ELEKTRİK, HVAC) hiyerarşiden çıkarılmalı
- **Montaj** grupları belirlenip parçalara atanmalı
- **Toplam Miktar** hesaplanmalı (parent quantity çarpımı)
- **MalzemeNo/SAP Karşılığı** türetilmeli

Bu işlem önceden **tamamen manuel** yapılıyordu — bir mühendis Excel'de satır satır bakıyor, SAP MM03'den kalem tipini kontrol edip elle yazıyordu. Binlerce satır için günler-haftalar süren bir iş.

### Çözüm

Bu sistem, tüm bu süreci **otomatize** eder:

```
PLM Excel (BOM) ──→ [Upload] ──→ [Rules Engine] ──→ SAP Master BOM (Excel)
                                       ↑
                                  Material Master
                                  (SAP MM03 data)
```

**3 adımlı akış:**
1. **Excel Yükle** — PLM BOM dosyasını sisteme upload et
2. **Kalem Tipi Eşleştir** — Otomatik kurallar + Material Master veritabanı ile eşleştir, çözülemeyenleri operatör incelesin
3. **SAP BOM İndir** — Tüm derived field'lar hesaplanmış Master BOM'u Excel olarak indir

---

## 2. Sistemin Mimarisi

### Tech Stack

| Katman | Teknoloji | Detay |
|--------|-----------|-------|
| **Backend** | Python 3.12 + FastAPI | Async REST API, openpyxl Excel işleme |
| **Frontend** | Next.js 14 + React 18 | App Router, Tailwind CSS, Axios |
| **Veritabanı** | PostgreSQL 16 | AsyncPG driver, SQLAlchemy 2.0 ORM |
| **Deployment** | Docker Compose | 3 servis: db, backend, frontend |

### Dosya Yapısı

```
excelentegrasyon/
├── docker-compose.yml            # 3 servis tanımı
├── analyze.py                    # Kaynak Excel analiz scripti
├── compare_master.py             # Export doğrulama scripti
├── compare_detail.py             # Kalem Tipi karşılaştırma
├── create_plm_file.py            # Manuel PLM dosyası oluşturma
├── create_kalem_tipi.py          # v1 KalemTipi listesi oluşturma
├── create_kalem_tipi_v2.py       # v2 KalemTipi (F dahil)
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # FastAPI app tanımı + lifespan
│       ├── config.py             # Pydantic Settings (DB URL, CORS)
│       ├── database.py           # AsyncPG engine + session factory
│       ├── models.py             # SQLAlchemy modeller (BomProject, BomItem, MaterialMaster + Calendar)
│       ├── models_integration.py # Entegrasyon modüle özel modeller
│       ├── schemas.py            # Pydantic request/response şemaları
│       ├── excel_service.py      # BOM parse, MM03 import, reprocess, Master export
│       ├── rules_engine.py       # Kalem Tipi + Sipariş/Dağıtım iş kuralları
│       ├── integration_service.py# Template-driven entegrasyon işleme
│       ├── routes_projects.py    # /api/projects/* endpoint'leri
│       ├── routes_materials.py   # /api/materials/* endpoint'leri
│       ├── routes_integration.py # /api/integration/* endpoint'leri
│       └── routes_calendar.py    # /api/calendar/* (ayrı modül)
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── lib/api.ts            # Axios API client + type tanımları
│       └── app/
│           ├── page.tsx          # Ana sayfa — proje listesi + upload
│           ├── layout.tsx        # Root layout
│           ├── materials/page.tsx# Material Master yönetimi
│           ├── project/[id]/page.tsx # Proje detay — BOM tablosu + inceleme
│           └── calendar/page.tsx # Gantt takvim (ayrı modül)
│
└── entegration-templatefolder/
    └── ALLZPL1_13.04.2026 - Kopya (2).xlsx  # Entegrasyon şablon dosyası
```

Kök dizindeki ek scriptler:
```
ten/
├── gen_plm.py      # ELECTRON için PLM + KalemTipi oluşturma (v1)
├── gen_plm_v2.py   # NEO + ELECTRON çoklu araç PLM/KalemTipi oluşturma (v2)
```

---

## 3. Veri Akış Diyagramı (Pipeline)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KAYNAK VERİ                                     │
│                                                                         │
│  PLM Sistemi (3DEXPERIENCE/CATIA)                                       │
│  ↓ Excel Export                                                         │
│  ┌────────────────────────────┐    ┌─────────────────────────┐          │
│  │  ELECTRON BOM.xlsx         │    │  NEO BOM.xlsx            │          │
│  │  (BOM sheet + Sheet1)      │    │  (Sheet1)                │          │
│  └────────────┬───────────────┘    └────────────┬────────────┘          │
└───────────────┼─────────────────────────────────┼───────────────────────┘
                │                                 │
    ┌───────────▼───────────┐         ┌───────────▼───────────┐
    │  gen_plm.py /         │         │  gen_plm_v2.py         │
    │  gen_plm_v2.py        │         │  (multi-vehicle)       │
    │                       │         │                        │
    │  • Column remapping   │         │  • Column remapping    │
    │  • Level increment    │         │  • Level handling      │
    │  • MalzNo cleanup     │         │  • KalemTipi letter    │
    │  • 31-col PLM format  │         │    stripping           │
    └───────────┬───────────┘         └───────────┬────────────┘
                │                                 │
                ▼                                 ▼
    ┌───────────────────────────────────────────────────┐
    │              ELECTRON_PLM.xlsx / NEO_PLM.xlsx      │
    │              (31 sütun, standart BOM formatı)      │
    │              + ELECTRON_KalemTipi_Listesi.xlsx      │
    └───────────────────────┬───────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────┐
    │                  WEB UYGULAMASI                     │
    │                                                    │
    │  ┌─────────────┐    ┌───────────────────────┐     │
    │  │ Upload PLM   │───→│ excel_service.py        │     │
    │  │ (Frontend)   │    │ parse_bom_file()        │     │
    │  └─────────────┘    └──────────┬────────────┘     │
    │                                │                   │
    │                                ▼                   │
    │  ┌──────────────────────────────────────────┐     │
    │  │        rules_engine.py                    │     │
    │  │        apply_rules()                      │     │
    │  │                                           │     │
    │  │  Input: level, title, malzeme_no,         │     │
    │  │         ana_malzeme, sap_usage, qty,       │     │
    │  │         parent hierarchy, material master  │     │
    │  │                                           │     │
    │  │  Output: kalem_tipi, siparis, dagitim,    │     │
    │  │          uzmanlik, montaj, birim,          │     │
    │  │          toplam_miktar, malzeme_no_sap,    │     │
    │  │          birlestirme, needs_review         │     │
    │  └──────────────────┬───────────────────────┘     │
    │                     │                              │
    │                     ▼                              │
    │  ┌──────────────────────────────────────────┐     │
    │  │           PostgreSQL                      │     │
    │  │  ┌─────────────┐  ┌──────────────────┐   │     │
    │  │  │ BomProject   │  │ BomItem           │   │     │
    │  │  │ (proje meta) │  │ (her satır +      │   │     │
    │  │  └─────────────┘  │  derived alanlar)  │   │     │
    │  │                    └──────────────────┘   │     │
    │  │  ┌───────────────┐                        │     │
    │  │  │MaterialMaster │ SAP MM03 verisi         │     │
    │  │  │(kalem_tipi,   │ (import edilir)         │     │
    │  │  │ birim vb.)    │                        │     │
    │  │  └───────────────┘                        │     │
    │  └──────────────────────────────────────────┘     │
    │                     │                              │
    │                     ▼                              │
    │  ┌──────────────────────────────────────────┐     │
    │  │  OPERATÖR İNCELEME (Frontend UI)          │     │
    │  │                                           │     │
    │  │  • needs_review satırları tek tek çöz      │     │
    │  │  • Kalem Tipi seç → Sipariş/Dağıtım       │     │
    │  │    otomatik doldurulur                     │     │
    │  │  • Bulk resolve — aynı malzemeyi tüm       │     │
    │  │    satırlara uygula                        │     │
    │  │  • KalemTipi listesi Excel upload          │     │
    │  │  • Yeniden işleme (reprocess)              │     │
    │  └──────────────────┬───────────────────────┘     │
    │                     │                              │
    │                     ▼                              │
    │  ┌──────────────────────────────────────────┐     │
    │  │  EXPORT — Master Excel                    │     │
    │  │                                           │     │
    │  │  Formatted, color-coded, filtered Excel   │     │
    │  │  Level-based row coloring                 │     │
    │  │  Auto-filter + frozen header              │     │
    │  └──────────────────────────────────────────┘     │
    └───────────────────────────────────────────────────┘
```

---

## 4. Excel Kaynak Dosyaları ve Formatları

### 4.1 PLM BOM Kaynak Excel (PLM Sistem Çıktısı)

PLM'den gelen ham Excel iki sheet içerir:

**BOM Sheet** — 12 sütun:

| Index | Sütun | Açıklama |
|-------|-------|----------|
| 0 | Level | Hiyerarşi seviyesi (0-8) |
| 1 | Title | Parça adı / montaj adı |
| 2 | Revision | Revizyon kodu |
| 3 | Quantity | Adet miktarı |
| 4 | Description | Açıklama |
| 5 | MaturityState | Olgunluk durumu |
| 6 | Owner | Sorumluk |
| 7 | MalzemeNo | SAP malzeme numarası |
| 8 | IstatistikselProsesKontrol | İPK bilgisi |
| 9 | SAP Usage | SAP kullanım bilgisi (C5P vb.) |
| 10 | KullanimMiktari | Kullanım miktarı |
| 11 | AnaMalzeme | Ana malzeme referansı |

**Sheet1** — Genişletilmiş versiyon (~23+ sütun), araç tipine göre farklı sütun mappingleri.

### 4.2 Sistem PLM Formatı (31 Sütun)

Sisteme yüklenen PLM dosyası **31 sütunluk** standart format kullanır:

| Index | Sütun Adı | Kaynak |
|-------|-----------|--------|
| 0 (A) | Level | PLM → +1 increment (ELECTRON) |
| 1 (B) | Title | PLM Title |
| 2 (C) | Revision | PLM Revision |
| 3 (D) | Quantity | PLM Quantity |
| 4 (E) | Description | PLM Description |
| 5 (F) | MaturityState | PLM MaturityState |
| 6 (G) | Owner | PLM Owner |
| 7 (H) | CatiaAciklama | Boş (CATIA'dan gelir) |
| 8 (I) | YedekParcaMi | Boş |
| 9 (J) | MalzemeStandartDokumani | Boş |
| 10 (K) | ToleransDokumani | Boş |
| 11 (L) | DokumanMalzemeTuru | Boş |
| 12 (M) | MalzemeNo | PLM MalzemeNo (trailing letter stripped) |
| 13 (N) | IstatistikselProsesKontrol | PLM İPK |
| 14 (O) | ParcaStandartDokumani | Boş |
| 15 (P) | SAP Usage | PLM SAP Usage |
| 16 (Q) | YanmazlikParametresi | Boş |
| 17 (R) | Hacim | Boş |
| 18 (S) | BoyaKodu | Boş |
| 19 (T) | YuzeyAlani | Boş |
| 20 (U) | HomologasyonDokumani | Boş |
| 21 (V) | EmisyonFaktoru | Boş |
| 22 (W) | FinishingStandartDokumani | Boş |
| 23 (X) | ReferansResim | Boş |
| 24 (Y) | Kutle | Boş |
| 25 (Z) | Sertlik | Boş |
| 26 (AA) | ProjeKodu | Boş |
| 27 (AB) | KullanimMiktari | PLM KullanimMiktari |
| 28 (AC) | AnaMalzemeGrubu | Boş |
| 29 (AD) | IsilIslemDokumani | Boş |
| 30 (AE) | AnaMalzeme | PLM AnaMalzeme |

### 4.3 KalemTipi Listesi Excel

SAP MM03'den çıkarılan veya PLM master'dan oluşturulan dosya:

| Sütun | Açıklama |
|-------|----------|
| MalzemeNo | Title veya malzeme numarası (lookup key) |
| KalemTipi | F, Y, E, H, C, X DETAY vb. |
| Birim | AD, KG, M, M2, L, D |
| Aciklama | Parça açıklaması |

### 4.4 Entegrasyon Şablon Excel (Template)

`entegration-templatefolder/` içindeki dosya, farklı bir sütun düzenine sahip:

| Sütun (1-indexed) | Alan | Açıklama |
|----|------|----------|
| 1 | Level | Hiyerarşi seviyesi |
| 2 | Title | Parça adı |
| 3 | Revision | Revizyon |
| 4 | Montaj No | Montaj numarası |
| 5 | Quantity | Miktar |
| 6 | Description | Açıklama |
| 7 | MaturityState | Olgunluk |
| 8 | Owner | Sorumlu |
| 9 | DokumanMalzemeTuru | Doküman malzeme türü |
| 10 | Sipariş | Ham sipariş değeri |
| 11 | Br (Birim) | Birim |
| 12 | DSD | İgnore |
| 13 | Miktar | Ham miktar |
| 14 | DF TR | DF TR değeri |
| 15 | Kalem Tipi | Item category |
| 16 | mtürü | Malzeme türü |
| 18 | MalzemeNo | Malzeme numarası |
| 19 | SAP Usage | SAP kullanımı |
| 20 | KullanimMiktari | Kullanım miktarı |
| 21 | AnaMalzeme | Ana malzeme |

---

## 5. PLM Dosya Oluşturma (gen_plm Scripts)

### 5.1 gen_plm.py — ELECTRON Tek Araç

Bu script, ELECTRON otobüsün PLM kaynak Excel'ini alıp iki dosya oluşturur:

#### Adım 1: PLM Dosyası Oluşturma

```python
# Kaynak: "G1280 ELECTRON*1.xlsx" → BOM sheet
# Çıktı: "ELECTRON_PLM.xlsx" → 31 sütunlu standart format

# Sütun Eşleştirmesi (BOM kaynak → PLM hedef):
REMAP = {
    0: 0,    # Level → Level
    1: 1,    # Title → Title
    2: 2,    # Revision → Revision
    3: 3,    # Quantity → Quantity
    4: 4,    # Description → Description
    5: 5,    # MaturityState
    6: 6,    # Owner
    7: 12,   # MalzemeNo → col M (index 12)
    8: 13,   # İPK → col N
    9: 15,   # SAP Usage → col P
    10: 27,  # KullanimMiktari → col AB
    11: 30,  # AnaMalzeme → col AE
}
```

**Kritik**: Level +1 increment yapılır çünkü PLM'deki Level 0, sistemde Level 1'e karşılık gelir.

**MalzemeNo Temizliği**: Trailing kalem tipi harfi (Y, X, F, E, H, C) striplenır:
```python
malz = str(out_vals[12] or "").strip()
if malz and malz[-1] in "YyXxFfEeHhCc":
    out_vals[12] = malz[:-1]
```

#### Adım 2: KalemTipi Listesi Oluşturma

```python
# Kaynak: Sheet1 → Col L(11)=KalemTipi, Col D(3)=Title, Col S(18)=MalzemeNo, Col W(22)=Birim
# Çıktı: "ELECTRON_KalemTipi_Listesi.xlsx"

# Title'ı key olarak kullanır (Title = malzeme referansı)
# Deduplication: seen set ile — aynı Title tekrar yazılmaz
# #N/A ve boş değerler atlanır
```

### 5.2 gen_plm_v2.py — Multi-Vehicle (NEO + ELECTRON)

V2, her araç için farklı konfigürasyon kullanarak aynı pipeline'ı çalıştırır:

```python
VEHICLES = {
    "NEO": {
        "pattern": "ALLZPL1*NEO*.xlsx",
        "sheet": "Sheet1",
        "level_increment": 0,    # NEO Level'ları zaten doğru
        "remap": {
            0: 0,    # Level
            2: 1,    # Title (col C)
            3: 2,    # Revision (col D)
            4: 3,    # Quantity (col E)
            6: 4,    # Description (col G)
            8: 5,    # MaturityState (col I)
            9: 6,    # Owner (col J)
            14: 12,  # MalzemeNo (col O)
            16: 27,  # KullanimMiktari (col Q)
            17: 30,  # AnaMalzeme (col R)
        },
        "ktipi_col": 5,       # KalemTipi sütunu
        "title_col": 2,
    },
    "ELECTRON": {
        "pattern": "G1280 ELECTRON*1.xlsx",
        "sheet": "Sheet1",
        "level_increment": 1,   # +1 gerekli
        "remap": {
            0: 0,    # Level
            3: 1,    # Title (col D)
            4: 2,    # Revision (col E)
            5: 3,    # Quantity (col F)
            6: 4,    # Description (col G)
            7: 5,    # MaturityState (col H)
            8: 6,    # Owner (col I)
            18: 12,  # MalzemeNo (col S)
            20: 27,  # KullanimMiktari (col U)
            21: 30,  # AnaMalzeme (col V)
        },
        "ktipi_col": 11,
        "title_col": 3,
        "birim_col": 22,
    },
}
```

**Önemli farklar:**
- NEO ve ELECTRON farklı kaynak sütun düzenleri kullanır
- NEO level'ları increment gerektirmez (zaten 1'den başlar)
- ELECTRON sheet'i 0'dan başlar → +1 increment yapılır

---

## 6. Backend — Detaylı Modül Açıklamaları

### 6.1 excel_service.py — BOM Parsing Engine

#### `parse_bom_file(filepath, project, db)`

Bu fonksiyon PLM Excel dosyasını parse edip veritabanına yazar. İki geçişli (two-pass) algoritma kullanır:

**Pass 1 — Material Number Collection:**
```python
# Tüm olası material key'leri topla:
# - malzeme_no (MalzemeNo sütunu)
# - title (Title sütunu — bazı parçalar title ile lookup edilir)
# - ana_malzeme (AnaMalzeme sütunu)
material_nos = set()
for row in ws.iter_rows(...):
    malz_no, title, ana_malz = ...
    material_nos.add(malz_no)
    material_nos.add(title)
    material_nos.add(ana_malz)
```

Sonra tek bir SQL sorgusu ile MaterialMaster tablosundan toplu lookup yapılır (N+1 query problemi önlenir):
```python
material_map = {}
result = await db.execute(
    select(MaterialMaster).where(MaterialMaster.material_no.in_(material_nos))
)
for mat in result.scalars().all():
    material_map[mat.material_no] = mat
```

**Pass 2 — Row Processing:**

Her satır için:

1. **Hiyerarşi takibi** — `level1_title`, `level2_title` güncellenir
2. **Parent stack yönetimi** — Toplam miktar hesabı için parent quantity'leri biriktirir
3. **Montaj parent stack** — F (MONTAJ) tipindeki parent'ları takip eder
4. **Material Master lookup** — `malzeme_no → title → ana_malzeme` sıralamasıyla aranır (fallback chain)
5. **Rules Engine çağrısı** — `apply_rules()` ile tüm derived alanlar hesaplanır
6. **BomItem oluşturma** — 31 PLM alanı + 12 derived alan ile veritabanına yazılır

**Hiyerarşi Takibi Mantığı:**
```
Level 1: "GÖVDE SİSTEMLERİ"          → level1_title = "GÖVDE SİSTEMLERİ"
  Level 2: "ÖN TAMPON"               → level2_title = "ÖN TAMPON" (eğer F ise)
    Level 3: "TAMPON BRAKETI"         → montaj = "ÖN TAMPON", uzmanlik = "GÖVDE"
      Level 4: "CİVATA M8x25"        → montaj = "ÖN TAMPON", uzmanlik = "GÖVDE"
    Level 3: "TAMPON KAPAK"           → montaj = "ÖN TAMPON", uzmanlik = "GÖVDE"
  Level 2: "YAN PANEL"               → level2_title = "YAN PANEL" (eğer F ise)
    Level 3: "SAC KAPAK"             → montaj = "YAN PANEL", uzmanlik = "GÖVDE"
Level 1: "MEKANİK SİSTEMLER"         → level1_title = "MEKANİK SİSTEMLER"
  Level 2: "FREN SİSTEMİ"            → level2_title = "FREN SİSTEMİ"
    Level 3: "FREN DİSKİ"            → uzmanlik = "MEKANİK", montaj = "FREN SİSTEMİ"
```

#### `import_mm03_file(filepath, db)`

SAP MM03 Excel'inden malzeme master verisi import eder:

- **Flexible header matching** — "malzeme", "material", "numara", "no" gibi keyword'lere bakar
- **Upsert** — Mevcut malzeme varsa günceller, yoksa yeni ekler
- **Source tracking** — `source = "mm03_import"` olarak işaretler

#### `reprocess_project(project, db)`

Mevcut bir projeyi güncel Material Master verileriyle yeniden işler:

1. Tüm `BomItem`'ları sıra numarasına göre yükle
2. Tüm olası material key'leri topla, toplu MaterialMaster lookup yap
3. Hiyerarşiyi yeniden kur (level1_title, level2_title, parent stacks)
4. **`kalem_tipi_source == "manual"` olan satırları atla** — Operatör elle düzeltmişse dokundurma
5. Diğer satırları `apply_rules()` ile yeniden hesapla
6. Proje istatistiklerini güncelle

**Kritik detay**: Manuel düzeltilmiş satırlar atlanır ama hiyerarşi takibi için yine de parent stack'e eklenir. Aksi halde, bir Level 2 F item manual olarak set edilmişse, altındaki Level 3 item'lar doğru montaj değerini alamaz.

#### `export_master_excel(project_id, db)`

Formatlı Master Excel çıktısı üretir:

- **Level-based row coloring**: Level 0=gri, Level 1=açık mavi, Level 2=mavi, Level 3=yeşil, Level 4+=beyaz
- **Level-based font styling**: Level 0-1 bold büyük, Level 2 bold orta, Level 3+ normal
- **Auto-filter** ve **frozen header** (A2'de freeze)
- **Column widths** optimize edilmiş

### 6.2 integration_service.py — Template-Driven Integration

Bu modül, `entegration-templatefolder/` şablonundan gelen dosyaları işler. Farklı sütun düzeni ve farklı iş kuralları uygular.

#### `parse_integration_file(filepath, upload, db, calculate_quantity=False)`

4 aşamalı işlem:

**Aşama 1: Excel'i oku**, raw satırları `list[dict]` olarak topla

**Aşama 2: `_apply_siparis_durumu(rows)`** — Sipariş Durumu belirleme (detay: Bölüm 8)

**Aşama 3: `_apply_quantity_calculation(rows)`** — İsteğe bağlı miktar hesapla

**Aşama 4: `_apply_montaj_flag(rows)`** — `Kalem Tipi == "F"` ise "EVET", değilse "HAYIR"

#### `export_filtered_excel(upload_id, db, **filters)`

Filtreleme seçenekleri:
- `siparis_durumu` — "EVET" veya "HAYIR"
- `montaj_mi` — "EVET" veya "HAYIR"
- `uzmanlik` — "GÖVDE", "TRİM" vb.
- `kalem_tipi` — "F", "Y" vb.
- `level` — Belirli seviye

Çıktıda:
- EVET satırları yeşil, HAYIR satırları kırmızı arka plan
- Onay sütunu (✓/✗) — operatör review için
- Download işlemi `IntegrationApproval` tablosuna loglanır

#### `compare_reupload(upload_id, filepath, db)`

Operatör Excel'i indirip inceledikten sonra tekrar yüklediğinde:
1. Mevcut satırlarla row_number bazında eşleştirir
2. Field-level diff üretir (title, siparis_durumu değişiklikleri)
3. Onay sütununda ✓ işareti olan satırları `approved = True, locked = True` yapar
4. Kilitli satırlar bir daha değiştirilemez

---

## 7. Rules Engine — Tüm İş Kuralları

`rules_engine.py` tüm karar mantığını merkezleştirir. Her BOM satırı için `apply_rules()` çağrılır.

### 7.1 Kalem Tipi Türleri ve Kuralları

| Kalem Tipi | Anlam | Sipariş | Dağıtım |
|------------|-------|---------|---------|
| **F** | Montaj (Fabrication/Assembly) | MONTAJ | — |
| **Y** | Satın alınacak (Yapılacak) | EVET | EVET |
| **E** | Temin edilecek | EVET | EVET |
| **H** | Hammadde | HAYIR | EVET |
| **C** | Costomer-supplied | HAYIR | EVET |
| **X DETAY** | Detay çizim | HAYIR | — |
| **X-Kesilerek** | Kesilerek kullanılan | KONTROL EDİLECEK | EVET |

### 7.2 Level-Bazlı Kurallar (Öncelik Sırası)

#### Level 0-1: Kök ve Ana Grup
```
Kalem Tipi = "NA"
Sipariş    = "NA"
Dağıtım    = ""
Montaj     = "NA"
→ Otomatik kural, inceleme gerektirmez
```

#### Level 2: Montaj/Grup Düzeyi
```
EĞER material_kalem_tipi ∈ {Y, H}:
    → Kalem Tipi = material_kalem_tipi
    → Sipariş = "EVET"
    → Dağıtım = "EVET"
    → source = "material_master"
DEĞİLSE:
    → Kalem Tipi = "F"           (Montaj olarak kabul et)
    → Sipariş = "MONTAJ"
    → Dağıtım = ""
    → source = "auto_rule"

# Level 2 ve "F" ise: Bu item yeni bir MONTAJ grubu başlatır
# level2_title = bu item'ın title'ı
# Altındaki tüm Level 3+ item'lar bu montaja ait olur
```

#### Level 3: Parça Düzeyi
```
EĞER material_kalem_tipi VAR:
    kt = material_kalem_tipi
    
    EĞER kt == "F":      → Sipariş = "MONTAJ", Dağıtım = ""
    EĞER kt ∈ KESİLEREK: → Sipariş = "KONTROL EDİLECEK", Dağıtım = "EVET", needs_review = True
    EĞER kt ∈ KURAL_MAP: → Sipariş = MAP[kt].siparis, Dağıtım = MAP[kt].dagitim
    DEĞİLSE:             → Sipariş = "EVET", Dağıtım = "EVET"
    
    source = "material_master"
DEĞİLSE:
    Kalem Tipi = ""
    Sipariş = "EVET", Dağıtım = "EVET"
    source = ""
    → Material Master'da bulunamadı, operatör inceleyecek
```

#### Level 4+: Alt Parça/Detay
```
EĞER material_kalem_tipi VAR:
    → Level 3 ile aynı kurallar uygulanır
DEĞİLSE:
    EĞER parent MONTAJ (F) altındaysa:
        → Sipariş = "EVET", Dağıtım = "EVET"
    DEĞİLSE:
        → Sipariş = "EVET", Dağıtım = "EVET"
    
    needs_review = False  (Level 4+ review gerektirmez)
```

### 7.3 Uzmanlık Derivasyonu

Level 1 parent'ın title'ından keyword eşleştirmesi:

```python
"GÖVDE"     → "GÖVDE"           # Gövde mühendisliği
"TRİM"      → "TRİM"            # İç tasarım / trim
"HVAC"      → "HVAC"            # İklimlendirme
"MEKANİK"   → "MEKANİK"         # Mekanik sistemler
"ELEKTRİK"  → "ELEKTRİK"        # Elektrik sistemleri
```

Case-insensitive kontrol yapılır. Eşleşme yoksa boş string.

### 7.4 MalzemeNo/SAP Karşılığı Derivasyonu

```python
def derive_malzeme_no_sap(title, malzeme_no, ana_malzeme, sap_usage):
    # Öncelik 1: ana_malzeme varsa, onu kullan + "Y" suffix
    if ana_malzeme:
        return ana_malzeme + "Y"  # (zaten Y ile bitiyorsa ekleme)
    
    # Öncelik 2: Kesilerek kullanılan (title'da "_" ve C5P usage)
    if "_" in title and sap_usage == "C5P":
        return title.split("_")[0] + "Y"
    
    # Öncelik 3: malzeme_no veya title + "Y" suffix
    base = malzeme_no or title
    return base + "Y"  # (zaten Y ile bitiyorsa ekleme)
```

### 7.5 Toplam Miktar Hesabı

Level 3+ ve Sipariş "EVET" veya "KONTROL EDİLECEK" olan satırlar için:

```
ToplamMiktar = Quantity × Parent₁.Quantity × Parent₂.Quantity × ... × ParentN.Quantity
```

Örnek:
```
Level 2: "ÖN TAMPON" (qty=1)
  Level 3: "BRAKET" (qty=2)
    Level 4: "CİVATA" (qty=4)    → ToplamMiktar = 4 × 2 × 1 = 8
    Level 4: "SOMUN" (qty=4)     → ToplamMiktar = 4 × 2 × 1 = 8
  Level 3: "KAPAK" (qty=1)
    Level 4: "PERÇİN" (qty=12)   → ToplamMiktar = 12 × 1 × 1 = 12
```

### 7.6 Birleştirme Alanı

Üç değerin birleşimi — SAP'da unique key olarak kullanılır:

```
Birleştirme = Montaj + Title + MalzemeNo/SAP
```

### 7.7 Montaj Atama Mantığı

```
Level 0-1:  Montaj = "NA"
Level 2:    EĞER Kalem Tipi == "F" → Montaj = kendi title'ı (yeni grup başlatır)
            DEĞİLSE               → Montaj = son Level 2 F'in title'ı
Level 3+:   Montaj = level2_title (en son Level 2 F'in title'ı)
```

**Montaj Parent Stack** — Level 3+ seviyede iç içe F (montaj) grupları takip edilir:
```
Level 2: "ANA MONTAJ" (F)
  Level 3: "ALT MONTAJ" (F)         → montaj_parent_stack'e eklenir
    Level 4: "PARÇA" (Y)            → parent_montaj_kt = "F"
  Level 3: "DİĞER PARÇA" (Y)       → stack pop edilir, parent_montaj_kt = None
```

---

## 8. Integration Module (Template-Driven Flow)

Bu modül, belirli bir şablondan gelen dosyalar için farklı bir iş akışı sunar.

### 8.1 Sipariş Durumu State Machine

`_apply_siparis_durumu()` üç seviye state machine kullanır:

```
State: l1_f_active, l2_f_active, l3_trigger

── Level 1 ──
L1 + KT="F" → l1_f_active = True,  Sipariş = "EVET"
L1 + KT≠"F" → l1_f_active = False, Sipariş = "HAYIR"

── Level 2 ──
L2 tüm durumda → l3_trigger sıfırla
L2 + KT="F" → l2_f_active = True,  Sipariş = "EVET"
L2 + KT≠"F" → l2_f_active = False, Sipariş = (l1_f_active ? "EVET" : "HAYIR")

── Level 3 ──
L3 + KT="F" → l3_trigger = "F",    Sipariş = "EVET"
L3 + KT="Y" → l3_trigger = "Y",    Sipariş = (l2_f_active ? "EVET" : "HAYIR")
L3 + KT∈{H,C} → l3_trigger = "",   Sipariş = "HAYIR"
L3 + KT="E" → l3_trigger = "",      Sipariş = "EVET"
L3 + diğer  → l3_trigger = "",      Sipariş = (l2_f_active ? "EVET" : "HAYIR")

── Level 4+ ──
l3_trigger == "F" → Sipariş = "EVET"
l3_trigger == "Y" → Sipariş = "HAYIR"
diğer             → Sipariş = (l2_f_active ? "EVET" : "HAYIR")
```

### 8.2 Miktar Hesabı

```python
def _apply_quantity_calculation(rows):
    # KullanimMiktari × Quantity × (tüm parent Quantity'ler çarpımı)
    # KullanimMiktari 0 veya boş ise → sonuç boş bırakılır
    
    parent_stack = []
    for r in rows:
        level = r["level"]
        qty = r["quantity"]
        
        # Pop deeper/same parents
        while parent_stack and parent_stack[-1]["level"] >= level:
            parent_stack.pop()
        
        kull = r["kullanim_miktari"]
        if kull and kull != 0:
            montaj_qty = 1.0
            for p in parent_stack:
                montaj_qty *= p["quantity"]
            r["hesaplanan_miktar"] = kull * qty * montaj_qty
        
        parent_stack.append({"level": level, "quantity": qty})
```

### 8.3 Onay Akışı (Approval Workflow)

```
                    ┌─────────────┐
                    │   Upload    │
                    │  Template   │
                    └──────┬──────┘
                           │ parse + apply rules
                           ▼
                    ┌─────────────┐
                    │  İşlenmiş   │
                    │   Veriler    │
                    └──────┬──────┘
                           │ filter by siparis/montaj/uzmanlik
                           ▼
                    ┌─────────────┐
                    │  Export      │◄── download loglanır
                    │  Filtered    │    (IntegrationApproval)
                    │  Excel       │
                    └──────┬──────┘
                           │ operatör inceler
                           │ ✓ işareti koyar
                           ▼
                    ┌─────────────┐
                    │  Re-upload   │
                    │  (diff)      │
                    └──────┬──────┘
                           │ row-level diff
                           │ ✓ olan satırlar lock
                           ▼
                    ┌─────────────┐
                    │  Approved    │  locked = True
                    │  & Locked    │  → artık değiştirilemez
                    └─────────────┘
```

Her adım `IntegrationApproval` tablosuna kaydedilir (action: download, reupload, approve, lock).

---

## 9. Frontend — Kullanıcı Arayüzü

### 9.1 Ana Sayfa (`page.tsx`)

- TEMSA branded hero banner — kırmızı/koyu tema
- Proje listesi — kartlar halinde, progress bar ile
- Upload butonu — dosya seçilince otomatik yüklenir
- Proje silme — onay ile
- 3 adımlı görsel: Excel yükle → Kalem Tipi eşleştir → SAP BOM indir

### 9.2 Proje Detay (`project/[id]/page.tsx`)

**Sol Panel — Navigasyon Sidebar:**
- Level 2 gruplar → expandable
- Her Level 2 altındaki Level 3'ler listeli
- Tıklandığında ilgili satıra scroll + highlight (ring animasyonu, 2.5s)
- Arama filtresi

**Üst Bölüm — Progress & İstatistikler:**
- Progress card: toplam / çözülen / bekleyen, yüzde bar
- Mini stat kartları: Kalem Tipi dağılımı, Sipariş dağılımı
- Uzmanlık dağılımı — tıklanabilir filtre butonları

**Filtreler:**
- Tümü / İnceleme Bekliyor / Çözülenler
- Uzmanlık filtresi
- L2/L3 navigasyon butonları (önceki/sonraki Level 2 veya 3'e atla)

**BOM Tablosu:**
Her satır gösterir:
- Row #, Level, Uzmanlık, Montaj, Title, MalzemeNo
- Kalem Tipi (dropdown ile değiştirilebilir)
- Sipariş, Dağıtım, Birim, Toplam Miktar
- Kalem Tipi Source badge (auto_rule / material_master / manual)

**Satır İnceleme — needs_review true olan satırlar:**
- Kalem Tipi dropdown — Y, E, H, C, F, X DETAY seçenekleri
- Birim dropdown — AD, KG, M, M2, L, D
- "Bulk Resolve" — aynı malzeme numarasını tüm eşleşen satırlara uygula + Material Master'a kaydet

**Aksiyon Butonları:**
- **Kalem Tipi Yükle** — KalemTipi listesi Excel'i upload et → Material Master'a import → projeyi reprocess
- **Yeniden İşle** — Güncel Material Master ile reprocess
- **Excel İndir** — Formatlı Master Excel export

### 9.3 Malzeme Master (`materials/page.tsx`)

- Material Master tablo görünümü — MalzemeNo, KalemTipi, Birim, Açıklama, Kaynak
- **Arama** — malzeme no veya açıklama üzerinden
- **MM03 Excel Yükle** — SAP MM03 çıktısını toplu import
- **Manuel Ekle** — Tek tek kayıt oluşturma
- **Sayfalama** — 100'er kayıt
- Color-coded Kalem Tipi badge'leri

---

## 10. Veritabanı Modelleri

### 10.1 MaterialMaster — SAP Malzeme Master

```sql
TABLE material_master (
    id              SERIAL PRIMARY KEY,
    material_no     VARCHAR(100) UNIQUE NOT NULL,  -- Lookup key
    description     TEXT DEFAULT '',
    kalem_tipi      VARCHAR(50) NOT NULL,          -- F, Y, E, H, C, X DETAY...
    birim           VARCHAR(100) DEFAULT '',       -- AD, KG, M, M2, L, D
    source          VARCHAR(50) DEFAULT 'manual',  -- manual, mm03_import, auto
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
```

**Lookup Logic:** Material Master'da arama şu sırayla yapılır:
1. `malzeme_no` ile ara
2. Bulamazsan `title` ile ara  
3. Bulamazsan `ana_malzeme` ile ara

### 10.2 BomProject — Proje

```sql
TABLE bom_project (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    filename        VARCHAR(500) NOT NULL,
    status          VARCHAR(50) DEFAULT 'uploaded',  -- uploaded, processing, review, completed
    total_rows      INTEGER DEFAULT 0,
    resolved_rows   INTEGER DEFAULT 0,
    unresolved_rows INTEGER DEFAULT 0,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
```

### 10.3 BomItem — BOM Satırı (31 PLM + 12 Derived Alan)

```sql
TABLE bom_item (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER REFERENCES bom_project(id) ON DELETE CASCADE,
    row_number      INTEGER NOT NULL,
    
    -- PLM alanları (31)
    level           INTEGER NOT NULL,
    title           VARCHAR(300),
    revision        VARCHAR(20),
    quantity        FLOAT DEFAULT 1.0,
    description     TEXT,
    maturity_state  VARCHAR(50),
    owner           VARCHAR(100),
    catia_aciklama  VARCHAR(300),
    yedek_parca_mi  VARCHAR(20),
    malzeme_standart_dokumani VARCHAR(100),
    tolerans_dokumani VARCHAR(100),
    dokuman_malzeme_turu VARCHAR(100),
    malzeme_no      VARCHAR(200),
    istatistiksel_proses_kontrol VARCHAR(100),
    parca_standart_dokumani VARCHAR(100),
    sap_usage       VARCHAR(20),
    yanmazlik_parametresi VARCHAR(100),
    hacim           VARCHAR(50),
    boya_kodu       VARCHAR(50),
    yuzey_alani     VARCHAR(50),
    homologasyon_dokumani VARCHAR(100),
    emisyon_faktoru VARCHAR(100),
    finishing_standart_dokumani VARCHAR(100),
    referans_resim  VARCHAR(200),
    kutle           VARCHAR(50),
    sertlik         VARCHAR(50),
    proje_kodu      VARCHAR(50),
    kullanim_miktari VARCHAR(50),
    ana_malzeme_grubu VARCHAR(100),
    isil_islem_dokumani VARCHAR(100),
    ana_malzeme     VARCHAR(200),
    
    -- Derived alanlar (12)
    uzmanlik          VARCHAR(50),      -- GÖVDE, TRİM, MEKANİK, ELEKTRİK, HVAC
    montaj            VARCHAR(200),     -- En yakın Level 2 F parent'ın title'ı
    malzeme_no_sap    VARCHAR(200),     -- MalzemeNo/SAP karşılığı (Y suffix)
    ana_malzeme_derived VARCHAR(200),   -- AnaMalzeme türetilmiş
    birlestirme       VARCHAR(500),     -- Montaj + Title + MalzemeNoSAP
    kalem_tipi        VARCHAR(50),      -- F, Y, E, H, C, X DETAY...
    siparis           VARCHAR(50),      -- NA, MONTAJ, EVET, HAYIR, KONTROL EDİLECEK
    dagitim           VARCHAR(10),      -- EVET, boş
    birim             VARCHAR(100),     -- AD, KG, M, M2, L, D
    toplam_miktar     FLOAT,            -- Qty × parent qty'ler çarpımı
    kalem_tipi_source VARCHAR(30),      -- auto_rule, material_master, manual
    needs_review      BOOLEAN           -- Operatör incelemesi gerekiyor mu?
);
CREATE INDEX ix_bom_item_project_row ON bom_item(project_id, row_number);
```

### 10.4 IntegrationUpload — Entegrasyon Yükleme

```sql
TABLE integration_upload (
    id                SERIAL PRIMARY KEY,
    filename          VARCHAR(500) NOT NULL,
    source            VARCHAR(50) DEFAULT 'user',
    status            VARCHAR(50) DEFAULT 'uploaded',  -- uploaded, processing, processed, approved
    template_version  VARCHAR(50) DEFAULT '1.0',
    total_rows        INTEGER DEFAULT 0,
    notes             TEXT DEFAULT '',
    created_at        TIMESTAMP,  -- Turkey timezone
    updated_at        TIMESTAMP
);
```

### 10.5 IntegrationItem — Entegrasyon Satırı

```sql
TABLE integration_item (
    id              SERIAL PRIMARY KEY,
    upload_id       INTEGER REFERENCES integration_upload(id) ON DELETE CASCADE,
    row_number      INTEGER NOT NULL,
    
    -- Excel'den gelen alanlar
    level           INTEGER NOT NULL,
    title           VARCHAR(300),
    revision        VARCHAR(50),
    montaj_no       VARCHAR(300),
    quantity        FLOAT DEFAULT 1.0,
    description     TEXT,
    maturity_state  VARCHAR(50),
    owner           VARCHAR(200),
    dokuman_malzeme_turu VARCHAR(200),
    birim           VARCHAR(50),
    miktar          FLOAT,
    df_tr           VARCHAR(300),
    kalem_tipi      VARCHAR(50),
    m_turu          VARCHAR(100),
    malzeme_no      VARCHAR(200),
    sap_usage       VARCHAR(50),
    kullanim_miktari VARCHAR(100),
    ana_malzeme     VARCHAR(200),
    
    -- Hesaplanan alanlar
    siparis_durumu    VARCHAR(50),      -- EVET / HAYIR (state machine)
    montaj_mi         VARCHAR(10),      -- EVET / HAYIR
    uzmanlik          VARCHAR(100),
    hesaplanan_miktar FLOAT,            -- KullMik × Qty × ParentQty
    
    -- Onay
    approved      BOOLEAN DEFAULT FALSE,
    approved_by   VARCHAR(200),
    approved_at   TIMESTAMP,
    locked        BOOLEAN DEFAULT FALSE   -- Kilitli = değiştirilemez
);
CREATE INDEX ix_intitem_upload_row ON integration_item(upload_id, row_number);
```

### 10.6 IntegrationApproval — Onay Geçmişi

```sql
TABLE integration_approval (
    id              SERIAL PRIMARY KEY,
    upload_id       INTEGER REFERENCES integration_upload(id) ON DELETE CASCADE,
    action          VARCHAR(50) NOT NULL,  -- download, reupload, approve, lock
    user_name       VARCHAR(200),
    filter_criteria TEXT,                   -- JSON: hangi filtrelerle indirildi
    filename        VARCHAR(500),
    details         TEXT,
    old_values      TEXT,
    new_values      TEXT,
    created_at      TIMESTAMP
);
```

---

## 11. API Endpoint'leri

### 11.1 Projects (`/api/projects/`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/upload` | PLM Excel yükle → parse + rules → DB |
| `GET` | `/` | Tüm projeleri listele |
| `GET` | `/{id}` | Proje detay |
| `GET` | `/{id}/items` | BOM satırları (filtreli: needs_review, level, uzmanlik, kalem_tipi, siparis) |
| `GET` | `/{id}/items` param: `offset, limit` | Sayfalama (500'er) |
| `GET` | `/{id}/stats` | İstatistikler (by_kalem_tipi, by_siparis, by_uzmanlik) |
| `GET` | `/{id}/nav` | Level 2+3 navigasyon listesi |
| `PATCH` | `/{id}/items/{item_id}` | Tek satır güncelle (kalem_tipi, siparis, dagitim, birim) |
| `POST` | `/{id}/bulk-resolve` | Malzeme bazlı toplu Kalem Tipi ataması |
| `POST` | `/{id}/upload-kalem-tipi` | KalemTipi listesi yükle → import + reprocess |
| `POST` | `/{id}/reprocess` | Güncel Material Master ile yeniden hesapla |
| `GET` | `/{id}/export` | Master Excel dosyası indir |
| `DELETE` | `/{id}` | Projeyi sil |

### 11.2 Materials (`/api/materials/`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/` | Malzeme listesi (search, kalem_tipi, offset, limit) |
| `GET` | `/count` | Toplam malzeme sayısı |
| `POST` | `/` | Manuel malzeme ekle |
| `PATCH` | `/{id}` | Malzeme güncelle |
| `DELETE` | `/{id}` | Malzeme sil |
| `POST` | `/import-mm03` | SAP MM03 Excel'den toplu import |

### 11.3 Integration (`/api/integration/`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/upload` | Şablon Excel yükle (calculate_quantity opsiyonel) |
| `GET` | `/uploads` | Yüklemeleri listele |
| `GET` | `/uploads/{id}` | Yükleme detay |
| `DELETE` | `/uploads/{id}` | Yükleme sil |
| `GET` | `/uploads/{id}/items` | Satırlar (filtreli, sayfalı) |
| `GET` | `/uploads/{id}/items/count` | Filtrelere göre satır sayısı |
| `GET` | `/uploads/{id}/stats` | İstatistikler |
| `PATCH` | `/items/{id}` | Tek satır güncelle (locked ise 409) |
| `GET` | `/uploads/{id}/export` | Filtrelenmiş Excel indir |
| `POST` | `/uploads/{id}/reupload` | Operatör incelemesi sonrası re-upload + diff |
| `POST` | `/uploads/{id}/approve` | Satırları onayla ve kilitle |
| `GET` | `/uploads/{id}/history` | Onay geçmişi |

---

## 12. Deployment (Docker)

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bomdb
      POSTGRES_USER: bomuser
      POSTGRES_PASSWORD: bompass123
    ports:
      - "5434:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8001:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://bomuser:bompass123@db:5432/bomdb
      CORS_ORIGINS: "*"
    depends_on:
      db: { condition: service_healthy }
    volumes:
      - ./backend:/app
      - uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8001
    depends_on:
      - backend
```

**Port'lar:**
- PostgreSQL: `5434` (dışarıdan) → `5432` (container)
- Backend API: `8001` → `8000`
- Frontend: `3001` → `3000`

**Başlatma:**
```bash
docker-compose up -d
```

**Otomatik table creation**: Backend startup'ta `Base.metadata.create_all()` çalışır — migration gerekmez.

---

## 13. Araçlar ve Yardımcı Scriptler

### 13.1 analyze.py

Kaynak Excel'in yapısını analiz etmek için kullanılır. Master sheet'teki sütun yapısını, MalzemeNo/SAP doldurulma oranını, AnaMalzeme değerlerini ve Toplam Miktar hesaplama mantığını araştırır.

### 13.2 compare_master.py

Dışa aktarılan Master Excel'i orijinal ile karşılaştırır — header'ları, satır sayılarını kontrol eder.

### 13.3 compare_detail.py

Kalem Tipi doğruluk testi — Orijinal Master'daki Kalem Tipi ile export edilen Kalem Tipi'ni satır satır karşılaştırır. Normalization uygular (y→Y, x detay→X DETAY). Match/mismatch istatistikleri + ilk 20 farklılık örneği verir.

### 13.4 create_plm_file.py

Basit PLM-only Excel oluşturma — BOM sheet'ini doğrudan kopyalar, başlıkları bold yapar, sütun genişlikleri ayarlar.

### 13.5 create_kalem_tipi.py (v1) & create_kalem_tipi_v2.py (v2)

BOM + Master sheet'lerden KalemTipi listesi oluşturur:
- **v1**: `skip_kalem` setinde "F" var → Level 2 F'ler atlanır
- **v2**: "F" removed from skip → Level 3 F item'lar da listeye dahil
- Level 3+ satırlar için MalzemeNo, Title, AnaMalzeme'nin tümünü key olarak kaydeder
- Normalization: `y→Y`, `X Detay→X DETAY`

---

## 14. Bilinen Sınırlamalar ve Gelecek Planlar

### Mevcut Sınırlamalar

1. **Uzmanlık Sütunu**: Entegrasyon şablonunda henüz Uzmanlık sütunu yok — kullanıcı tarafından eklenecek
2. **Template path**: Hard-coded — production'da env-based yapılmalı
3. **Material Master Fallback**: `title` ile arama yapılması bazı false positive'lere yol açabilir (farklı parçalar aynı title)
4. **Level 4+ needs_review**: Daima `False` — bazı edge case'lerde manuel inceleme gerekebilir
5. **Single-user**: Auth/authz yok — tüm operatörler aynı yetkilere sahip

### Gelecek Planlar

- [ ] Uzmanlık sütununu şablona ekle
- [ ] Frontend'de integration modülü için ayrı sayfa
- [ ] Material Master auto-complete önerileri
- [ ] SAP SPI entegrasyonu (doğrudan SAP'a yazma)
- [ ] Diff/change history — bir proje birden fazla kez reprocess edildiğinde değişiklik takibi
- [ ] Role-based access control
- [ ] Export formatlarını customize etme (sütun seçimi, gruplama)

---

*Bu doküman, PLM BOM Entegrasyon Sistemi'nin tüm bileşenlerini, iş mantığını, veri akışını ve teknik detaylarını kapsar.*
