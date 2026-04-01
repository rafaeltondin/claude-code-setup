"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTasks = listTasks;
exports.getTaskById = getTaskById;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.updateTaskStatus = updateTaskStatus;
exports.deleteTask = deleteTask;
exports.getStats = getStats;
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
// ---------------------------------------------------------------------------
// listTasks
// ---------------------------------------------------------------------------
async function listTasks(params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[personal-tasks.service.listTasks] INÍCIO', {
        page,
        limit,
        status: params.status,
        priority: params.priority,
        search: params.search,
        tag: params.tag,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {};
    if (params.status) {
        where.status = params.status;
        logger_1.logger.debug('[personal-tasks.service.listTasks] Filtro status aplicado', { status: params.status });
    }
    if (params.priority) {
        where.priority = params.priority;
        logger_1.logger.debug('[personal-tasks.service.listTasks] Filtro priority aplicado', { priority: params.priority });
    }
    if (params.search) {
        where.OR = [
            { title: { contains: params.search } },
            { description: { contains: params.search } },
        ];
        logger_1.logger.debug('[personal-tasks.service.listTasks] Filtro search aplicado', { search: params.search });
    }
    if (params.tag) {
        where.tags = { contains: params.tag };
        logger_1.logger.debug('[personal-tasks.service.listTasks] Filtro tag aplicado', { tag: params.tag });
    }
    logger_1.logger.debug('[personal-tasks.service.listTasks] Executando query COUNT...', { where });
    const total = await database_1.prisma.personalTask.count({ where });
    logger_1.logger.debug('[personal-tasks.service.listTasks] Executando query SELECT...', { skip, limit });
    const data = await database_1.prisma.personalTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[personal-tasks.service.listTasks] FIM', {
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
async function getTaskById(id) {
    logger_1.logger.info('[personal-tasks.service.getTaskById] INÍCIO', { id });
    const task = await database_1.prisma.personalTask.findUnique({ where: { id } });
    if (!task) {
        logger_1.logger.warn('[personal-tasks.service.getTaskById] Task não encontrada', { id });
        throw new errors_1.AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
    }
    logger_1.logger.info('[personal-tasks.service.getTaskById] FIM', { id });
    return task;
}
// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------
async function createTask(data) {
    logger_1.logger.info('[personal-tasks.service.createTask] INÍCIO', {
        title: data.title,
        priority: data.priority,
        status: data.status,
    });
    const task = await database_1.prisma.personalTask.create({
        data: {
            title: data.title,
            description: data.description,
            status: data.status ?? 'pending',
            priority: data.priority ?? 'medium',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            tags: JSON.stringify(data.tags ?? []),
        },
    });
    logger_1.logger.info('[personal-tasks.service.createTask] FIM - Task criada', { id: task.id });
    return task;
}
// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------
async function updateTask(id, data) {
    logger_1.logger.info('[personal-tasks.service.updateTask] INÍCIO', { id, campos: Object.keys(data) });
    const existente = await database_1.prisma.personalTask.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[personal-tasks.service.updateTask] Task não encontrada', { id });
        throw new errors_1.AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.title !== undefined)
        updateData.title = data.title;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.status !== undefined)
        updateData.status = data.status;
    if (data.priority !== undefined)
        updateData.priority = data.priority;
    if (data.dueDate !== undefined)
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.tags !== undefined)
        updateData.tags = JSON.stringify(data.tags);
    logger_1.logger.debug('[personal-tasks.service.updateTask] Atualizando no banco...', { id });
    const task = await database_1.prisma.personalTask.update({ where: { id }, data: updateData });
    logger_1.logger.info('[personal-tasks.service.updateTask] FIM - Task atualizada', { id });
    return task;
}
// ---------------------------------------------------------------------------
// updateTaskStatus
// ---------------------------------------------------------------------------
async function updateTaskStatus(id, status) {
    logger_1.logger.info('[personal-tasks.service.updateTaskStatus] INÍCIO', { id, status });
    const existente = await database_1.prisma.personalTask.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[personal-tasks.service.updateTaskStatus] Task não encontrada', { id });
        throw new errors_1.AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
    }
    const task = await database_1.prisma.personalTask.update({ where: { id }, data: { status } });
    logger_1.logger.info('[personal-tasks.service.updateTaskStatus] FIM', { id, status });
    return task;
}
// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------
async function deleteTask(id) {
    logger_1.logger.info('[personal-tasks.service.deleteTask] INÍCIO', { id });
    const existente = await database_1.prisma.personalTask.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[personal-tasks.service.deleteTask] Task não encontrada', { id });
        throw new errors_1.AppError(404, 'Task não encontrada', 'TASK_NOT_FOUND');
    }
    await database_1.prisma.personalTask.delete({ where: { id } });
    logger_1.logger.info('[personal-tasks.service.deleteTask] FIM - Task deletada', { id });
}
// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------
async function getStats() {
    logger_1.logger.info('[personal-tasks.service.getStats] INÍCIO');
    const [byStatus, byPriority, overdue, upcoming] = await Promise.all([
        database_1.prisma.personalTask.groupBy({
            by: ['status'],
            _count: { id: true },
        }),
        database_1.prisma.personalTask.groupBy({
            by: ['priority'],
            _count: { id: true },
        }),
        database_1.prisma.personalTask.count({
            where: {
                status: { not: 'completed' },
                dueDate: { lt: new Date() },
            },
        }),
        database_1.prisma.personalTask.count({
            where: {
                status: { not: 'completed' },
                dueDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            },
        }),
    ]);
    const statusMap = {};
    for (const row of byStatus) {
        statusMap[row.status] = row._count.id;
    }
    const priorityMap = {};
    for (const row of byPriority) {
        priorityMap[row.priority] = row._count.id;
    }
    const stats = {
        byStatus: statusMap,
        byPriority: priorityMap,
        overdue,
        upcomingThisWeek: upcoming,
    };
    logger_1.logger.info('[personal-tasks.service.getStats] FIM', { stats });
    return stats;
}
//# sourceMappingURL=personal-tasks.service.js.map