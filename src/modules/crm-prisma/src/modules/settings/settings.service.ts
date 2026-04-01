import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { encrypt, decrypt } from '../../config/crypto';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Constantes de cache
// ---------------------------------------------------------------------------

const SETTINGS_CACHE_KEY = 'settings:all';
const SETTINGS_TTL = 300; // 5 minutos

// ---------------------------------------------------------------------------
// getSetting
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  logger.info('[settings.service] getSetting INICIO', { key });

  const setting = await prisma.setting.findUnique({ where: { key } });

  if (!setting) {
    logger.debug('[settings.service] getSetting nao encontrado', { key });
    return null;
  }

  logger.debug('[settings.service] getSetting descriptografando valor...', { key });

  try {
    const valor = decrypt(setting.value, setting.iv, setting.tag);
    logger.info('[settings.service] getSetting FIM - sucesso', { key });
    return valor;
  } catch (err) {
    logger.error('[settings.service] getSetting ERRO ao descriptografar', {
      key,
      error: (err as Error).message,
    });
    throw new AppError(500, 'Erro ao recuperar configuracao', 'DECRYPT_ERROR');
  }
}

// ---------------------------------------------------------------------------
// setSetting
// ---------------------------------------------------------------------------

export async function setSetting(key: string, value: string): Promise<SettingRecord> {
  logger.info('[settings.service] setSetting INICIO', { key });

  logger.debug('[settings.service] setSetting criptografando valor...', { key });

  const { encrypted, iv, tag } = encrypt(value);

  logger.debug('[settings.service] setSetting salvando no banco (upsert)...', { key });

  const setting = await prisma.setting.upsert({
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
  logger.debug('[settings.service] setSetting invalidando cache Redis...', {
    cacheKey: SETTINGS_CACHE_KEY,
  });
  await redis.del(SETTINGS_CACHE_KEY);

  logger.info('[settings.service] setSetting FIM - sucesso', {
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

export async function getAllSettings(): Promise<SettingRecord[]> {
  logger.info('[settings.service] getAllSettings INICIO');

  // Verificar cache Redis
  logger.debug('[settings.service] getAllSettings verificando cache Redis...', {
    cacheKey: SETTINGS_CACHE_KEY,
  });

  const cached = await redis.get(SETTINGS_CACHE_KEY);

  if (cached) {
    logger.info('[settings.service] getAllSettings Cache HIT — retornando do Redis', {
      cacheKey: SETTINGS_CACHE_KEY,
    });
    return JSON.parse(cached) as SettingRecord[];
  }

  logger.debug('[settings.service] getAllSettings Cache MISS — buscando no banco...');

  const settings = await prisma.setting.findMany({
    orderBy: { key: 'asc' },
  });

  logger.debug('[settings.service] getAllSettings encontradas', {
    total: settings.length,
  });

  const resultado: SettingRecord[] = [];

  for (const setting of settings) {
    try {
      const valor = decrypt(setting.value, setting.iv, setting.tag);
      resultado.push({
        key: setting.key,
        value: valor,
        updatedAt: setting.updatedAt,
      });
    } catch (err) {
      logger.error('[settings.service] getAllSettings ERRO ao descriptografar setting', {
        key: setting.key,
        error: (err as Error).message,
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
  logger.debug('[settings.service] getAllSettings salvando no cache Redis...', {
    cacheKey: SETTINGS_CACHE_KEY,
    ttl: SETTINGS_TTL,
    total: resultado.length,
  });

  await redis.setex(SETTINGS_CACHE_KEY, SETTINGS_TTL, JSON.stringify(resultado));

  logger.info('[settings.service] getAllSettings FIM - sucesso', {
    total: resultado.length,
    cacheGravado: true,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// deleteSetting
// ---------------------------------------------------------------------------

export async function deleteSetting(key: string): Promise<void> {
  logger.info('[settings.service] deleteSetting INICIO', { key });

  const existente = await prisma.setting.findUnique({ where: { key } });

  if (!existente) {
    logger.warn('[settings.service] deleteSetting configuracao nao encontrada', {
      key,
    });
    throw new AppError(404, `Configuracao '${key}' nao encontrada`, 'SETTING_NOT_FOUND');
  }

  await prisma.setting.delete({ where: { key } });

  // Invalidar cache apos exclusao
  logger.debug('[settings.service] deleteSetting invalidando cache Redis...', {
    cacheKey: SETTINGS_CACHE_KEY,
  });
  await redis.del(SETTINGS_CACHE_KEY);

  logger.info('[settings.service] deleteSetting FIM - sucesso', { key });
}
