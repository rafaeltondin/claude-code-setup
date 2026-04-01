import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { getStats } from './dashboard.service';

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function handleGetStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[dashboard.controller.handleGetStats] INÍCIO');

  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
