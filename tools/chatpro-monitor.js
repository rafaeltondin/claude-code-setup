/**
 * CHATPRO MONITOR — Verifica conversas do ChatPro Performa Academia
 *
 * Faz login, busca conversas recentes, analisa loops/problemas,
 * e envia relatorio via WhatsApp.
 *
 * Uso: node chatpro-monitor.js [--dry-run]
 */

const https = require('https');
const path = require('path');

// --- Config ---
const CHATPRO_BACKEND = 'backend.botconversa.com.br';
const BOT_ID = 69429;
const COMPANY_ID = 76490;
const LOGIN_EMAIL = 'nadia.ton@hotmail.com';
const LOGIN_PASS = 'Performa@123';
const WHATSAPP_NUMBER = '5554990007530';
const TOOLS_CLI = path.join(__dirname, '..', 'task-scheduler', 'tools-cli.js');

const DRY_RUN = process.argv.includes('--dry-run');

// --- HTTP Helper ---
function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// --- Login ---
async function login() {
  console.log('[Monitor] Fazendo login no ChatPro...');
  const body = JSON.stringify({
    email: LOGIN_EMAIL,
    password: LOGIN_PASS,
    franchise_code: '5892e900-5ccc-4786-bcbf-ec8358d4ad98'
  });
  const res = await httpsRequest({
    hostname: CHATPRO_BACKEND,
    path: '/api/v1/auth/jwt/create/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://app.chatpro.digital',
      'Referer': 'https://app.chatpro.digital/',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (res.status === 200 && res.data.access) {
    console.log('[Monitor] Login OK');
    return res.data.access;
  }
  throw new Error(`Login falhou: ${res.status} — ${JSON.stringify(res.data).substring(0, 200)}`);
}

// --- API Call ---
async function apiCall(token, path) {
  return httpsRequest({
    hostname: CHATPRO_BACKEND,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Language': 'pt'
    }
  });
}

// --- Buscar conversas recentes ---
async function getRecentConversations(token) {
  console.log('[Monitor] Buscando conversas recentes...');

  // Buscar threads/conversas do bot
  const res = await apiCall(token, `/api/v1/threads/?bot_id=${BOT_ID}&page=1&limit=50`);

  if (res.status !== 200) {
    // Tentar endpoint alternativo
    const res2 = await apiCall(token, `/api/v1/bots/${BOT_ID}/threads/?page=1`);
    if (res2.status === 200) return res2.data;

    // Outro alternativo
    const res3 = await apiCall(token, `/api/v2/threads/?bot_id=${BOT_ID}&page=1`);
    if (res3.status === 200) return res3.data;

    console.log('[Monitor] Endpoints de threads retornaram:', res.status);
    return null;
  }
  return res.data;
}

// --- Verificar flows e menus ---
async function checkFlows(token) {
  console.log('[Monitor] Verificando flows e menus...');
  const results = {};

  const flowsToCheck = [
    { id: 8673437, name: 'Interesse Generico' },
    { id: 8673251, name: 'Boas-Vindas v2' },
    { id: 8679080, name: 'Atendimento Aluno Ativo' }
  ];

  for (const f of flowsToCheck) {
    const res = await apiCall(token, `/api/v1/blocks/flow/${f.id}/?bot_id=${BOT_ID}`);
    if (res.status === 200) {
      const blocks = res.data.blocks || res.data;
      const menuBlocks = blocks.filter(b => b.type === 6);
      // Dead-ends: blocos de texto com menu numerado que NÃO estão conectados a partir do starting block
      const startBlock = blocks.find(b => b.type === 5);
      const reachable = new Set();
      if (startBlock) {
        const queue = [startBlock.block_to];
        while (queue.length > 0) {
          const id = queue.shift();
          if (!id || reachable.has(id)) continue;
          reachable.add(id);
          const block = blocks.find(b => b.id === id);
          if (block) {
            if (block.block_to) queue.push(block.block_to);
            if (block.menu_block?.menu_sub_block) {
              block.menu_block.menu_sub_block.forEach(s => { if (s.block_to) queue.push(s.block_to); });
            }
            if (block.condition_block) {
              if (block.condition_block.true_block_to) queue.push(block.condition_block.true_block_to);
              if (block.condition_block.false_block_to) queue.push(block.condition_block.false_block_to);
            }
          }
        }
      }
      const deadEnds = blocks.filter(b => b.type === 0 && b.block_to === null && reachable.has(b.id) &&
        b.content_block?.content_sub_block?.some(s => s.text_content_sub_block?.text?.includes('1️⃣')));

      results[f.name] = {
        totalBlocks: blocks.length,
        menuBlocks: menuBlocks.length,
        menuOptions: menuBlocks.reduce((sum, mb) => sum + (mb.menu_block?.menu_sub_block?.length || 0), 0),
        deadEndMenus: deadEnds.length,
        status: menuBlocks.length > 0 && deadEnds.length === 0 ? '✅ OK' : '⚠️ Problema'
      };
    } else {
      results[f.name] = { status: '❌ Erro ao carregar', httpStatus: res.status };
    }
  }

  return results;
}

// --- Verificar keywords ---
async function checkKeywords(token) {
  console.log('[Monitor] Verificando keywords...');
  const res = await apiCall(token, `/api/v1/keywords/bot/${BOT_ID}/`);

  if (res.status !== 200) return { error: 'Falha ao buscar keywords' };

  const keywords = res.data;
  const active = keywords.filter(k => k.is_turn_on);
  const disabled = keywords.filter(k => !k.is_turn_on);

  // Check for digit conflicts
  const digitKeywords = active.filter(k => {
    const words = k.text.split(',').map(w => w.trim());
    return words.some(w => ['1', '2', '3', '4'].includes(w));
  });

  // Check for word conflicts
  const wordMap = {};
  active.forEach(k => {
    k.text.split(',').map(w => w.trim().toLowerCase()).forEach(w => {
      if (!wordMap[w]) wordMap[w] = [];
      wordMap[w].push(k.name);
    });
  });
  // Build flow map for conflict detection (same word → different flows = real conflict)
  const wordFlowMap = {};
  active.forEach(k => {
    k.text.split(',').map(w => w.trim().toLowerCase()).forEach(w => {
      if (!wordFlowMap[w]) wordFlowMap[w] = new Set();
      wordFlowMap[w].add(k.flow?.name || k.name);
    });
  });
  const conflicts = Object.entries(wordFlowMap)
    .filter(([_, flows]) => flows.size > 1)
    .map(([word, flows]) => `"${word}" → ${[...flows].join(', ')}`);

  return {
    total: keywords.length,
    active: active.length,
    disabled: disabled.length,
    digitKeywords: digitKeywords.map(k => `${k.name}: "${k.text.substring(0, 30)}" → ${k.flow?.name}`),
    conflicts: conflicts.length > 0 ? conflicts : ['Nenhum conflito ✅'],
    status: conflicts.filter(c => !c.includes('mesmo destino')).length === 0 ? '✅ OK' : '⚠️ Conflitos encontrados'
  };
}

// --- Buscar estatísticas do bot ---
async function getBotStats(token) {
  console.log('[Monitor] Buscando estatísticas...');
  const res = await apiCall(token, `/api/v2/companies/${COMPANY_ID}/`);

  if (res.status === 200) {
    return {
      contacts: res.data.subscribers_count || 'N/A',
      name: res.data.name || 'Performa Academia'
    };
  }
  return { contacts: 'N/A', name: 'Performa Academia' };
}

// --- Montar relatório ---
function buildReport(stats, flows, keywords) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  let report = `*📊 Monitor ChatPro — Performa Academia*\n`;
  report += `_${dateStr} às ${timeStr}_\n\n`;

  // Stats
  report += `*Contatos:* ${stats.contacts}\n\n`;

  // Flows
  report += `*🔄 Status dos Flows:*\n`;
  for (const [name, data] of Object.entries(flows)) {
    report += `• ${name}: ${data.status}`;
    if (data.menuBlocks !== undefined) {
      report += ` (${data.menuBlocks} menus, ${data.menuOptions} opções)`;
    }
    report += `\n`;
  }
  report += `\n`;

  // Keywords
  report += `*🔑 Keywords:*\n`;
  report += `• Ativas: ${keywords.active} | Desativadas: ${keywords.disabled}\n`;
  report += `• Dígitos 1-4 mapeados:\n`;
  keywords.digitKeywords?.forEach(k => { report += `  → ${k}\n`; });
  report += `• Conflitos: ${keywords.conflicts?.[0]}\n\n`;

  // Veredicto
  const allOk = Object.values(flows).every(f => f.status?.includes('OK')) &&
                 keywords.status?.includes('OK');

  if (allOk) {
    report += `*✅ Tudo funcionando corretamente!*\n`;
    report += `Menus MENU block ativos, sem dead-ends, sem conflitos de keywords.`;
  } else {
    report += `*⚠️ Atenção necessária!*\n`;
    const issues = [];
    Object.entries(flows).forEach(([n, d]) => { if (!d.status?.includes('OK')) issues.push(`Flow "${n}" com problema`); });
    if (!keywords.status?.includes('OK')) issues.push('Conflitos de keywords detectados');
    report += issues.join('\n');
  }

  return report;
}

