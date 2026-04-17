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
  malzemeNoSap: string;
  siparis: string;
  dagitim: string;
  toplamMiktar: number | null;
  needsReview: boolean;
}

// Column indices from PLM export (0-based)
const COL = {
  level: 0, title: 1, revision: 2, quantity: 3, description: 4,
  maturityState: 5, owner: 6, malzemeNo: 12, sapUsage: 15,
  kullanimMiktari: 27, anaMalzemeGrubu: 28, anaMalzeme: 30,
  projeKodu: 26, kutle: 24, kalemTipi: 31, birim: 32,
};

function str(v: any): string { return v != null ? String(v).trim() : ''; }
function num(v: any): number { const n = parseFloat(v); return isNaN(n) ? 1 : n; }

/** Detect uzmanlik column from header row (case/accent insensitive) */
function normalizeTr(s: string): string {
  return s.toUpperCase()
    .replace(/İ/g, 'I').replace(/ı/g, 'I')
    .replace(/Ö/g, 'O').replace(/ö/g, 'O')
    .replace(/Ü/g, 'U').replace(/ü/g, 'U')
    .replace(/Ş/g, 'S').replace(/ş/g, 'S')
    .replace(/Ç/g, 'C').replace(/ç/g, 'C')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'G');
}

function findUzmanlikCol(worksheet: ExcelJS.Worksheet): number | null {
  // Search first 3 rows for header (some exports have multi-row headers)
  for (let r = 1; r <= Math.min(3, worksheet.rowCount); r++) {
    const headerRow = worksheet.getRow(r);
    if (!headerRow) continue;
    const vals = (headerRow.values as any[]) || [];
    for (let i = 1; i < vals.length; i++) {
      const h = normalizeTr(str(vals[i]));
      // Match exact "UZMANLIK" or containing it (e.g. "UZMANLIK GRUBU", "UZMANLIK ALANI")
      if (h === 'UZMANLIK' || h.includes('UZMANLIK')) return i - 1; // 0-based
    }
  }
  return null;
}

export function parseBomRows(worksheet: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let level1Title = '';
  let level2Title = '';
  const parentStack: { level: number; qty: number }[] = [];
  let rowNum = 0;

  const uzmanlikCol = findUzmanlikCol(worksheet);
  let lastExcelUzmanlik = ''; // propagate from parent rows

  // Log for debugging uzmanlik detection
  console.log(`[Excel Parse] uzmanlikCol: ${uzmanlikCol}, rowCount: ${worksheet.rowCount}`);
  if (uzmanlikCol !== null) {
    console.log(`[Excel Parse] Uzmanlik column found at index ${uzmanlikCol}`);
  } else {
    // Log headers for debugging
    const hRow = worksheet.getRow(1);
    const hVals = (hRow?.values as any[]) || [];
    const headers = hVals.slice(1).map((v: any, i: number) => `${i}:${str(v)}`).filter((s: string) => !s.endsWith(':'));
    console.log(`[Excel Parse] No uzmanlik column found. Headers: ${headers.join(', ')}`);
  }

  worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    rowNum++;
    const vals = row.values as any[];
    // ExcelJS row.values is 1-indexed, shift to 0-indexed
    const v = vals.slice(1);

    const level = parseInt(str(v[COL.level])) || 0;
    const title = str(v[COL.title]);
    const quantity = num(v[COL.quantity]);
    const malzemeNo = str(v[COL.malzemeNo]);
    const sapUsage = str(v[COL.sapUsage]);
    const kullanimMiktari = str(v[COL.kullanimMiktari]);
    const anaMalzeme = str(v[COL.anaMalzeme]);
    const kalemTipi = str(v[COL.kalemTipi]);
    const birim = str(v[COL.birim]);

    // Read uzmanlik directly from Excel column if present
    let excelUzmanlik = uzmanlikCol !== null ? str(v[uzmanlikCol]) : '';
    // Normalize Excel value against known uzmanlik keywords
    if (excelUzmanlik) {
      const normalized = normalizeTr(excelUzmanlik);
      const matched = UZMANLIK_KEYWORDS[excelUzmanlik] || UZMANLIK_KEYWORDS[normalized]
        || Object.entries(UZMANLIK_KEYWORDS).find(([k]) => normalized.includes(normalizeTr(k)))?.[1];
      if (matched) excelUzmanlik = matched;
    }
    // Track last seen uzmanlik from Excel (propagates to children)
    if (excelUzmanlik) {
      lastExcelUzmanlik = excelUzmanlik;
    } else if (level <= 1) {
      lastExcelUzmanlik = ''; // reset at top-level if no value
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

    // Excel column value takes priority over derived value
    // Use row-level value, or propagated parent value, or keep derived
    const effectiveUzmanlik = excelUzmanlik || lastExcelUzmanlik;
    if (effectiveUzmanlik) {
      derived.uzmanlik = effectiveUzmanlik;
    }

    rows.push({
      rowNumber: rowNum, level, title,
      revision: str(v[COL.revision]),
      quantity,
      description: str(v[COL.description]),
      maturityState: str(v[COL.maturityState]),
      owner: str(v[COL.owner]),
      malzemeNo, sapUsage, kullanimMiktari, anaMalzeme,
      anaMalzemeGrubu: str(v[COL.anaMalzemeGrubu]),
      projeKodu: str(v[COL.projeKodu]),
      kutle: str(v[COL.kutle]),
      kalemTipi, birim,
      ...derived,
    });

    parentStack.push({ level, qty: quantity });
  });

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
