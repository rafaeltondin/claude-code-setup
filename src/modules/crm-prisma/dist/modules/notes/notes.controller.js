"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.pin = pin;
exports.archive = archive;
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const notes_service_1 = require("./notes.service");
// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    categoryId: zod_1.z.string().optional(),
    pinned: zod_1.z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    archived: zod_1.z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    search: zod_1.z.string().optional(),
});
const createNoteSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Título é obrigatório'),
    content: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    pinned: zod_1.z.boolean().optional(),
    archived: zod_1.z.boolean().optional(),
    categoryId: zod_1.z.string().optional(),
});
const updateNoteSchema = createNoteSchema.partial().extend({
    categoryId: zod_1.z.string().nullable().optional(),
});
const noteCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    color: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// NOTES handlers
// ---------------------------------------------------------------------------
async function list(req, res, next) {
    logger_1.logger.info('[notes.controller.list] INÍCIO', { query: req.query });
    try {
        const params = listQuerySchema.parse(req.query);
        logger_1.logger.debug('[notes.controller.list] Query validada', { params });
        const result = await (0, notes_service_1.listNotes)(params);
        logger_1.logger.info('[notes.controller.list] FIM - Sucesso', {
            total: result.pagination.total,
        });
        res.json({ success: true, ...result });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.list] ERRO', { error: err.message });
        next(err);
    }
}
async function getById(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.getById] INÍCIO', { id });
    try {
        const data = await (0, notes_service_1.getNoteById)(id);
        logger_1.logger.info('[notes.controller.getById] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.getById] ERRO', { id, error: err.message });
        next(err);
    }
}
async function create(req, res, next) {
    logger_1.logger.info('[notes.controller.create] INÍCIO', { body: req.body });
    try {
        const body = createNoteSchema.parse(req.body);
        logger_1.logger.debug('[notes.controller.create] Body validado', { title: body.title });
        const data = await (0, notes_service_1.createNote)(body);
        logger_1.logger.info('[notes.controller.create] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.create] ERRO', { error: err.message });
        next(err);
    }
}
async function update(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.update] INÍCIO', { id, body: req.body });
    try {
        const body = updateNoteSchema.parse(req.body);
        logger_1.logger.debug('[notes.controller.update] Body validado', { id, campos: Object.keys(body) });
        const data = await (0, notes_service_1.updateNote)(id, body);
        logger_1.logger.info('[notes.controller.update] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.update] ERRO', { id, error: err.message });
        next(err);
    }
}
async function remove(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.remove] INÍCIO', { id });
    try {
        await (0, notes_service_1.deleteNote)(id);
        logger_1.logger.info('[notes.controller.remove] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Nota removida com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.remove] ERRO', { id, error: err.message });
        next(err);
    }
}
async function pin(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.pin] INÍCIO', { id });
    try {
        const data = await (0, notes_service_1.togglePin)(id);
        logger_1.logger.info('[notes.controller.pin] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.pin] ERRO', { id, error: err.message });
        next(err);
    }
}
async function archive(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.archive] INÍCIO', { id });
    try {
        const data = await (0, notes_service_1.toggleArchive)(id);
        logger_1.logger.info('[notes.controller.archive] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.archive] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// NOTE CATEGORIES handlers
// ---------------------------------------------------------------------------
async function listCategories(req, res, next) {
    logger_1.logger.info('[notes.controller.listCategories] INÍCIO');
    try {
        const data = await (0, notes_service_1.listNoteCategories)();
        logger_1.logger.info('[notes.controller.listCategories] FIM - Sucesso', { total: data.length });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.listCategories] ERRO', { error: err.message });
        next(err);
    }
}
async function createCategory(req, res, next) {
    logger_1.logger.info('[notes.controller.createCategory] INÍCIO', { body: req.body });
    try {
        const body = noteCategorySchema.parse(req.body);
        const data = await (0, notes_service_1.createNoteCategory)(body);
        logger_1.logger.info('[notes.controller.createCategory] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.createCategory] ERRO', { error: err.message });
        next(err);
    }
}
async function updateCategory(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.updateCategory] INÍCIO', { id, body: req.body });
    try {
        const body = noteCategorySchema.partial().parse(req.body);
        const data = await (0, notes_service_1.updateNoteCategory)(id, body);
        logger_1.logger.info('[notes.controller.updateCategory] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.updateCategory] ERRO', { id, error: err.message });
        next(err);
    }
}
async function deleteCategory(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[notes.controller.deleteCategory] INÍCIO', { id });
    try {
        await (0, notes_service_1.deleteNoteCategory)(id);
        logger_1.logger.info('[notes.controller.deleteCategory] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Categoria removida com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[notes.controller.deleteCategory] ERRO', { id, error: err.message });
        next(err);
    }
}
//# sourceMappingURL=notes.controller.js.map