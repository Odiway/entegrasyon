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
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
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

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedTo: { select: { fullName: true } } },
    });
    if (!existing) return err('Görev bulunamadı', 404);

    // Engineers can update status; designers/admins can update assignment
    const updateData: any = {};
    const historyEntries: { field: string; oldValue: string | null; newValue: string | null }[] = [];

    const STATUS_LABELS: Record<string, string> = {
      open: 'Açık', in_progress: 'Devam Ediyor', completed: 'Tamamlandı', rejected: 'Reddedildi',
    };
    const PRIORITY_LABELS: Record<string, string> = {
      low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
    };

    if (body.status && body.status !== existing.status) {
      updateData.status = body.status;
      if (body.status === 'completed') updateData.completedAt = new Date();
      historyEntries.push({ field: 'status', oldValue: existing.status, newValue: body.status });
    }
    if (body.assignedToId !== undefined && body.assignedToId !== existing.assignedToId) {
      updateData.assignedToId = body.assignedToId || null;
      historyEntries.push({ field: 'assignedToId', oldValue: String(existing.assignedToId || ''), newValue: String(body.assignedToId || '') });
    }
    if (body.title && body.title !== existing.title) {
      updateData.title = body.title;
      historyEntries.push({ field: 'title', oldValue: existing.title, newValue: body.title });
    }
    if (body.description !== undefined && body.description !== existing.description) {
      updateData.description = body.description;
      historyEntries.push({ field: 'description', oldValue: existing.description || '', newValue: body.description || '' });
    }
    if (body.priority && body.priority !== existing.priority) {
      updateData.priority = body.priority;
      historyEntries.push({ field: 'priority', oldValue: existing.priority, newValue: body.priority });
    }

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

    // Write history entries
    if (historyEntries.length > 0) {
      await prisma.taskHistory.createMany({
        data: historyEntries.map(h => ({
          taskId,
          userId: user.id,
          field: h.field,
          oldValue: h.oldValue,
          newValue: h.newValue,
        })),
      });

      // Build notification message
      const FIELD_NAMES: Record<string, string> = {
        status: 'Durum', title: 'Başlık', description: 'Açıklama',
        priority: 'Öncelik', assignedToId: 'Atanan Kişi',
      };
      const changes = historyEntries.map(h => {
        if (h.field === 'status') return `Durum: ${STATUS_LABELS[h.oldValue || ''] || h.oldValue} → ${STATUS_LABELS[h.newValue || ''] || h.newValue}`;
        if (h.field === 'priority') return `Öncelik: ${PRIORITY_LABELS[h.oldValue || ''] || h.oldValue} → ${PRIORITY_LABELS[h.newValue || ''] || h.newValue}`;
        return `${FIELD_NAMES[h.field] || h.field} güncellendi`;
      }).join(', ');

      const notifMessage = `"${existing.title}" ticket güncellendi — ${changes}`;
      const notifType = historyEntries.some(h => h.field === 'status') ? 'task_status_changed' : 'task_updated';

      // Notify relevant users: creator, assignee (excluding the person who made the change)
      const notifyUserIds = new Set<number>();
      if (existing.createdById !== user.id) notifyUserIds.add(existing.createdById);
      if (existing.assignedToId && existing.assignedToId !== user.id) notifyUserIds.add(existing.assignedToId);
      // If assignee changed, notify new assignee too
      if (body.assignedToId && body.assignedToId !== user.id) notifyUserIds.add(body.assignedToId);

      if (notifyUserIds.size > 0) {
        await prisma.notification.createMany({
          data: Array.from(notifyUserIds).map(uid => ({
            userId: uid,
            type: notifType,
            message: notifMessage,
            taskId,
          })),
        });
      }
    }

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
