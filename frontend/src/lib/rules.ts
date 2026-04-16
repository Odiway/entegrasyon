/**
 * Rules engine — derives uzmanlik, siparis, dagitim, montaj, malzemeNoSap from BOM hierarchy.
 * Simplified: kalemTipi comes from the uploaded data, no material master needed.
 */

const UZMANLIK_KEYWORDS: Record<string, string> = {
  'GÖVDE': 'GÖVDE', 'GOVDE': 'GÖVDE',
  'TRİM': 'TRİM', 'TRIM': 'TRİM',
  'HVAC': 'HVAC',
  'MEKANİK': 'MEKANİK', 'MEKANIK': 'MEKANİK',
  'ELEKTRİK': 'ELEKTRİK', 'ELEKTRIK': 'ELEKTRİK',
};

const SIPARIS_MAP: Record<string, string> = {
  F: 'MONTAJ', Y: 'EVET', E: 'EVET', H: 'HAYIR', C: 'HAYIR', 'X DETAY': 'HAYIR',
};

const DAGITIM_MAP: Record<string, string> = {
  F: '', Y: 'EVET', E: 'EVET', H: 'EVET', C: 'EVET', 'X DETAY': '',
};

export function deriveUzmanlik(level1Title: string): string {
  if (!level1Title) return '';
  const upper = level1Title.toUpperCase();
  for (const [kw, val] of Object.entries(UZMANLIK_KEYWORDS)) {
    if (upper.includes(kw)) return val;
  }
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

  if (p.level <= 1) {
    result.siparis = 'NA';
    result.dagitim = '';
    result.montaj = 'NA';
    return result;
  }

  if (p.level === 2) {
    const kt = p.kalemTipi || 'F';
    if (kt === 'Y' || kt === 'H') {
      result.siparis = 'EVET';
      result.dagitim = 'EVET';
    } else {
      result.siparis = 'MONTAJ';
      result.dagitim = '';
    }
    result.montaj = kt === 'F' ? p.title : p.level2Title;
    return result;
  }

  // Level 3+
  result.montaj = p.level2Title;
  const kt = p.kalemTipi;

  if (kt) {
    if (kt === 'F') {
      result.siparis = 'MONTAJ';
      result.dagitim = '';
    } else if (kt.startsWith('X-Kesilerek') || kt === 'Kesilerek kullaniliyor') {
      result.siparis = 'KONTROL EDİLECEK';
      result.dagitim = 'EVET';
      result.needsReview = true;
    } else if (SIPARIS_MAP[kt]) {
      result.siparis = SIPARIS_MAP[kt];
      result.dagitim = DAGITIM_MAP[kt] || '';
    } else {
      result.siparis = 'EVET';
      result.dagitim = 'EVET';
    }
  } else {
    result.siparis = 'EVET';
    result.dagitim = 'EVET';
    if (p.level === 3) result.needsReview = true;
  }

  if (p.level >= 3 && (result.siparis === 'EVET' || result.siparis === 'KONTROL EDİLECEK')) {
    result.toplamMiktar = (p.quantity || 1) * p.parentQtyProduct;
  }

  return result;
}
