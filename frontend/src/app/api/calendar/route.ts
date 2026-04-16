import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const month = url.searchParams.get('month'); // YYYY-MM format
    const eventType = url.searchParams.get('event_type');
    const status = url.searchParams.get('status');

    const where: any = {};

    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      };
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      where.startDate = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    }

    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
    return json(events);
  } catch {
    return err('Unauthorized', 401);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const event = await prisma.calendarEvent.create({
      data: {
        title: body.title,
        description: body.description || null,
        eventType: body.event_type || body.eventType || 'task',
        priority: body.priority || 'medium',
        status: body.status || 'pending',
        startDate: new Date(body.start_date || body.startDate),
        endDate: (body.end_date || body.endDate) ? new Date(body.end_date || body.endDate) : null,
        allDay: body.all_day ?? body.allDay ?? true,
        createdBy: user.fullName,
      },
    });
    return json(event, 201);
  } catch (e: any) {
    return err(e.message || 'Etkinlik oluşturma hatası', 500);
  }
}
