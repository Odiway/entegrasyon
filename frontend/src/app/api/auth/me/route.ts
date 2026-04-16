import { requireUser, json, err } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return json({ id: user.id, email: user.email, full_name: user.fullName, role: user.role, uzmanlik: user.uzmanlik, isActive: user.isActive });
  } catch {
    return err('Unauthorized', 401);
  }
}
