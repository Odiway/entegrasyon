import { prisma } from '@/lib/prisma';
import { requireUser, err } from '@/lib/auth-utils';
import { exportProjectExcel } from '@/lib/excel';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const projectId = parseInt(params.id);

    const project = await prisma.bomProject.findUnique({ where: { id: projectId } });
    if (!project) return err('Proje bulunamadı', 404);

    const items = await prisma.bomItem.findMany({
      where: { projectId },
      orderBy: { rowNumber: 'asc' },
    });

    // Get change logs grouped by item
    const allLogs = await prisma.changeLog.findMany({
      where: { bomItem: { projectId } },
      include: {
        bomItem: { select: { rowNumber: true } },
        changedBy: { select: { fullName: true } },
      },
      orderBy: { changedAt: 'desc' },
    });

    const logMap = new Map<number, any[]>();
    for (const log of allLogs) {
      const arr = logMap.get(log.bomItemId) || [];
      arr.push(log);
      logMap.set(log.bomItemId, arr);
    }

    const buffer = await exportProjectExcel(project.name, items, logMap);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(project.name)}_export.xlsx"`,
      },
    });
  } catch (e: any) {
    return err(e.message || 'Export hatası', 500);
  }
}
