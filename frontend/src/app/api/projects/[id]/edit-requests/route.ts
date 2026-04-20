import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

// GET — list edit requests for a project (admin sees all, engineer sees own)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const projectId = parseInt(params.id);
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;

    const where: any = { projectId };
    if (status) where.status = status;
    if (user.role !== 'admin') where.requestedBy = user.id;

    const requests = await prisma.editRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with user and item info
    const userIds = [...new Set(requests.map(r => r.requestedBy).concat(requests.filter(r => r.reviewedBy).map(r => r.reviewedBy!)))];
    const itemIds = [...new Set(requests.map(r => r.bomItemId))];

    const [users, items] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } }),
      prisma.bomItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, rowNumber: true, title: true, montajNo: true, level: true } }),
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

    const enriched = requests.map(r => ({
      ...r,
      requestedByUser: userMap[r.requestedBy] || null,
      reviewedByUser: r.reviewedBy ? userMap[r.reviewedBy] || null : null,
      bomItem: itemMap[r.bomItemId] || null,
    }));

    return json(enriched);
  } catch (e: any) {
    return err(e.message || 'Hata', 500);
  }
}

// POST — create edit request (integration_engineer or admin)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const projectId = parseInt(params.id);
    const body = await req.json();

    if (user.role !== 'integration_engineer' && user.role !== 'admin') {
      return err('Yetkiniz yok', 403);
    }

    const { bomItemId, editType, fieldName, oldValue, newValue, comment } = body;

    if (!bomItemId || !editType) {
      return err('Eksik bilgi', 400);
    }

    // Verify item belongs to project
    const item = await prisma.bomItem.findUnique({ where: { id: bomItemId } });
    if (!item || item.projectId !== projectId) {
      return err('Kayıt bulunamadı', 404);
    }

    const editRequest = await prisma.editRequest.create({
      data: {
        projectId,
        bomItemId,
        requestedBy: user.id,
        editType,
        fieldName: fieldName || editType,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        comment: comment ?? null,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
    const editTypeLabels: Record<string, string> = {
      adet: 'Adet Yanlışlığı',
      siparis_hayir: 'Sipariş Edilmemeli',
      malzeme_eksik: 'Malzeme Eksikliği',
    };
    const label = editTypeLabels[editType] || editType;

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          type: 'edit_request',
          message: `${user.fullName} — "${label}" düzenleme talebi (#${item.rowNumber} ${item.title?.substring(0, 40)})`,
          taskId: null,
        })),
      });
    }

    return json(editRequest);
  } catch (e: any) {
    return err(e.message || 'Hata', 500);
  }
}
