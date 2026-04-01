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
exports.getSettings = getSettings;
exports.putSettings = putSettings;
exports.getSetupStatus = getSetupStatus;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const settingsService = __importStar(require("./settings.service"));
// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------
const settingsBatchSchema = zod_1.z.record(zod_1.z.string().min(1), zod_1.z.string());
// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------
async function getSettings(req, res, next) {
    logger_1.logger.info('[settings.controller] getSettings INICIO');
    try {
        const settings = await settingsService.getAllSettings();
        const flat = {};
        for (const s of settings) {
            flat[s.key] = s.value;
        }
        res.status(200).json({ success: true, data: flat });
    }
    catch (err) {
        logger_1.logger.error('[settings.controller] getSettings ERRO', { error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// PUT /api/settings
// ---------------------------------------------------------------------------
async function putSettings(req, res, next) {
    logger_1.logger.info('[settings.controller] putSettings INICIO', { chaves: Object.keys(req.body || {}) });
    try {
        const parseResult = settingsBatchSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new errors_1.AppError(400, 'Corpo da requisicao invalido', 'VALIDATION_ERROR');
        }
        const batch = parseResult.data;
        const atualizadas = [];
        for (const [key, value] of Object.entries(batch)) {
            const resultado = await settingsService.setSetting(key, value);
            atualizadas.push({ key: resultado.key, updatedAt: resultado.updatedAt });
        }
        res.status(200).json({ success: true, data: { updated: atualizadas } });
    }
    catch (err) {
        logger_1.logger.error('[settings.controller] putSettings ERRO', { error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// GET /api/settings/setup-status
// ---------------------------------------------------------------------------
async function getSetupStatus(req, res, next) {
    try {
        const smtpHost = await settingsService.getSetting('smtp_host');
        const steps = {
            account: true,
            email: smtpHost !== null && smtpHost.trim() !== '',
        };
        const completed = steps.account && steps.email;
        res.status(200).json({ success: true, data: { completed, steps } });
    }
    catch (err) {
        logger_1.logger.error('[settings.controller] getSetupStatus ERRO', { error: err.message });
        next(err);
    }
}
//# sourceMappingURL=settings.controller.js.map