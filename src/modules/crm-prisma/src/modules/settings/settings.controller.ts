import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import * as settingsService from './settings.service';

// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------

const settingsBatchSchema = z.record(z.string().min(1), z.string());

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------

export async function getSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[settings.controller] getSettings INICIO');

  try {
    const settings = await settingsService.getAllSettings();

    const flat: Record<string, string> = {};
    for (const s of settings) {
      flat[s.key] = s.value;
    }

    res.status(200).json({ success: true, data: flat });
  } catch (err) {
    logger.error('[settings.controller] getSettings ERRO', { error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings
// ---------------------------------------------------------------------------

export async function putSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[settings.controller] putSettings INICIO', { chaves: Object.keys(req.body || {}) });

  try {
    const parseResult = settingsBatchSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new AppError(400, 'Corpo da requisicao invalido', 'VALIDATION_ERROR');
    }

    const batch = parseResult.data;
    const atualizadas: Array<{ key: string; updatedAt: Date }> = [];

    for (const [key, value] of Object.entries(batch)) {
      const resultado = await settingsService.setSetting(key, value);
      atualizadas.push({ key: resultado.key, updatedAt: resultado.updatedAt });
    }

    res.status(200).json({ success: true, data: { updated: atualizadas } });
  } catch (err) {
    logger.error('[settings.controller] putSettings ERRO', { error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/settings/setup-status
// ---------------------------------------------------------------------------

export async function getSetupStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const smtpHost = await settingsService.getSetting('smtp_host');

    const steps = {
      account: true,
      email: smtpHost !== null && smtpHost.trim() !== '',
    };

    const completed = steps.account && steps.email;

    res.status(200).json({ success: true, data: { completed, steps } });
  } catch (err) {
    logger.error('[settings.controller] getSetupStatus ERRO', { error: (err as Error).message });
    next(err);
  }
}
