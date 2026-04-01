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
const express_1 = require("express");
const controller = __importStar(require("./campaigns.controller"));
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Rotas de campanhas
// ---------------------------------------------------------------------------
/**
 * GET /campaigns
 * Lista campanhas com paginação e filtro por status.
 * Query: page, limit, status
 */
router.get('/', controller.list);
/**
 * POST /campaigns
 * Cria uma nova campanha.
 * Body: { name, description?, channel }
 */
router.post('/', controller.create);
/**
 * GET /campaigns/:id
 * Retorna campanha com steps e contagens de leads/mensagens.
 */
router.get('/:id', controller.getById);
/**
 * PUT /campaigns/:id
 * Atualiza campos de uma campanha (apenas em estado draft ou paused).
 * Body: { name?, description?, channel? }
 */
router.put('/:id', controller.update);
/**
 * POST /campaigns/:id/start
 * Inicia a campanha: muda status para active e agenda o primeiro step de todos os leads.
 */
router.post('/:id/start', controller.start);
/**
 * POST /campaigns/:id/pause
 * Pausa uma campanha ativa.
 */
router.post('/:id/pause', controller.pause);
/**
 * POST /campaigns/:id/leads
 * Adiciona leads à campanha.
 * Body: { leadIds: string[] }
 */
router.post('/:id/leads', controller.addLeads);
/**
 * POST /campaigns/:id/steps
 * Define (substitui) os steps de uma campanha.
 * Body: { steps: [{ order, delayDays, channel, template, subject? }] }
 */
router.post('/:id/steps', controller.addSteps);
/**
 * GET /campaigns/:id/stats
 * Retorna estatísticas com breakdown por step e contagem de leads por status.
 */
router.get('/:id/stats', controller.getStats);
/**
 * DELETE /campaigns/:id
 * Deleta uma campanha (apenas se status for draft, paused ou completed).
 * Se status for active, retorna 400.
 */
router.delete('/:id', controller.deleteCampaign);
/**
 * GET /campaigns/:id/leads
 * Lista leads da campanha com dados do lead (name, email, phone, company).
 * Query: page, limit, status (active | completed | replied | paused | failed)
 */
router.get('/:id/leads', controller.listLeads);
/**
 * DELETE /campaigns/:id/leads/:leadId
 * Remove um lead da campanha.
 * Se a campanha estiver ativa, o lead simplesmente para de receber mensagens.
 */
router.delete('/:id/leads/:leadId', controller.removeLead);
/**
 * POST /campaigns/:id/duplicate
 * Clona a campanha: mesmo nome + " (cópia)", copia steps, NÃO copia leads.
 * Status da cópia = 'draft'.
 */
router.post('/:id/duplicate', controller.duplicate);
exports.default = router;
//# sourceMappingURL=campaigns.routes.js.map