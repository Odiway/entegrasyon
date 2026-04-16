import { prisma } from '@/lib/prisma';
import { hashPassword, createToken, json, err } from '@/lib/auth-utils';

export async function POST(req: Request) {
  const { email, full_name, fullName, password, role, uzmanlik } = await req.json();
  const name = full_name || fullName;
  if (!email || !name || !password) return err('Email, isim ve şifre gerekli');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return err('Bu email zaten kayıtlı');

  const user = await prisma.user.create({
    data: {
      email,
      fullName: name,
      hashedPassword: hashPassword(password),
      role: role || 'designer',
      uzmanlik: uzmanlik || null,
    },
  });

  const token = await createToken(user.id);
  return json({
    access_token: token,
    token_type: 'bearer',
    user: { id: user.id, email: user.email, full_name: user.fullName, role: user.role, uzmanlik: user.uzmanlik, isActive: user.isActive },
  });
}
