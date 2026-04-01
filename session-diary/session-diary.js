#!/usr/bin/env node
'use strict';

/**
 * session-diary.js
 * CLI para gerenciar histórico de sessões de trabalho com agentes IA.
 * Node.js puro, sem dependências externas.
 *
 * Uso: node session-diary.js [comando] [args]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const DIARY_DIR  = path.join(__dirname);
const DIARY_FILE = path.join(DIARY_DIR, 'diary.jsonl');

// ---------------------------------------------------------------------------
// Logger inline (sem dependências)
// ---------------------------------------------------------------------------

const log = {
    info:  (msg, data) => { process.stdout.write(`[session-diary] [INFO] ${msg}\n`); if (data) console.log(data); },
    debug: (msg, data) => { if (process.env.DEBUG) { process.stdout.write(`[session-diary] [DEBUG] ${msg}\n`); if (data) console.log(data); } },
    error: (msg, err)  => { process.stderr.write(`[session-diary] [ERROR] ${msg}\n`); if (err) console.error(err); }
};

// ---------------------------------------------------------------------------
// Helpers de I/O
// ---------------------------------------------------------------------------

/**
 * Garante que o diretório e o arquivo JSONL existam.
 */
function ensureStorage() {
    log.debug('ensureStorage: verificando diretório e arquivo');

    if (!fs.existsSync(DIARY_DIR)) {
        log.info(`Criando diretório: ${DIARY_DIR}`);
        fs.mkdirSync(DIARY_DIR, { recursive: true });
    }

    if (!fs.existsSync(DIARY_FILE)) {
        log.info(`Criando arquivo: ${DIARY_FILE}`);
        fs.writeFileSync(DIARY_FILE, '', 'utf8');
    }

    log.debug('ensureStorage: OK');
}

/**
 * Lê todas as sessões do arquivo JSONL.
 * @returns {Array<Object>} Array de objetos de sessão
 */
function readAll() {
    log.debug('readAll: lendo arquivo', { path: DIARY_FILE });

    ensureStorage();

    const raw = fs.readFileSync(DIARY_FILE, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim() !== '');

    log.debug('readAll: linhas encontradas', { count: lines.length });

    const sessions = [];
    for (let i = 0; i < lines.length; i++) {
        try {
            sessions.push(JSON.parse(lines[i]));
        } catch (err) {
            log.error(`readAll: linha ${i + 1} inválida — ignorando`, err);
        }
    }

    log.debug('readAll: sessões carregadas', { count: sessions.length });
    return sessions;
}

/**
 * Persiste uma sessão nova no arquivo JSONL (append).
 * @param {Object} session
 */
function appendSession(session) {
    log.debug('appendSession: salvando sessão', { id: session.id });
    ensureStorage();
    fs.appendFileSync(DIARY_FILE, JSON.stringify(session) + '\n', 'utf8');
    log.debug('appendSession: OK');
}

/**
 * Reescreve todo o arquivo JSONL com o array fornecido.
 * @param {Array<Object>} sessions
 */
function writeAll(sessions) {
    log.debug('writeAll: reescrevendo arquivo', { count: sessions.length });
    ensureStorage();
    const content = sessions.map(s => JSON.stringify(s)).join('\n') + (sessions.length ? '\n' : '');
    fs.writeFileSync(DIARY_FILE, content, 'utf8');
    log.debug('writeAll: OK');
}

// ---------------------------------------------------------------------------
// Geração de ID
// ---------------------------------------------------------------------------

/**
 * Gera um ID baseado em timestamp: YYYYMMDD-HHMMSS
 * @returns {string}
 */
function generateId() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const id = [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        '-',
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds())
    ].join('');
    log.debug('generateId', { id });
    return id;
}

// ---------------------------------------------------------------------------
// Formatação de data para exibição
// ---------------------------------------------------------------------------

/**
 * Formata uma string ISO ou Date para DD/MM/YYYY HH:MM
 * @param {string|Date} dateInput
 * @returns {string}
 */
