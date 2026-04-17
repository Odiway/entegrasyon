/**
 * Rules engine — derives uzmanlik, siparis, dagitim, montaj, malzemeNoSap from BOM hierarchy.
 * 
 * Business rules (from documentation section 7 & 8):
 * - Level 0-1: siparis=NA, montaj=NA
 * - Level 2 F: siparis=MONTAJ, starts new montaj group
 * - Level 2 Y/H: siparis=EVET, dagitim=EVET
 * - Level 2 H (under F parent): siparis=EVET
 * - Level 3 F: siparis=MONTAJ (sub-assembly)
 * - Level 3+ follows SIPARIS_MAP / DAGITIM_MAP
 * - Toplam Miktar = qty × all parent quantities (for siparis EVET/KONTROL EDİLECEK)
 */

export const UZMANLIK_KEYWORDS: Record<string, string> = {
  'GÖVDE': 'GÖVDE', 'GOVDE': 'GÖVDE',
  'TRİM': 'TRİM', 'TRIM': 'TRİM',
  'HVAC': 'HVAC',
  'MEKANİK': 'MEKANİK', 'MEKANIK': 'MEKANİK',
  'ELEKTRİK': 'ELEKTRİK', 'ELEKTRIK': 'ELEKTRİK',
};

export const SIPARIS_MAP: Record<string, string> = {
  F: 'MONTAJ', Y: 'EVET', E: 'EVET', H: 'HAYIR', C: 'HAYIR', 'X DETAY': 'HAYIR',
};

export const DAGITIM_MAP: Record<string, string> = {
  F: '', Y: 'EVET', E: 'EVET', H: 'EVET', C: 'EVET', 'X DETAY': '',
};

export const KALEM_TIPI_OPTIONS = ['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'];
export const BIRIM_OPTIONS = ['AD', 'KG', 'M', 'M2', 'L', 'D', 'SET', 'LT'];

export function deriveUzmanlik(level1Title: string): string {
  if (!level1Title) return '';
  // Normalize Turkish chars for reliable matching
  const upper = level1Title.toUpperCase()
    .replace(/İ/g, 'I').replace(/ı/g, 'I')
    .replace(/ö/gi, 'O').replace(/ü/gi, 'U')
    .replace(/ş/gi, 'S').replace(/ç/gi, 'C')
    .replace(/ğ/gi, 'G');
  // Check normalized versions
  if (upper.includes('GOVDE')) return 'GÖVDE';
  if (upper.includes('TRIM')) return 'TRİM';
  if (upper.includes('HVAC')) return 'HVAC';
  if (upper.includes('MEKANIK')) return 'MEKANİK';
  if (upper.includes('ELEKTRIK')) return 'ELEKTRİK';
  return '';
}

export function deriveMalzemeNoSap(title: string, malzemeNo: string, anaMalzeme: string, sapUsage: string): string {
  if (anaMalzeme) {
    const base = anaMalzeme.trim();
    return base.toUpperCase().endsWith('Y') ? base : base + 'Y';
  }
  if (title && title.includes('_') && sapUsage === 'C5P') {
    const base = title.split('_')[0].trim();
    return base.toUpperCase().endsWith('Y') ? base : base + 'Y';
  }
  const base = (malzemeNo || title || '').trim();
  if (!base) return '';
  return base.toUpperCase().endsWith('Y') ? base : base + 'Y';
}

export interface DerivedFields {
  uzmanlik: string;
  montaj: string;
  malzemeNoSap: string;
  siparis: string;
  dagitim: string;
  toplamMiktar: number | null;
  needsReview: boolean;
}

