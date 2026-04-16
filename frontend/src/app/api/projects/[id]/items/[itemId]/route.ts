import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const user = await requireUser(req);
    const bomItemId = parseInt(params.itemId);
    const body = await req.json();

    // Only allow integration engineers or admins to edit
    if (user.role !== 'integration_engineer' && user.role !== 'admin') {
      return err('Sadece entegrasyon mühendisi düzenleyebilir', 403);
    }

    const existing = await prisma.bomItem.findUnique({ where: { id: bomItemId } });
    if (!existing || existing.projectId !== parseInt(params.id)) {
      return err('Kayıt bulunamadı', 404);
    }

    // Allowed editable fields
    const editableFields = [
      'kalemTipi', 'siparis', 'dagitim', 'birim', 'quantity', 'toplamMiktar',
      'malzemeNoSap', 'uzmanlik', 'montaj', 'needsReview', 'status',
    ];

    const updateData: any = {};
    const changeLogs: any[] = [];

    for (const field of editableFields) {
      if (body[field] !== undefined && body[field] !== (existing as any)[field]) {
        changeLogs.push({
          bomItemId,
          fieldName: field,
          oldValue: String((existing as any)[field] ?? ''),
          newValue: String(body[field] ?? ''),
          changedById: user.id,
        });
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return json(existing);
    }

    updateData.updatedAt = new Date();
    updateData.updatedById = user.id;
    if (updateData.needsReview === undefined) {
      updateData.status = 'modified';
    }

    const [updated] = await prisma.$transaction([
      prisma.bomItem.update({ where: { id: bomItemId }, data: updateData }),
      ...(changeLogs.length > 0 ? [prisma.changeLog.createMany({ data: changeLogs })] : []),
    ]);

    return json(updated);
  } catch (e: any) {
    return err(e.message || 'Güncelleme hatası', 500);
  }
}
