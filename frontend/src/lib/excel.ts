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
  prototip2: string;
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

/** Parse uzmanlik lookup sheet — returns Map<montajNo (stripped) → {uzmanlik, opsStd, prototip2}> */
function parseUzmanlikSheet(workbook: ExcelJS.Workbook): Map<string, { uzmanlik: string; opsStd: string; prototip2: string }> {
  const map = new Map<string, { uzmanlik: string; opsStd: string; prototip2: string }>();

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
  let montajCol = -1, uzmanlikCol = -1, opsCol = -1, tanimCol = -1, protoCol = -1;
  for (let i = 1; i < hVals.length; i++) {
    const h = normalizeTr(str(hVals[i]));
    if (h.includes('MONTAJ') && (h.includes('NO') || h.includes('NUMARA'))) montajCol = i;
    else if (h.includes('UZMANLIK')) uzmanlikCol = i;
    else if (h.includes('OPS') || h.includes('STD') || h.includes('STANDART')) opsCol = i;
    else if (h.includes('PROTO')) protoCol = i;
    else if (h.includes('TANIM') || h.includes('MONTAJ')) { if (montajCol === -1) montajCol = i; else tanimCol = i; }
  }

  // Fallback to positional if header detection fails
  if (montajCol === -1) montajCol = 1;
  if (uzmanlikCol === -1) uzmanlikCol = 4;
  if (opsCol === -1) opsCol = 3;

  console.log(`[Excel Parse] Uzmanlik sheet columns — montaj:${montajCol}, uzmanlik:${uzmanlikCol}, ops:${opsCol}, proto:${protoCol}`);

  uzSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    const vals = row.values as any[];
    const montajNo = str(vals[montajCol]);
    const uzmanlik = normalizeUzmanlik(str(vals[uzmanlikCol]));
    const opsStd = str(vals[opsCol]);
    const prototip2 = protoCol >= 0 ? str(vals[protoCol]).toUpperCase() : '';

    if (montajNo && uzmanlik) {
      const entry = { uzmanlik, opsStd, prototip2: prototip2 === 'X' ? 'X' : '' };
      // Store both original and stripped versions for flexible matching
      map.set(montajNo, entry);
      map.set(stripTrailing(montajNo), entry);
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
  uzLookup?: Map<string, { uzmanlik: string; opsStd: string; prototip2: string }>,
): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let level1Title = '';
  let level2Title = '';
  const parentStack: { level: number; qty: number }[] = [];
  let rowNum = 0;

  // Sipariş context tracking
  // "underL2F" = we're currently under a Level 2 F-montaj group
  // "lastL2IsF" = the most recent Level 2 had kalemTipi=F
  // "underL3F" = we're currently under a Level 3 F sub-montaj
  let lastL2IsF = false;
  let underL2NonF = false; // L2 non-F under a F-montaj context → children get HAYIR
  let lastL3IsF = false;
  let underL3NonF = false;

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

    // Lookup uzmanlik/opsStd/prototip2 from the uzmanlik sheet by montajNo
    const effectiveMontajNo = montajNo || lastMontajNo;
    let lookupUz = '';
    let lookupOps = '';
    let lookupProto = '';
    if (uzLookup && effectiveMontajNo) {
      const entry = uzLookup.get(effectiveMontajNo) || uzLookup.get(stripTrailing(effectiveMontajNo));
      if (entry) {
        lookupUz = entry.uzmanlik;
        lookupOps = entry.opsStd;
        lookupProto = entry.prototip2;
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

    // ───── SIPARIŞ RULES (context-dependent) ─────
    const kt = kalemTipi || derived.kalemTipi || '';
    let siparis = '';
    let dagitim = '';

    if (level === 0) {
      siparis = 'NA';
    } else if (level === 1) {
      siparis = 'MONTAJ';
    } else if (level === 2) {
      if (kt === 'F') {
        siparis = 'MONTAJ';
        lastL2IsF = true;
        underL2NonF = false;
        // reset L3 state
        lastL3IsF = false;
        underL3NonF = false;
      } else if (kt === 'Y' || kt === 'E') {
        siparis = 'EVET';
        dagitim = 'EVET';
        // Non-F under F-montaj: children L3 → HAYIR
        if (lastL2IsF) underL2NonF = true;
        else underL2NonF = false;
        lastL3IsF = false;
        underL3NonF = false;
      } else if (kt === 'H') {
        siparis = 'EVET';
        dagitim = 'EVET';
        if (lastL2IsF) underL2NonF = true;
        else underL2NonF = false;
        lastL3IsF = false;
        underL3NonF = false;
      } else if (kt === 'C') {
        siparis = 'HAYIR';
        dagitim = 'EVET';
        lastL3IsF = false;
        underL3NonF = false;
      } else {
        // Default L2 with no/unknown kalem tipi
        siparis = 'MONTAJ';
        lastL2IsF = true;
        underL2NonF = false;
        lastL3IsF = false;
        underL3NonF = false;
      }
    } else if (level === 3) {
      if (kt === 'F') {
        siparis = 'MONTAJ';
        lastL3IsF = true;
        underL3NonF = false;
      } else if (underL2NonF) {
        // L3 under a non-F L2 (which itself is under an F-montaj) → HAYIR
        siparis = 'HAYIR';
        dagitim = kt === 'Y' || kt === 'H' || kt === 'E' ? 'EVET' : '';
      } else if (lastL2IsF) {
        // L3 directly under L2-F montaj → EVET
        siparis = 'EVET';
        dagitim = 'EVET';
        // Track if this L3 is non-F for L4 children
        if (kt !== 'F') underL3NonF = true;
      } else {
        // L3 Y/H outside F-montaj → HAYIR
        siparis = (kt === 'Y' || kt === 'H') ? 'HAYIR' : 'HAYIR';
        dagitim = (kt === 'Y' || kt === 'H' || kt === 'E') ? 'EVET' : '';
      }
    } else if (level === 4) {
      if (kt === 'F') {
        siparis = 'MONTAJ';
      } else if (underL3NonF || underL2NonF) {
        // L4 under non-F L3 or non-F L2 → HAYIR
        siparis = 'HAYIR';
        dagitim = (kt === 'Y' || kt === 'H' || kt === 'E') ? 'EVET' : '';
      } else if (lastL3IsF || lastL2IsF) {
        // L4 under L3-F or L2-F → EVET
        siparis = 'EVET';
        dagitim = 'EVET';
      } else {
        siparis = (kt === 'Y' || kt === 'H') ? 'HAYIR' : 'HAYIR';
        dagitim = (kt === 'Y' || kt === 'H' || kt === 'E') ? 'EVET' : '';
      }
    } else {
      // Level 5, 6, 7+ → HAYIR
      siparis = 'HAYIR';
    }

    // Kesilerek kullanılan → KONTROL EDİLECEK
    if (kt.startsWith('X-Kesilerek') || kt === 'Kesilerek kullaniliyor') {
      siparis = 'KONTROL EDİLECEK';
      dagitim = 'EVET';
    }

    derived.siparis = siparis;
    derived.dagitim = dagitim;

    // Toplam Miktar: for level 3+ when siparis is EVET or KONTROL EDİLECEK
    if (level >= 3 && (siparis === 'EVET' || siparis === 'KONTROL EDİLECEK')) {
      derived.toplamMiktar = (quantity || 1) * parentQtyProduct;
    }

    const finalKalemTipi = kalemTipi || derived.kalemTipi || '';
    const finalBirim = birim || derived.birim || '';

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
      kalemTipi: finalKalemTipi,
      birim: finalBirim,
      montajNo: effectiveMontajNo,
      opsStd: lookupOps,
      prototip2: lookupProto,
      ...derived,
    });

    parentStack.push({ level, qty: quantity });
  });

  console.log(`[Excel Parse] Parsed ${rows.length} rows, uzmanlik assigned: ${rows.filter(r => r.uzmanlik).length}`);
  return rows;
}

