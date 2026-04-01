"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.start = start;
exports.pause = pause;
exports.addLeads = addLeads;
exports.addSteps = addSteps;
exports.getStats = getStats;
exports.deleteCampaign = deleteCampaign;
exports.listLeads = listLeads;
exports.removeLead = removeLead;
exports.duplicate = duplicate;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const service = __importStar(require("./campaigns.service"));
// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.enum(['draft', 'active', 'paused', 'completed']).optional(),
});
const listCampaignLeadsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.enum(['active', 'completed', 'replied', 'paused', 'failed']).optional(),
});
const createCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório').max(200),
    description: zod_1.z.string().max(1000).optional(),
    channel: zod_1.z.enum(['whatsapp', 'email'], {
        required_error: 'Canal é obrigatório',
        invalid_type_error: 'Canal deve ser whatsapp ou email',
    }),
});
const updateCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).optional(),
    channel: zod_1.z.enum(['whatsapp', 'email']).optional(),
});
const campaignStepSchema = zod_1.z.object({
    order: zod_1.z.number().int().min(0),
    delayDays: zod_1.z.number().int().min(0),
    channel: zod_1.z.enum(['whatsapp', 'email']),
    template: zod_1.z.string().min(1, 'Template é obrigatório'),
    subject: zod_1.z.string().max(500).optional(),
});
const addStepsSchema = zod_1.z.object({
    steps: zod_1.z.array(campaignStepSchema).min(1, 'Informe pelo menos um step'),
});
const addLeadsSchema = zod_1.z.object({
    leadIds: zod_1.z.array(zod_1.z.string().cuid()).min(1, 'Informe pelo menos um leadId'),
});
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function validar(schema, data) {
    const resultado = schema.safeParse(data);
    if (!resultado.success) {
        const mensagem = resultado.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
        throw new errors_1.AppError(400, mensagem, 'VALIDATION_ERROR');
    }
    return resultado.data;
}
/** Extrai o parâmetro de rota como string simples */
function paramId(req, key = 'id') {
    const valor = req.params[key];
    return Array.isArray(valor) ? valor[0] : valor;
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
/**
 * GET /campaigns
 * Lista campanhas com paginação e filtro por status.
 */
async function list(req, res, next) {
    try {
        logger_1.logger.info('[campaigns.controller.list] Requisição recebida', {
            query: req.query,
        });
        const params = validar(listQuerySchema, req.query);
        const resultado = await service.listCampaigns(params);
        res.json({ success: true, ...resultado });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /campaigns/:id
 * Retorna uma campanha com steps e contagens.
 */
async function getById(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.getById] Requisição recebida', { id });
        const campanha = await service.getCampaign(id);
        res.json({ success: true, data: campanha });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /campaigns
 * Cria uma nova campanha.
 */
async function create(req, res, next) {
    try {
        logger_1.logger.info('[campaigns.controller.create] Requisição recebida', {
            body: req.body,
        });
        const dados = validar(createCampaignSchema, req.body);
        const campanha = await service.createCampaign(dados);
        res.status(201).json({ success: true, data: campanha });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PUT /campaigns/:id
 * Atualiza campos de uma campanha.
 */
async function update(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.update] Requisição recebida', {
            id,
            body: req.body,
        });
        const dados = validar(updateCampaignSchema, req.body);
        const campanha = await service.updateCampaign(id, dados);
        res.json({ success: true, data: campanha });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /campaigns/:id/start
 * Inicia uma campanha.
 */
async function start(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.start] Requisição recebida', { id });
        const resultado = await service.startCampaign(id);
        res.json({ success: true, data: resultado });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /campaigns/:id/pause
 * Pausa uma campanha ativa.
 */
async function pause(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.pause] Requisição recebida', { id });
        const resultado = await service.pauseCampaign(id);
        res.json({ success: true, data: resultado });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /campaigns/:id/leads
 * Adiciona leads a uma campanha.
 */
async function addLeads(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.addLeads] Requisição recebida', {
            id,
            body: req.body,
        });
        const { leadIds } = validar(addLeadsSchema, req.body);
        const resultado = await service.addLeads(id, leadIds);
        res.json({ success: true, data: resultado });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /campaigns/:id/steps
 * Define os steps de uma campanha.
 */
async function addSteps(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.addSteps] Requisição recebida', {
            id,
            body: req.body,
        });
        const { steps } = validar(addStepsSchema, req.body);
        const resultado = await service.addSteps(id, steps);
        res.json({ success: true, data: resultado });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /campaigns/:id/stats
 * Retorna estatísticas de uma campanha com breakdown por step.
 */
async function getStats(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.getStats] Requisição recebida', { id });
        const stats = await service.getCampaignStats(id);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
}
/**
 * DELETE /campaigns/:id
 * Deleta uma campanha (apenas draft, paused ou completed).
 */
async function deleteCampaign(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.deleteCampaign] Requisição recebida', { id });
        await service.deleteCampaign(id);
        res.json({ success: true, message: 'Campanha deletada com sucesso' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /campaigns/:id/leads
 * Lista leads de uma campanha com paginação e filtro por status.
 */
async function listLeads(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.listLeads] Requisição recebida', {
            id,
            query: req.query,
        });
        const params = validar(listCampaignLeadsQuerySchema, req.query);
        const resultado = await service.listCampaignLeads(id, params);
        res.json({ success: true, ...resultado });
    }
    catch (error) {
        next(error);
    }
}
/**
 * DELETE /campaigns/:id/leads/:leadId
 * Remove um lead de uma campanha.
 */
async function removeLead(req, res, next) {
    try {
        const id = paramId(req);
        const leadId = paramId(req, 'leadId');
        logger_1.logger.info('[campaigns.controller.removeLead] Requisição recebida', { id, leadId });
        await service.removeCampaignLead(id, leadId);
        res.json({ success: true, message: 'Lead removido da campanha com sucesso' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /campaigns/:id/duplicate
 * Clona uma campanha (mesmo nome + " (cópia)"), copiando todos os steps.
 * Não copia leads. Status da cópia é 'draft'.
 */
async function duplicate(req, res, next) {
    try {
        const id = paramId(req);
        logger_1.logger.info('[campaigns.controller.duplicate] Requisição recebida', { id });
        const copia = await service.duplicateCampaign(id);
        res.status(201).json({ success: true, data: copia });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=campaigns.controller.js.map