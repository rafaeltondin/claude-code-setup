"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRoutes = void 0;
const express_1 = require("express");
const leads_controller_1 = require("./leads.controller");
exports.leadsRoutes = (0, express_1.Router)();
// GET  /api/leads               — listar com filtros e paginação
exports.leadsRoutes.get('/', leads_controller_1.handleListLeads);
// POST /api/leads/import        — importar CSV (deve ficar ANTES de /:id)
exports.leadsRoutes.post('/import', leads_controller_1.uploadCSV.single('file'), leads_controller_1.handleImportCSV);
// POST /api/leads/check-whatsapp       — verificar se números têm WhatsApp antes de criar lead
exports.leadsRoutes.post('/check-whatsapp', leads_controller_1.handleCheckWhatsapp);
// POST /api/leads/bulk-whatsapp-cleanup — verificar todos os leads via Evolution API e deletar sem WhatsApp
// ?dryRun=true para simular sem deletar
exports.leadsRoutes.post('/bulk-whatsapp-cleanup', leads_controller_1.handleBulkWhatsappCleanup);
// GET  /api/leads/:id           — detalhe do lead (inclui messages e activities)
exports.leadsRoutes.get('/:id', leads_controller_1.handleGetLead);
// POST /api/leads               — criar lead
exports.leadsRoutes.post('/', leads_controller_1.handleCreateLead);
// PUT  /api/leads/:id           — atualizar lead
exports.leadsRoutes.put('/:id', leads_controller_1.handleUpdateLead);
// DELETE /api/leads/:id         — remover lead
exports.leadsRoutes.delete('/:id', leads_controller_1.handleDeleteLead);
// GET  /api/leads/:id/messages  — histórico de mensagens do lead
exports.leadsRoutes.get('/:id/messages', leads_controller_1.handleGetLeadMessages);
// GET  /api/leads/:id/activities — histórico de atividades do lead
exports.leadsRoutes.get('/:id/activities', leads_controller_1.handleGetLeadActivities);
// POST /api/leads/:id/notes     — adicionar nota ao lead
exports.leadsRoutes.post('/:id/notes', leads_controller_1.handleAddNote);
//# sourceMappingURL=leads.routes.js.map