"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
// ---------------------------------------------------------------------------
// Redis com fallback graceful (funciona sem Redis rodando)
// ---------------------------------------------------------------------------
let _redis = null;
let _available = false;
try {
    _redis = new ioredis_1.default(env_1.env.REDIS_URL, {
        maxRetriesPerRequest: null, // BullMQ exige null
        enableReadyCheck: false,
        connectTimeout: 3000,
        lazyConnect: true,
        retryStrategy(times) {
            if (times > 3) {
                logger_1.logger.warn('[redis] Indisponivel — operando sem cache', { tentativas: times });
                _available = false;
                return null;
            }
            return Math.min(times * 200, 1000);
        },
    });
    _redis.on('error', (err) => {
        if (_available) {
            logger_1.logger.warn('[redis] Erro de conexao (degradando para sem cache)', { error: err.message });
        }
        _available = false;
    });
    _redis.on('ready', () => {
        _available = true;
        logger_1.logger.info('[redis] Conectado e pronto');
    });
    _redis.on('close', () => {
        _available = false;
    });
    // Tentar conectar (nao bloqueia se falhar)
    _redis.connect().catch(() => {
        logger_1.logger.warn('[redis] Nao foi possivel conectar — operando sem cache');
        _available = false;
    });
}
catch {
    logger_1.logger.warn('[redis] Falha ao criar instancia — operando sem cache');
}
// ---------------------------------------------------------------------------
// Proxy seguro — nunca lanca erro se Redis indisponivel
// ---------------------------------------------------------------------------
exports.redis = {
    async get(key) {
        if (!_available || !_redis)
            return null;
        try {
            return await _redis.get(key);
        }
        catch {
            return null;
        }
    },
    async setex(key, ttl, value) {
        if (!_available || !_redis)
            return;
        try {
            await _redis.setex(key, ttl, value);
        }
        catch { /* silencioso */ }
    },
    async del(...keys) {
        if (!_available || !_redis)
            return;
        try {
            await _redis.del(...keys);
        }
        catch { /* silencioso */ }
    },
    async exists(key) {
        if (!_available || !_redis)
            return 0;
        try {
            return await _redis.exists(key);
        }
        catch {
            return 0;
        }
    },
    async ping() {
        if (!_available || !_redis)
            return 'PONG (no-redis)';
        try {
            return await _redis.ping();
        }
        catch {
            return 'PONG (error)';
        }
    },
    async quit() {
        if (!_redis)
            return;
        try {
            await _redis.quit();
        }
        catch { /* silencioso */ }
    },
    get available() { return _available; },
    /** Instancia ioredis real (pode ser null) — usar APENAS para BullMQ connection */
    get ioredis() { return _redis; },
};
//# sourceMappingURL=redis.js.map