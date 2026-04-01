import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleArchive,
  listNoteCategories,
  createNoteCategory,
  updateNoteCategory,
  deleteNoteCategory,
} from './notes.service';

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  categoryId: z.string().optional(),
  pinned: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  archived: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
});

const createNoteSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  content: z.string().optional(),
  color: z.string().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  categoryId: z.string().optional(),
});

const updateNoteSchema = createNoteSchema.partial().extend({
  categoryId: z.string().nullable().optional(),
});

const noteCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().optional(),
});

// ---------------------------------------------------------------------------
// NOTES handlers
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[notes.controller.list] INÍCIO', { query: req.query });
  try {
    const params = listQuerySchema.parse(req.query);
    logger.debug('[notes.controller.list] Query validada', { params });

    const result = await listNotes(params);
    logger.info('[notes.controller.list] FIM - Sucesso', {
      total: (result as { pagination: { total: number } }).pagination.total,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[notes.controller.list] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.getById] INÍCIO', { id });
  try {
    const data = await getNoteById(id);
    logger.info('[notes.controller.getById] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.getById] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[notes.controller.create] INÍCIO', { body: req.body });
  try {
    const body = createNoteSchema.parse(req.body);
    logger.debug('[notes.controller.create] Body validado', { title: body.title });

    const data = await createNote(body);
    logger.info('[notes.controller.create] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.create] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.update] INÍCIO', { id, body: req.body });
  try {
    const body = updateNoteSchema.parse(req.body);
    logger.debug('[notes.controller.update] Body validado', { id, campos: Object.keys(body) });

    const data = await updateNote(id, body);
    logger.info('[notes.controller.update] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.update] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.remove] INÍCIO', { id });
  try {
    await deleteNote(id);
    logger.info('[notes.controller.remove] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Nota removida com sucesso' });
  } catch (err) {
    logger.error('[notes.controller.remove] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function pin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.pin] INÍCIO', { id });
  try {
    const data = await togglePin(id);
    logger.info('[notes.controller.pin] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.pin] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function archive(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.archive] INÍCIO', { id });
  try {
    const data = await toggleArchive(id);
    logger.info('[notes.controller.archive] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.archive] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// NOTE CATEGORIES handlers
// ---------------------------------------------------------------------------

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[notes.controller.listCategories] INÍCIO');
  try {
    const data = await listNoteCategories();
    logger.info('[notes.controller.listCategories] FIM - Sucesso', { total: data.length });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.listCategories] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[notes.controller.createCategory] INÍCIO', { body: req.body });
  try {
    const body = noteCategorySchema.parse(req.body);
    const data = await createNoteCategory(body);
    logger.info('[notes.controller.createCategory] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.createCategory] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.updateCategory] INÍCIO', { id, body: req.body });
  try {
    const body = noteCategorySchema.partial().parse(req.body);
    const data = await updateNoteCategory(id, body);
    logger.info('[notes.controller.updateCategory] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[notes.controller.updateCategory] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[notes.controller.deleteCategory] INÍCIO', { id });
  try {
    await deleteNoteCategory(id);
    logger.info('[notes.controller.deleteCategory] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Categoria removida com sucesso' });
  } catch (err) {
    logger.error('[notes.controller.deleteCategory] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}
