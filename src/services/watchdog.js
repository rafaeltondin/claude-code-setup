/**
 * Watchdog — Supervisor do Claude Ecosystem (porta 3847)
 *
 * Responsabilidades:
 *   - Monitora GET /api/status a cada 30s
 *   - Reinicia servidor após 3 falhas consecutivas
 *   - Monitora Telegram bot e reconecta se desconectado
 *   - Log rotacionado (~/.claude/logs/watchdog.log, máx 1000 linhas)
 *   - Grava PID em ~/.claude/data/watchdog.pid
 *   - Respeita shutdown.lock — não reinicia se servidor está parando
 *   - Notifica via Telegram API direta ao reiniciar
 *   - Flag --once para execução única (Task Scheduler do Windows)
 *
 * Uso:
 *   node src/services/watchdog.js           # loop contínuo (30s)
 *   node src/services/watchdog.js --once    # check único e sai
 */

'use strict';

const http    = require('http');
const https   = require('https');
const { spawn } = require('child_process');
const fs      = require('fs');
const path    = require('path');

// ─────────────────────────────────────────────
// Caminhos
// ─────────────────────────────────────────────
const ECOSYSTEM_ROOT  = path.join(__dirname, '..', '..');
const CHECK_INTERVAL  = 30_000;          // 30 segundos
const MAX_FAILURES    = 3;
const LOG_FILE        = path.join(ECOSYSTEM_ROOT, 'logs', 'watchdog.log');
const PID_FILE        = path.join(ECOSYSTEM_ROOT, 'data', 'watchdog.pid');
const SHUTDOWN_LOCK   = path.join(ECOSYSTEM_ROOT, 'data', 'shutdown.lock');
const CONFIG_FILE     = path.join(ECOSYSTEM_ROOT, 'data', 'config.json');
const MAX_LOG_LINES   = 1000;
const REQUEST_TIMEOUT = 8_000;           // 8 segundos por request HTTP

// ─────────────────────────────────────────────
// Estado interno
// ─────────────────────────────────────────────
let consecutiveFailures = 0;
let isRestarting        = false;
let checkTimer          = null;

// ─────────────────────────────────────────────
// Log com rotação
// ─────────────────────────────────────────────
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function rotateLogs() {
    if (!fs.existsSync(LOG_FILE)) return;
    try {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines   = content.split('\n').filter(Boolean);
        if (lines.length > MAX_LOG_LINES) {
            const trimmed = lines.slice(lines.length - MAX_LOG_LINES).join('\n') + '\n';
            fs.writeFileSync(LOG_FILE, trimmed, 'utf8');
        }
    } catch (e) {
        // Silencioso — não deixar rotação matar o watchdog
    }
}

function log(level, message, data) {
    const ts      = new Date().toISOString();
    const extra   = data ? ` ${JSON.stringify(data)}` : '';
    const line    = `[watchdog][${ts}] ${level.toUpperCase()}: ${message}${extra}\n`;

    // Console
    if (level === 'error') {
        process.stderr.write(line);
    } else {
        process.stdout.write(line);
    }

    // Arquivo
    try {
        ensureDir(LOG_FILE);
        fs.appendFileSync(LOG_FILE, line, 'utf8');
        rotateLogs();
    } catch (e) {
        process.stderr.write(`[watchdog] AVISO: falha ao gravar log — ${e.message}\n`);
    }
}

const logger = {
    debug: (msg, data) => log('debug', msg, data),
    info:  (msg, data) => log('info',  msg, data),
    warn:  (msg, data) => log('warn',  msg, data),
    error: (msg, data) => log('error', msg, data),
};

// ─────────────────────────────────────────────
// Leitura de config
// ─────────────────────────────────────────────
function readConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        logger.warn('[readConfig] Nao foi possivel ler config.json', { erro: e.message });
        return {};
    }
}

// ─────────────────────────────────────────────
// Requisição HTTP local (http ou https)
// ─────────────────────────────────────────────
function httpGet(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { timeout: timeoutMs || REQUEST_TIMEOUT }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body });
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout apos ${timeoutMs || REQUEST_TIMEOUT}ms`));
        });
        req.on('error', reject);
    });
}

function httpPost(url, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(payload);
        const mod     = url.startsWith('https') ? https : http;
        const urlObj  = new URL(url);
        const opts    = {
            hostname: urlObj.hostname,
            port:     urlObj.port || (url.startsWith('https') ? 443 : 80),
            path:     urlObj.pathname + urlObj.search,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
            },
            timeout: timeoutMs || REQUEST_TIMEOUT,
        };

        const req = mod.request(opts, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout POST apos ${timeoutMs || REQUEST_TIMEOUT}ms`));
        });
        req.on('error', reject);
        req.write(bodyStr, 'utf8');
        req.end();
    });
}

