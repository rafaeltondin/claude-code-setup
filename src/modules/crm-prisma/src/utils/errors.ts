import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const meta = {
    method: req.method,
    url: req.url,
    userId: (req as Request & { userId?: string }).userId ?? null,
  };

  // Erros de validação Zod
  if (err instanceof ZodError) {
    logger.warn('[errorHandler] Erro de validação Zod', {
      ...meta,
      erros: err.errors,
    });

    res.status(400).json({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
        codigo: e.code,
      })),
    });
    return;
  }

  // Erros operacionais conhecidos (AppError)
  if (err instanceof AppError) {
    const is4xx = err.statusCode >= 400 && err.statusCode < 500;

    if (is4xx) {
      logger.warn('[errorHandler] Erro de cliente (4xx)', {
        ...meta,
        statusCode: err.statusCode,
        errorMessage: err.message,
        errorCode: err.code ?? null,
      });
    } else {
      logger.error('[errorHandler] Erro de servidor (5xx)', {
        ...meta,
        statusCode: err.statusCode,
        errorMessage: err.message,
        errorCode: err.code ?? null,
        stack: err.stack,
      });
    }

    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Erros inesperados (não tratados)
  logger.error('[errorHandler] Erro não tratado', {
    ...meta,
    errorType: err.constructor.name,
    errorMessage: err.message,
    stack: err.stack,
  });

  res.status(500).json({ error: 'Erro interno do servidor' });
}
