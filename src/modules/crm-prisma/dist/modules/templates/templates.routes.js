"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templatesRoutes = void 0;
const express_1 = require("express");
const templates_controller_1 = require("./templates.controller");
exports.templatesRoutes = (0, express_1.Router)();
// GET    /api/templates              — listar templates (filtros: channel, category)
exports.templatesRoutes.get('/', templates_controller_1.handleListTemplates);
// GET    /api/templates/:id          — detalhe do template
exports.templatesRoutes.get('/:id', templates_controller_1.handleGetTemplate);
// POST   /api/templates              — criar template
exports.templatesRoutes.post('/', templates_controller_1.handleCreateTemplate);
// PUT    /api/templates/:id          — atualizar template
exports.templatesRoutes.put('/:id', templates_controller_1.handleUpdateTemplate);
// DELETE /api/templates/:id          — deletar template
exports.templatesRoutes.delete('/:id', templates_controller_1.handleDeleteTemplate);
// POST   /api/templates/:id/render   — renderizar template com dados do lead
exports.templatesRoutes.post('/:id/render', templates_controller_1.handleRenderTemplate);
//# sourceMappingURL=templates.routes.js.map