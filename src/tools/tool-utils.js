/**
 * TOOL UTILS — Circuit Breaker, Cache e Timeout para Tools
 *
 * Modulo utilitario que envolve a execucao de ferramentas com:
 * 1. Timeout global configuravel (default 60s)
 * 2. Circuit Breaker com retry exponencial
 * 3. Cache inteligente por hash(tool + args) com TTL por tipo
 */

const crypto = require('crypto');

// ============================================================================
// TIMEOUT WRAPPER
// ============================================================================

/**
 * Envolve uma Promise com timeout.
 * @param {Promise} promise - Promise a executar
 * @param {number} ms - Timeout em milissegundos (default 60000)
 * @param {string} label - Label para a mensagem de erro
 * @returns {Promise}
 */
function withTimeout(promise, ms = 60000, label = 'Tool') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} excedeu o timeout de ${Math.round(ms / 1000)}s`));
    }, ms);

    promise
      .then(result => { clearTimeout(timer); resolve(result); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

// Estado dos circuit breakers por servico
const circuitState = new Map();

const CB_DEFAULTS = {
  failureThreshold: 5,    // Abrir circuito apos N falhas consecutivas
  resetTimeout: 60000,    // Tempo para tentar fechar o circuito (ms)
  retryDelays: [1000, 5000, 15000], // Delays entre retries (ms)
  maxRetries: 3
};

/**
 * Retorna o estado do circuit breaker para um servico.
 */
function getCircuitState(serviceName) {
  if (!circuitState.has(serviceName)) {
    circuitState.set(serviceName, {
      failures: 0,
      state: 'closed',        // closed | open | half-open
      lastFailure: 0,
      lastSuccess: 0
    });
  }
  return circuitState.get(serviceName);
}

/**
 * Verifica se o circuito permite execucao.
 */
function canExecute(serviceName) {
  const cs = getCircuitState(serviceName);

  if (cs.state === 'closed') return true;

  if (cs.state === 'open') {
    // Verificar se o resetTimeout passou para entrar em half-open
    if (Date.now() - cs.lastFailure >= CB_DEFAULTS.resetTimeout) {
      cs.state = 'half-open';
      return true;
    }
    return false;
  }

  // half-open: permite uma tentativa
  return true;
}

/**
 * Registra sucesso no circuit breaker.
 */
function recordSuccess(serviceName) {
  const cs = getCircuitState(serviceName);
  cs.failures = 0;
  cs.state = 'closed';
  cs.lastSuccess = Date.now();
}

/**
 * Registra falha no circuit breaker.
 */
function recordFailure(serviceName) {
  const cs = getCircuitState(serviceName);
  cs.failures++;
  cs.lastFailure = Date.now();

  if (cs.failures >= CB_DEFAULTS.failureThreshold) {
    cs.state = 'open';
    console.log(`[CircuitBreaker] Circuito ABERTO para "${serviceName}" apos ${cs.failures} falhas`);
  }
}

/**
 * Envolve uma funcao com circuit breaker e retry exponencial.
 * @param {string} serviceName - Nome do servico (ex: 'fetch_api', 'scrape_website')
 * @param {Function} fn - Funcao async a executar
 * @param {Object} opts - Opcoes (maxRetries, retryDelays)
 * @returns {Promise}
 */
async function withCircuitBreaker(serviceName, fn, opts = {}) {
  const maxRetries = opts.maxRetries || CB_DEFAULTS.maxRetries;
  const retryDelays = opts.retryDelays || CB_DEFAULTS.retryDelays;

  if (!canExecute(serviceName)) {
    const cs = getCircuitState(serviceName);
    const waitSec = Math.round((CB_DEFAULTS.resetTimeout - (Date.now() - cs.lastFailure)) / 1000);
    throw new Error(
      `Circuit breaker ABERTO para "${serviceName}". ` +
      `${cs.failures} falhas consecutivas. ` +
      `Retry automatico em ~${Math.max(0, waitSec)}s.`
    );
  }

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      recordSuccess(serviceName);
      return result;
    } catch (err) {
      lastError = err;
      recordFailure(serviceName);

      // Se circuito abriu, parar de tentar
      const cs = getCircuitState(serviceName);
      if (cs.state === 'open') break;

      // Retry com delay exponencial
      if (attempt < maxRetries - 1) {
        const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)];
        console.log(`[CircuitBreaker] ${serviceName} falhou (tentativa ${attempt + 1}/${maxRetries}), retry em ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Retorna status de todos os circuit breakers (para debug/monitoring).
 */
function getCircuitBreakerStatus() {
  const status = {};
  for (const [name, state] of circuitState) {
    status[name] = { ...state };
  }
  return status;
}

// ============================================================================
// TOOL RESULT CACHE
// ============================================================================

// TTLs padrão por tipo de tool (em ms)
const CACHE_TTLS = {
  scrape_website: 5 * 60 * 1000,    // 5 minutos
  seo_check: 60 * 60 * 1000,        // 1 hora
  pagespeed: 30 * 60 * 1000,        // 30 minutos
  call_crm: 30 * 1000,              // 30 segundos (apenas GET)
  search_kb: 2 * 60 * 1000,         // 2 minutos
  google_search: 5 * 60 * 1000,     // 5 minutos
  maps_search: 10 * 60 * 1000,      // 10 minutos
  fetch_api: 60 * 1000,             // 1 minuto (apenas GET)
};

