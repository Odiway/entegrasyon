import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const body = await req.json();
    const updateData: any = {};

    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.eventType) updateData.eventType = body.eventType;
    if (body.priority) updateData.priority = body.priority;
    if (body.status) updateData.status = body.status;
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.allDay !== undefined) updateData.allDay = body.allDay;

    const event = await prisma.calendarEvent.update({
      where: { id: parseInt(params.id) },
      data: updateData,
    });
    return json(event);
  } catch (e: any) {
    return err(e.message || 'Güncelleme hatası', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    await prisma.calendarEvent.delete({ where: { id: parseInt(params.id) } });
    return json({ ok: true });
  } catch (e: any) {
    return err(e.message || 'Silme hatası', 500);
  }
}
