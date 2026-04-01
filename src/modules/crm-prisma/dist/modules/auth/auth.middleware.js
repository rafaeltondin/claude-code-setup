"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const redis_1 = require("../../config/redis");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
async function authMiddleware(req, _res, next) {
    logger_1.logger.debug('[auth.middleware] validando token JWT', {
        url: req.url,
        method: req.method,
    });
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        logger_1.logger.warn('[auth.middleware] header Authorization ausente', {
            url: req.url,
        });
        return next(new errors_1.AppError(401, 'Token de autenticacao ausente', 'MISSING_TOKEN'));
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        logger_1.logger.warn('[auth.middleware] formato do header invalido', {
            authHeader: parts[0],
        });
        return next(new errors_1.AppError(401, 'Formato do token invalido. Use: Bearer <token>', 'INVALID_TOKEN_FORMAT'));
    }
    const token = parts[1];
    // Dev-mode: aceitar token local sem verificação JWT
    if (process.env.NODE_ENV !== 'production' && token === 'local-dev-token') {
        logger_1.logger.debug('[auth.middleware] dev-mode — usando token local sem verificação JWT');
        // Buscar ou criar o usuário dev padrão
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../../config/database')));
            let devUser = await prisma.user.findFirst({ where: { email: 'rafael@riwerlabs.com' } });
            if (!devUser) {
                const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
                devUser = await prisma.user.create({
                    data: {
                        name: 'Rafael',
                        email: 'rafael@riwerlabs.com',
                        password: await bcrypt.hash('dev-password', 10),
                    },
                });
                logger_1.logger.info('[auth.middleware] dev-mode — usuário dev criado', { userId: devUser.id });
            }
            req.userId = devUser.id;
            return next();
        }
        catch (devErr) {
            logger_1.logger.warn('[auth.middleware] dev-mode — falha ao buscar usuário dev, usando ID fixo');
            req.userId = 'dev-user-id';
            return next();
        }
    }
    // Verificar assinatura JWT primeiro (independente do Redis)
    let payload;
    try {
        logger_1.logger.debug('[auth.middleware] verificando assinatura do token...');
        payload = jsonwebtoken_1.default.verify(token, env_1.env.APP_SECRET);
        logger_1.logger.debug('[auth.middleware] assinatura JWT valida', { userId: payload.userId });
    }
    catch (err) {
        const isExpired = err instanceof jsonwebtoken_1.default.TokenExpiredError;
        logger_1.logger.warn('[auth.middleware] token invalido ou expirado', {
            expired: isExpired,
            error: err.message,
        });
        if (isExpired) {
            return next(new errors_1.AppError(401, 'Token expirado', 'TOKEN_EXPIRED'));
        }
        return next(new errors_1.AppError(401, 'Token invalido', 'INVALID_TOKEN'));
    }
    // Verificar blacklist no Redis (nao-fatal — se Redis estiver offline, continua sem verificar)
    try {
        logger_1.logger.debug('[auth.middleware] verificando blacklist do token...');
        const isBlacklisted = await redis_1.redis.exists(`jwt:blacklist:${token}`);
        if (isBlacklisted) {
            logger_1.logger.warn('[auth.middleware] token na blacklist (logout realizado)', { url: req.url });
            return next(new errors_1.AppError(401, 'Token revogado', 'TOKEN_REVOKED'));
        }
        logger_1.logger.debug('[auth.middleware] token nao esta na blacklist');
    }
    catch (redisErr) {
        logger_1.logger.warn('[auth.middleware] Redis indisponivel — verificacao de blacklist ignorada (modo degradado)', {
            error: redisErr.message,
        });
        // Continua sem verificar blacklist quando Redis esta offline
    }
    req.userId = payload.userId;
    next();
}
//# sourceMappingURL=auth.middleware.js.map