// Tools que NUNCA devem ser cacheadas (mutacoes, side-effects)
const NO_CACHE_TOOLS = new Set([
  'execute_node', 'call_crm_POST', 'call_crm_PUT', 'call_crm_DELETE',
  'send_email', 'send_whatsapp', 'get_credential', 'chrome',
  'instagram', 'csv_processor'
]);

// Cache em memória: Map<hash, { result, expiry }>
const toolCache = new Map();

// Limpeza periodica (a cada 5 min)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of toolCache) {
    if (entry.expiry <= now) {
      toolCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[ToolCache] Limpou ${cleaned} entradas expiradas. Total: ${toolCache.size}`);
  }
}, 5 * 60 * 1000).unref();

/**
 * Gera hash unico para tool + args.
 */
function cacheKey(toolName, args) {
  const normalized = JSON.stringify(args, Object.keys(args || {}).sort());
  return crypto.createHash('md5').update(`${toolName}:${normalized}`).digest('hex');
}

/**
 * Verifica se uma tool call deve ser cacheada.
 */
function isCacheable(toolName, args) {
  // Nunca cachear tools com side-effects
  if (NO_CACHE_TOOLS.has(toolName)) return false;

  // call_crm: apenas cachear GETs
  if (toolName === 'call_crm') {
    const method = (args.method || 'GET').toUpperCase();
    if (method !== 'GET') return false;
  }

  // fetch_api: apenas cachear GETs
  if (toolName === 'fetch_api') {
    const method = (args.method || 'GET').toUpperCase();
    if (method !== 'GET') return false;
  }

  // Deve ter TTL definido
  return CACHE_TTLS.hasOwnProperty(toolName);
}

/**
 * Busca resultado no cache.
 * @returns {string|null} Resultado cacheado ou null
 */
function getCached(toolName, args) {
  if (!isCacheable(toolName, args)) return null;

  const key = cacheKey(toolName, args);
  const entry = toolCache.get(key);

  if (!entry) return null;
  if (entry.expiry <= Date.now()) {
    toolCache.delete(key);
    return null;
  }

  console.log(`[ToolCache] HIT: ${toolName} (${key.substring(0, 8)}...)`);
  return entry.result;
}

/**
 * Armazena resultado no cache.
 */
function setCached(toolName, args, result) {
  if (!isCacheable(toolName, args)) return;

  const ttl = CACHE_TTLS[toolName] || 60000;
  const key = cacheKey(toolName, args);

  toolCache.set(key, {
    result,
    expiry: Date.now() + ttl,
    toolName,
    createdAt: Date.now()
  });

  console.log(`[ToolCache] SET: ${toolName} (${key.substring(0, 8)}...) TTL=${Math.round(ttl / 1000)}s`);
}

/**
 * Retorna stats do cache (para debug).
 */
function getCacheStats() {
  return {
    size: toolCache.size,
    entries: Array.from(toolCache.values()).map(e => ({
      tool: e.toolName,
      expiresIn: Math.round((e.expiry - Date.now()) / 1000) + 's'
    }))
  };
}

// ============================================================================
// TOOL PROGRESS STREAMING
// ============================================================================

/**
 * Cria um wrapper de progresso para tools longas.
 * @param {string} toolName - Nome da tool
 * @param {Function} sendEvent - Funcao SSE para enviar eventos ao cliente
 * @returns {Function} Funcao progress(status) para reportar progresso
 */
function createProgressReporter(toolName, sendEvent) {
  if (!sendEvent) return () => {};

  return (status) => {
    try {
      sendEvent({
        type: 'tool_progress',
        tool: toolName,
        status: typeof status === 'string' ? status : JSON.stringify(status)
      });
    } catch (_) {
      // Ignorar erros de SSE (cliente desconectado)
    }
  };
}

// ============================================================================
// RATE LIMITER (in-memory sliding window)
// ============================================================================

// Map<key, timestamps[]>
const rateLimitWindows = new Map();

// Limpeza periodica
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitWindows) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) {
      rateLimitWindows.delete(key);
    } else {
      rateLimitWindows.set(key, valid);
    }
  }
}, 60000).unref();

/**
 * Verifica rate limit usando sliding window.
 * @param {string} key - Identificador (session ID ou IP)
 * @param {number} maxRequests - Maximo de requests na janela
 * @param {number} windowMs - Tamanho da janela em ms (default 60000 = 1 min)
 * @returns {{ allowed: boolean, retryAfter?: number, remaining: number }}
 */
function checkRateLimit(key, maxRequests, windowMs = 60000) {
  const now = Date.now();

  if (!rateLimitWindows.has(key)) {
    rateLimitWindows.set(key, []);
  }

  const timestamps = rateLimitWindows.get(key);

  // Remover timestamps fora da janela
  const windowStart = now - windowMs;
  const valid = timestamps.filter(t => t > windowStart);
  rateLimitWindows.set(key, valid);

  if (valid.length >= maxRequests) {
    // Calcular quando o proximo slot abre
    const oldest = valid[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  // Registrar este request
  valid.push(now);
  return { allowed: true, remaining: maxRequests - valid.length };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Timeout
  withTimeout,

  // Circuit Breaker
  withCircuitBreaker,
  getCircuitBreakerStatus,

  // Cache
  getCached,
  setCached,
  getCacheStats,
  CACHE_TTLS,

  // Progress
  createProgressReporter,

  // Rate Limiter
  checkRateLimit
};
