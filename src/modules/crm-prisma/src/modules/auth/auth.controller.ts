import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import * as authService from './auth.service';

// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
  email: z.string().email('Email invalido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no minimo 8 caracteres')
    .max(128, 'Senha muito longa'),
});

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

export async function postRegister(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[auth.controller] postRegister INICIO', {
    ip: req.ip,
    body: { ...req.body, password: '[REDACTED]' },
  });

  try {
    logger.debug('[auth.controller] postRegister validando body...');

    const parseResult = registerSchema.safeParse(req.body);

    if (!parseResult.success) {
      const erros = parseResult.error.flatten().fieldErrors;
      logger.warn('[auth.controller] postRegister body invalido', { erros });
      throw new AppError(400, 'Dados invalidos', 'VALIDATION_ERROR');
    }

    const { name, email, password } = parseResult.data;

    logger.debug('[auth.controller] postRegister validacao OK, chamando service...');

    const resultado = await authService.register(name, email, password);

    logger.info('[auth.controller] postRegister FIM - sucesso', {
      userId: resultado.user.id,
    });

    res.status(201).json({
      success: true,
      data: resultado,
    });
  } catch (err) {
    logger.error('[auth.controller] postRegister ERRO', {
      error: (err as Error).message,
    });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function postLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[auth.controller] postLogin INICIO', {
    ip: req.ip,
    email: req.body?.email,
  });

  try {
    logger.debug('[auth.controller] postLogin validando body...');

    const parseResult = loginSchema.safeParse(req.body);

    if (!parseResult.success) {
      const erros = parseResult.error.flatten().fieldErrors;
      logger.warn('[auth.controller] postLogin body invalido', { erros });
      throw new AppError(400, 'Dados invalidos', 'VALIDATION_ERROR');
    }

    const { email, password } = parseResult.data;

    logger.debug('[auth.controller] postLogin validacao OK, chamando service...');

    const resultado = await authService.login(email, password);

    logger.info('[auth.controller] postLogin FIM - sucesso', {
      userId: resultado.user.id,
    });

    res.status(200).json({
      success: true,
      data: resultado,
    });
  } catch (err) {
    logger.error('[auth.controller] postLogin ERRO', {
      error: (err as Error).message,
    });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

export async function postLogout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[auth.controller] postLogout INICIO', { ip: req.ip });

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('[auth.controller] postLogout header Authorization ausente');
      throw new AppError(401, 'Token de autenticacao ausente', 'MISSING_TOKEN');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      logger.warn('[auth.controller] postLogout formato de header invalido');
      throw new AppError(401, 'Formato do token invalido. Use: Bearer <token>', 'INVALID_TOKEN_FORMAT');
    }

    const token = parts[1];

    logger.debug('[auth.controller] postLogout invalidando token...');
    await authService.logout(token);

    logger.info('[auth.controller] postLogout FIM - sucesso');

    res.status(200).json({
      success: true,
      message: 'Logout realizado',
    });
  } catch (err) {
    logger.error('[auth.controller] postLogout ERRO', {
      error: (err as Error).message,
    });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('[auth.controller] getMe INICIO', { userId: req.userId });

  try {
    logger.debug('[auth.controller] getMe buscando dados do usuario...');

    const user = await authService.getUserById(req.userId);

    logger.info('[auth.controller] getMe FIM - sucesso', { userId: user.id });

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    logger.error('[auth.controller] getMe ERRO', {
      userId: req.userId,
      error: (err as Error).message,
    });
    next(err);
  }
}