// ────────────────────────────────────────────────────────────
// EXPORT HELPERS & PALETTES
// ────────────────────────────────────────────────────────────

/** Level-based background ARGB colours (BOM sheet) */
const LEVEL_FILLS: Record<number, string> = {
  0: 'FF2D3748', // very dark – assembly root
  1: 'FF1E3A5F', // dark blue
  2: 'FF1B4F72', // medium blue
  3: 'FF196F3D', // dark green
  4: 'FF6B2D8B', // purple
};

/** Level-based text colours (BOM sheet) */
const LEVEL_TEXT: Record<number, string> = {
  0: 'FFFFFFFF',
  1: 'FFFFFFFF',
  2: 'FFFFFFFF',
  3: 'FFFFFFFF',
  4: 'FFFFFFFF',
};

/** Rotating palette for uzmanlık groups (stat sheet) */
const UZMANLIK_PALETTE = [
  'FF2E86C1', 'FF1E8449', 'FF884EA0', 'FF117A65',
  'FFB7950B', 'FF922B21', 'FF1A5276', 'FF4D5656',
  'FF76448A', 'FF1F618D', 'FF148F77', 'FF196F3D',
  'FF935116', 'FF7D6608', 'FF6E2F1A', 'FF1A237E',
];

/** Kalem tipi accent colours */
const KALEM_FILLS: Record<string, string> = {
  F: 'FFDFF0FF', // light blue  – montaj
  H: 'FFFFF3CD', // light yellow – half
  Y: 'FFE8F5E9', // light green  – yedek
  E: 'FFFCE4EC', // light pink   – electronic
  X: 'FFF3E5F5', // light purple
  C: 'FFFFEBEE', // light red
};

