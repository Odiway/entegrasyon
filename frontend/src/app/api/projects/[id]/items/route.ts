import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const projectId = parseInt(params.id);
    const url = new URL(req.url);

    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const uzmanlik = url.searchParams.get('uzmanlik');
    const level = url.searchParams.get('level');
    const needsReview = url.searchParams.get('needs_review');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('q');
    const montaj = url.searchParams.get('montaj');

    const where: any = { projectId };
    if (uzmanlik) where.uzmanlik = uzmanlik;
    if (level) where.level = parseInt(level);
    if (needsReview === 'true') where.needsReview = true;
    if (status) where.status = status;
    if (montaj) where.montaj = montaj;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { malzemeNo: { contains: search, mode: 'insensitive' } },
        { malzemeNoSap: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.bomItem.findMany({
        where,
        orderBy: { rowNumber: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.bomItem.count({ where }),
    ]);

    return json({ items, total, offset, limit });
  } catch {
    return err('Unauthorized', 401);
  }
}
