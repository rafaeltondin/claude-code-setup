/**
 * Logger centralizado — todos os módulos usam este logger.
 * Formato: [MODULO][TIMESTAMP] LEVEL: mensagem
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function fmt(module, level, msg, data) {
  const ts = new Date().toISOString();
  const extra = data ? ` ${JSON.stringify(data)}` : '';
  return `[${module}][${ts}] ${level.toUpperCase()}: ${msg}${extra}`;
}

function createLogger(module) {
  return {
    debug: (msg, data) => CURRENT_LEVEL <= 0 && console.log(fmt(module, 'debug', msg, data)),
    info:  (msg, data) => CURRENT_LEVEL <= 1 && console.log(fmt(module, 'info', msg, data)),
    warn:  (msg, data) => CURRENT_LEVEL <= 2 && console.warn(fmt(module, 'warn', msg, data)),
    error: (msg, data) => CURRENT_LEVEL <= 3 && console.error(fmt(module, 'error', msg, data)),
  };
}

module.exports = { createLogger };