export function applyRules(p: {
  level: number; title: string; malzemeNo: string; anaMalzeme: string;
  sapUsage: string; quantity: number; kalemTipi: string; birim: string;
  level1Title: string; level2Title: string; parentQtyProduct: number;
  level2KalemTipi?: string;
}): DerivedFields {
  const result: DerivedFields = {
    uzmanlik: deriveUzmanlik(p.level1Title),
    montaj: '',
    malzemeNoSap: deriveMalzemeNoSap(p.title, p.malzemeNo, p.anaMalzeme, p.sapUsage),
    siparis: '',
    dagitim: '',
    toplamMiktar: null,
    needsReview: false,
  };

  // Level 0-1: Root / Ana Grup — no siparis, no montaj
  if (p.level <= 1) {
    result.siparis = 'NA';
    result.dagitim = '';
    result.montaj = 'NA';
    return result;
  }

  // Level 2: Montaj/Grup level
  if (p.level === 2) {
    const kt = p.kalemTipi || 'F';
    if (kt === 'F') {
      // F = Montaj group — starts a new montaj, siparis=MONTAJ
      result.siparis = 'MONTAJ';
      result.dagitim = '';
      result.montaj = p.title; // montaj = own title (new group)
    } else if (kt === 'Y' || kt === 'E') {
      result.siparis = 'EVET';
      result.dagitim = 'EVET';
      result.montaj = p.level2Title || p.title;
    } else if (kt === 'H') {
      // H at level 2: siparis=EVET (if parent was F context)
      result.siparis = 'EVET';
      result.dagitim = 'EVET';
      result.montaj = p.level2Title || p.title;
    } else if (kt === 'C') {
      result.siparis = 'HAYIR';
      result.dagitim = 'EVET';
      result.montaj = p.level2Title || p.title;
    } else {
      result.siparis = 'MONTAJ';
      result.dagitim = '';
      result.montaj = p.title;
    }
    return result;
  }

  // Level 3+: Parça/Alt Parça level
  result.montaj = p.level2Title;
  const kt = p.kalemTipi;
  const l2Kt = p.level2KalemTipi || 'F';
  const l2IsF = l2Kt === 'F';

  if (kt) {
    if (kt === 'F') {
      // F at level 3+ = sub-assembly (montaj)
      result.siparis = 'MONTAJ';
      result.dagitim = '';
    } else if (kt.startsWith('X-Kesilerek') || kt === 'Kesilerek kullaniliyor') {
      result.siparis = 'KONTROL EDİLECEK';
      result.dagitim = 'EVET';
      result.needsReview = true;
    } else if (kt === 'Y' || kt === 'E') {
      result.siparis = l2IsF ? 'EVET' : 'EVET';
      result.dagitim = 'EVET';
    } else if (kt === 'H') {
      result.siparis = l2IsF ? 'EVET' : 'HAYIR';
      result.dagitim = 'EVET';
    } else if (kt === 'C') {
      result.siparis = 'HAYIR';
      result.dagitim = 'EVET';
    } else if (kt === 'X DETAY') {
      result.siparis = 'HAYIR';
      result.dagitim = '';
    } else {
      result.siparis = l2IsF ? 'EVET' : 'EVET';
      result.dagitim = 'EVET';
    }
  } else {
    // No kalemTipi — needs review at level 3
    result.siparis = 'EVET';
    result.dagitim = 'EVET';
    if (p.level === 3) result.needsReview = true;
  }

  // Toplam Miktar: for level 3+ when siparis is EVET or KONTROL EDİLECEK
  if (p.level >= 3 && (result.siparis === 'EVET' || result.siparis === 'KONTROL EDİLECEK')) {
    result.toplamMiktar = (p.quantity || 1) * p.parentQtyProduct;
  }

  return result;
}

/** Get a human-readable summary of all rules for the settings page */
export function getRulesSummary() {
  return {
    kalemTipleri: [
      { kod: 'F', anlam: 'Montaj (Fabrication/Assembly)', siparis: 'MONTAJ', dagitim: '—' },
      { kod: 'Y', anlam: 'Satın alınacak (Yapılacak)', siparis: 'EVET', dagitim: 'EVET' },
      { kod: 'E', anlam: 'Temin edilecek', siparis: 'EVET', dagitim: 'EVET' },
      { kod: 'H', anlam: 'Hammadde', siparis: 'HAYIR*', dagitim: 'EVET' },
      { kod: 'C', anlam: 'Customer-supplied', siparis: 'HAYIR', dagitim: 'EVET' },
      { kod: 'X DETAY', anlam: 'Detay çizim', siparis: 'HAYIR', dagitim: '—' },
      { kod: 'X-Kesilerek', anlam: 'Kesilerek kullanılan', siparis: 'KONTROL EDİLECEK', dagitim: 'EVET' },
    ],
    levelKurallari: [
      { level: '0-1', kural: 'Kök/Ana Grup — Sipariş=NA, Montaj=NA, otomatik' },
      { level: '2 (F)', kural: 'Yeni montaj grubu başlatır, Sipariş=MONTAJ' },
      { level: '2 (Y/H)', kural: 'Sipariş=EVET, Dağıtım=EVET' },
      { level: '3 (F)', kural: 'Alt montaj (sub-assembly), Sipariş=MONTAJ' },
      { level: '3+ (Y/E)', kural: 'Sipariş=EVET, Dağıtım=EVET' },
      { level: '3+ (H)', kural: 'Level 2 F altında → EVET, değilse → HAYIR' },
      { level: '4+', kural: 'Level 3 ile aynı kurallar, needs_review=false' },
    ],
    uzmanliklar: Object.values(UZMANLIK_KEYWORDS).filter((v, i, a) => a.indexOf(v) === i),
    birimler: BIRIM_OPTIONS,
    toplamMiktarFormul: 'Quantity × Parent₁.Qty × Parent₂.Qty × ... × ParentN.Qty',
    malzemeNoSapFormul: 'AnaMalzeme > Title (C5P) > MalzemeNo — hepsi + "Y" suffix',
    montajKurali: 'Level 2 F → kendi title\'ı; Level 3+ → son Level 2 title\'ı',
  };
}
