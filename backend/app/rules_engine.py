"""
Rules Engine — Kalem Tipi + Sipariş/Dağıtım derivation for BOM items.
Central business logic for PLM BOM → SAP Master BOM conversion.
"""

KESILEREK_TYPES = {"X-Kesilerek Kullanilan", "Kesilerek kullaniliyor"}

UZMANLIK_KEYWORDS = {
    "GÖVDE": "GÖVDE",
    "GOVDE": "GÖVDE",
    "TRİM": "TRİM",
    "TRIM": "TRİM",
    "HVAC": "HVAC",
    "MEKANİK": "MEKANİK",
    "MEKANIK": "MEKANİK",
    "ELEKTRİK": "ELEKTRİK",
    "ELEKTRIK": "ELEKTRİK",
}

SIPARIS_MAP = {
    "F": "MONTAJ",
    "Y": "EVET",
    "E": "EVET",
    "H": "HAYIR",
    "C": "HAYIR",
    "X DETAY": "HAYIR",
}

DAGITIM_MAP = {
    "F": "",
    "Y": "EVET",
    "E": "EVET",
    "H": "EVET",
    "C": "EVET",
    "X DETAY": "",
}


def derive_uzmanlik(level1_title: str) -> str:
    if not level1_title:
        return ""
    upper = level1_title.upper()
    for kw, val in UZMANLIK_KEYWORDS.items():
        if kw in upper:
            return val
    return ""


def derive_malzeme_no_sap(title: str, malzeme_no: str, ana_malzeme: str, sap_usage: str) -> str:
    if ana_malzeme:
        base = ana_malzeme.strip()
        return base if base.upper().endswith("Y") else base + "Y"
    if title and "_" in title and sap_usage == "C5P":
        base = title.split("_")[0].strip()
        return base if base.upper().endswith("Y") else base + "Y"
    base = (malzeme_no or title or "").strip()
    if not base:
        return ""
    return base if base.upper().endswith("Y") else base + "Y"


def apply_rules(
    level: int,
    title: str,
    malzeme_no: str,
    ana_malzeme: str,
    sap_usage: str,
    quantity: float,
    level1_title: str,
    level2_title: str,
    material_kalem_tipi: str | None,
    material_birim: str | None,
    parent_qty_product: float,
    parent_montaj_kt: str | None,
) -> dict:
    result = {
        "kalem_tipi": "",
        "siparis": "",
        "dagitim": "",
        "birim": material_birim or "",
        "uzmanlik": derive_uzmanlik(level1_title),
        "montaj": "",
        "malzeme_no_sap": derive_malzeme_no_sap(title, malzeme_no, ana_malzeme, sap_usage or ""),
        "toplam_miktar": None,
        "kalem_tipi_source": "",
        "needs_review": False,
    }

    # Level 0-1: root / main group
    if level <= 1:
        result["kalem_tipi"] = "NA"
        result["siparis"] = "NA"
        result["dagitim"] = ""
        result["montaj"] = "NA"
        result["kalem_tipi_source"] = "auto_rule"
        return result

    # Level 2: assembly level
    if level == 2:
        if material_kalem_tipi and material_kalem_tipi in ("Y", "H"):
            result["kalem_tipi"] = material_kalem_tipi
            result["siparis"] = "EVET"
            result["dagitim"] = "EVET"
            result["kalem_tipi_source"] = "material_master"
        else:
            result["kalem_tipi"] = "F"
            result["siparis"] = "MONTAJ"
            result["dagitim"] = ""
            result["kalem_tipi_source"] = "auto_rule"
        result["montaj"] = title if result["kalem_tipi"] == "F" else level2_title
        return result

    # Level 3+: part level
    montaj = level2_title

    if material_kalem_tipi:
        kt = material_kalem_tipi
        result["kalem_tipi"] = kt
        result["kalem_tipi_source"] = "material_master"

        if kt == "F":
            result["siparis"] = "MONTAJ"
            result["dagitim"] = ""
        elif kt in KESILEREK_TYPES:
            result["siparis"] = "KONTROL EDİLECEK"
            result["dagitim"] = "EVET"
            result["needs_review"] = True
        elif kt in SIPARIS_MAP:
            result["siparis"] = SIPARIS_MAP[kt]
            result["dagitim"] = DAGITIM_MAP.get(kt, "")
        else:
            result["siparis"] = "EVET"
            result["dagitim"] = "EVET"
    else:
        # Not found in Material Master
        result["kalem_tipi"] = ""
        result["siparis"] = "EVET"
        result["dagitim"] = "EVET"
        result["kalem_tipi_source"] = ""
        if level == 3:
            result["needs_review"] = True

    result["montaj"] = montaj

    # Total quantity for orderable items
    if level >= 3 and result["siparis"] in ("EVET", "KONTROL EDİLECEK"):
        result["toplam_miktar"] = (quantity or 1.0) * parent_qty_product

    return result
