/**
 * Knowledge Base Cache System
 * Sistema de cache para acelerar buscas na KB
 *
 * Features:
 * - Cache de índice de documentos (evita reprocessamento)
 * - Cache de resultados de busca (evita recálculo)
 * - TTL configurável (padrão: 5 minutos)
 * - Invalidação automática quando arquivos mudam
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '.cache');
const INDEX_CACHE_FILE = path.join(CACHE_DIR, 'index-cache.json');
const SEARCH_CACHE_FILE = path.join(CACHE_DIR, 'search-cache.json');

// TTL em milissegundos (5 minutos padrão)
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache em memória para acesso ultra-rápido
let memoryCache = {
    index: null,
    indexHash: null,
    searches: new Map(),
    lastCleanup: Date.now()
};

/**
 * Inicializa diretório de cache
 */
function initCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

/**
 * Gera hash dos arquivos da KB para detectar mudanças
 */
function generateKBHash(files) {
    const stats = files.map(f => {
        try {
            const stat = fs.statSync(f);
            return `${f}:${stat.mtime.getTime()}:${stat.size}`;
        } catch {
            return f;
        }
    }).join('|');

    return crypto.createHash('md5').update(stats).digest('hex');
}

/**
 * Salva índice em cache
 */
function saveIndexCache(index, hash) {
    initCacheDir();
    const cache = {
        hash,
        timestamp: Date.now(),
        index
    };

    try {
        fs.writeFileSync(INDEX_CACHE_FILE, JSON.stringify(cache), 'utf-8');
        memoryCache.index = index;
        memoryCache.indexHash = hash;
    } catch (e) {
        console.error('[Cache] Erro ao salvar índice:', e.message);
    }
}

/**
 * Carrega índice do cache
 */
function loadIndexCache(currentHash) {
    // Primeiro tenta memória
    if (memoryCache.index && memoryCache.indexHash === currentHash) {
        return memoryCache.index;
    }

    // Depois tenta disco
    try {
        if (fs.existsSync(INDEX_CACHE_FILE)) {
            const cache = JSON.parse(fs.readFileSync(INDEX_CACHE_FILE, 'utf-8'));

            if (cache.hash === currentHash) {
                memoryCache.index = cache.index;
                memoryCache.indexHash = currentHash;
                return cache.index;
            }
        }
    } catch (e) {
        console.error('[Cache] Erro ao carregar índice:', e.message);
    }

    return null;
}

/**
 * Gera chave de cache para busca
 */
function generateSearchKey(query, options) {
    const normalized = JSON.stringify({ query: query.toLowerCase().trim(), options });
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Salva resultado de busca em cache
 */
function saveSearchCache(key, results, ttl = DEFAULT_TTL) {
    const entry = {
        results,
        timestamp: Date.now(),
        ttl
    };

    // Salva em memória
    memoryCache.searches.set(key, entry);

    // Persiste em disco periodicamente (a cada 10 buscas)
    if (memoryCache.searches.size % 10 === 0) {
        persistSearchCache();
    }
}

/**
 * Carrega resultado de busca do cache
 */
function loadSearchCache(key) {
    // Primeiro tenta memória
    const memEntry = memoryCache.searches.get(key);
    if (memEntry) {
        const age = Date.now() - memEntry.timestamp;
        if (age < memEntry.ttl) {
            return memEntry.results;
        } else {
            memoryCache.searches.delete(key);
        }
    }

    return null;
}

/**
 * Persiste cache de buscas em disco
 */
function persistSearchCache() {
    initCacheDir();

    const cacheData = {};
    const now = Date.now();

    memoryCache.searches.forEach((entry, key) => {
        const age = now - entry.timestamp;
        if (age < entry.ttl) {
            cacheData[key] = entry;
        }
    });

    try {
        fs.writeFileSync(SEARCH_CACHE_FILE, JSON.stringify(cacheData), 'utf-8');
    } catch (e) {
        console.error('[Cache] Erro ao persistir buscas:', e.message);
    }
}

/**
 * Carrega cache de buscas do disco
 */
function loadSearchCacheFromDisk() {
    try {
        if (fs.existsSync(SEARCH_CACHE_FILE)) {
            const cacheData = JSON.parse(fs.readFileSync(SEARCH_CACHE_FILE, 'utf-8'));
            const now = Date.now();

            Object.entries(cacheData).forEach(([key, entry]) => {
                const age = now - entry.timestamp;
                if (age < entry.ttl) {
                    memoryCache.searches.set(key, entry);
                }
            });
        }
    } catch (e) {
        console.error('[Cache] Erro ao carregar buscas:', e.message);
    }
}

/**
 * Limpa entradas expiradas do cache
 */
function cleanupCache() {
    const now = Date.now();

    // Só limpa a cada minuto
    if (now - memoryCache.lastCleanup < 60000) {
        return;
    }

    memoryCache.lastCleanup = now;

    let removed = 0;
    memoryCache.searches.forEach((entry, key) => {
        const age = now - entry.timestamp;
        if (age >= entry.ttl) {
            memoryCache.searches.delete(key);
            removed++;
        }
    });

    if (removed > 0) {
        console.log(`[Cache] Removidas ${removed} entradas expiradas`);
    }
}

/**
 * Invalida todo o cache (usar quando KB muda significativamente)
 */
function invalidateAll() {
    memoryCache = {
        index: null,
        indexHash: null,
        searches: new Map(),
        lastCleanup: Date.now()
    };

    try {
        if (fs.existsSync(INDEX_CACHE_FILE)) fs.unlinkSync(INDEX_CACHE_FILE);
        if (fs.existsSync(SEARCH_CACHE_FILE)) fs.unlinkSync(SEARCH_CACHE_FILE);
    } catch (e) {
        console.error('[Cache] Erro ao invalidar:', e.message);
    }

    console.log('[Cache] Cache invalidado');
}

/**
 * Retorna estatísticas do cache
 */
function getStats() {
    return {
        indexCached: memoryCache.index !== null,
        searchesCached: memoryCache.searches.size,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };
}

// Inicializa ao carregar módulo
loadSearchCacheFromDisk();

module.exports = {
    generateKBHash,
    saveIndexCache,
    loadIndexCache,
    generateSearchKey,
    saveSearchCache,
    loadSearchCache,
    persistSearchCache,
    cleanupCache,
    invalidateAll,
    getStats,
    DEFAULT_TTL
};
