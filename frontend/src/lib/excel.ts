/**
 * Excel parsing and export using ExcelJS.
 * Handles BOM upload parsing and formatted download export.
 */
import ExcelJS from 'exceljs';
import { applyRules, UZMANLIK_KEYWORDS } from './rules';

export interface ParsedRow {
  rowNumber: number;
  level: number;
  title: string;
  revision: string;
  quantity: number;
  description: string;
  maturityState: string;
  owner: string;
  malzemeNo: string;
  sapUsage: string;
  kullanimMiktari: string;
  anaMalzeme: string;
  anaMalzemeGrubu: string;
  projeKodu: string;
  kutle: string;
  kalemTipi: string;
  birim: string;
  // Derived
  uzmanlik: string;
  montaj: string;
  montajNo: string;
  opsStd: string;
  malzemeNoSap: string;
  siparis: string;
  dagitim: string;
  toplamMiktar: number | null;
  needsReview: boolean;
}

// Column indices from PLM export (0-based) — 31+ column standard format
const COL_PLM = {
  level: 0, title: 1, revision: 2, quantity: 3, description: 4,
  maturityState: 5, owner: 6, malzemeNo: 12, sapUsage: 15,
  kullanimMiktari: 27, anaMalzemeGrubu: 28, anaMalzeme: 30,
  projeKodu: 26, kutle: 24, kalemTipi: 31, birim: 32,
  montajNo: -1, siparis: -1, // not present in PLM format
};

// Column indices from Template format (0-based) — ~21 column format
const COL_TPL = {
  level: 0, title: 1, revision: 2, montajNo: 3, quantity: 4,
  description: 5, maturityState: 6, owner: 7,
  siparis: 9, birim: 10, kalemTipi: 14,
  malzemeNo: 17, sapUsage: 18, kullanimMiktari: 19, anaMalzeme: 20,
  // Not present in template
  anaMalzemeGrubu: -1, projeKodu: -1, kutle: -1,
};

function str(v: any): string { return v != null ? String(v).trim() : ''; }
function num(v: any): number { const n = parseFloat(v); return isNaN(n) ? 1 : n; }

function normalizeTr(s: string): string {
  return s.toUpperCase()
    .replace(/İ/g, 'I').replace(/ı/g, 'I')
    .replace(/Ö/g, 'O').replace(/ö/g, 'O')
    .replace(/Ü/g, 'U').replace(/ü/g, 'U')
    .replace(/Ş/g, 'S').replace(/ş/g, 'S')
    .replace(/Ç/g, 'C').replace(/ç/g, 'C')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'G');
}

/** Strip trailing kalem tipi letter from malzeme/montaj No for lookup matching */
function stripTrailing(s: string): string {
  if (!s) return '';
  return s.replace(/[YyXxFfEeHhCc]$/, '');
}

/** Normalize a uzmanlik value against known keywords */
function normalizeUzmanlik(raw: string): string {
  if (!raw) return '';
  const normalized = normalizeTr(raw);
  return UZMANLIK_KEYWORDS[raw] || UZMANLIK_KEYWORDS[normalized]
    || Object.entries(UZMANLIK_KEYWORDS).find(([k]) => normalized.includes(normalizeTr(k)))?.[1]
    || raw;
}

/** Detect format by checking header row keywords */
function detectFormat(worksheet: ExcelJS.Worksheet): 'plm' | 'template' {
  const hRow = worksheet.getRow(1);
  if (!hRow) return 'plm';
  const vals = (hRow.values as any[]) || [];
  const headers = vals.slice(1).map((v: any) => normalizeTr(str(v)));
  // Template format has "Montaj No" at column 4 and fewer columns
  const hasMontajNo = headers.some(h => h.includes('MONTAJ') && h.includes('NO'));
  const hasSiparis = headers.some(h => h === 'SIPARIS' || h.includes('SIPARIS'));
  if (hasMontajNo && hasSiparis) return 'template';
  // PLM format typically has 31+ columns
  if (headers.length > 25) return 'plm';
  return hasMontajNo ? 'template' : 'plm';
}

