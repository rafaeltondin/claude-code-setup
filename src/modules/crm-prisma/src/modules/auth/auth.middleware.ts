import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { TokenPayload } from './auth.service';

// Estender o tipo Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug('[auth.middleware] validando token JWT', {
    url: req.url,
    method: req.method,
  });

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('[auth.middleware] header Authorization ausente', {
      url: req.url,
    });
    return next(new AppError(401, 'Token de autenticacao ausente', 'MISSING_TOKEN'));
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('[auth.middleware] formato do header invalido', {
      authHeader: parts[0],
    });
    return next(
      new AppError(401, 'Formato do token invalido. Use: Bearer <token>', 'INVALID_TOKEN_FORMAT')
    );
  }

  const token = parts[1];

  // Dev-mode: aceitar token local sem verificação JWT
  if (process.env.NODE_ENV !== 'production' && token === 'local-dev-token') {
    logger.debug('[auth.middleware] dev-mode — usando token local sem verificação JWT');
    // Buscar ou criar o usuário dev padrão
    try {
      const { prisma } = await import('../../config/database');
      let devUser = await prisma.user.findFirst({ where: { email: 'rafael@riwerlabs.com' } });
      if (!devUser) {
        const bcrypt = await import('bcryptjs');
        devUser = await prisma.user.create({
          data: {
            name: 'Rafael',
            email: 'rafael@riwerlabs.com',
            password: await bcrypt.hash('dev-password', 10),
          },
        });
        logger.info('[auth.middleware] dev-mode — usuário dev criado', { userId: devUser.id });
      }
      req.userId = devUser.id;
      return next();
    } catch (devErr) {
      logger.warn('[auth.middleware] dev-mode — falha ao buscar usuário dev, usando ID fixo');
      req.userId = 'dev-user-id';
      return next();
    }
  }

  // Verificar assinatura JWT primeiro (independente do Redis)
  let payload: TokenPayload;
  try {
    logger.debug('[auth.middleware] verificando assinatura do token...');
    payload = jwt.verify(token, env.APP_SECRET) as TokenPayload;
    logger.debug('[auth.middleware] assinatura JWT valida', { userId: payload.userId });
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;

    logger.warn('[auth.middleware] token invalido ou expirado', {
      expired: isExpired,
      error: (err as Error).message,
    });

    if (isExpired) {
      return next(new AppError(401, 'Token expirado', 'TOKEN_EXPIRED'));
    }

    return next(new AppError(401, 'Token invalido', 'INVALID_TOKEN'));
  }

  // Verificar blacklist no Redis (nao-fatal — se Redis estiver offline, continua sem verificar)
  try {
    logger.debug('[auth.middleware] verificando blacklist do token...');
    const isBlacklisted = await redis.exists(`jwt:blacklist:${token}`);
    if (isBlacklisted) {
      logger.warn('[auth.middleware] token na blacklist (logout realizado)', { url: req.url });
      return next(new AppError(401, 'Token revogado', 'TOKEN_REVOKED'));
    }
    logger.debug('[auth.middleware] token nao esta na blacklist');
  } catch (redisErr) {
    logger.warn('[auth.middleware] Redis indisponivel — verificacao de blacklist ignorada (modo degradado)', {
      error: (redisErr as Error).message,
    });
    // Continua sem verificar blacklist quando Redis esta offline
  }

  req.userId = payload.userId;
  next();
}
