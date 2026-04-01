/**
 * Tools Registry — Auto-discovery de ferramentas.
 *
 * Carrega automaticamente TODOS os .js de src/tools/modules/.
 * Cada módulo exporta: { definitions: [...], handlers: { nome: async fn } }
 *
 * Para adicionar nova ferramenta:
 *   1. Criar arquivo em src/tools/modules/<nome>.js
 *   2. Exportar definitions e handlers
 *   3. Pronto — será carregada automaticamente
 */

const fs = require('fs');
const path = require('path');
const { httpRequest } = require('../shared/utils/http-helper');
const { createLogger } = require('../shared/utils/logger');

const log = createLogger('ToolsRegistry');
const MODULES_DIR = path.join(__dirname, 'modules');

const CRM_BASE = process.env.CRM_URL || `http://localhost:${process.env.PORT || 3847}`;
const CRM_TOKEN = process.env.CRM_TOKEN || 'local-dev-token';

let toolUtils = null;
try { toolUtils = require('../shared/utils/tool-utils'); } catch (_) {}

// ─── Auto-discovery ─────────────────────────────────────────────
const TOOLS_DEF = [];
const handlerMap = {};

function loadModules() {
  if (!fs.existsSync(MODULES_DIR)) {
    log.warn('Diretório de módulos de tools não encontrado');
    return;
  }

  const files = fs.readdirSync(MODULES_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    try {
      const mod = require(path.join(MODULES_DIR, file));

      if (mod.definitions && Array.isArray(mod.definitions)) {
        TOOLS_DEF.push(...mod.definitions);
      }

      if (mod.handlers && typeof mod.handlers === 'object') {
        for (const [name, fn] of Object.entries(mod.handlers)) {
          if (typeof fn === 'function') {
            handlerMap[name] = fn;
          }
        }
      }

      log.debug(`Módulo carregado: ${file}`, {
        tools: mod.definitions?.length || 0
      });
    } catch (err) {
      log.error(`Falha ao carregar módulo: ${file}`, { error: err.message });
    }
  }

  log.info(`${TOOLS_DEF.length} ferramentas carregadas de ${files.length} módulos`);
}

// Carregar na importação
loadModules();

// ─── Executor Central ───────────────────────────────────────────
async function executeTool(toolName, toolArgs, credentialVault) {
  const handler = handlerMap[toolName];
  if (!handler) {
    return `Ferramenta "${toolName}" não reconhecida. Disponíveis: ${Object.keys(handlerMap).join(', ')}`;
  }

  const ctx = { credentialVault, httpRequest, CRM_BASE, CRM_TOKEN, toolUtils };

  try {
    return await handler(toolArgs, ctx);
  } catch (err) {
    return `Erro ao executar ${toolName}: ${err.message}`;
  }
}

// ─── Reload (para desenvolvimento) ─────────────────────────────
function reload() {
  TOOLS_DEF.length = 0;
  Object.keys(handlerMap).forEach(k => delete handlerMap[k]);

  // Limpar require cache dos módulos
  const prefix = path.resolve(MODULES_DIR);
  Object.keys(require.cache).forEach(key => {
    if (key.startsWith(prefix)) delete require.cache[key];
  });

  loadModules();
  return { tools: TOOLS_DEF.length, handlers: Object.keys(handlerMap).length };
}

module.exports = { TOOLS_DEF, executeTool, reload, handlerMap };