// ─────────────────────────────────────────────
// Notificação Telegram (API direta — sem depender do bot local)
// ─────────────────────────────────────────────
async function sendTelegramNotification(message) {
    const config = readConfig();
    const tg     = config.telegram || {};

    if (!tg.enabled || !tg.botToken || !tg.chatId) {
        logger.debug('[sendTelegramNotification] Telegram desabilitado ou sem credenciais — pulando notificacao');
        return;
    }

    const url  = `https://api.telegram.org/bot${tg.botToken}/sendMessage`;
    const body = { chat_id: String(tg.chatId), text: message, parse_mode: 'HTML' };

    try {
        logger.debug('[sendTelegramNotification] Enviando notificacao', { chatId: tg.chatId });
        const res = await httpPost(url, body, 10_000);
        if (res.statusCode === 200) {
            logger.info('[sendTelegramNotification] Notificacao enviada com sucesso');
        } else {
            logger.warn('[sendTelegramNotification] Resposta inesperada', { status: res.statusCode });
        }
    } catch (err) {
        logger.warn('[sendTelegramNotification] Falha ao enviar notificacao Telegram', { erro: err.message });
    }
}

// ─────────────────────────────────────────────
// Reinício do servidor
// ─────────────────────────────────────────────
async function restartServer() {
    if (isRestarting) {
        logger.warn('[restartServer] Reinicio ja em andamento — ignorando chamada duplicada');
        return;
    }

    // Verificar shutdown.lock — não reiniciar durante desligamento intencional
    if (fs.existsSync(SHUTDOWN_LOCK)) {
        logger.info('[restartServer] shutdown.lock detectado — servidor em processo de shutdown, nao reiniciando');
        consecutiveFailures = 0;
        return;
    }

    isRestarting = true;
    logger.warn('[restartServer] INICIO — Tentando reiniciar o servidor (3 falhas consecutivas)');

    // Notificar antes de reiniciar
    const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await sendTelegramNotification(
        `<b>Watchdog</b> — Reiniciando servidor\n` +
        `Porta: 3847\n` +
        `Falhas consecutivas: ${consecutiveFailures}\n` +
        `Horario: ${ts}`
    );

    try {
        const child = spawn(
            process.execPath,           // mesmo node que está rodando o watchdog
            ['src/server/index.js'],
            {
                cwd:      ECOSYSTEM_ROOT,
                detached: true,
                stdio:    'ignore',
            }
        );
        child.unref();
        logger.info('[restartServer] Processo filho lançado', { pid: child.pid });

        // Aguardar o servidor subir antes de zerar contadores
        await new Promise(resolve => setTimeout(resolve, 5_000));

        consecutiveFailures = 0;
        logger.info('[restartServer] FIM — servidor reiniciado com sucesso');
    } catch (err) {
        logger.error('[restartServer] Falha ao lançar processo filho', { erro: err.message, stack: err.stack });
    } finally {
        isRestarting = false;
    }
}

// ─────────────────────────────────────────────
// Verificação de status do servidor principal
// ─────────────────────────────────────────────
async function checkServerStatus() {
    logger.debug('[checkServerStatus] Iniciando verificacao de /api/status');

    try {
        const res = await httpGet('http://localhost:3847/api/status');

        if (res.statusCode >= 200 && res.statusCode < 400) {
            logger.debug('[checkServerStatus] Servidor respondendo normalmente', { status: res.statusCode });
            consecutiveFailures = 0;
            return true;
        }

        logger.warn('[checkServerStatus] Resposta inesperada', { status: res.statusCode });
        consecutiveFailures++;
    } catch (err) {
        consecutiveFailures++;
        logger.warn('[checkServerStatus] Falha ao conectar', {
            erro:    err.message,
            falhasConsecutivas: consecutiveFailures,
        });
    }

    logger.warn('[checkServerStatus] Falha acumulada', {
        consecutivas: consecutiveFailures,
        limiteParaReinicio: MAX_FAILURES,
    });

    if (consecutiveFailures >= MAX_FAILURES) {
        logger.error('[checkServerStatus] Limite de falhas atingido — acionando reinicio');
        await restartServer();
    }

    return false;
}

