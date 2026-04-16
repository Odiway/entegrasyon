import { prisma } from '@/lib/prisma';
import { requireUser, hashPassword, json, err } from '@/lib/auth-utils';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireUser(req);
    if (admin.role !== 'admin') return err('Sadece admin düzenleyebilir', 403);

    const userId = parseInt(params.id);
    const body = await req.json();

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return err('Kullanıcı bulunamadı', 404);

    const updateData: any = {};
    if (body.full_name || body.fullName) updateData.fullName = body.full_name || body.fullName;
    if (body.email) updateData.email = body.email;
    if (body.role) updateData.role = body.role;
    if (body.uzmanlik !== undefined) updateData.uzmanlik = body.uzmanlik || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.password && body.password.length >= 6) {
      updateData.hashedPassword = hashPassword(body.password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return json({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      uzmanlik: user.uzmanlik,
      isActive: user.isActive,
    });
  } catch (e: any) {
    if (e.code === 'P2002') return err('Bu email zaten kayıtlı', 400);
    return err(e.message || 'Güncelleme hatası', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireUser(req);
    if (admin.role !== 'admin') return err('Sadece admin silebilir', 403);

    const userId = parseInt(params.id);
    if (userId === admin.id) return err('Kendinizi silemezsiniz', 400);

    await prisma.user.delete({ where: { id: userId } });
    return json({ ok: true });
  } catch (e: any) {
    return err(e.message || 'Silme hatası', 500);
  }
}
