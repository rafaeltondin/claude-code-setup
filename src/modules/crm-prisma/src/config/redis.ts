import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Redis com fallback graceful (funciona sem Redis rodando)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;
let _available = false;

try {
  _redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // BullMQ exige null
    enableReadyCheck: false,
    connectTimeout: 3000,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('[redis] Indisponivel — operando sem cache', { tentativas: times });
        _available = false;
        return null;
      }
      return Math.min(times * 200, 1000);
    },
  });

  _redis.on('error', (err) => {
    if (_available) {
      logger.warn('[redis] Erro de conexao (degradando para sem cache)', { error: err.message });
    }
    _available = false;
  });

  _redis.on('ready', () => {
    _available = true;
    logger.info('[redis] Conectado e pronto');
  });

  _redis.on('close', () => {
    _available = false;
  });

  // Tentar conectar (nao bloqueia se falhar)
  _redis.connect().catch(() => {
    logger.warn('[redis] Nao foi possivel conectar — operando sem cache');
    _available = false;
  });
} catch {
  logger.warn('[redis] Falha ao criar instancia — operando sem cache');
}

// ---------------------------------------------------------------------------
// Proxy seguro — nunca lanca erro se Redis indisponivel
// ---------------------------------------------------------------------------

export const redis = {
  async get(key: string): Promise<string | null> {
    if (!_available || !_redis) return null;
    try { return await _redis.get(key); } catch { return null; }
  },
  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (!_available || !_redis) return;
    try { await _redis.setex(key, ttl, value); } catch { /* silencioso */ }
  },
  async del(...keys: string[]): Promise<void> {
    if (!_available || !_redis) return;
    try { await _redis.del(...keys); } catch { /* silencioso */ }
  },
  async exists(key: string): Promise<number> {
    if (!_available || !_redis) return 0;
    try { return await _redis.exists(key); } catch { return 0; }
  },
  async ping(): Promise<string> {
    if (!_available || !_redis) return 'PONG (no-redis)';
    try { return await _redis.ping(); } catch { return 'PONG (error)'; }
  },
  async quit(): Promise<void> {
    if (!_redis) return;
    try { await _redis.quit(); } catch { /* silencioso */ }
  },
  get available(): boolean { return _available; },
  /** Instancia ioredis real (pode ser null) — usar APENAS para BullMQ connection */
  get ioredis(): Redis | null { return _redis; },
};
