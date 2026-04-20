import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const projectId = parseInt(params.id);
    const url = new URL(req.url);

    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const findRow = url.searchParams.get('find_row');
    const uzmanlik = url.searchParams.get('uzmanlik');
    const level = url.searchParams.get('level');
    const needsReview = url.searchParams.get('needs_review');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('q');
    const montaj = url.searchParams.get('montaj');
    const siparis = url.searchParams.get('siparis');
    const kalemTipi = url.searchParams.get('kalem_tipi');
    const dagitim = url.searchParams.get('dagitim');
    const prototip2 = url.searchParams.get('prototip2');

    const where: any = { projectId };

    // Designer role: restrict to their own uzmanlik
    if (user.role === 'designer' && user.uzmanlik) {
      where.uzmanlik = user.uzmanlik;
    }
    // Allow explicit uzmanlik filter (overrides designer restriction only if same)
    if (uzmanlik) where.uzmanlik = uzmanlik;
    if (level) where.level = parseInt(level);
    if (needsReview === 'true') where.needsReview = true;
    if (status) where.status = status;
    if (montaj) where.montaj = montaj;
    if (siparis) where.siparis = siparis;
    if (kalemTipi) where.kalemTipi = kalemTipi;
    if (dagitim) where.dagitim = dagitim;
    if (prototip2 === 'X') where.prototip2 = 'X';
    else if (prototip2 === 'YOK') {
      where.AND = [...(where.AND || []), { OR: [{ prototip2: null }, { prototip2: '' }] }];
    }
    if (search) {
      where.AND = [...(where.AND || []), { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { malzemeNo: { contains: search, mode: 'insensitive' } },
        { malzemeNoSap: { contains: search, mode: 'insensitive' } },
        { montajNo: { contains: search, mode: 'insensitive' } },
        { montaj: { contains: search, mode: 'insensitive' } },
      ] }];
    }

    // If find_row is specified, calculate the page/offset for that row
    if (findRow) {
      const targetRow = parseInt(findRow);
      // Count items before this row (with same base filter of projectId)
      const baseWhere: any = { projectId };
      if (user.role === 'designer' && user.uzmanlik) baseWhere.uzmanlik = user.uzmanlik;
      const posIndex = await prisma.bomItem.count({
        where: { ...baseWhere, rowNumber: { lt: targetRow } },
      });
      const calcPage = Math.floor(posIndex / limit);
      const calcOffset = calcPage * limit;
      const pageItems = await prisma.bomItem.findMany({
        where: baseWhere,
        orderBy: { rowNumber: 'asc' },
        skip: calcOffset,
        take: limit,
      });
      const total = await prisma.bomItem.count({ where: baseWhere });
      return json({ items: pageItems, total, offset: calcOffset, limit, page: calcPage, targetRow });
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