/** Parse uzmanlik lookup sheet — returns Map<montajNo (stripped) → {uzmanlik, opsStd}> */
function parseUzmanlikSheet(workbook: ExcelJS.Workbook): Map<string, { uzmanlik: string; opsStd: string }> {
  const map = new Map<string, { uzmanlik: string; opsStd: string }>();

  // Find the uzmanlik sheet by name (case-insensitive, Turkish-aware)
  const uzSheet = workbook.worksheets.find(ws => {
    const n = normalizeTr(ws.name);
    return n.includes('UZMANLIK');
  });

  if (!uzSheet) {
    console.log('[Excel Parse] No uzmanlik sheet found in workbook');
    return map;
  }

  console.log(`[Excel Parse] Found uzmanlik sheet: "${uzSheet.name}" with ${uzSheet.rowCount} rows`);

  // Detect column positions from header
  const hVals = (uzSheet.getRow(1).values as any[]) || [];
  let montajCol = -1, uzmanlikCol = -1, opsCol = -1, tanimCol = -1;
  for (let i = 1; i < hVals.length; i++) {
    const h = normalizeTr(str(hVals[i]));
    if (h.includes('MONTAJ') && (h.includes('NO') || h.includes('NUMARA'))) montajCol = i;
    else if (h.includes('UZMANLIK')) uzmanlikCol = i;
    else if (h.includes('OPS') || h.includes('STD') || h.includes('STANDART')) opsCol = i;
    else if (h.includes('TANIM') || h.includes('MONTAJ')) { if (montajCol === -1) montajCol = i; else tanimCol = i; }
  }

  // Fallback to positional if header detection fails
  if (montajCol === -1) montajCol = 1;
  if (uzmanlikCol === -1) uzmanlikCol = 3;
  if (opsCol === -1) opsCol = 4;

  console.log(`[Excel Parse] Uzmanlik sheet columns — montaj:${montajCol}, uzmanlik:${uzmanlikCol}, ops:${opsCol}`);

  uzSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    const vals = row.values as any[];
    const montajNo = str(vals[montajCol]);
    const uzmanlik = normalizeUzmanlik(str(vals[uzmanlikCol]));
    const opsStd = str(vals[opsCol]);

    if (montajNo && uzmanlik) {
      // Store both original and stripped versions for flexible matching
      map.set(montajNo, { uzmanlik, opsStd });
      map.set(stripTrailing(montajNo), { uzmanlik, opsStd });
    }
  });

  console.log(`[Excel Parse] Uzmanlik lookup built: ${map.size} entries`);
  return map;
}

/** Find uzmanlik column in the BOM sheet header */
function findUzmanlikCol(worksheet: ExcelJS.Worksheet): number | null {
  for (let r = 1; r <= Math.min(3, worksheet.rowCount); r++) {
    const headerRow = worksheet.getRow(r);
    if (!headerRow) continue;
    const vals = (headerRow.values as any[]) || [];
    for (let i = 1; i < vals.length; i++) {
      const h = normalizeTr(str(vals[i]));
      if (h === 'UZMANLIK' || h.includes('UZMANLIK')) return i - 1; // 0-based
    }
  }
  return null;
}

/** Main parser — accepts full workbook to handle multi-sheet merging */
export function parseBomWorkbook(workbook: ExcelJS.Workbook): ParsedRow[] {
  // Find the main BOM sheet (first sheet, or one named 'master' / 'BOM')
  const mainSheet = workbook.worksheets.find(ws => {
    const n = normalizeTr(ws.name);
    return n === 'MASTER' || n === 'BOM';
  }) || workbook.worksheets[0];

  if (!mainSheet) return [];

  // Parse uzmanlik lookup from second sheet
  const uzLookup = parseUzmanlikSheet(workbook);

  return parseBomRows(mainSheet, uzLookup);
}

