"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCSV = void 0;
exports.handleListLeads = handleListLeads;
exports.handleGetLead = handleGetLead;
exports.handleCreateLead = handleCreateLead;
exports.handleUpdateLead = handleUpdateLead;
exports.handleDeleteLead = handleDeleteLead;
exports.handleImportCSV = handleImportCSV;
exports.handleGetLeadMessages = handleGetLeadMessages;
exports.handleGetLeadActivities = handleGetLeadActivities;
exports.handleCheckWhatsapp = handleCheckWhatsapp;
exports.handleBulkWhatsappCleanup = handleBulkWhatsappCleanup;
exports.handleAddNote = handleAddNote;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const enums_1 = require("../../shared/enums");
const leads_service_1 = require("./leads.service");
// ---------------------------------------------------------------------------
// Configuração do Multer (memória — sem gravar em disco)
// ---------------------------------------------------------------------------
exports.uploadCSV = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'text/csv' ||
            file.mimetype === 'application/csv' ||
            file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(new errors_1.AppError(400, 'Apenas arquivos CSV são permitidos', 'INVALID_FILE_TYPE'));
        }
    },
});
// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    status: zod_1.z.string().optional(),
    temperature: zod_1.z.string().optional(),
    source: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    tags: zod_1.z.string().optional(),
});
const createLeadSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    email: zod_1.z.string().email('E-mail inválido').optional(),
    phone: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(),
    source: zod_1.z.string().optional(),
    status: zod_1.z.enum(enums_1.LEAD_STATUS).optional(),
    temperature: zod_1.z.enum(enums_1.LEAD_TEMPERATURE).optional(),
    notes: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    customFields: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const updateLeadSchema = createLeadSchema.partial();
const addNoteSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Conteúdo da nota é obrigatório'),
});
const paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
// ---------------------------------------------------------------------------
// Helper para extrair param como string
// ---------------------------------------------------------------------------
function param(req, name) {
    return String(req.params[name]);
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
async function handleListLeads(req, res, next) {
    logger_1.logger.info('[leads.controller.handleListLeads] INÍCIO', {
        userId: req.userId,
        query: req.query,
    });
    try {
        const query = listQuerySchema.parse(req.query);
        logger_1.logger.debug('[leads.controller.handleListLeads] Query validada', { query });
        const result = await (0, leads_service_1.listLeads)(query);
        logger_1.logger.info('[leads.controller.handleListLeads] FIM - Sucesso', {
            total: result.pagination.total,
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[leads.controller.handleListLeads] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleGetLead(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[leads.controller.handleGetLead] INÍCIO', { id, userId: req.userId });
    try {
        const lead = await (0, leads_service_1.getLeadById)(id);
        logger_1.logger.info('[leads.controller.handleGetLead] FIM - Sucesso', { id });
        res.json({ success: true, data: lead });
    }
    catch (error) {
        next(error);
    }
}
async function handleCreateLead(req, res, next) {
    logger_1.logger.info('[leads.controller.handleCreateLead] INÍCIO', {
        userId: req.userId,
        body: req.body,
    });
    try {
        const data = createLeadSchema.parse(req.body);
        logger_1.logger.debug('[leads.controller.handleCreateLead] Dados validados', { data });
        const result = await (0, leads_service_1.createLead)(data);
        logger_1.logger.info('[leads.controller.handleCreateLead] FIM - Sucesso', {
            leadId: result.lead.id,
            duplicataEncontrada: !!result.duplicateWarning,
        });
        const response = {
            success: true,
            data: result.lead,
        };
        if (result.duplicateWarning) {
            response.duplicateWarning = result.duplicateWarning;
            logger_1.logger.warn('[leads.controller.handleCreateLead] Warning de duplicata incluído na resposta', {
                field: result.duplicateWarning.field,
                message: result.duplicateWarning.message,
            });
        }
        res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[leads.controller.handleCreateLead] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleUpdateLead(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[leads.controller.handleUpdateLead] INÍCIO', {
        id,
        userId: req.userId,
        body: req.body,
    });
    try {
        const data = updateLeadSchema.parse(req.body);
        logger_1.logger.debug('[leads.controller.handleUpdateLead] Dados validados', { id, data });
        const lead = await (0, leads_service_1.updateLead)(id, data);
        logger_1.logger.info('[leads.controller.handleUpdateLead] FIM - Sucesso', { id });
        res.json({ success: true, data: lead });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[leads.controller.handleUpdateLead] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleDeleteLead(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[leads.controller.handleDeleteLead] INÍCIO', { id, userId: req.userId });
    try {
        await (0, leads_service_1.deleteLead)(id);
        logger_1.logger.info('[leads.controller.handleDeleteLead] FIM - Lead deletado', { id });
        res.json({ success: true, message: 'Lead removido com sucesso' });
    }
    catch (error) {
        next(error);
    }
}
async function handleImportCSV(req, res, next) {
    logger_1.logger.info('[leads.controller.handleImportCSV] INÍCIO', {
        userId: req.userId,
        file: req.file?.originalname,
        fileSize: req.file?.size,
    });
    try {
        if (!req.file) {
            logger_1.logger.warn('[leads.controller.handleImportCSV] Nenhum arquivo enviado');
            return next(new errors_1.AppError(400, 'Arquivo CSV é obrigatório', 'FILE_REQUIRED'));
        }
        logger_1.logger.debug('[leads.controller.handleImportCSV] Arquivo recebido', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
        const result = await (0, leads_service_1.importLeadsCSV)(req.file.buffer);
        logger_1.logger.info('[leads.controller.handleImportCSV] FIM - Importação concluída', {
            imported: result.imported,
            errors: result.errors.length,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
async function handleGetLeadMessages(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[leads.controller.handleGetLeadMessages] INÍCIO', { id, userId: req.userId });
    try {
        const query = paginationSchema.parse(req.query);
        const result = await (0, leads_service_1.getLeadMessages)(id, query);
        logger_1.logger.info('[leads.controller.handleGetLeadMessages] FIM', {
            id,
            total: result.pagination.total,
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleGetLeadActivities(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[leads.controller.handleGetLeadActivities] INÍCIO', { id, userId: req.userId });
    try {
        const query = paginationSchema.parse(req.query);
        const result = await (0, leads_service_1.getLeadActivities)(id, query);
        logger_1.logger.info('[leads.controller.handleGetLeadActivities] FIM', {
            id,
            total: result.pagination.total,
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleCheckWhatsapp(req, res, next) {
    logger_1.logger.info('[leads.controller.handleCheckWhatsapp] INÍCIO', { userId: req.userId });
    try {
        const { numbers } = zod_1.z.object({
            numbers: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'Informe ao menos 1 número'),
        }).parse(req.body);
        const result = await (0, leads_service_1.checkWhatsappNumbers)(numbers);
        logger_1.logger.info('[leads.controller.handleCheckWhatsapp] FIM', {
            verificados: result.length,
            comWhatsApp: result.filter((r) => r.exists).length,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleBulkWhatsappCleanup(req, res, next) {
    logger_1.logger.info('[leads.controller.handleBulkWhatsappCleanup] INÍCIO', {
        userId: req.userId,
        dryRun: req.query.dryRun,
    });
    try {
        const dryRun = req.query.dryRun === 'true';
        const result = await (0, leads_service_1.bulkWhatsappCleanup)(dryRun);
        logger_1.logger.info('[leads.controller.handleBulkWhatsappCleanup] FIM - Sucesso', result);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
async function handleAddNote(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[leads.controller.handleAddNote] INÍCIO', {
        leadId: id,
        userId: req.userId,
    });
    try {
        const { content } = addNoteSchema.parse(req.body);
        logger_1.logger.debug('[leads.controller.handleAddNote] Dados validados', {
            leadId: id,
            contentPreview: content.substring(0, 50),
        });
        const activity = await (0, leads_service_1.addNote)(id, content);
        logger_1.logger.info('[leads.controller.handleAddNote] FIM - Nota adicionada', { leadId: id });
        res.status(201).json({ success: true, data: activity });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[leads.controller.handleAddNote] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
//# sourceMappingURL=leads.controller.js.map