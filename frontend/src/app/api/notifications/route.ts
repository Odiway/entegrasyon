import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === '1';

    const where: any = { userId: user.id };
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return json(notifications);
  } catch {
    return err('Unauthorized', 401);
  }
}

// Mark notifications as read
export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { ids } = body; // array of notification ids, or 'all'

    if (ids === 'all') {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { isRead: true },
      });
    }

    return json({ ok: true });
  } catch {
    return err('Unauthorized', 401);
  }
}
