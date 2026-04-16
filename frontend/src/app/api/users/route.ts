import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return json({ users: await prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, uzmanlik: true, isActive: true } }) });
  } catch {
    return err('Unauthorized', 401);
  }
}
