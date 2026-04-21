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

    const [
      total,
      needsReview,
      modified,
      byUzmanlik,
      byLevel,
      recentChanges,
      taskStats,
      bySiparis,
      byDagitim,
      byKalemTipi,
      byLevelKalem,
      byLevelSiparis,
      byUzmanlikLevelKalem,
      byUzmanlikLevelSiparis,
    ] = await Promise.all([
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
      // Level x Kalem Tipi
      prisma.bomItem.groupBy({ by: ['level', 'kalemTipi'], where: baseWhere, _count: { _all: true }, orderBy: [{ level: 'asc' }] }),
      // Level x Sipariş
      prisma.bomItem.groupBy({ by: ['level', 'siparis'], where: baseWhere, _count: { _all: true }, orderBy: [{ level: 'asc' }] }),
      // Uzmanlık x Level x Kalem Tipi
      prisma.bomItem.groupBy({ by: ['uzmanlik', 'level', 'kalemTipi'], where: baseWhere, _count: { _all: true }, orderBy: [{ uzmanlik: 'asc' }, { level: 'asc' }] }),
      // Uzmanlık x Level x Sipariş
      prisma.bomItem.groupBy({ by: ['uzmanlik', 'level', 'siparis'], where: baseWhere, _count: { _all: true }, orderBy: [{ uzmanlik: 'asc' }, { level: 'asc' }] }),
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
      byLevelKalem: byLevelKalem.map(g => ({ level: g.level, kalemTipi: g.kalemTipi || 'Boş', count: g._count._all })),
      byLevelSiparis: byLevelSiparis.map(g => ({ level: g.level, siparis: g.siparis || 'Boş', count: g._count._all })),
      byUzmanlikLevelKalem: byUzmanlikLevelKalem.map(g => ({ uzmanlik: g.uzmanlik || 'Belirsiz', level: g.level, kalemTipi: g.kalemTipi || 'Boş', count: g._count._all })),
      byUzmanlikLevelSiparis: byUzmanlikLevelSiparis.map(g => ({ uzmanlik: g.uzmanlik || 'Belirsiz', level: g.level, siparis: g.siparis || 'Boş', count: g._count._all })),
    });
  } catch {
    return err('Unauthorized', 401);
  }
}
