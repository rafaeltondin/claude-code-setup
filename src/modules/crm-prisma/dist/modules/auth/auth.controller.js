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
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRegister = postRegister;
exports.postLogin = postLogin;
exports.postLogout = postLogout;
exports.getMe = getMe;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const authService = __importStar(require("./auth.service"));
// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
    email: zod_1.z.string().email('Email invalido'),
    password: zod_1.z
        .string()
        .min(8, 'Senha deve ter no minimo 8 caracteres')
        .max(128, 'Senha muito longa'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalido'),
    password: zod_1.z.string().min(1, 'Senha obrigatoria'),
});
// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
async function postRegister(req, res, next) {
    logger_1.logger.info('[auth.controller] postRegister INICIO', {
        ip: req.ip,
        body: { ...req.body, password: '[REDACTED]' },
    });
    try {
        logger_1.logger.debug('[auth.controller] postRegister validando body...');
        const parseResult = registerSchema.safeParse(req.body);
        if (!parseResult.success) {
            const erros = parseResult.error.flatten().fieldErrors;
            logger_1.logger.warn('[auth.controller] postRegister body invalido', { erros });
            throw new errors_1.AppError(400, 'Dados invalidos', 'VALIDATION_ERROR');
        }
        const { name, email, password } = parseResult.data;
        logger_1.logger.debug('[auth.controller] postRegister validacao OK, chamando service...');
        const resultado = await authService.register(name, email, password);
        logger_1.logger.info('[auth.controller] postRegister FIM - sucesso', {
            userId: resultado.user.id,
        });
        res.status(201).json({
            success: true,
            data: resultado,
        });
    }
    catch (err) {
        logger_1.logger.error('[auth.controller] postRegister ERRO', {
            error: err.message,
        });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
async function postLogin(req, res, next) {
    logger_1.logger.info('[auth.controller] postLogin INICIO', {
        ip: req.ip,
        email: req.body?.email,
    });
    try {
        logger_1.logger.debug('[auth.controller] postLogin validando body...');
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            const erros = parseResult.error.flatten().fieldErrors;
            logger_1.logger.warn('[auth.controller] postLogin body invalido', { erros });
            throw new errors_1.AppError(400, 'Dados invalidos', 'VALIDATION_ERROR');
        }
        const { email, password } = parseResult.data;
        logger_1.logger.debug('[auth.controller] postLogin validacao OK, chamando service...');
        const resultado = await authService.login(email, password);
        logger_1.logger.info('[auth.controller] postLogin FIM - sucesso', {
            userId: resultado.user.id,
        });
        res.status(200).json({
            success: true,
            data: resultado,
        });
    }
    catch (err) {
        logger_1.logger.error('[auth.controller] postLogin ERRO', {
            error: err.message,
        });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
async function postLogout(req, res, next) {
    logger_1.logger.info('[auth.controller] postLogout INICIO', { ip: req.ip });
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger_1.logger.warn('[auth.controller] postLogout header Authorization ausente');
            throw new errors_1.AppError(401, 'Token de autenticacao ausente', 'MISSING_TOKEN');
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            logger_1.logger.warn('[auth.controller] postLogout formato de header invalido');
            throw new errors_1.AppError(401, 'Formato do token invalido. Use: Bearer <token>', 'INVALID_TOKEN_FORMAT');
        }
        const token = parts[1];
        logger_1.logger.debug('[auth.controller] postLogout invalidando token...');
        await authService.logout(token);
        logger_1.logger.info('[auth.controller] postLogout FIM - sucesso');
        res.status(200).json({
            success: true,
            message: 'Logout realizado',
        });
    }
    catch (err) {
        logger_1.logger.error('[auth.controller] postLogout ERRO', {
            error: err.message,
        });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
async function getMe(req, res, next) {
    logger_1.logger.info('[auth.controller] getMe INICIO', { userId: req.userId });
    try {
        logger_1.logger.debug('[auth.controller] getMe buscando dados do usuario...');
        const user = await authService.getUserById(req.userId);
        logger_1.logger.info('[auth.controller] getMe FIM - sucesso', { userId: user.id });
        res.status(200).json({
            success: true,
            data: { user },
        });
    }
    catch (err) {
        logger_1.logger.error('[auth.controller] getMe ERRO', {
            userId: req.userId,
            error: err.message,
        });
        next(err);
    }
}
//# sourceMappingURL=auth.controller.js.map