import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ListTasksParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  tag?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  tags?: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// listTasks
// ---------------------------------------------------------------------------

export async function listTasks(params: ListTasksParams): Promise<PaginatedResult<unknown>> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  logger.info('[personal-tasks.service.listTasks] INÍCIO', {
    page,
    limit,
    status: params.status,
    priority: params.priority,
    search: params.search,
    tag: params.tag,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (params.status) {
    where.status = params.status;
    logger.debug('[personal-tasks.service.listTasks] Filtro status aplicado', { status: params.status });
  }

  if (params.priority) {
    where.priority = params.priority;
    logger.debug('[personal-tasks.service.listTasks] Filtro priority aplicado', { priority: params.priority });
  }

  if (params.search) {
    where.OR = [
      { title: { contains: params.search } },
      { description: { contains: params.search } },
    ];
    logger.debug('[personal-tasks.service.listTasks] Filtro search aplicado', { search: params.search });
  }

  if (params.tag) {
    where.tags = { contains: params.tag };
    logger.debug('[personal-tasks.service.listTasks] Filtro tag aplicado', { tag: params.tag });
  }

  logger.debug('[personal-tasks.service.listTasks] Executando query COUNT...', { where });
  const total = await prisma.personalTask.count({ where });

  logger.debug('[personal-tasks.service.listTasks] Executando query SELECT...', { skip, limit });
  const data = await prisma.personalTask.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  const totalPages = Math.ceil(total / limit);

  logger.info('[personal-tasks.service.listTasks] FIM', {
    total,
    retornados: data.length,
    page,
    totalPages,
  });

  return { data, pagination: { page, limit, total, totalPages } };
}

// ---------------------------------------------------------------------------
// getTaskById
// ---------------------------------------------------------------------------

export async function getTaskById(id: string): Promise<unknown> {
  logger.info('[personal-tasks.service.getTaskById] INÍCIO', { id });

  const task = await prisma.personalTask.findUnique({ where: { id } });

  if (!task) {
    logger.warn('[personal-tasks.service.getTaskById] Task não encontrada', { id });
    throw new AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
  }

  logger.info('[personal-tasks.service.getTaskById] FIM', { id });
  return task;
}

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

export async function createTask(data: CreateTaskData): Promise<unknown> {
  logger.info('[personal-tasks.service.createTask] INÍCIO', {
    title: data.title,
    priority: data.priority,
    status: data.status,
  });

  const task = await prisma.personalTask.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status ?? 'pending',
      priority: data.priority ?? 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      tags: JSON.stringify(data.tags ?? []),
    },
  });

  logger.info('[personal-tasks.service.createTask] FIM - Task criada', { id: task.id });
  return task;
}

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

export async function updateTask(id: string, data: UpdateTaskData): Promise<unknown> {
  logger.info('[personal-tasks.service.updateTask] INÍCIO', { id, campos: Object.keys(data) });

  const existente = await prisma.personalTask.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[personal-tasks.service.updateTask] Task não encontrada', { id });
    throw new AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

  logger.debug('[personal-tasks.service.updateTask] Atualizando no banco...', { id });

  const task = await prisma.personalTask.update({ where: { id }, data: updateData });

  logger.info('[personal-tasks.service.updateTask] FIM - Task atualizada', { id });
  return task;
}

// ---------------------------------------------------------------------------
// updateTaskStatus
// ---------------------------------------------------------------------------

export async function updateTaskStatus(id: string, status: string): Promise<unknown> {
  logger.info('[personal-tasks.service.updateTaskStatus] INÍCIO', { id, status });

  const existente = await prisma.personalTask.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[personal-tasks.service.updateTaskStatus] Task não encontrada', { id });
    throw new AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
  }

  const task = await prisma.personalTask.update({ where: { id }, data: { status } });

  logger.info('[personal-tasks.service.updateTaskStatus] FIM', { id, status });
  return task;
}

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

export async function deleteTask(id: string): Promise<void> {
  logger.info('[personal-tasks.service.deleteTask] INÍCIO', { id });

  const existente = await prisma.personalTask.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[personal-tasks.service.deleteTask] Task não encontrada', { id });
    throw new AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
  }

  await prisma.personalTask.delete({ where: { id } });

  logger.info('[personal-tasks.service.deleteTask] FIM - Task deletada', { id });
}

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

export async function getStats(): Promise<unknown> {
  logger.info('[personal-tasks.service.getStats] INÍCIO');

  const [byStatus, byPriority, overdue, upcoming] = await Promise.all([
    prisma.personalTask.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.personalTask.groupBy({
      by: ['priority'],
      _count: { id: true },
    }),
    prisma.personalTask.count({
      where: {
        status: { not: 'completed' },
        dueDate: { lt: new Date() },
      },
    }),
    prisma.personalTask.count({
      where: {
        status: { not: 'completed' },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) {
    statusMap[row.status] = row._count.id;
  }

  const priorityMap: Record<string, number> = {};
  for (const row of byPriority) {
    priorityMap[row.priority] = row._count.id;
  }

  const stats = {
    byStatus: statusMap,
    byPriority: priorityMap,
    overdue,
    upcomingThisWeek: upcoming,
  };

  logger.info('[personal-tasks.service.getStats] FIM', { stats });
  return stats;
}