/** Legacy single-sheet parser (kept for backward compat) */
export function parseBomRows(
  worksheet: ExcelJS.Worksheet,
  uzLookup?: Map<string, { uzmanlik: string; opsStd: string }>,
): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let level1Title = '';
  let level2Title = '';
  const parentStack: { level: number; qty: number }[] = [];
  let rowNum = 0;

  // Detect format
  const format = detectFormat(worksheet);
  const COL = format === 'template' ? COL_TPL : COL_PLM;
  console.log(`[Excel Parse] Detected format: ${format}, rowCount: ${worksheet.rowCount}`);

  // Check for inline uzmanlik column
  const uzmanlikCol = findUzmanlikCol(worksheet);
  let lastExcelUzmanlik = '';
  let lastMontajNo = '';

  if (uzmanlikCol !== null) {
    console.log(`[Excel Parse] Inline uzmanlik column at index ${uzmanlikCol}`);
  }

  // Log headers for debugging
  const hRow = worksheet.getRow(1);
  const hVals = (hRow?.values as any[]) || [];
  const headers = hVals.slice(1).map((v: any, i: number) => `${i}:${str(v)}`).filter((s: string) => !s.endsWith(':'));
  console.log(`[Excel Parse] Headers: ${headers.join(', ')}`);

  worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    rowNum++;
    const vals = row.values as any[];
    const v = vals.slice(1); // shift to 0-indexed

    const level = parseInt(str(v[COL.level])) || 0;
    const title = str(v[COL.title]);
    const quantity = num(v[COL.quantity]);
    const malzemeNo = COL.malzemeNo >= 0 ? str(v[COL.malzemeNo]) : '';
    const sapUsage = COL.sapUsage >= 0 ? str(v[COL.sapUsage]) : '';
    const kullanimMiktari = COL.kullanimMiktari >= 0 ? str(v[COL.kullanimMiktari]) : '';
    const anaMalzeme = COL.anaMalzeme >= 0 ? str(v[COL.anaMalzeme]) : '';
    const kalemTipi = COL.kalemTipi >= 0 ? str(v[COL.kalemTipi]) : '';
    const birim = COL.birim >= 0 ? str(v[COL.birim]) : '';
    const montajNo = COL.montajNo >= 0 ? str(v[COL.montajNo]) : '';
    const excelSiparis = (COL as any).siparis >= 0 ? str(v[(COL as any).siparis]) : '';

    // Track montaj no for uzmanlik lookup (propagates to children)
    if (montajNo && montajNo !== 'NA') {
      lastMontajNo = montajNo;
    } else if (level <= 1) {
      lastMontajNo = '';
    }

    // Read uzmanlik from inline column if present
    let excelUzmanlik = uzmanlikCol !== null ? str(v[uzmanlikCol]) : '';
    if (excelUzmanlik) excelUzmanlik = normalizeUzmanlik(excelUzmanlik);
    if (excelUzmanlik) {
      lastExcelUzmanlik = excelUzmanlik;
    } else if (level <= 1) {
      lastExcelUzmanlik = '';
    }

    // Lookup uzmanlik from the uzmanlik sheet by montajNo
    const effectiveMontajNo = montajNo || lastMontajNo;
    let lookupUz = '';
    let lookupOps = '';
    if (uzLookup && effectiveMontajNo) {
      const entry = uzLookup.get(effectiveMontajNo) || uzLookup.get(stripTrailing(effectiveMontajNo));
      if (entry) {
        lookupUz = entry.uzmanlik;
        lookupOps = entry.opsStd;
      }
    }

    if (level === 1) level1Title = title;
    if (level === 2) level2Title = title;

    // Parent stack for quantity calculation
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
      parentStack.pop();
    }
    let parentQtyProduct = 1;
    for (const p of parentStack) parentQtyProduct *= p.qty;

    const derived = applyRules({
      level, title, malzemeNo, anaMalzeme, sapUsage,
      quantity, kalemTipi, birim, level1Title, level2Title, parentQtyProduct,
    });

    // Uzmanlik priority: inline Excel column > uzmanlik sheet lookup > derived from title
    const finalUzmanlik = excelUzmanlik || lastExcelUzmanlik || lookupUz || derived.uzmanlik;
    if (finalUzmanlik) derived.uzmanlik = finalUzmanlik;

    // If template has siparis column and there's a value, use it
    if (excelSiparis && excelSiparis !== 'NA') {
      derived.siparis = excelSiparis;
    }

    rows.push({
      rowNumber: rowNum, level, title,
      revision: str(v[COL.revision]),
      quantity,
      description: COL.description >= 0 ? str(v[COL.description]) : '',
      maturityState: COL.maturityState >= 0 ? str(v[COL.maturityState]) : '',
      owner: COL.owner >= 0 ? str(v[COL.owner]) : '',
      malzemeNo, sapUsage, kullanimMiktari, anaMalzeme,
      anaMalzemeGrubu: (COL as any).anaMalzemeGrubu >= 0 ? str(v[(COL as any).anaMalzemeGrubu]) : '',
      projeKodu: (COL as any).projeKodu >= 0 ? str(v[(COL as any).projeKodu]) : '',
      kutle: (COL as any).kutle >= 0 ? str(v[(COL as any).kutle]) : '',
      kalemTipi: kalemTipi || derived.kalemTipi || '',
      birim: birim || derived.birim || '',
      montajNo: effectiveMontajNo,
      opsStd: lookupOps,
      ...derived,
    });

    parentStack.push({ level, qty: quantity });
  });

  console.log(`[Excel Parse] Parsed ${rows.length} rows, uzmanlik assigned: ${rows.filter(r => r.uzmanlik).length}`);
  return rows;
}