// --- Enviar WhatsApp ---
async function sendWhatsApp(text) {
  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Relatório que seria enviado:\n');
    console.log(text);
    return;
  }

  console.log('[Monitor] Enviando relatório via WhatsApp...');
  const { execSync } = require('child_process');
  try {
    // Escapar aspas no texto
    const escaped = text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    execSync(`node "${TOOLS_CLI}" send_whatsapp number="${WHATSAPP_NUMBER}" text="${escaped}"`, {
      timeout: 30000,
      encoding: 'utf-8'
    });
    console.log('[Monitor] WhatsApp enviado com sucesso!');
  } catch (e) {
    console.error('[Monitor] Erro ao enviar WhatsApp:', e.message);
  }
}

// --- Main ---
async function main() {
  console.log(`[Monitor] Iniciando verificação — ${new Date().toISOString()}`);

  try {
    const token = await login();

    const [stats, flows, keywords] = await Promise.all([
      getBotStats(token),
      checkFlows(token),
      checkKeywords(token)
    ]);

    const report = buildReport(stats, flows, keywords);
    await sendWhatsApp(report);

    console.log('[Monitor] Verificação concluída com sucesso!');
  } catch (err) {
    console.error('[Monitor] Erro:', err.message);

    // Tentar notificar erro
    if (!DRY_RUN) {
      try {
        await sendWhatsApp(`*❌ Monitor ChatPro — ERRO*\n\n${err.message}\n\nVerifique manualmente.`);
      } catch (_) {}
    }
  }
}

main();
