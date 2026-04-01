"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetStats = handleGetStats;
const logger_1 = require("../../utils/logger");
const dashboard_service_1 = require("./dashboard.service");
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
async function handleGetStats(req, res, next) {
    logger_1.logger.info('[dashboard.controller.handleGetStats] INÍCIO');
    try {
        const stats = await (0, dashboard_service_1.getStats)();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=dashboard.controller.js.map