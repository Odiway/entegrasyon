import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const projectId = parseInt(params.id);

    const [total, needsReview, modified, byUzmanlik, byLevel, recentChanges, taskStats] = await Promise.all([
      prisma.bomItem.count({ where: { projectId } }),
      prisma.bomItem.count({ where: { projectId, needsReview: true } }),
      prisma.bomItem.count({ where: { projectId, status: 'modified' } }),
      prisma.bomItem.groupBy({ by: ['uzmanlik'], where: { projectId }, _count: { _all: true } }),
      prisma.bomItem.groupBy({ by: ['level'], where: { projectId }, _count: { _all: true }, orderBy: { level: 'asc' } }),
      prisma.changeLog.count({ where: { bomItem: { projectId } } }),
      prisma.task.groupBy({ by: ['status'], where: { projectId }, _count: { _all: true } }),
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
    });
  } catch {
    return err('Unauthorized', 401);
  }
}
