import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const projectId = parseInt(params.id);

    // Designer role: restrict nav to their own uzmanlik
    const where: any = { projectId, level: { gte: 2 } };
    if (user.role === 'designer' && user.uzmanlik) {
      where.uzmanlik = user.uzmanlik;
    }

    // Get unique uzmanlik-montaj combinations for navigation tree
    const items = await prisma.bomItem.findMany({
      where,
      select: { uzmanlik: true, montaj: true, level: true },
    });

    const tree: Record<string, Set<string>> = {};
    for (const item of items) {
      const uz = item.uzmanlik || 'Belirsiz';
      if (!tree[uz]) tree[uz] = new Set();
      if (item.montaj) tree[uz].add(item.montaj);
    }

    const nav = Object.entries(tree).map(([uzmanlik, montajSet]) => ({
      uzmanlik,
      montajlar: Array.from(montajSet).sort(),
    }));

    return json(nav);
  } catch {
    return err('Unauthorized', 401);
  }
}