/** Sipariş durumu colours (cell) */
const SIPARIS_FILL: Record<string, string> = {
  'SİPARİŞ EDİLECEK': 'FFE8F5E9',
  'SİPARİŞ EDİLMEYECEK': 'FFFCE4EC',
};

const BOM_HEADERS = [
  '#', 'Level', 'Uzmanlık', 'Montaj', 'Title',
  'MalzemeNo', 'MalzemeNo SAP',
  'Kalem Tipi', 'Sipariş', 'Dağıtım', 'Birim',
  'Qty', 'Toplam Miktar',
  'Durum', 'Son Güncelleme',
];

function autoWidth(ws: ExcelJS.Worksheet, minW = 10, maxW = 50) {
  ws.columns.forEach((col) => {
    const lengths = ((col.values as any[]) || [])
      .filter((v) => v != null)
      .map((v) => String(v).length);
    col.width = lengths.length > 0 ? Math.min(maxW, Math.max(minW, ...lengths)) : minW;
  });
}

function sectionTitle(ws: ExcelJS.Worksheet, text: string, cols: number, color = 'FF1F2937') {
  const rowIdx = ws.rowCount + 2;
  ws.mergeCells(rowIdx, 1, rowIdx, cols);
  const r = ws.getRow(rowIdx);
  r.getCell(1).value = text;
  r.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  r.height = 22;
  return rowIdx + 1; // next free row
}

