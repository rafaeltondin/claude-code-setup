/**
 * Tool Utils — Circuit Breaker, Cache e Timeout para ferramentas.
 */

const crypto = require('crypto');

// ─── TIMEOUT ────────────────────────────────────────────────────
function withTimeout(promise, ms = 60000, label = 'Tool') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} excedeu timeout de ${Math.round(ms / 1000)}s`)), ms);
    promise
      .then(r => { clearTimeout(timer); resolve(r); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}

// ─── CIRCUIT BREAKER ────────────────────────────────────────────
const circuits = new Map();
const CB = { failureThreshold: 5, resetTimeout: 60000 };

function getCircuit(name) {
  if (!circuits.has(name)) {
    circuits.set(name, { failures: 0, state: 'closed', lastFailure: 0 });
  }
  return circuits.get(name);
}

function canExecute(name) {
  const c = getCircuit(name);
  if (c.state === 'closed') return true;
  if (c.state === 'open' && Date.now() - c.lastFailure >= CB.resetTimeout) {
    c.state = 'half-open';
    return true;
  }
  return c.state === 'half-open';
}

function recordSuccess(name) {
  const c = getCircuit(name);
  c.failures = 0;
  c.state = 'closed';
}

function recordFailure(name) {
  const c = getCircuit(name);
  c.failures++;
  c.lastFailure = Date.now();
  if (c.failures >= CB.failureThreshold) c.state = 'open';
}

// ─── CACHE ──────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = { default: 300000, dns: 600000, search: 120000 };

function cacheKey(tool, args) {
  return crypto.createHash('md5').update(`${tool}:${JSON.stringify(args)}`).digest('hex');
}

function getCached(tool, args) {
  const key = cacheKey(tool, args);
  const entry = cache.get(key);
  if (!entry) return null;
  const ttl = CACHE_TTL[tool] || CACHE_TTL.default;
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return null; }
  return entry.value;
}

function setCache(tool, args, value) {
  const key = cacheKey(tool, args);
  cache.set(key, { value, ts: Date.now() });
  // Limpar cache velhos a cada 1000 entradas
  if (cache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL.default) cache.delete(k);
    }
  }
}

module.exports = {
  withTimeout, canExecute, recordSuccess, recordFailure,
  getCached, setCache, getCircuit
};
