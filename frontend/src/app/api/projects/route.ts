import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';
import { parseBomWorkbook } from '@/lib/excel';
import ExcelJS from 'exceljs';

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const projects = await prisma.bomProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true, tasks: true } } },
    });
    return json(projects);
  } catch {
    return err('Unauthorized', 401);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') return err('Sadece admin yükleme yapabilir', 403);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return err('Dosya gerekli');

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) return err('Excel sayfası bulunamadı');

    const parsedRows = parseBomWorkbook(wb);
    const name = file.name.replace(/\.(xlsx|xls)$/i, '');

    const project = await prisma.bomProject.create({
      data: {
        name,
        filename: file.name,
        uploadedBy: user.fullName,
        totalRows: parsedRows.length,
        status: parsedRows.some(r => r.needsReview) ? 'in_review' : 'completed',
      },
    });

    // Bulk create items
    await prisma.bomItem.createMany({
      data: parsedRows.map(r => ({
        projectId: project.id,
        rowNumber: r.rowNumber,
        level: r.level,
        title: r.title,
        revision: r.revision,
        quantity: r.quantity,
        description: r.description,
        maturityState: r.maturityState,
        owner: r.owner,
        malzemeNo: r.malzemeNo,
        sapUsage: r.sapUsage,
        kullanimMiktari: r.kullanimMiktari,
        anaMalzeme: r.anaMalzeme,
        anaMalzemeGrubu: r.anaMalzemeGrubu,
        projeKodu: r.projeKodu,
        kutle: r.kutle,
        kalemTipi: r.kalemTipi,
        birim: r.birim,
        uzmanlik: r.uzmanlik,
        montaj: r.montaj,
        montajNo: r.montajNo,
        opsStd: r.opsStd,
        prototip2: r.prototip2,
        malzemeNoSap: r.malzemeNoSap,
        siparis: r.siparis,
        dagitim: r.dagitim,
        toplamMiktar: r.toplamMiktar,
        needsReview: r.needsReview,
      })),
    });

    return json({ id: project.id, name: project.name, totalRows: parsedRows.length });
  } catch (e: any) {
    return err(e.message || 'Yükleme hatası', 500);
  }
}
