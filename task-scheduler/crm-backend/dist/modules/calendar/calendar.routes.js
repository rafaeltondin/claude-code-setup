"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarRoutes = void 0;
const express_1 = require("express");
const calendar_service_1 = require("./calendar.service");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
exports.calendarRoutes = router;
// GET /availability?month=YYYY-MM — datas bloqueadas (endpoint legado)
router.get('/availability', async (req, res) => {
    try {
        const month = req.query.month;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            res.status(400).json({
                error: 'Parametro "month" obrigatorio no formato YYYY-MM',
                example: '?month=2026-03',
            });
            return;
        }
        const blocked = await (0, calendar_service_1.getBlockedDates)(month);
        res.json({
            month,
            blockedDates: blocked,
            totalBlocked: blocked.length,
        });
    }
    catch (err) {
        logger_1.logger.error('[calendar] Erro ao buscar disponibilidade', {
            error: err.message,
        });
        res.status(500).json({ error: 'Falha ao consultar disponibilidade' });
    }
});
// GET /events?timeMin=ISO&timeMax=ISO — listar eventos
router.get('/events', async (req, res) => {
    try {
        const { timeMin, timeMax, month, year } = req.query;
        let tMin;
        let tMax;
        if (month && year) {
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            tMin = new Date(y, m - 1, 1).toISOString();
            tMax = new Date(y, m, 0, 23, 59, 59).toISOString();
        }
        else if (timeMin && timeMax) {
            tMin = timeMin;
            tMax = timeMax;
        }
        else {
            // Default: mes atual
            const now = new Date();
            tMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            tMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        }
        const events = await (0, calendar_service_1.listEvents)(tMin, tMax);
        res.json({ success: true, data: events });
    }
    catch (err) {
        logger_1.logger.error('[calendar] Erro ao listar eventos', { error: err.message });
        res.status(500).json({ error: 'Falha ao listar eventos do calendário' });
    }
});
// POST /events — criar evento
router.post('/events', async (req, res) => {
    try {
        const { title, start, end, description, location, isAllDay } = req.body;
        if (!title || !start || !end) {
            res.status(400).json({ error: 'title, start e end são obrigatórios' });
            return;
        }
        const event = await (0, calendar_service_1.createEvent)({ title, start, end, description, location, isAllDay });
        res.status(201).json({ success: true, data: event });
    }
    catch (err) {
        logger_1.logger.error('[calendar] Erro ao criar evento', { error: err.message });
        res.status(500).json({ error: 'Falha ao criar evento no calendário' });
    }
});
// DELETE /events/:eventId — deletar evento
router.delete('/events/:eventId', async (req, res) => {
    try {
        const eventId = req.params['eventId'];
        await (0, calendar_service_1.deleteEvent)(eventId);
        res.json({ success: true, message: 'Evento deletado' });
    }
    catch (err) {
        logger_1.logger.error('[calendar] Erro ao deletar evento', { error: err.message });
        res.status(500).json({ error: 'Falha ao deletar evento' });
    }
});
//# sourceMappingURL=calendar.routes.js.map