function tableHeader(ws: ExcelJS.Worksheet, headers: string[], startRow: number, color = 'FF2C3E50') {
  const r = ws.getRow(startRow);
  headers.forEach((h, i) => {
    const c = r.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  ws.getRow(startRow).height = 18;
}

function dataCell(ws: ExcelJS.Worksheet, rowIdx: number, colIdx: number, value: any, opts?: {
  bg?: string; textColor?: string; bold?: boolean; align?: ExcelJS.Alignment['horizontal'];
}) {
  const c = ws.getRow(rowIdx).getCell(colIdx);
  c.value = value;
  if (opts?.bg) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
  c.font = { bold: opts?.bold ?? false, color: { argb: opts?.textColor ?? 'FF1F2937' }, size: 10 };
  c.alignment = { horizontal: opts?.align ?? 'center', vertical: 'middle' };
  c.border = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  };
  return c;
}

// ────────────────────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ────────────────────────────────────────────────────────────
export async function exportProjectExcel(
  projectName: string,
  items: any[],
  changeLogs?: Map<number, any[]>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TEMSA PLM Entegrasyon';
  wb.created = new Date();

  // ── 1. BOM SHEET ─────────────────────────────────────────
  const ws = wb.addWorksheet('BOM', { views: [{ state: 'frozen', ySplit: 1 }] });

  // Project name banner
  ws.mergeCells('A1:O1');
  const banner = ws.getRow(1);
  banner.getCell(1).value = projectName;
  banner.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  banner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };
  banner.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  banner.height = 28;

  // Header row
  const hRowIdx = 2;
  tableHeader(ws, BOM_HEADERS, hRowIdx, 'FF1A252F');
  ws.getRow(hRowIdx).height = 20;

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 2 }];

  let dataRow = 3;
  for (const item of items) {
    const r = ws.getRow(dataRow);

    const lvl: number = item.level ?? 0;
    const kalemTipi: string = (item.kalemTipi || '').toUpperCase();
    const siparisVal: string = (item.siparis || '').toUpperCase().trim();

    // Base fill: level or kalemTipi
    let baseBg = KALEM_FILLS[kalemTipi] || 'FFFFFFFF';
    let textCol = 'FF1F2937';

    // Level 0-2 override with stronger colours
    if (lvl <= 2) {
      baseBg = LEVEL_FILLS[lvl] || baseBg;
      textCol = 'FFFFFFFF';
    }

    const cells = [
      item.rowNumber, lvl, item.uzmanlik || '', item.montaj || '',
      item.title, item.malzemeNo || '', item.malzemeNoSap || '',
      kalemTipi, item.siparis || '', item.dagitim || '',
      item.birim || '',
      typeof item.quantity === 'number' ? item.quantity : 1,
      item.toplamMiktar != null ? item.toplamMiktar : '',
      item.status || 'active',
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('tr-TR') : '',
    ];

    cells.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c.font = { color: { argb: textCol }, bold: lvl <= 1, size: 10 };
      c.border = {
        bottom: { style: 'hair', color: { argb: 'FFB0B0B0' } },
        right: { style: 'hair', color: { argb: 'FFB0B0B0' } },
      };
      c.alignment = { vertical: 'middle', horizontal: i <= 1 ? 'center' : 'left' };
    });

    // Level indent in Title cell
    const titleCell = r.getCell(5);
    titleCell.alignment = { indent: Math.max(0, lvl - 1), vertical: 'middle', horizontal: 'left' };

    // Sipariş colouring
    const sipCell = r.getCell(9);
    const sipBg = SIPARIS_FILL[siparisVal];
    if (sipBg && lvl > 2) {
      sipCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sipBg } };
      sipCell.font = {
        bold: true,
        color: { argb: siparisVal.includes('EDİLECEK') && !siparisVal.includes('MEY') ? 'FF1A6B3A' : 'FF8B0000' },
        size: 10,
      };
    }

    // Modified status highlight
    if (item.status === 'modified') {
      r.getCell(14).font = { bold: true, color: { argb: 'FF059669' }, size: 10 };
    } else if (item.status === 'flagged') {
      r.getCell(14).font = { bold: true, color: { argb: 'FFDC2626' }, size: 10 };
    }

    r.height = 16;
    dataRow++;
  }

  autoWidth(ws, 8, 55);
  // Fixed widths for known columns
  ws.getColumn(1).width = 6;  // #
  ws.getColumn(2).width = 7;  // Level
  ws.getColumn(8).width = 11; // Kalem Tipi
  ws.getColumn(9).width = 22; // Sipariş
  ws.getColumn(11).width = 8; // Birim
  ws.getColumn(12).width = 8; // Qty
  ws.getColumn(13).width = 14;// Toplam Miktar

  // ── 2. İSTATİSTİKLER SHEET ───────────────────────────────
  const ss = wb.addWorksheet('İstatistikler', { views: [{ showGridLines: false }] });

  // Compute all stats
  const totalItems = items.length;
  const levelCounts: Record<number, number> = {};
  const statusCounts: Record<string, number> = { active: 0, modified: 0, flagged: 0 };
  const kalemTipiByLevel: Record<string, Record<string, number>> = {}; // level → kalemTipi → count
  const siparisStats: Record<number, { edilecek: number; edilmeyecek: number; bos: number }> = {};
  const uzmanlikStats: Record<string, {
    total: number; byLevel: Record<number, number>;
    edilecek: number; edilmeyecek: number;
    byKalemTipi: Record<string, number>;
  }> = {};
  const montajStats: Record<string, { total: number; edilecek: number; edilmeyecek: number }> = {};
  let needsReviewCount = 0;

  for (const item of items) {
    const lvl: number = item.level ?? 0;
    const kt = (item.kalemTipi || '').toUpperCase() || 'Boş';
    const sip = (item.siparis || '').toUpperCase().trim();
    const uzm = item.uzmanlik || 'Belirsiz';
    const montaj = item.montaj || '';
    const status = item.status || 'active';

    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    if (item.needsReview) needsReviewCount++;

    // Kalem tipi × level
    const lvlKey = String(lvl);
    if (!kalemTipiByLevel[lvlKey]) kalemTipiByLevel[lvlKey] = {};
    kalemTipiByLevel[lvlKey][kt] = (kalemTipiByLevel[lvlKey][kt] || 0) + 1;

    // Sipariş stats per level (only for items that have sipariş field)
    if (!siparisStats[lvl]) siparisStats[lvl] = { edilecek: 0, edilmeyecek: 0, bos: 0 };
    if (sip.includes('EDİLECEK') && !sip.includes('MEY')) siparisStats[lvl].edilecek++;
    else if (sip.includes('EDİLMEYECEK')) siparisStats[lvl].edilmeyecek++;
    else siparisStats[lvl].bos++;

    // Uzmanlık stats
    if (!uzmanlikStats[uzm]) {
      uzmanlikStats[uzm] = { total: 0, byLevel: {}, edilecek: 0, edilmeyecek: 0, byKalemTipi: {} };
    }
    uzmanlikStats[uzm].total++;
    uzmanlikStats[uzm].byLevel[lvl] = (uzmanlikStats[uzm].byLevel[lvl] || 0) + 1;
    if (sip.includes('EDİLECEK') && !sip.includes('MEY')) uzmanlikStats[uzm].edilecek++;
    else if (sip.includes('EDİLMEYECEK')) uzmanlikStats[uzm].edilmeyecek++;
    uzmanlikStats[uzm].byKalemTipi[kt] = (uzmanlikStats[uzm].byKalemTipi[kt] || 0) + 1;

    // Montaj (level 1-2 items that have a montaj code)
    if (montaj && lvl <= 2) {
      if (!montajStats[montaj]) montajStats[montaj] = { total: 0, edilecek: 0, edilmeyecek: 0 };
      montajStats[montaj].total++;
    }
  }

  // Also count montaj children sipariş
  for (const item of items) {
    const montaj = item.montaj || '';
    const sip = (item.siparis || '').toUpperCase().trim();
    if (montaj && montajStats[montaj]) {
      if (sip.includes('EDİLECEK') && !sip.includes('MEY')) montajStats[montaj].edilecek++;
      else if (sip.includes('EDİLMEYECEK')) montajStats[montaj].edilmeyecek++;
    }
  }

  const allLevels = [...new Set(items.map(i => i.level ?? 0))].sort((a, b) => a - b);
  const allKalemTipis = [...new Set(items.map(i => (i.kalemTipi || '').toUpperCase() || 'Boş'))].sort();
  const uzmanlikList = Object.entries(uzmanlikStats).sort((a, b) => b[1].total - a[1].total);
  const montajList = Object.entries(montajStats).sort((a, b) => b[1].total - a[1].total);

  // ── SECTION 1: PROJE BAŞLIĞI ──────────────────────────────
  ss.mergeCells('A1:L1');
  const ssBanner = ss.getRow(1);
  ssBanner.getCell(1).value = `📊 ${projectName} — Proje İstatistikleri`;
  ssBanner.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  ssBanner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };
  ssBanner.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  ssBanner.height = 36;

  ss.mergeCells('A2:L2');
  const dateRow = ss.getRow(2);
  dateRow.getCell(1).value = `Oluşturulma: ${new Date().toLocaleString('tr-TR')}  |  Toplam Kalem: ${totalItems}`;
  dateRow.getCell(1).font = { size: 10, color: { argb: 'FF555555' }, italic: true };
  dateRow.getCell(1).alignment = { horizontal: 'center' };
  dateRow.height = 16;

  let nextRow = 4;

  // ── SECTION 2: GENEL ÖZET ─────────────────────────────────
  nextRow = sectionTitle(ss, '  GENEL ÖZET', 6, 'FF1A252F');

  const summaryHeaders = ['Metrik', 'Değer', '', 'Metrik', 'Değer', ''];
  tableHeader(ss, summaryHeaders, nextRow, 'FF2C3E50');
  nextRow++;

  const summaryLeft: [string, any][] = [
    ['Toplam Kalem', totalItems],
    ['Aktif Kalem', statusCounts['active'] || 0],
    ['Güncellenmiş Kalem', statusCounts['modified'] || 0],
    ['İşaretli (Flagged)', statusCounts['flagged'] || 0],
    ['İnceleme Bekleyen', needsReviewCount],
  ];

  const levelKeys = Object.keys(levelCounts).map(Number).sort((a, b) => a - b);
  const summaryRight: [string, any][] = levelKeys.map(l => [`Level ${l} Kalem Sayısı`, levelCounts[l]]);
  summaryRight.push(['Farklı Uzmanlık Grubu', uzmanlikList.length]);
  summaryRight.push(['Farklı Kalem Tipi', allKalemTipis.length]);

  const summaryRows = Math.max(summaryLeft.length, summaryRight.length);
  for (let i = 0; i < summaryRows; i++) {
    const even = i % 2 === 0;
    const rowBg = even ? 'FFF5F5F5' : 'FFFFFFFF';
    if (summaryLeft[i]) {
      dataCell(ss, nextRow, 1, summaryLeft[i][0], { bg: rowBg, align: 'left', bold: false });
      dataCell(ss, nextRow, 2, summaryLeft[i][1], { bg: 'FFE8F5E9', bold: true, textColor: 'FF1A6B3A' });
    }
    if (summaryRight[i]) {
      dataCell(ss, nextRow, 4, summaryRight[i][0], { bg: rowBg, align: 'left', bold: false });
      dataCell(ss, nextRow, 5, summaryRight[i][1], { bg: 'FFDBEAFE', bold: true, textColor: 'FF1D4ED8' });
    }
    ss.getRow(nextRow).height = 17;
    nextRow++;
  }
  nextRow += 2;

  // ── SECTION 3: UZMANILIK BAZLI ANALİZ ─────────────────────
  nextRow = sectionTitle(ss, '  UZMANLIK BAZLI ANALİZ', 10, 'FF1B4F72');

  const uzm_cols = [
    'Uzmanlık', 'Toplam', ...levelKeys.map(l => `L${l}`),
    'Sipariş Edilecek', 'Sipariş Edilmeyecek', 'F (Montaj)', 'H', 'Diğer KT',
  ];
  tableHeader(ss, uzm_cols, nextRow, 'FF1B4F72');
  nextRow++;

  uzmanlikList.forEach(([uzm, stat], idx) => {
    const palBg = UZMANLIK_PALETTE[idx % UZMANLIK_PALETTE.length];
    const lightBg = 'FFF8F9FA';
    const even = idx % 2 === 0;
    const rowBg = even ? 'FFF0F4FF' : 'FFFFFFFF';

    dataCell(ss, nextRow, 1, uzm, { bg: palBg, textColor: 'FFFFFFFF', bold: true, align: 'left' });
    dataCell(ss, nextRow, 2, stat.total, { bg: rowBg, bold: true });

    levelKeys.forEach((l, i) => {
      dataCell(ss, nextRow, 3 + i, stat.byLevel[l] || 0, { bg: rowBg });
    });

    const colOffset = 3 + levelKeys.length;
    dataCell(ss, nextRow, colOffset, stat.edilecek, { bg: 'FFE8F5E9', textColor: 'FF1A6B3A', bold: stat.edilecek > 0 });
    dataCell(ss, nextRow, colOffset + 1, stat.edilmeyecek, { bg: 'FFFCE4EC', textColor: 'FF8B0000', bold: stat.edilmeyecek > 0 });
    dataCell(ss, nextRow, colOffset + 2, stat.byKalemTipi['F'] || 0, { bg: 'FFDFF0FF', textColor: 'FF1D4ED8' });
    dataCell(ss, nextRow, colOffset + 3, stat.byKalemTipi['H'] || 0, { bg: 'FFFFF3CD', textColor: 'FF92400E' });
    const digerKT = stat.total - (stat.byKalemTipi['F'] || 0) - (stat.byKalemTipi['H'] || 0);
    dataCell(ss, nextRow, colOffset + 4, digerKT, { bg: lightBg });

    ss.getRow(nextRow).height = 17;
    nextRow++;
  });
  nextRow += 2;

  // ── SECTION 4: LEVEL × KALEM TİPİ MATRİSİ ───────────────
  nextRow = sectionTitle(ss, '  LEVEL × KALEM TİPİ MATRİSİ', allKalemTipis.length + 3, 'FF196F3D');

  const ktHeaders = ['Level', 'Toplam Level', ...allKalemTipis, 'Diğer'];
  tableHeader(ss, ktHeaders, nextRow, 'FF196F3D');
  nextRow++;

  for (const lvl of allLevels) {
    const lvlData = kalemTipiByLevel[String(lvl)] || {};
    const lvlTotal = levelCounts[lvl] || 0;
    const even = allLevels.indexOf(lvl) % 2 === 0;
    const rowBg = even ? 'FFF0FFF4' : 'FFFFFFFF';

    dataCell(ss, nextRow, 1, `Level ${lvl}`, { bg: LEVEL_FILLS[lvl] || 'FF666666', textColor: 'FFFFFFFF', bold: true, align: 'center' });
    dataCell(ss, nextRow, 2, lvlTotal, { bg: rowBg, bold: true });

    let knownSum = 0;
    allKalemTipis.forEach((kt, i) => {
      const cnt = lvlData[kt] || 0;
      knownSum += cnt;
      const ktBg = cnt > 0 ? (KALEM_FILLS[kt] || rowBg) : rowBg;
      dataCell(ss, nextRow, 3 + i, cnt > 0 ? cnt : '–', { bg: ktBg, bold: cnt > 0 });
    });

    dataCell(ss, nextRow, 3 + allKalemTipis.length, lvlTotal - knownSum || '–', { bg: rowBg });
    ss.getRow(nextRow).height = 17;
    nextRow++;
  }
  nextRow += 2;

  // ── SECTION 5: SİPARİŞ DURUMU LEVEL BAZLI ─────────────────
  nextRow = sectionTitle(ss, '  SİPARİŞ DURUMU — LEVEL BAZLI', 6, 'FF884EA0');

  tableHeader(ss, ['Level', 'Sipariş Edilecek', 'Sipariş Edilmeyecek', 'Belirtilmemiş', 'Toplam', 'Sipariş %'], nextRow, 'FF884EA0');
  nextRow++;

  for (const lvl of allLevels) {
    const s = siparisStats[lvl] || { edilecek: 0, edilmeyecek: 0, bos: 0 };
    const total = s.edilecek + s.edilmeyecek + s.bos;
    const pct = total > 0 ? Math.round((s.edilecek / total) * 100) : 0;
    const even = allLevels.indexOf(lvl) % 2 === 0;
    const rowBg = even ? 'FFF9F0FF' : 'FFFFFFFF';

    dataCell(ss, nextRow, 1, `Level ${lvl}`, { bg: LEVEL_FILLS[lvl] || 'FF666666', textColor: 'FFFFFFFF', bold: true, align: 'center' });
    dataCell(ss, nextRow, 2, s.edilecek, { bg: s.edilecek > 0 ? 'FFE8F5E9' : rowBg, textColor: 'FF1A6B3A', bold: s.edilecek > 0 });
    dataCell(ss, nextRow, 3, s.edilmeyecek, { bg: s.edilmeyecek > 0 ? 'FFFCE4EC' : rowBg, textColor: 'FF8B0000', bold: s.edilmeyecek > 0 });
    dataCell(ss, nextRow, 4, s.bos || '–', { bg: rowBg, textColor: 'FF888888' });
    dataCell(ss, nextRow, 5, total, { bg: rowBg, bold: true });
    dataCell(ss, nextRow, 6, `%${pct}`, { bg: pct > 50 ? 'FFE8F5E9' : pct > 0 ? 'FFFFF3CD' : rowBg, bold: true, textColor: pct > 50 ? 'FF1A6B3A' : 'FF92400E' });

    ss.getRow(nextRow).height = 17;
    nextRow++;
  }
  nextRow += 2;

  // ── SECTION 6: MONTAJ BAZLI ÖZET ─────────────────────────
  if (montajList.length > 0) {
    nextRow = sectionTitle(ss, '  MONTAJ BAZLI ÖZET (Level ≤ 2)', 5, 'FF117A65');

    tableHeader(ss, ['Montaj No', 'Kayıtlı Alt Kalem', 'Sipariş Edilecek', 'Sipariş Edilmeyecek', 'Oran %'], nextRow, 'FF117A65');
    nextRow++;

    montajList.forEach(([montaj, stat], idx) => {
      const total = stat.edilecek + stat.edilmeyecek;
      const pct = total > 0 ? Math.round((stat.edilecek / total) * 100) : 0;
      const rowBg = idx % 2 === 0 ? 'FFF0FDFA' : 'FFFFFFFF';

      dataCell(ss, nextRow, 1, montaj, { bg: 'FF0E6655', textColor: 'FFFFFFFF', bold: true, align: 'left' });
      dataCell(ss, nextRow, 2, stat.total, { bg: rowBg, bold: true });
      dataCell(ss, nextRow, 3, stat.edilecek, { bg: stat.edilecek > 0 ? 'FFE8F5E9' : rowBg, textColor: 'FF1A6B3A' });
      dataCell(ss, nextRow, 4, stat.edilmeyecek, { bg: stat.edilmeyecek > 0 ? 'FFFCE4EC' : rowBg, textColor: 'FF8B0000' });
      dataCell(ss, nextRow, 5, total > 0 ? `%${pct}` : '–', { bg: rowBg, bold: true });

      ss.getRow(nextRow).height = 17;
      nextRow++;
    });
    nextRow += 2;
  }

  // ── SECTION 7: UZMANILIK × LEVEL DETAYİ (SİPARİŞ) ────────
  nextRow = sectionTitle(ss, '  UZMANLIK × LEVEL DETAYLI SİPARİŞ ANALİZİ', allLevels.length * 2 + 2, 'FFB7950B');

  const detailHeaders = ['Uzmanlık', ...allLevels.flatMap(l => [`L${l} Sipariş Edilecek`, `L${l} Edilmeyecek`])];
  tableHeader(ss, detailHeaders, nextRow, 'FF9B7700');
  nextRow++;

  // Build detailed per-uzmanlik per-level sipariş stats
  const uzLevelSip: Record<string, Record<number, { e: number; m: number }>> = {};
  for (const item of items) {
    const uzm = item.uzmanlik || 'Belirsiz';
    const lvl: number = item.level ?? 0;
    const sip = (item.siparis || '').toUpperCase().trim();
    if (!uzLevelSip[uzm]) uzLevelSip[uzm] = {};
    if (!uzLevelSip[uzm][lvl]) uzLevelSip[uzm][lvl] = { e: 0, m: 0 };
    if (sip.includes('EDİLECEK') && !sip.includes('MEY')) uzLevelSip[uzm][lvl].e++;
    else if (sip.includes('EDİLMEYECEK')) uzLevelSip[uzm][lvl].m++;
  }

  uzmanlikList.forEach(([uzm], idx) => {
    const palBg = UZMANLIK_PALETTE[idx % UZMANLIK_PALETTE.length];
    const rowBg = idx % 2 === 0 ? 'FFFFFBF0' : 'FFFFFFFF';

    dataCell(ss, nextRow, 1, uzm, { bg: palBg, textColor: 'FFFFFFFF', bold: true, align: 'left' });

    allLevels.forEach((l, i) => {
      const stat = uzLevelSip[uzm]?.[l] || { e: 0, m: 0 };
      dataCell(ss, nextRow, 2 + i * 2, stat.e > 0 ? stat.e : '–', { bg: stat.e > 0 ? 'FFE8F5E9' : rowBg, textColor: 'FF1A6B3A', bold: stat.e > 0 });
      dataCell(ss, nextRow, 3 + i * 2, stat.m > 0 ? stat.m : '–', { bg: stat.m > 0 ? 'FFFCE4EC' : rowBg, textColor: 'FF8B0000', bold: stat.m > 0 });
    });

    ss.getRow(nextRow).height = 17;
    nextRow++;
  });

  autoWidth(ss, 12, 30);
  ss.getColumn(1).width = 24;

  // ── 3. DEĞİŞİKLİK GEÇMİŞİ SHEET ─────────────────────────
  if (changeLogs && changeLogs.size > 0) {
    const hs = wb.addWorksheet('Değişiklik Geçmişi', { views: [{ state: 'frozen', ySplit: 1 }] });

    hs.mergeCells('A1:F1');
    const hsBanner = hs.getRow(1);
    hsBanner.getCell(1).value = `${projectName} — Değişiklik Geçmişi`;
    hsBanner.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    hsBanner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C1D95' } };
    hsBanner.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    hsBanner.height = 26;

    tableHeader(hs, ['Satır #', 'Alan', 'Eski Değer', 'Yeni Değer', 'Değiştiren', 'Tarih'], 2, 'FF5B21B6');
    hs.views = [{ state: 'frozen', ySplit: 2 }];

    let hsRow = 3;
    for (const [bomItemId, logs] of changeLogs) {
      for (const log of logs) {
        const r = hs.getRow(hsRow);
        const even = hsRow % 2 === 0;
        const bg = even ? 'FFF5F3FF' : 'FFFFFFFF';
        [
          log.bomItem?.rowNumber || bomItemId,
          log.fieldName,
          log.oldValue || '',
          log.newValue || '',
          log.changedBy?.fullName || '',
          new Date(log.changedAt).toLocaleDateString('tr-TR'),
        ].forEach((v, i) => {
          dataCell(hs, hsRow, i + 1, v, { bg, align: i === 0 ? 'center' : 'left' });
        });
        // Highlight old → new cells
        r.getCell(3).font = { color: { argb: 'FF8B0000' }, size: 10, strikethrough: true };
        r.getCell(4).font = { color: { argb: 'FF1A6B3A' }, size: 10, bold: true };
        r.height = 16;
        hsRow++;
      }
    }
    autoWidth(hs, 10, 40);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
