/**
 * Module Loader — Auto-discovery de módulos em src/modules/.
 *
 * Cada módulo é uma pasta com um arquivo routes.js que exporta:
 *   module.exports = { prefix: '/api/...', router: express.Router(), init?: async () => {} }
 *
 * O loader carrega todos automaticamente. Para adicionar um novo módulo:
 *   1. Criar pasta em src/modules/<nome>/
 *   2. Criar routes.js com prefix e router
 *   3. Pronto — será carregado automaticamente
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../shared/utils/logger');

const log = createLogger('ModuleLoader');
const MODULES_DIR = path.join(__dirname, '..', 'modules');

async function loadModules(app) {
  const loaded = [];
  const errors = [];

  if (!fs.existsSync(MODULES_DIR)) {
    log.warn('Diretório de módulos não encontrado', { path: MODULES_DIR });
    return { loaded, errors };
  }

  const dirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const dir of dirs) {
    const routesPath = path.join(MODULES_DIR, dir, 'routes.js');

    if (!fs.existsSync(routesPath)) continue;

    try {
      const mod = require(routesPath);

      if (!mod.prefix || !mod.router) {
        log.warn(`Módulo ${dir} ignorado — falta prefix ou router`);
        continue;
      }

      // Middlewares opcionais do módulo
      const middlewares = mod.middlewares || [];
      app.use(mod.prefix, ...middlewares, mod.router);

      // Init assíncrono opcional
      if (typeof mod.init === 'function') {
        await mod.init();
      }

      loaded.push({ name: dir, prefix: mod.prefix });
      log.info(`Módulo carregado: ${dir}`, { prefix: mod.prefix });
    } catch (err) {
      errors.push({ name: dir, error: err.message });
      log.error(`Falha ao carregar módulo: ${dir}`, { error: err.message });
    }
  }

  log.info(`${loaded.length} módulos carregados, ${errors.length} erros`);
  return { loaded, errors };
}

module.exports = { loadModules };
