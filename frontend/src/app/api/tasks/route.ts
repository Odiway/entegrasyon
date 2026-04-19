import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const projectId = url.searchParams.get('project_id');

    const where: any = {};

    // Engineers see tasks assigned to them, designers see tasks they created
    if (user.role === 'integration_engineer') {
      where.assignedToId = user.id;
    } else if (user.role === 'designer') {
      where.createdById = user.id;
    }
    // admin sees all

    if (status) where.status = status;
    if (projectId) where.projectId = parseInt(projectId);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        assignedTo: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return json(tasks);
  } catch {
    return err('Unauthorized', 401);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'designer' && user.role !== 'admin') {
      return err('Sadece tasarımcı görev oluşturabilir', 403);
    }

    const body = await req.json();
    const { projectId, assignedToId, title, description, priority, bomItemIds } = body;

    if (!projectId || !title) return err('Proje ve başlık gerekli');
    if (!bomItemIds || !Array.isArray(bomItemIds) || bomItemIds.length === 0) {
      return err('En az bir BOM kalemi seçilmeli');
    }

    // Auto-assign to admin if no assignee specified
    let finalAssigneeId = assignedToId || null;
    if (!finalAssigneeId) {
      const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
      if (admin) finalAssigneeId = admin.id;
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        createdById: user.id,
        assignedToId: finalAssigneeId,
        title,
        description: description || null,
        priority: priority || 'medium',
        items: {
          create: bomItemIds.map((id: number) => ({
            bomItemId: id,
          })),
        },
      },
      include: {
        items: { include: { bomItem: true } },
        createdBy: { select: { fullName: true } },
        assignedTo: { select: { fullName: true } },
      },
    });

    // Notify assignee about the new ticket
    if (finalAssigneeId && finalAssigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: finalAssigneeId,
          type: 'task_created',
          message: `"${title}" — yeni ticket oluşturuldu (${user.fullName})`,
          taskId: task.id,
        },
      });
    }

    return json(task, 201);
  } catch (e: any) {
    return err(e.message || 'Görev oluşturma hatası', 500);
  }
}
