"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotes = listNotes;
exports.getNoteById = getNoteById;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
exports.togglePin = togglePin;
exports.toggleArchive = toggleArchive;
exports.listNoteCategories = listNoteCategories;
exports.createNoteCategory = createNoteCategory;
exports.updateNoteCategory = updateNoteCategory;
exports.deleteNoteCategory = deleteNoteCategory;
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
// ---------------------------------------------------------------------------
// NOTES
// ---------------------------------------------------------------------------
async function listNotes(params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[notes.service.listNotes] INÍCIO', {
        page,
        limit,
        categoryId: params.categoryId,
        pinned: params.pinned,
        archived: params.archived,
        search: params.search,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {};
    if (params.categoryId)
        where.categoryId = params.categoryId;
    // Por padrão, não retornar arquivadas (a menos que filtro explícito)
    if (params.archived !== undefined) {
        where.archived = params.archived;
    }
    else {
        where.archived = false;
    }
    if (params.pinned !== undefined)
        where.pinned = params.pinned;
    if (params.search) {
        where.OR = [
            { title: { contains: params.search } },
            { content: { contains: params.search } },
        ];
        logger_1.logger.debug('[notes.service.listNotes] Filtro search aplicado', { search: params.search });
    }
    logger_1.logger.debug('[notes.service.listNotes] Executando query COUNT...', { where });
    const total = await database_1.prisma.note.count({ where });
    logger_1.logger.debug('[notes.service.listNotes] Executando query SELECT...', { skip, limit });
    const data = await database_1.prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
        include: { category: true },
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[notes.service.listNotes] FIM', {
        total,
        retornados: data.length,
        page,
        totalPages,
    });
    return { data, pagination: { page, limit, total, totalPages } };
}
async function getNoteById(id) {
    logger_1.logger.info('[notes.service.getNoteById] INÍCIO', { id });
    const note = await database_1.prisma.note.findUnique({
        where: { id },
        include: { category: true },
    });
    if (!note) {
        logger_1.logger.warn('[notes.service.getNoteById] Nota não encontrada', { id });
        throw new errors_1.AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
    }
    logger_1.logger.info('[notes.service.getNoteById] FIM', { id });
    return note;
}
async function createNote(data) {
    logger_1.logger.info('[notes.service.createNote] INÍCIO', { title: data.title, categoryId: data.categoryId });
    const note = await database_1.prisma.note.create({
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
    logger_1.logger.info('[notes.service.createNote] FIM - Nota criada', { id: note.id });
    return note;
}
async function updateNote(id, data) {
    logger_1.logger.info('[notes.service.updateNote] INÍCIO', { id, campos: Object.keys(data) });
    const existente = await database_1.prisma.note.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[notes.service.updateNote] Nota não encontrada', { id });
        throw new errors_1.AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.title !== undefined)
        updateData.title = data.title;
    if (data.content !== undefined)
        updateData.content = data.content;
    if (data.color !== undefined)
        updateData.color = data.color;
    if (data.pinned !== undefined)
        updateData.pinned = data.pinned;
    if (data.archived !== undefined)
        updateData.archived = data.archived;
    if (data.categoryId !== undefined)
        updateData.categoryId = data.categoryId;
    logger_1.logger.debug('[notes.service.updateNote] Atualizando no banco...', { id });
    const note = await database_1.prisma.note.update({
        where: { id },
        data: updateData,
        include: { category: true },
    });
    logger_1.logger.info('[notes.service.updateNote] FIM - Nota atualizada', { id });
    return note;
}
async function deleteNote(id) {
    logger_1.logger.info('[notes.service.deleteNote] INÍCIO', { id });
    const existente = await database_1.prisma.note.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[notes.service.deleteNote] Nota não encontrada', { id });
        throw new errors_1.AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
    }
    await database_1.prisma.note.delete({ where: { id } });
    logger_1.logger.info('[notes.service.deleteNote] FIM - Nota deletada', { id });
}
async function togglePin(id) {
    logger_1.logger.info('[notes.service.togglePin] INÍCIO', { id });
    const note = await database_1.prisma.note.findUnique({ where: { id } });
    if (!note) {
        logger_1.logger.warn('[notes.service.togglePin] Nota não encontrada', { id });
        throw new errors_1.AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
    }
    const novoPinned = !note.pinned;
    logger_1.logger.debug('[notes.service.togglePin] Alternando pin', { id, de: note.pinned, para: novoPinned });
    const updated = await database_1.prisma.note.update({
        where: { id },
        data: { pinned: novoPinned },
        include: { category: true },
    });
    logger_1.logger.info('[notes.service.togglePin] FIM', { id, pinned: novoPinned });
    return updated;
}
async function toggleArchive(id) {
    logger_1.logger.info('[notes.service.toggleArchive] INÍCIO', { id });
    const note = await database_1.prisma.note.findUnique({ where: { id } });
    if (!note) {
        logger_1.logger.warn('[notes.service.toggleArchive] Nota não encontrada', { id });
        throw new errors_1.AppError(404, 'Nota não encontrada', 'NOTE_NOT_FOUND');
    }
    const novoArchived = !note.archived;
    logger_1.logger.debug('[notes.service.toggleArchive] Alternando archive', { id, de: note.archived, para: novoArchived });
    const updated = await database_1.prisma.note.update({
        where: { id },
        data: { archived: novoArchived },
        include: { category: true },
    });
    logger_1.logger.info('[notes.service.toggleArchive] FIM', { id, archived: novoArchived });
    return updated;
}
// ---------------------------------------------------------------------------
// NOTE CATEGORIES
// ---------------------------------------------------------------------------
async function listNoteCategories() {
    logger_1.logger.info('[notes.service.listNoteCategories] INÍCIO');
    const data = await database_1.prisma.noteCategory.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { notes: true } },
        },
    });
    logger_1.logger.info('[notes.service.listNoteCategories] FIM', { total: data.length });
    return data;
}
async function createNoteCategory(data) {
    logger_1.logger.info('[notes.service.createNoteCategory] INÍCIO', { name: data.name });
    const category = await database_1.prisma.noteCategory.create({
        data: {
            name: data.name,
            color: data.color ?? '#FFD700',
        },
    });
    logger_1.logger.info('[notes.service.createNoteCategory] FIM - Categoria criada', { id: category.id });
    return category;
}
async function updateNoteCategory(id, data) {
    logger_1.logger.info('[notes.service.updateNoteCategory] INÍCIO', { id });
    const existente = await database_1.prisma.noteCategory.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[notes.service.updateNoteCategory] Categoria não encontrada', { id });
        throw new errors_1.AppError(404, 'Categoria não encontrada', 'CATEGORY_NOT_FOUND');
    }
    const category = await database_1.prisma.noteCategory.update({ where: { id }, data });
    logger_1.logger.info('[notes.service.updateNoteCategory] FIM - Atualizada', { id });
    return category;
}
async function deleteNoteCategory(id) {
    logger_1.logger.info('[notes.service.deleteNoteCategory] INÍCIO', { id });
    const existente = await database_1.prisma.noteCategory.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[notes.service.deleteNoteCategory] Categoria não encontrada', { id });
        throw new errors_1.AppError(404, 'Categoria não encontrada', 'CATEGORY_NOT_FOUND');
    }
    await database_1.prisma.noteCategory.delete({ where: { id } });
    logger_1.logger.info('[notes.service.deleteNoteCategory] FIM - Deletada', { id });
}
//# sourceMappingURL=notes.service.js.map