function formatDate(dateInput) {
    const d = new Date(dateInput);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Parser de flags (--key "value")
// ---------------------------------------------------------------------------

/**
 * Extrai flags do argv no formato --key value
 * @param {Array<string>} argv
 * @returns {Object}
 */
function parseFlags(argv) {
    log.debug('parseFlags: argumentos recebidos', { argv });

    const flags = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
            flags[key] = value;
            if (value) i++; // pular o próximo elemento pois já foi consumido
        }
    }

    log.debug('parseFlags: flags extraídas', { flags });
    return flags;
}

// ---------------------------------------------------------------------------
// Modo interativo (readline)
// ---------------------------------------------------------------------------

/**
 * Faz uma pergunta via readline e retorna a resposta.
 * @param {readline.Interface} rl
 * @param {string} question
 * @returns {Promise<string>}
 */
function ask(rl, question) {
    return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

/**
 * WRITE — salva uma nova sessão (interativo ou via flags)
 */
async function cmdWrite(argv) {
    log.info('INÍCIO - cmdWrite', { argv });

    const flags = parseFlags(argv);

    let project   = flags.project   || '';
    let summary   = flags.summary   || '';
    let pendingRaw   = flags.pending   || '';
    let decisionsRaw = flags.decisions || '';
    let tagsRaw   = flags.tags      || '';

    // Modo interativo se campos obrigatórios ausentes
    const needsInteractive = !project || !summary;

    if (needsInteractive) {
        log.info('Modo interativo ativado (--project e/ou --summary não fornecidos)');

        const rl = readline.createInterface({
            input:  process.stdin,
            output: process.stdout
        });

        if (!project)   project   = await ask(rl, 'Projeto (obrigatório): ');
        if (!summary)   summary   = await ask(rl, 'Resumo do que foi feito (obrigatório): ');
        if (!pendingRaw)    pendingRaw    = await ask(rl, 'Tarefas pendentes (separadas por | ou Enter para nenhuma): ');
        if (!decisionsRaw)  decisionsRaw  = await ask(rl, 'Decisões tomadas (separadas por | ou Enter para nenhuma): ');
        if (!tagsRaw)       tagsRaw       = await ask(rl, 'Tags (separadas por vírgula ou Enter para nenhuma): ');

        rl.close();
    }

    // Validações
    if (!project || !summary) {
        log.error('cmdWrite: --project e --summary são obrigatórios');
        process.stderr.write('Erro: --project e --summary são obrigatórios.\n');
        process.exit(1);
    }

    // Parse de listas
    const pending   = pendingRaw   ? pendingRaw.split('|').map(s => s.trim()).filter(Boolean)   : [];
    const decisions = decisionsRaw ? decisionsRaw.split('|').map(s => s.trim()).filter(Boolean) : [];
    const tags      = tagsRaw      ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean)      : [];

    const session = {
        id:         generateId(),
        date:       new Date().toISOString(),
        project:    project.trim(),
        summary:    summary.trim(),
        pending,
        decisions,
        tags,
        createdAt:  new Date().toISOString()
    };

    log.debug('cmdWrite: sessão construída', { session });

    appendSession(session);

    process.stdout.write(`✓ Sessão salva [${session.id}]\n`);
    log.info('FIM - cmdWrite - Sucesso', { id: session.id });
}

/**
 * LATEST — exibe a última sessão em formato legível
 */
function cmdLatest() {
    log.info('INÍCIO - cmdLatest');

    const sessions = readAll();

    if (sessions.length === 0) {
        process.stdout.write('Nenhuma sessão encontrada no diário.\n');
        log.info('FIM - cmdLatest - sem sessões');
        return;
    }

    const s = sessions[sessions.length - 1];
    log.debug('cmdLatest: última sessão', { id: s.id });

    const lines = [
        '=== ÚLTIMA SESSÃO ===',
        `Data:    ${formatDate(s.date)}`,
        `ID:      ${s.id}`,
        `Projeto: ${s.project}`,
        `Resumo:  ${s.summary}`
    ];

    if (s.pending && s.pending.length > 0) {
        lines.push('Pendências:');
        s.pending.forEach(p => lines.push(`  - ${p}`));
    } else {
        lines.push('Pendências: nenhuma');
    }

    if (s.decisions && s.decisions.length > 0) {
        lines.push('Decisões:');
        s.decisions.forEach(d => lines.push(`  - ${d}`));
    }

    if (s.tags && s.tags.length > 0) {
        lines.push(`Tags: ${s.tags.join(', ')}`);
    }

    process.stdout.write(lines.join('\n') + '\n');
    log.info('FIM - cmdLatest - Sucesso');
}

