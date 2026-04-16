import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, json, err } from '@/lib/auth-utils';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return err('Email ve şifre gerekli');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.hashedPassword)) {
    return err('Geçersiz email veya şifre', 401);
  }

  const token = await createToken(user.id);
  return json({
    access_token: token,
    token_type: 'bearer',
    user: { id: user.id, email: user.email, full_name: user.fullName, role: user.role, uzmanlik: user.uzmanlik, isActive: user.isActive },
  });
}
