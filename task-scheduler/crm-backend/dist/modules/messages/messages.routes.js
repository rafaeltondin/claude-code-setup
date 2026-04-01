"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRoutes = void 0;
const express_1 = require("express");
const messages_controller_1 = require("./messages.controller");
exports.messagesRoutes = (0, express_1.Router)();
// POST /api/messages/whatsapp        — enviar mensagem WhatsApp
exports.messagesRoutes.post('/whatsapp', messages_controller_1.handleSendWhatsApp);
// POST /api/messages/email           — enviar e-mail
exports.messagesRoutes.post('/email', messages_controller_1.handleSendEmail);
// POST /api/messages/schedule        — agendar mensagem para envio futuro
exports.messagesRoutes.post('/schedule', messages_controller_1.handleScheduleMessage);
// GET  /api/messages/:leadId         — histórico de mensagens do lead
// @deprecated: Duplica funcionalidade de GET /api/leads/:id/messages.
//              Mantido para compatibilidade retroativa — não remover.
exports.messagesRoutes.get('/:leadId', messages_controller_1.handleGetMessagesByLead);
//# sourceMappingURL=messages.routes.js.map