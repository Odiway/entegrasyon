import { prisma } from '@/lib/prisma';
import { requireUser, hashPassword, json, err } from '@/lib/auth-utils';

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, uzmanlik: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return json(users.map(u => ({ ...u, full_name: u.fullName })));
  } catch {
    return err('Unauthorized', 401);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireUser(req);
    if (admin.role !== 'admin') return err('Sadece admin kullanıcı oluşturabilir', 403);

    const body = await req.json();
    const { email, password, role, uzmanlik } = body;
    const fullName = body.full_name || body.fullName || '';

    if (!email || !password || !fullName) return err('Email, ad soyad ve şifre gerekli');
    if (password.length < 6) return err('Şifre en az 6 karakter olmalı');

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return err('Bu email zaten kayıtlı');

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        hashedPassword: hashPassword(password),
        role: role || 'designer',
        uzmanlik: uzmanlik || null,
      },
    });

    return json({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      uzmanlik: user.uzmanlik,
      isActive: user.isActive,
    }, 201);
  } catch (e: any) {
    return err(e.message || 'Kullanıcı oluşturma hatası', 500);
  }
}
