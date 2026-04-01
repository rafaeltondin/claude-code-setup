"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = void 0;
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
exports.dashboardRoutes = (0, express_1.Router)();
// GET /api/dashboard/stats — resumo financeiro e contadores
exports.dashboardRoutes.get('/stats', dashboard_controller_1.handleGetStats);
//# sourceMappingURL=dashboard.routes.js.map