// ─────────────────────────────────────────────
// Verificação do Telegram bot
// ─────────────────────────────────────────────
async function checkTelegramBot() {
    logger.debug('[checkTelegramBot] Verificando status do bot Telegram');

    const config = readConfig();
    const tg     = config.telegram || {};

    if (!tg.enabled) {
        logger.debug('[checkTelegramBot] Telegram desabilitado na configuracao — pulando');
        return;
    }

    try {
        const res  = await httpGet('http://localhost:3847/api/telegram/status');
        if (res.statusCode !== 200) {
            logger.warn('[checkTelegramBot] Endpoint retornou status inesperado', { status: res.statusCode });
            return;
        }

        let data;
        try {
            data = JSON.parse(res.body);
        } catch {
            logger.warn('[checkTelegramBot] Resposta nao e JSON valido', { body: res.body.slice(0, 200) });
            return;
        }

        logger.debug('[checkTelegramBot] Status recebido', { isRunning: data.isRunning });

        if (data.isRunning === false) {
            logger.warn('[checkTelegramBot] Bot esta parado com config habilitada — tentando reconectar');

            const startRes = await httpPost(
                'http://localhost:3847/api/telegram/start',
                {},
                10_000
            );

            if (startRes.statusCode >= 200 && startRes.statusCode < 300) {
                logger.info('[checkTelegramBot] Reconexao solicitada com sucesso', { status: startRes.statusCode });
            } else {
                logger.warn('[checkTelegramBot] Falha ao solicitar reconexao', { status: startRes.statusCode });
            }
        } else {
            logger.debug('[checkTelegramBot] Bot ativo — nada a fazer');
        }
    } catch (err) {
        // Endpoint pode não existir em versões mais antigas — não é crítico
        logger.debug('[checkTelegramBot] Nao foi possivel verificar Telegram bot', { erro: err.message });
    }
}

// ─────────────────────────────────────────────
// Ciclo principal de verificação
// ─────────────────────────────────────────────
async function runChecks() {
    logger.info('[runChecks] INICIO do ciclo de verificacao');

    await checkServerStatus();
    await checkTelegramBot();

    logger.info('[runChecks] FIM do ciclo de verificacao', {
        falhasConsecutivas: consecutiveFailures,
        emReinicio: isRestarting,
    });
}

// ─────────────────────────────────────────────
// Gravação de PID
// ─────────────────────────────────────────────
function writePid() {
    try {
        ensureDir(PID_FILE);
        fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
        logger.info('[watchdog] PID gravado', { pid: process.pid, arquivo: PID_FILE });
    } catch (err) {
        logger.warn('[watchdog] Nao foi possivel gravar PID', { erro: err.message });
    }
}

function removePid() {
    try {
        if (fs.existsSync(PID_FILE)) {
            const stored = fs.readFileSync(PID_FILE, 'utf8').trim();
            if (stored === String(process.pid)) {
                fs.unlinkSync(PID_FILE);
                logger.info('[watchdog] PID removido ao encerrar');
            }
        }
    } catch (e) {
        // Silencioso
    }
}

// ─────────────────────────────────────────────
// Encerramento gracioso
// ─────────────────────────────────────────────
function shutdown(signal) {
    logger.info('[watchdog] Sinal recebido — encerrando', { sinal: signal });
    if (checkTimer) clearInterval(checkTimer);
    removePid();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error('[watchdog] Excecao nao capturada', { erro: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason) => {
    logger.error('[watchdog] Promise rejeitada sem tratamento', { motivo: String(reason) });
});

// ─────────────────────────────────────────────
// Ponto de entrada
// ─────────────────────────────────────────────
async function main() {
    const onceMode = process.argv.includes('--once');

    logger.info('[watchdog] INICIANDO', {
        modo:          onceMode ? 'once' : 'continuo',
        pid:           process.pid,
        intervalo:     `${CHECK_INTERVAL / 1000}s`,
        maxFalhas:     MAX_FAILURES,
        ecosystemRoot: ECOSYSTEM_ROOT,
    });

    writePid();

    if (onceMode) {
        logger.info('[watchdog] Modo --once: executando verificacao unica');
        await runChecks();
        logger.info('[watchdog] Modo --once: verificacao concluida — encerrando');
        removePid();
        process.exit(0);
    }

    // Primeiro check imediato ao iniciar
    await runChecks();

    // Loop contínuo
    checkTimer = setInterval(async () => {
        try {
            await runChecks();
        } catch (err) {
            logger.error('[watchdog] Erro nao esperado no ciclo principal', {
                erro:  err.message,
                stack: err.stack,
            });
        }
    }, CHECK_INTERVAL);

    logger.info('[watchdog] Loop ativo — proxima verificacao em 30s');
}

main().catch((err) => {
    process.stderr.write(`[watchdog] FATAL ao iniciar: ${err.message}\n${err.stack}\n`);
    process.exit(1);
});
