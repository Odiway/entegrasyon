import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const task = await prisma.task.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            bomItem: {
              select: {
                id: true, rowNumber: true, level: true, title: true,
                malzemeNo: true, malzemeNoSap: true, kalemTipi: true,
                siparis: true, dagitim: true, birim: true, quantity: true,
                uzmanlik: true, montaj: true, needsReview: true, status: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    if (!task) return err('Görev bulunamadı', 404);
    return json(task);
  } catch {
    return err('Unauthorized', 401);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const taskId = parseInt(params.id);
    const body = await req.json();

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) return err('Görev bulunamadı', 404);

    // Engineers can update status; designers/admins can update assignment
    const updateData: any = {};

    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'completed') updateData.completedAt = new Date();
    }
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority) updateData.priority = body.priority;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        assignedTo: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
    });

    return json(updated);
  } catch (e: any) {
    return err(e.message || 'Güncelleme hatası', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const task = await prisma.task.findUnique({ where: { id: parseInt(params.id) } });
    if (!task) return err('Görev bulunamadı', 404);

    // Only creator or admin can delete
    if (task.createdById !== user.id && user.role !== 'admin') {
      return err('Silme yetkiniz yok', 403);
    }

    await prisma.task.delete({ where: { id: parseInt(params.id) } });
    return json({ ok: true });
  } catch (e: any) {
    return err(e.message || 'Silme hatası', 500);
  }
}
