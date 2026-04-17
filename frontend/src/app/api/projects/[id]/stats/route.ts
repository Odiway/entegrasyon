import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const projectId = parseInt(params.id);

    // Base filter: for designers, restrict to their uzmanlik
    const baseWhere: any = { projectId };
    if (user.role === 'designer' && user.uzmanlik) {
      baseWhere.uzmanlik = user.uzmanlik;
    }

    const [total, needsReview, modified, byUzmanlik, byLevel, recentChanges, taskStats, bySiparis, byDagitim, byKalemTipi] = await Promise.all([
      prisma.bomItem.count({ where: baseWhere }),
      prisma.bomItem.count({ where: { ...baseWhere, needsReview: true } }),
      prisma.bomItem.count({ where: { ...baseWhere, status: 'modified' } }),
      prisma.bomItem.groupBy({ by: ['uzmanlik'], where: baseWhere, _count: { _all: true } }),
      prisma.bomItem.groupBy({ by: ['level'], where: baseWhere, _count: { _all: true }, orderBy: { level: 'asc' } }),
      prisma.changeLog.count({ where: { bomItem: baseWhere } }),
      prisma.task.groupBy({ by: ['status'], where: { projectId }, _count: { _all: true } }),
      // Sipariş breakdown
      prisma.bomItem.groupBy({ by: ['siparis'], where: { ...baseWhere, level: { gte: 2 } }, _count: { _all: true } }),
      // Dağıtım breakdown
      prisma.bomItem.groupBy({ by: ['dagitim'], where: { ...baseWhere, level: { gte: 2 } }, _count: { _all: true } }),
      // Kalem Tipi breakdown
      prisma.bomItem.groupBy({ by: ['kalemTipi'], where: { ...baseWhere, level: { gte: 2 } }, _count: { _all: true } }),
    ]);

    return json({
      total,
      needsReview,
      modified,
      resolved: total - needsReview,
      recentChanges,
      byUzmanlik: byUzmanlik.map(g => ({ uzmanlik: g.uzmanlik || 'Belirsiz', count: g._count._all })),
      byLevel: byLevel.map(g => ({ level: g.level, count: g._count._all })),
      taskStats: taskStats.map(g => ({ status: g.status, count: g._count._all })),
      bySiparis: bySiparis.map(g => ({ siparis: g.siparis || 'Boş', count: g._count._all })),
      byDagitim: byDagitim.map(g => ({ dagitim: g.dagitim || 'Boş', count: g._count._all })),
      byKalemTipi: byKalemTipi.map(g => ({ kalemTipi: g.kalemTipi || 'Boş', count: g._count._all })),
    });
  } catch {
    return err('Unauthorized', 401);
  }
}
