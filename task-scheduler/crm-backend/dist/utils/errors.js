"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const logger_1 = require("./logger");
class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, _next) {
    const meta = {
        method: req.method,
        url: req.url,
        userId: req.userId ?? null,
    };
    // Erros de validação Zod
    if (err instanceof zod_1.ZodError) {
        logger_1.logger.warn('[errorHandler] Erro de validação Zod', {
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
            logger_1.logger.warn('[errorHandler] Erro de cliente (4xx)', {
                ...meta,
                statusCode: err.statusCode,
                errorMessage: err.message,
                errorCode: err.code ?? null,
            });
        }
        else {
            logger_1.logger.error('[errorHandler] Erro de servidor (5xx)', {
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
    logger_1.logger.error('[errorHandler] Erro não tratado', {
        ...meta,
        errorType: err.constructor.name,
        errorMessage: err.message,
        stack: err.stack,
    });
    res.status(500).json({ error: 'Erro interno do servidor' });
}
//# sourceMappingURL=errors.js.map