/**
 * LIST [N] — lista as últimas N sessões (default 5)
 */
function cmdList(argv) {
    log.info('INÍCIO - cmdList', { argv });

    const n = parseInt(argv[0], 10) || 5;
    log.debug('cmdList: N sessões solicitadas', { n });

    const sessions = readAll();

    if (sessions.length === 0) {
        process.stdout.write('Nenhuma sessão encontrada no diário.\n');
        log.info('FIM - cmdList - sem sessões');
        return;
    }

    const slice = sessions.slice(-n).reverse(); // mais recente primeiro

    process.stdout.write(`=== ÚLTIMAS ${slice.length} SESSÕES ===\n\n`);

    slice.forEach((s, idx) => {
        const summaryTrunc = s.summary.length > 60
            ? s.summary.slice(0, 57) + '...'
            : s.summary;

        const pendingCount = (s.pending || []).length;
        const dateStr = formatDate(s.date);

        process.stdout.write(`[${dateStr}] [${s.project}] - ${summaryTrunc}\n`);
        process.stdout.write(`  ID: ${s.id} | Pending: ${pendingCount} ${pendingCount === 1 ? 'item' : 'items'}\n`);

        if (idx < slice.length - 1) process.stdout.write('\n');
    });

    process.stdout.write('\n');
    log.info('FIM - cmdList - Sucesso', { exibidas: slice.length });
}

/**
 * PENDING — mostra todas as tarefas pendentes agrupadas por projeto
 */
function cmdPending() {
    log.info('INÍCIO - cmdPending');

    const sessions = readAll();

    if (sessions.length === 0) {
        process.stdout.write('Nenhuma sessão encontrada no diário.\n');
        log.info('FIM - cmdPending - sem sessões');
        return;
    }

    // Agrupar pendências por projeto
    const byProject = {};

    sessions.forEach(s => {
        if (!s.pending || s.pending.length === 0) return;

        const proj = s.project;
        if (!byProject[proj]) byProject[proj] = [];

        s.pending.forEach(task => {
            byProject[proj].push({ date: formatDate(s.date), task, sessionId: s.id });
        });
    });

    const projects = Object.keys(byProject);

    if (projects.length === 0) {
        process.stdout.write('Nenhuma tarefa pendente encontrada.\n');
        log.info('FIM - cmdPending - sem pendências');
        return;
    }

    log.debug('cmdPending: projetos com pendências', { projects });

    process.stdout.write('=== TAREFAS PENDENTES ===\n\n');

    projects.forEach(proj => {
        process.stdout.write(`## ${proj}\n`);
        byProject[proj].forEach(item => {
            process.stdout.write(`  - [${item.date}] ${item.task}\n`);
        });
        process.stdout.write('\n');
    });

    log.info('FIM - cmdPending - Sucesso', { projetos: projects.length });
}

/**
 * SEARCH "palavra" — busca em summary, pending e decisions
 */
