"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.getAllSettings = getAllSettings;
exports.deleteSetting = deleteSetting;
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const crypto_1 = require("../../config/crypto");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
// ---------------------------------------------------------------------------
// Constantes de cache
// ---------------------------------------------------------------------------
const SETTINGS_CACHE_KEY = 'settings:all';
const SETTINGS_TTL = 300; // 5 minutos
// ---------------------------------------------------------------------------
// getSetting
// ---------------------------------------------------------------------------
async function getSetting(key) {
    logger_1.logger.info('[settings.service] getSetting INICIO', { key });
    const setting = await database_1.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
        logger_1.logger.debug('[settings.service] getSetting nao encontrado', { key });
        return null;
    }
    logger_1.logger.debug('[settings.service] getSetting descriptografando valor...', { key });
    try {
        const valor = (0, crypto_1.decrypt)(setting.value, setting.iv, setting.tag);
        logger_1.logger.info('[settings.service] getSetting FIM - sucesso', { key });
        return valor;
    }
    catch (err) {
        logger_1.logger.error('[settings.service] getSetting ERRO ao descriptografar', {
            key,
            error: err.message,
        });
        throw new errors_1.AppError(500, 'Erro ao recuperar configuracao', 'DECRYPT_ERROR');
    }
}
// ---------------------------------------------------------------------------
// setSetting
// ---------------------------------------------------------------------------
async function setSetting(key, value) {
    logger_1.logger.info('[settings.service] setSetting INICIO', { key });
    logger_1.logger.debug('[settings.service] setSetting criptografando valor...', { key });
    const { encrypted, iv, tag } = (0, crypto_1.encrypt)(value);
    logger_1.logger.debug('[settings.service] setSetting salvando no banco (upsert)...', { key });
    const setting = await database_1.prisma.setting.upsert({
        where: { key },
        update: {
            value: encrypted,
            iv,
            tag,
        },
        create: {
            key,
            value: encrypted,
            iv,
            tag,
        },
    });
    // Invalidar cache apos alteracao
    logger_1.logger.debug('[settings.service] setSetting invalidando cache Redis...', {
        cacheKey: SETTINGS_CACHE_KEY,
    });
    await redis_1.redis.del(SETTINGS_CACHE_KEY);
    logger_1.logger.info('[settings.service] setSetting FIM - sucesso', {
        key,
        id: setting.id,
    });
    return {
        key: setting.key,
        value,
        updatedAt: setting.updatedAt,
    };
}
// ---------------------------------------------------------------------------
// getAllSettings
// ---------------------------------------------------------------------------
async function getAllSettings() {
    logger_1.logger.info('[settings.service] getAllSettings INICIO');
    // Verificar cache Redis
    logger_1.logger.debug('[settings.service] getAllSettings verificando cache Redis...', {
        cacheKey: SETTINGS_CACHE_KEY,
    });
    const cached = await redis_1.redis.get(SETTINGS_CACHE_KEY);
    if (cached) {
        logger_1.logger.info('[settings.service] getAllSettings Cache HIT — retornando do Redis', {
            cacheKey: SETTINGS_CACHE_KEY,
        });
        return JSON.parse(cached);
    }
    logger_1.logger.debug('[settings.service] getAllSettings Cache MISS — buscando no banco...');
    const settings = await database_1.prisma.setting.findMany({
        orderBy: { key: 'asc' },
    });
    logger_1.logger.debug('[settings.service] getAllSettings encontradas', {
        total: settings.length,
    });
    const resultado = [];
    for (const setting of settings) {
        try {
            const valor = (0, crypto_1.decrypt)(setting.value, setting.iv, setting.tag);
            resultado.push({
                key: setting.key,
                value: valor,
                updatedAt: setting.updatedAt,
            });
        }
        catch (err) {
            logger_1.logger.error('[settings.service] getAllSettings ERRO ao descriptografar setting', {
                key: setting.key,
                error: err.message,
            });
            // Inclui com valor vazio para nao quebrar a listagem
            resultado.push({
                key: setting.key,
                value: '',
                updatedAt: setting.updatedAt,
            });
        }
    }
    // Salvar no cache Redis (serializando as datas como string — JSON.stringify faz isso automaticamente)
    logger_1.logger.debug('[settings.service] getAllSettings salvando no cache Redis...', {
        cacheKey: SETTINGS_CACHE_KEY,
        ttl: SETTINGS_TTL,
        total: resultado.length,
    });
    await redis_1.redis.setex(SETTINGS_CACHE_KEY, SETTINGS_TTL, JSON.stringify(resultado));
    logger_1.logger.info('[settings.service] getAllSettings FIM - sucesso', {
        total: resultado.length,
        cacheGravado: true,
    });
    return resultado;
}
// ---------------------------------------------------------------------------
// deleteSetting
// ---------------------------------------------------------------------------
async function deleteSetting(key) {
    logger_1.logger.info('[settings.service] deleteSetting INICIO', { key });
    const existente = await database_1.prisma.setting.findUnique({ where: { key } });
    if (!existente) {
        logger_1.logger.warn('[settings.service] deleteSetting configuracao nao encontrada', {
            key,
        });
        throw new errors_1.AppError(404, `Configuracao '${key}' nao encontrada`, 'SETTING_NOT_FOUND');
    }
    await database_1.prisma.setting.delete({ where: { key } });
    // Invalidar cache apos exclusao
    logger_1.logger.debug('[settings.service] deleteSetting invalidando cache Redis...', {
        cacheKey: SETTINGS_CACHE_KEY,
    });
    await redis_1.redis.del(SETTINGS_CACHE_KEY);
    logger_1.logger.info('[settings.service] deleteSetting FIM - sucesso', { key });
}
//# sourceMappingURL=settings.service.js.map