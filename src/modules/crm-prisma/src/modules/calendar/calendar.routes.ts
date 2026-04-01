import { Router, Request, Response } from 'express';
import { getBlockedDates, listEvents, createEvent, deleteEvent } from './calendar.service';
import { logger } from '../../utils/logger';

const router = Router();

// GET /availability?month=YYYY-MM — datas bloqueadas (endpoint legado)
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({
        error: 'Parametro "month" obrigatorio no formato YYYY-MM',
        example: '?month=2026-03',
      });
      return;
    }

    const blocked = await getBlockedDates(month);

    res.json({
      month,
      blockedDates: blocked,
      totalBlocked: blocked.length,
    });
  } catch (err) {
    logger.error('[calendar] Erro ao buscar disponibilidade', {
      error: (err as Error).message,
    });
    res.status(500).json({ error: 'Falha ao consultar disponibilidade' });
  }
});

// GET /events?timeMin=ISO&timeMax=ISO — listar eventos
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { timeMin, timeMax, month, year } = req.query as Record<string, string>;

    let tMin: string;
    let tMax: string;

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      tMin = new Date(y, m - 1, 1).toISOString();
      tMax = new Date(y, m, 0, 23, 59, 59).toISOString();
    } else if (timeMin && timeMax) {
      tMin = timeMin;
      tMax = timeMax;
    } else {
      // Default: mes atual
      const now = new Date();
      tMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      tMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    }

    const events = await listEvents(tMin, tMax);
    res.json({ success: true, data: events });
  } catch (err) {
    logger.error('[calendar] Erro ao listar eventos', { error: (err as Error).message });
    res.status(500).json({ error: 'Falha ao listar eventos do calendário' });
  }
});

// POST /events — criar evento
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { title, start, end, description, location, isAllDay } = req.body as {
      title?: string;
      start?: string;
      end?: string;
      description?: string;
      location?: string;
      isAllDay?: boolean;
    };

    if (!title || !start || !end) {
      res.status(400).json({ error: 'title, start e end são obrigatórios' });
      return;
    }

    const event = await createEvent({ title, start, end, description, location, isAllDay });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    logger.error('[calendar] Erro ao criar evento', { error: (err as Error).message });
    res.status(500).json({ error: 'Falha ao criar evento no calendário' });
  }
});

// DELETE /events/:eventId — deletar evento
router.delete('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = req.params['eventId'] as string;
    await deleteEvent(eventId);
    res.json({ success: true, message: 'Evento deletado' });
  } catch (err) {
    logger.error('[calendar] Erro ao deletar evento', { error: (err as Error).message });
    res.status(500).json({ error: 'Falha ao deletar evento' });
  }
});

export { router as calendarRoutes };
