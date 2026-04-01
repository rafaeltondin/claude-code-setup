"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.stats = stats;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.updateStatus = updateStatus;
exports.remove = remove;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const personal_tasks_service_1 = require("./personal-tasks.service");
// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------
const TASK_STATUS = ['pending', 'in_progress', 'completed', 'cancelled'];
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'];
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    status: zod_1.z.string().optional(),
    priority: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    tag: zod_1.z.string().optional(),
});
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Título é obrigatório'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(TASK_STATUS).optional(),
    priority: zod_1.z.enum(TASK_PRIORITY).optional(),
    dueDate: zod_1.z.string().datetime({ offset: true }).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
const updateTaskSchema = createTaskSchema.partial().extend({
    dueDate: zod_1.z.string().datetime({ offset: true }).nullable().optional(),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(TASK_STATUS),
});
// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------
async function list(req, res, next) {
    logger_1.logger.info('[personal-tasks.controller.list] INÍCIO', { query: req.query });
    try {
        const params = listQuerySchema.parse(req.query);
        logger_1.logger.debug('[personal-tasks.controller.list] Query validada', { params });
        const result = await (0, personal_tasks_service_1.listTasks)(params);
        logger_1.logger.info('[personal-tasks.controller.list] FIM - Sucesso', {
            total: result.pagination.total,
        });
        res.json({ success: true, ...result });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.list] ERRO', { error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------
async function stats(req, res, next) {
    logger_1.logger.info('[personal-tasks.controller.stats] INÍCIO');
    try {
        const data = await (0, personal_tasks_service_1.getStats)();
        logger_1.logger.info('[personal-tasks.controller.stats] FIM - Sucesso');
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.stats] ERRO', { error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------
async function getById(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[personal-tasks.controller.getById] INÍCIO', { id });
    try {
        const data = await (0, personal_tasks_service_1.getTaskById)(id);
        logger_1.logger.info('[personal-tasks.controller.getById] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.getById] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
async function create(req, res, next) {
    logger_1.logger.info('[personal-tasks.controller.create] INÍCIO', { body: req.body });
    try {
        const body = createTaskSchema.parse(req.body);
        logger_1.logger.debug('[personal-tasks.controller.create] Body validado', { title: body.title });
        const data = await (0, personal_tasks_service_1.createTask)(body);
        logger_1.logger.info('[personal-tasks.controller.create] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.create] ERRO', { error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
async function update(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[personal-tasks.controller.update] INÍCIO', { id, body: req.body });
    try {
        const body = updateTaskSchema.parse(req.body);
        logger_1.logger.debug('[personal-tasks.controller.update] Body validado', { id, campos: Object.keys(body) });
        const data = await (0, personal_tasks_service_1.updateTask)(id, body);
        logger_1.logger.info('[personal-tasks.controller.update] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.update] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------
async function updateStatus(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[personal-tasks.controller.updateStatus] INÍCIO', { id, body: req.body });
    try {
        const { status } = updateStatusSchema.parse(req.body);
        logger_1.logger.debug('[personal-tasks.controller.updateStatus] Status validado', { id, status });
        const data = await (0, personal_tasks_service_1.updateTaskStatus)(id, status);
        logger_1.logger.info('[personal-tasks.controller.updateStatus] FIM - Sucesso', { id, status });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.updateStatus] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------
async function remove(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[personal-tasks.controller.remove] INÍCIO', { id });
    try {
        await (0, personal_tasks_service_1.deleteTask)(id);
        logger_1.logger.info('[personal-tasks.controller.remove] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Task removida com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[personal-tasks.controller.remove] ERRO', { id, error: err.message });
        next(err);
    }
}
//# sourceMappingURL=personal-tasks.controller.js.map