const LEVEL_FILLS: Record<number, string> = {
  0: 'FFD9D9D9', 1: 'FFBDD7EE', 2: 'FF9BC2E6', 3: 'FFC6EFCE',
};

const HEADERS = [
  '#', 'Level', 'Uzmanlık', 'Montaj', 'Title', 'MalzemeNo', 'MalzemeNo SAP',
  'Kalem Tipi', 'Sipariş', 'Dağıtım', 'Birim', 'Quantity', 'ToplamMiktar',
  'Durum', 'Son Güncelleme', 'Güncelleyen',
];

export async function exportProjectExcel(
  projectName: string,
  items: any[],
  changeLogs?: Map<number, any[]>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('BOM');

  // Header row
  ws.addRow(HEADERS);
  const hRow = ws.getRow(1);
  hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  hRow.alignment = { horizontal: 'center' };

  for (const item of items) {
    const row = ws.addRow([
      item.rowNumber, item.level, item.uzmanlik || '', item.montaj || '',
      item.title, item.malzemeNo, item.malzemeNoSap || '',
      item.kalemTipi || '', item.siparis || '', item.dagitim || '',
      item.birim || '', item.quantity, item.toplamMiktar || '',
      item.status || 'active',
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('tr-TR') : '',
      '', // updatedBy name filled by caller
    ]);

    // Level-based coloring
    const fill = LEVEL_FILLS[item.level];
    if (fill) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    }

    // Highlight modified items
    if (item.status === 'modified' || item.updatedAt) {
      row.getCell(14).font = { bold: true, color: { argb: 'FF059669' } };
      row.getCell(15).font = { bold: true, color: { argb: 'FF2563EB' } };
    }
  }

  // Auto-width columns
  ws.columns.forEach((col) => {
    col.width = Math.max(12, ...(col.values?.map(v => String(v || '').length) || [12]));
  });

  // Change history sheet
  if (changeLogs && changeLogs.size > 0) {
    const hs = wb.addWorksheet('Değişiklik Geçmişi');
    hs.addRow(['Satır #', 'Alan', 'Eski Değer', 'Yeni Değer', 'Değiştiren', 'Tarih']);
    const hr = hs.getRow(1);
    hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };

    for (const [bomItemId, logs] of changeLogs) {
      for (const log of logs) {
        hs.addRow([
          log.bomItem?.rowNumber || bomItemId,
          log.fieldName, log.oldValue || '', log.newValue || '',
          log.changedBy?.fullName || '', new Date(log.changedAt).toLocaleDateString('tr-TR'),
        ]);
      }
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
