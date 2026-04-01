import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getStats,
} from './personal-tasks.service';

// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------

const TASK_STATUS = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(TASK_STATUS),
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[personal-tasks.controller.list] INÍCIO', { query: req.query });

  try {
    const params = listQuerySchema.parse(req.query);
    logger.debug('[personal-tasks.controller.list] Query validada', { params });

    const result = await listTasks(params);

    logger.info('[personal-tasks.controller.list] FIM - Sucesso', {
      total: (result as { pagination: { total: number } }).pagination.total,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[personal-tasks.controller.list] ERRO', { error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[personal-tasks.controller.stats] INÍCIO');

  try {
    const data = await getStats();

    logger.info('[personal-tasks.controller.stats] FIM - Sucesso');
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[personal-tasks.controller.stats] ERRO', { error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[personal-tasks.controller.getById] INÍCIO', { id });

  try {
    const data = await getTaskById(id);

    logger.info('[personal-tasks.controller.getById] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[personal-tasks.controller.getById] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[personal-tasks.controller.create] INÍCIO', { body: req.body });

  try {
    const body = createTaskSchema.parse(req.body);
    logger.debug('[personal-tasks.controller.create] Body validado', { title: body.title });

    const data = await createTask(body);

    logger.info('[personal-tasks.controller.create] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[personal-tasks.controller.create] ERRO', { error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[personal-tasks.controller.update] INÍCIO', { id, body: req.body });

  try {
    const body = updateTaskSchema.parse(req.body);
    logger.debug('[personal-tasks.controller.update] Body validado', { id, campos: Object.keys(body) });

    const data = await updateTask(id, body);

    logger.info('[personal-tasks.controller.update] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[personal-tasks.controller.update] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[personal-tasks.controller.updateStatus] INÍCIO', { id, body: req.body });

  try {
    const { status } = updateStatusSchema.parse(req.body);
    logger.debug('[personal-tasks.controller.updateStatus] Status validado', { id, status });

    const data = await updateTaskStatus(id, status);

    logger.info('[personal-tasks.controller.updateStatus] FIM - Sucesso', { id, status });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[personal-tasks.controller.updateStatus] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[personal-tasks.controller.remove] INÍCIO', { id });

  try {
    await deleteTask(id);

    logger.info('[personal-tasks.controller.remove] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Task removida com sucesso' });
  } catch (err) {
    logger.error('[personal-tasks.controller.remove] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}
