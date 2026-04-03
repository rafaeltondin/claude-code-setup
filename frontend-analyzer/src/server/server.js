/**
 * Frontend Analyzer - Servidor Express
 *
 * Serve o dashboard web e a API para gerenciamento
 * de perfis Chrome e analise frontend.
 *
 * Uso:
 *   node src/server/server.js
 *   node src/index.js --dashboard
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chromeRoutes from './routes/chrome-routes.js';
import analysisRoutes from './routes/analysis-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = 3850;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS para desenvolvimento
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log de requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Server] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Servir arquivos estaticos do dashboard
const dashboardPath = path.join(__dirname, '..', 'dashboard');
app.use(express.static(dashboardPath));

// Rotas da API
app.use('/api/chrome', chromeRoutes);
app.use('/api/analysis', analysisRoutes);

// Rota de saude
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Fallback para SPA - redirecionar para o dashboard
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

/**
 * Inicia o servidor Express
 *
 * @param {number} port - Porta do servidor
 * @returns {Promise<object>} Instancia do servidor
 */
export function startServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║              FRONTEND ANALYZER v2.1.0                            ║
║              Dashboard + Chrome DevTools                         ║
║                                                                  ║
║              http://localhost:${port}                              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
      `);
      console.log(`[Server] Dashboard disponivel em: http://localhost:${port}`);
      console.log(`[Server] API disponivel em: http://localhost:${port}/api`);
      console.log(`[Server] Endpoints:`);
      console.log(`[Server]   GET  /api/chrome/profiles`);
      console.log(`[Server]   GET  /api/chrome/session/status`);
      console.log(`[Server]   POST /api/chrome/session/start`);
      console.log(`[Server]   POST /api/chrome/session/close`);
      console.log(`[Server]   GET  /api/chrome/config`);
      console.log(`[Server]   PUT  /api/chrome/config`);
      console.log(`[Server]   POST /api/analysis/project`);
      console.log(`[Server]   POST /api/analysis/url`);
      console.log(`[Server]   GET  /api/health`);

      resolve(server);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server] Porta ${port} ja esta em uso. Tente outra porta.`);
      }
      reject(error);
    });
  });
}

// Executar diretamente se chamado como script
if (process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].includes('server')
)) {
  const port = parseInt(process.env.PORT || DEFAULT_PORT);
  startServer(port).catch(error => {
    console.error(`[Server] Falha ao iniciar: ${error.message}`);
    process.exit(1);
  });
}

export default app;
