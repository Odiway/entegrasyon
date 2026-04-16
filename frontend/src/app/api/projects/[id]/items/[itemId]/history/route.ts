import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    await requireUser(req);
    const logs = await prisma.changeLog.findMany({
      where: { bomItemId: parseInt(params.itemId) },
      include: { changedBy: { select: { fullName: true, email: true } } },
      orderBy: { changedAt: 'desc' },
    });
    return json(logs);
  } catch {
    return err('Unauthorized', 401);
  }
}
