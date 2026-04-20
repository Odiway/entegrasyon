import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

// PATCH — approve or reject an edit request (admin only)
export async function PATCH(req: Request, { params }: { params: { id: string; reqId: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') {
      return err('Sadece admin onay verebilir', 403);
    }

    const reqId = parseInt(params.reqId);
    const projectId = parseInt(params.id);
    const body = await req.json();
    const { status } = body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return err('Geçersiz durum', 400);
    }

    const editReq = await prisma.editRequest.findUnique({ where: { id: reqId } });
    if (!editReq || editReq.projectId !== projectId) {
      return err('Talep bulunamadı', 404);
    }
    if (editReq.status !== 'pending') {
      return err('Bu talep zaten işlenmiş', 400);
    }

    // Update request status
    const updated = await prisma.editRequest.update({
      where: { id: reqId },
      data: { status, reviewedBy: user.id, reviewedAt: new Date() },
    });

    // If approved, apply the change to the BOM item
    if (status === 'approved') {
      const item = await prisma.bomItem.findUnique({ where: { id: editReq.bomItemId } });
      if (item) {
        const updateData: any = { updatedAt: new Date(), updatedById: user.id };
        const changeLogs: any[] = [];

        if (editReq.editType === 'adet') {
          const num = parseFloat(editReq.newValue || '0');
          if (!isNaN(num)) {
            updateData.quantity = num;
            updateData.status = 'modified';
            changeLogs.push({
              bomItemId: item.id,
              fieldName: 'quantity',
              oldValue: String(item.quantity ?? ''),
              newValue: String(num),
              changedById: user.id,
            });
          }
        } else if (editReq.editType === 'siparis_hayir') {
          updateData.siparis = 'HAYIR';
          updateData.status = 'modified';
          changeLogs.push({
            bomItemId: item.id,
            fieldName: 'siparis',
            oldValue: item.siparis || '',
            newValue: 'HAYIR',
            changedById: user.id,
          });
          if (editReq.comment) {
            updateData.dagitim = editReq.comment;
            changeLogs.push({
              bomItemId: item.id,
              fieldName: 'dagitim',
              oldValue: item.dagitim || '',
              newValue: editReq.comment,
              changedById: user.id,
            });
          }
        } else if (editReq.editType === 'malzeme_eksik') {
          updateData.needsReview = true;
          changeLogs.push({
            bomItemId: item.id,
            fieldName: 'needsReview',
            oldValue: String(item.needsReview),
            newValue: 'true',
            changedById: user.id,
          });
          if (editReq.comment) {
            updateData.dagitim = editReq.comment;
            changeLogs.push({
              bomItemId: item.id,
              fieldName: 'dagitim',
              oldValue: item.dagitim || '',
              newValue: editReq.comment,
              changedById: user.id,
            });
          }
        }

        await prisma.$transaction([
          prisma.bomItem.update({ where: { id: item.id }, data: updateData }),
          ...(changeLogs.length > 0 ? [prisma.changeLog.createMany({ data: changeLogs })] : []),
        ]);
      }
    }

    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: editReq.requestedBy,
        type: 'edit_request_reviewed',
        message: status === 'approved'
          ? `Düzenleme talebiniz onaylandı (Admin: ${user.fullName})`
          : `Düzenleme talebiniz reddedildi (Admin: ${user.fullName})`,
        taskId: null,
      },
    });

    return json(updated);
  } catch (e: any) {
    return err(e.message || 'Hata', 500);
  }
}
