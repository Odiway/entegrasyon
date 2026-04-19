/**
 * Rules engine — derives uzmanlik, siparis, dagitim, montaj, malzemeNoSap from BOM hierarchy.
 *
 * Sipariş rules (context-dependent, applied in excel.ts row loop):
 * - Level 0: sipariş=NA
 * - Level 1: sipariş=MONTAJ
 * - Level 2 F: sipariş=MONTAJ (starts F-montaj group, children L3→EVET)
 * - Level 2 Y: sipariş=EVET
 * - Level 2 H: sipariş=Dağıtım (EVET)
 * - Level 2 non-F under F-montaj: sipariş=EVET, but its L3 children→HAYIR
 * - Level 3 F: sipariş=MONTAJ (starts sub-F group, children L4→EVET)
 * - Level 3 Y/H (no F-montaj parent): sipariş=HAYIR
 * - Level 5+: sipariş=HAYIR
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

  // Montaj derivation (non-context-dependent part)
  if (p.level <= 1) {
    result.montaj = 'NA';
  } else if (p.level === 2 && (p.kalemTipi === 'F' || !p.kalemTipi)) {
    result.montaj = p.title;
  } else {
    result.montaj = p.level2Title;
  }

  // Sipariş/Dağıtım are now computed in parseBomRows row loop (context-dependent)
  // Only set needsReview for "Kesilerek" kalemTipi here
  const kt = p.kalemTipi;
  if (kt && (kt.startsWith('X-Kesilerek') || kt === 'Kesilerek kullaniliyor')) {
    result.needsReview = true;
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
      { level: '0', kural: 'Sipariş=NA' },
      { level: '1', kural: 'Sipariş=MONTAJ' },
      { level: '2 (F)', kural: 'Sipariş=MONTAJ — yeni montaj grubu, altındaki L3→EVET' },
      { level: '2 (Y)', kural: 'Sipariş=EVET' },
      { level: '2 (H)', kural: 'Sipariş=EVET (Dağıtım)' },
      { level: '2 (non-F, F-montaj altında)', kural: 'Sipariş=EVET, ama L3 çocukları→HAYIR' },
      { level: '3 (F)', kural: 'Sipariş=MONTAJ — altındaki L4→EVET' },
      { level: '3 (Y/H, F-montaj altında)', kural: 'Sipariş=EVET' },
      { level: '3 (Y/H, F-montaj dışı)', kural: 'Sipariş=HAYIR' },
      { level: '5-6-7', kural: 'Sipariş=HAYIR' },
    ],
    uzmanliklar: Object.values(UZMANLIK_KEYWORDS).filter((v, i, a) => a.indexOf(v) === i),
    birimler: BIRIM_OPTIONS,
    toplamMiktarFormul: 'Quantity × Parent₁.Qty × Parent₂.Qty × ... × ParentN.Qty',
    malzemeNoSapFormul: 'AnaMalzeme > Title (C5P) > MalzemeNo — hepsi + "Y" suffix',
    montajKurali: 'Level 2 F → kendi title\'ı; Level 3+ → son Level 2 title\'ı',
  };
}
