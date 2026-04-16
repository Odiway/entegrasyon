import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const project = await prisma.bomProject.findUnique({
      where: { id: parseInt(params.id) },
      include: { _count: { select: { items: true, tasks: true } } },
    });
    if (!project) return err('Proje bulunamadı', 404);

    // Compute stats
    const [total, needsReview, modified] = await Promise.all([
      prisma.bomItem.count({ where: { projectId: project.id } }),
      prisma.bomItem.count({ where: { projectId: project.id, needsReview: true } }),
      prisma.bomItem.count({ where: { projectId: project.id, status: 'modified' } }),
    ]);

    return json({ ...project, totalRows: total, unresolvedRows: needsReview, modifiedRows: modified, resolvedRows: total - needsReview });
  } catch {
    return err('Unauthorized', 401);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') return err('Sadece admin silebilir', 403);
    await prisma.bomProject.delete({ where: { id: parseInt(params.id) } });
    return json({ ok: true });
  } catch {
    return err('Silme hatası', 500);
  }
}
