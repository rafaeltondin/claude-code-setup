/**
 * START SCRIPT — Inicializa o servidor task-scheduler na porta 8000.
 *
 * Carrega OPENROUTER_API_KEY do credential vault automaticamente.
 * Uso: node start.js
 */

const path = require('path');

// Carregar API key do vault
try {
  const vault = require('./credential-vault');
  const apiKey = vault.reveal
    ? (() => {
        const all = vault.getAll ? vault.getAll() : [];
        const cred = all.find(c => c.name === 'OPENROUTER_API_KEY');
        if (cred) {
          const revealed = vault.reveal(cred.id);
          return revealed ? revealed.value : null;
        }
        return null;
      })()
    : null;

  if (apiKey && !process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = apiKey;
    console.log('[Start] OPENROUTER_API_KEY carregada do vault');
  } else if (process.env.OPENROUTER_API_KEY) {
    console.log('[Start] OPENROUTER_API_KEY já definida via env var');
  } else {
    console.warn('[Start] OPENROUTER_API_KEY não encontrada no vault nem em env. Configure via: node credential-cli.js');
  }
} catch (e) {
  console.warn('[Start] Não foi possível carregar vault:', e.message);
}

// Porta padrão: 8000
if (!process.env.PORT) {
  process.env.PORT = '8000';
}

console.log(`[Start] Iniciando servidor na porta ${process.env.PORT}...`);
const { DEFAULT_MODEL } = require('./openrouter-client');
console.log(`[Start] Modelo padrão: ${process.env.OPENROUTER_DEFAULT_MODEL || DEFAULT_MODEL}`);

// Iniciar servidor — spawn server.js como processo principal para que
// require.main === module seja verdadeiro em server.js (necessário para server.listen())
const { spawn } = require('child_process');
const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  stdio: 'inherit',
  env: process.env,
  detached: false,
  windowsHide: false,
});
child.on('exit', (code) => process.exit(code || 0));
child.on('error', (err) => {
  console.error('[Start] Erro ao iniciar server.js:', err.message);
  process.exit(1);
});