function cmdSearch(argv) {
    const query = (argv[0] || '').toLowerCase().trim();
    log.info('INÍCIO - cmdSearch', { query });

    if (!query) {
        process.stderr.write('Uso: search "palavra"\n');
        process.exit(1);
    }

    const sessions = readAll();
    const results = sessions.filter(s => {
        const haystack = [
            s.summary || '',
            ...(s.pending   || []),
            ...(s.decisions || []),
            ...(s.tags      || [])
        ].join(' ').toLowerCase();

        return haystack.includes(query);
    });

    log.debug('cmdSearch: resultado', { total: sessions.length, encontradas: results.length });

    if (results.length === 0) {
        process.stdout.write(`Nenhuma sessão encontrada para: "${query}"\n`);
        log.info('FIM - cmdSearch - sem resultados');
        return;
    }

    process.stdout.write(`=== BUSCA: "${query}" — ${results.length} resultado(s) ===\n\n`);

    results.reverse().forEach(s => {
        process.stdout.write(`[${formatDate(s.date)}] [${s.project}] ID: ${s.id}\n`);
        process.stdout.write(`  Resumo: ${s.summary}\n`);

        if (s.pending && s.pending.length > 0) {
            process.stdout.write(`  Pendências: ${s.pending.join(' | ')}\n`);
        }
        if (s.decisions && s.decisions.length > 0) {
            process.stdout.write(`  Decisões: ${s.decisions.join(' | ')}\n`);
        }
        process.stdout.write('\n');
    });

    log.info('FIM - cmdSearch - Sucesso', { resultados: results.length });
}

/**
 * DONE [ID] "tarefa" — marca uma tarefa como concluída
 */
function cmdDone(argv) {
    const sessionId = (argv[0] || '').trim();
    const taskText  = (argv[1] || '').toLowerCase().trim();

    log.info('INÍCIO - cmdDone', { sessionId, taskText });

    if (!sessionId || !taskText) {
        process.stderr.write('Uso: done [ID] "tarefa"\n');
        process.exit(1);
    }

    const sessions = readAll();
    const idx = sessions.findIndex(s => s.id === sessionId);

    if (idx === -1) {
        process.stderr.write(`Sessão não encontrada: ${sessionId}\n`);
        log.error('cmdDone: sessão não encontrada', null);
        process.exit(1);
    }

    const session = sessions[idx];
    log.debug('cmdDone: sessão encontrada', { id: session.id, pending: session.pending });

    const before = session.pending.length;

    // Filtrar a tarefa que corresponde (busca parcial, case-insensitive)
    session.pending = session.pending.filter(p => !p.toLowerCase().includes(taskText));

    const after = session.pending.length;
    const removidas = before - after;

    if (removidas === 0) {
        process.stderr.write(`Tarefa não encontrada na sessão ${sessionId}: "${taskText}"\n`);
        log.error('cmdDone: tarefa não encontrada');
        process.exit(1);
    }

    writeAll(sessions);

    process.stdout.write(`✓ ${removidas} tarefa(s) marcada(s) como concluída(s) na sessão [${sessionId}]\n`);
    log.info('FIM - cmdDone - Sucesso', { removidas });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
    const args   = process.argv.slice(2);
    const cmd    = (args[0] || '').toLowerCase().trim();
    const rest   = args.slice(1);

    log.debug('main: iniciando', { cmd, rest });

    switch (cmd) {
        case 'write':
            await cmdWrite(rest);
            break;

        case 'latest':
            cmdLatest();
            break;

        case 'list':
            cmdList(rest);
            break;

        case 'pending':
            cmdPending();
            break;

        case 'search':
            cmdSearch(rest);
            break;

        case 'done':
            cmdDone(rest);
            break;

        default:
            process.stdout.write([
                'session-diary.js — Gerenciador de histórico de sessões IA',
                '',
                'Uso: node session-diary.js [comando] [opções]',
                '',
                'Comandos:',
                '  write                          Salva nova sessão (modo interativo)',
                '  write --project "X" --summary "Y" [--pending "a|b"] [--decisions "d1|d2"] [--tags "t1,t2"]',
                '  latest                         Exibe a última sessão',
                '  list [N]                       Lista as últimas N sessões (default 5)',
                '  pending                        Todas as tarefas pendentes agrupadas por projeto',
                '  search "palavra"               Busca em resumo, pendências e decisões',
                '  done [ID] "tarefa"             Marca tarefa como concluída em uma sessão',
                '',
                'Arquivo de dados: ' + DIARY_FILE,
                ''
            ].join('\n'));
            break;
    }
}

main().catch(err => {
    log.error('Erro fatal não tratado', err);
    process.exit(1);
});
