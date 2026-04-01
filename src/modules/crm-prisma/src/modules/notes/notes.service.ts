import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ListNotesParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  pinned?: boolean;
  archived?: boolean;
  search?: string;
}

export interface CreateNoteData {
  title: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  archived?: boolean;
  categoryId?: string;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  archived?: boolean;
  categoryId?: string | null;
}

export interface CreateNoteCategoryData {
  name: string;
  color?: string;
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
// NOTES
// ---------------------------------------------------------------------------

export async function listNotes(params: ListNotesParams): Promise<PaginatedResult<unknown>> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  logger.info('[notes.service.listNotes] INÍCIO', {
    page,
    limit,
    categoryId: params.categoryId,
    pinned: params.pinned,
    archived: params.archived,
    search: params.search,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (params.categoryId) where.categoryId = params.categoryId;

  // Por padrão, não retornar arquivadas (a menos que filtro explícito)
  if (params.archived !== undefined) {
    where.archived = params.archived;
  } else {
    where.archived = false;
  }

  if (params.pinned !== undefined) where.pinned = params.pinned;

  if (params.search) {
    where.OR = [
      { title: { contains: params.search } },
      { content: { contains: params.search } },
    ];
    logger.debug('[notes.service.listNotes] Filtro search aplicado', { search: params.search });
  }

  logger.debug('[notes.service.listNotes] Executando query COUNT...', { where });
  const total = await prisma.note.count({ where });

  logger.debug('[notes.service.listNotes] Executando query SELECT...', { skip, limit });
  const data = await prisma.note.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    include: { category: true },
  });

  const totalPages = Math.ceil(total / limit);

  logger.info('[notes.service.listNotes] FIM', {
    total,
    retornados: data.length,
    page,
    totalPages,
  });

  return { data, pagination: { page, limit, total, totalPages } };
}

export async function getNoteById(id: string): Promise<unknown> {
  logger.info('[notes.service.getNoteById] INÍCIO', { id });

  const note = await prisma.note.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!note) {
    logger.warn('[notes.service.getNoteById] Nota não encontrada', { id });
    throw new AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
  }

  logger.info('[notes.service.getNoteById] FIM', { id });
  return note;
}

export async function createNote(data: CreateNoteData): Promise<unknown> {
  logger.info('[notes.service.createNote] INÍCIO', { title: data.title, categoryId: data.categoryId });

  const note = await prisma.note.create({
    data: {
      title: data.title,
      content: data.content,
      color: data.color ?? '#1a1a25',
      pinned: data.pinned ?? false,
      archived: data.archived ?? false,
      categoryId: data.categoryId ?? null,
    },
    include: { category: true },
  });

  logger.info('[notes.service.createNote] FIM - Nota criada', { id: note.id });
  return note;
}

export async function updateNote(id: string, data: UpdateNoteData): Promise<unknown> {
  logger.info('[notes.service.updateNote] INÍCIO', { id, campos: Object.keys(data) });

  const existente = await prisma.note.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[notes.service.updateNote] Nota não encontrada', { id });
    throw new AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.pinned !== undefined) updateData.pinned = data.pinned;
  if (data.archived !== undefined) updateData.archived = data.archived;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  logger.debug('[notes.service.updateNote] Atualizando no banco...', { id });

  const note = await prisma.note.update({
    where: { id },
    data: updateData,
    include: { category: true },
  });

  logger.info('[notes.service.updateNote] FIM - Nota atualizada', { id });
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  logger.info('[notes.service.deleteNote] INÍCIO', { id });

  const existente = await prisma.note.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[notes.service.deleteNote] Nota não encontrada', { id });
    throw new AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
  }

  await prisma.note.delete({ where: { id } });
  logger.info('[notes.service.deleteNote] FIM - Nota deletada', { id });
}

export async function togglePin(id: string): Promise<unknown> {
  logger.info('[notes.service.togglePin] INÍCIO', { id });

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) {
    logger.warn('[notes.service.togglePin] Nota não encontrada', { id });
    throw new AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
  }

  const novoPinned = !note.pinned;

  logger.debug('[notes.service.togglePin] Alternando pin', { id, de: note.pinned, para: novoPinned });

  const updated = await prisma.note.update({
    where: { id },
    data: { pinned: novoPinned },
    include: { category: true },
  });

  logger.info('[notes.service.togglePin] FIM', { id, pinned: novoPinned });
  return updated;
}

export async function toggleArchive(id: string): Promise<unknown> {
  logger.info('[notes.service.toggleArchive] INÍCIO', { id });

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) {
    logger.warn('[notes.service.toggleArchive] Nota não encontrada', { id });
    throw new AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
  }

  const novoArchived = !note.archived;

  logger.debug('[notes.service.toggleArchive] Alternando archive', { id, de: note.archived, para: novoArchived });

  const updated = await prisma.note.update({
    where: { id },
    data: { archived: novoArchived },
    include: { category: true },
  });

  logger.info('[notes.service.toggleArchive] FIM', { id, archived: novoArchived });
  return updated;
}

// ---------------------------------------------------------------------------
// NOTE CATEGORIES
// ---------------------------------------------------------------------------

export async function listNoteCategories(): Promise<unknown[]> {
  logger.info('[notes.service.listNoteCategories] INÍCIO');

  const data = await prisma.noteCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { notes: true } },
    },
  });

  logger.info('[notes.service.listNoteCategories] FIM', { total: data.length });
  return data;
}

export async function createNoteCategory(data: CreateNoteCategoryData): Promise<unknown> {
  logger.info('[notes.service.createNoteCategory] INÍCIO', { name: data.name });

  const category = await prisma.noteCategory.create({
    data: {
      name: data.name,
      color: data.color ?? '#FFD700',
    },
  });

  logger.info('[notes.service.createNoteCategory] FIM - Categoria criada', { id: category.id });
  return category;
}

export async function updateNoteCategory(id: string, data: Partial<CreateNoteCategoryData>): Promise<unknown> {
  logger.info('[notes.service.updateNoteCategory] INÍCIO', { id });

  const existente = await prisma.noteCategory.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[notes.service.updateNoteCategory] Categoria não encontrada', { id });
    throw new AppError(404, 'Categoria não encontrada', 'CATEGORY_NOT_FOUND');
  }

  const category = await prisma.noteCategory.update({ where: { id }, data });
  logger.info('[notes.service.updateNoteCategory] FIM - Atualizada', { id });
  return category;
}

export async function deleteNoteCategory(id: string): Promise<void> {
  logger.info('[notes.service.deleteNoteCategory] INÍCIO', { id });

  const existente = await prisma.noteCategory.findUnique({ where: { id } });
  if (!existente) {
    logger.warn('[notes.service.deleteNoteCategory] Categoria não encontrada', { id });
    throw new AppError(404, 'Categoria não encontrada', 'CATEGORY_NOT_FOUND');
  }

  await prisma.noteCategory.delete({ where: { id } });
  logger.info('[notes.service.deleteNoteCategory] FIM - Deletada', { id });
}
