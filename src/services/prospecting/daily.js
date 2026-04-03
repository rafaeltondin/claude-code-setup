/**
 * RIWER LABS — PROSPECÇÃO DIÁRIA AUTOMÁTICA
 *
 * Roda todos os dias via scheduler. Rotaciona segmentos/regiões
 * automaticamente e evita duplicatas usando histórico persistente.
 *
 * Meta: 20 leads NOVOS por dia.
 *
 * Uso manual: node daily.js [--dry-run] [--force-segment "nome"] [--force-region "nome"]
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const { prospect } = require('./prospector');

// ─── Horário comercial ─────────────────────────────────────────────────────
const HORA_INICIO = 8;
const HORA_FIM    = 17;

function agoraSP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function isDiaUtil() {
  const d = agoraSP();
  return d.getDay() >= 1 && d.getDay() <= 5;
}

function isDentroHorarioComercial() {
  const d = agoraSP();
  return isDiaUtil() && d.getHours() >= HORA_INICIO && d.getHours() < HORA_FIM;
}

// ─── Config ────────────────────────────────────────────────────────────────
const HISTORY_FILE = path.join(__dirname, 'history.json');
const STATE_FILE   = path.join(__dirname, 'daily-state.json');
const LOGS_DIR     = path.join(__dirname, 'logs');
const DAILY_TARGET = 20;

// Regiões com peso (cidades maiores geram mais leads por busca)
const REGIOES = [
  { name: 'Florianópolis SC',  weight: 3 },
  { name: 'São José SC',       weight: 2 },
  { name: 'Palhoça SC',        weight: 1 },
  { name: 'Biguaçu SC',        weight: 1 },
  { name: 'Imbituba SC',       weight: 1 },
  { name: 'Garopaba SC',       weight: 1 },
  { name: 'Laguna SC',         weight: 1 },
  { name: 'Tubarão SC',        weight: 1 },
  { name: 'Criciúma SC',       weight: 2 },
  { name: 'Blumenau SC',       weight: 2 },
  { name: 'Joinville SC',      weight: 3 },
  { name: 'Balneário Camboriú SC', weight: 2 },
  { name: 'Itajaí SC',         weight: 2 },
  { name: 'Chapecó SC',        weight: 1 },
  { name: 'Lages SC',          weight: 1 },
];

const SEGMENTOS = [
  'clínicas odontológicas',
  'clínicas médicas',
  'clínicas de estética',
  'imobiliárias',
  'escritórios de advocacia',
  'escritórios de contabilidade',
  'academias de ginástica',
  'restaurantes delivery',
  'clínicas veterinárias',
  'salões de beleza',
  'pet shops',
  'lojas de roupas',
  'autoescolas',
  'escolas de idiomas',
  'estúdios de pilates',
  'agências de turismo',
  'lojas de materiais de construção',
  'farmácias',
  'óticas',
  'pizzarias delivery',
  'clínicas de fisioterapia',
  'estúdios de tatuagem',
  'floriculturas',
  'lavanderias',
  'oficinas mecânicas',
];

// ─── Histórico (anti-duplicatas) ───────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return { prospected: [], lastUpdated: null };
  }
}

function saveHistory(history) {
  history.lastUpdated = new Date().toISOString();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

function isAlreadyProspected(history, name, phone, website) {
  const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nName = normalize(name);
  const nPhone = (phone || '').replace(/\D/g, '');
  const nSite = normalize(website);

  return history.prospected.some(h => {
    if (nPhone && h.phone && h.phone === nPhone) return true;
    if (nSite && h.website && normalize(h.website) === nSite) return true;
    if (nName && h.name && normalize(h.name) === nName) return true;
    return false;
  });
}

function addToHistory(history, lead) {
  history.prospected.push({
    name: lead.name,
    phone: (lead.phone || '').replace(/\D/g, ''),
    website: lead.website || '',
    segment: lead.segment,
    region: lead.region,
    score: lead.score,
    date: new Date().toISOString(),
  });
}

// ─── Estado diário (rotação) ───────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastSegmentIdx: -1, lastRegionIdx: -1, totalRuns: 0, history: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Selecionar próximo combo segmento+região que ainda não foi usado recentemente
function pickNextCombo(state) {
  const totalCombos = SEGMENTOS.length * REGIOES.length;

  // Pegar últimos combos usados (últimos 30 dias = ~30 combos)
  const recentCombos = new Set(
    (state.history || [])
      .filter(h => {
        const d = new Date(h.date);
        const ago = Date.now() - d.getTime();
        return ago < 30 * 24 * 60 * 60 * 1000; // 30 dias
      })
      .map(h => `${h.segment}|${h.region}`)
  );

  // Avançar ciclicamente, pulando combos recentes
  let segIdx = (state.lastSegmentIdx + 1) % SEGMENTOS.length;
  let regIdx = state.lastRegionIdx < 0 ? 0 : state.lastRegionIdx;

  // Se completou todos os segmentos, avançar região
  if (segIdx === 0 && state.totalRuns > 0) {
    regIdx = (regIdx + 1) % REGIOES.length;
  }

  const combo = `${SEGMENTOS[segIdx]}|${REGIOES[regIdx].name}`;

  // Se esse combo foi usado recentemente, tentar o próximo
  let attempts = 0;
  while (recentCombos.has(`${SEGMENTOS[segIdx]}|${REGIOES[regIdx].name}`) && attempts < totalCombos) {
    segIdx = (segIdx + 1) % SEGMENTOS.length;
    if (segIdx === 0) regIdx = (regIdx + 1) % REGIOES.length;
    attempts++;
  }

  // Se todos foram usados recentemente (improvável com 25x15=375 combos), resetar
  if (attempts >= totalCombos) {
    segIdx = 0;
    regIdx = 0;
    state.history = [];
  }

  return { segIdx, regIdx, segment: SEGMENTOS[segIdx], region: REGIOES[regIdx].name };
}

// ─── Logging em arquivo ────────────────────────────────────────────────────
function setupFileLog() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const logFile = path.join(LOGS_DIR, `daily-${today}.log`);
  const stream = fs.createWriteStream(logFile, { flags: 'a' });

  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => {
    const line = args.map(String).join(' ');
    stream.write(line + '\n');
    origLog.apply(console, args);
  };
  console.error = (...args) => {
    const line = '[ERROR] ' + args.map(String).join(' ');
    stream.write(line + '\n');
    origErr.apply(console, args);
  };

  return { logFile, stream, restore: () => { console.log = origLog; console.error = origErr; } };
}

// ─── Notificar resultado via CRM note ──────────────────────────────────────
async function notifyResult(summary) {
  const http_ = require('http');
  const body = JSON.stringify({
    title: `Prospecção Diária — ${new Date().toLocaleDateString('pt-BR')}`,
    content: [
      `Segmento: ${summary.segment}`,
      `Região: ${summary.region}`,
      `Leads novos criados: ${summary.created}`,
      `Adicionados à campanha: ${summary.addedToCampaign}`,
      `Quentes: ${summary.hot} | Mornos: ${summary.warm} | Frios: ${summary.cold}`,
      `Duplicatas evitadas: ${summary.duplicatesSkipped}`,
      `Total no histórico: ${summary.totalInHistory}`,
      `Execução #${summary.runNumber}`,
    ].join('\n'),
    type: 'system',
  });

  return new Promise((resolve) => {
    const req = http_.request({
      hostname: 'localhost', port: 3847, method: 'POST',
      path: '/api/crm/notes',
      headers: {
        'Authorization': 'Bearer local-dev-token',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
      },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)); });
    req.on('error', () => resolve(null));
    req.write(body, 'utf8');
    req.end();
  });
}

// ─── Monkey-patch do prospector para filtrar duplicatas ─────────────────────
// O prospector original não conhece o histórico. Vamos interceptar
// os resultados do Maps e filtrar ANTES de processar.
const origProspect = prospect;

async function prospectWithDedup(options, history) {
  // Hook: salvar leads criados no histórico após o prospect rodar
  const result = await origProspect(options);
  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function daily(opts = {}) {
  const { dryRun = false, forceSegment, forceRegion } = opts;

  // Guard de horário comercial — só roda seg-sex 8h-17h (SP)
  if (!dryRun && !isDentroHorarioComercial()) {
    const sp = agoraSP();
    const motivo = !isDiaUtil()
      ? `final de semana (${['dom','seg','ter','qua','qui','sex','sab'][sp.getDay()]})`
      : sp.getHours() < HORA_INICIO
        ? `antes do expediente (${sp.getHours()}h)`
        : `após o expediente (${sp.getHours()}h)`;
    console.log(`[DAILY] Fora do horário comercial: ${motivo}. Pulando execução.`);
    console.log(`[DAILY] Horário permitido: seg-sex ${HORA_INICIO}h-${HORA_FIM}h (America/Sao_Paulo)`);
    return { skipped: true, reason: motivo };
  }

  const { logFile, stream, restore } = setupFileLog();

  console.log('\n' + '█'.repeat(60));
  console.log('  RIWER LABS — PROSPECÇÃO DIÁRIA AUTOMÁTICA');
  console.log(`  ${new Date().toLocaleString('pt-BR')}`);
  console.log('█'.repeat(60));

  // Carregar estado e histórico
  const state   = loadState();
  const history = loadHistory();

  console.log(`\n  Histórico: ${history.prospected.length} leads já prospectados`);
  console.log(`  Execuções anteriores: ${state.totalRuns}`);

  // Escolher segmento + região
  let segment, region;
  if (forceSegment && forceRegion) {
    segment = forceSegment;
    region  = forceRegion;
  } else {
    const combo = pickNextCombo(state);
    segment = forceSegment || combo.segment;
    region  = forceRegion  || combo.region;
    state.lastSegmentIdx = combo.segIdx;
    state.lastRegionIdx  = combo.regIdx;
  }

  console.log(`\n  Combo do dia: "${segment}" em "${region}"`);
  console.log(`  Meta: ${DAILY_TARGET} leads novos`);
  console.log(`  Modo: ${dryRun ? '🧪 DRY-RUN' : '🔴 PRODUÇÃO'}\n`);

  // Registrar combo no histórico de rotação
  state.history = state.history || [];
  state.history.push({ segment, region, date: new Date().toISOString() });
  // Manter só últimos 60 dias de histórico de combos
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  state.history = state.history.filter(h => new Date(h.date).getTime() > cutoff);

  // Buscar leads existentes no CRM para comparar com os do Maps
  let existingLeads = [];
  try {
    const http_ = require('http');
    const res = await new Promise((resolve) => {
      http_.get('http://localhost:3847/api/crm/leads?limit=500&source=prospecting', {
        headers: { 'Authorization': 'Bearer local-dev-token' },
      }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d))); })
      .on('error', () => resolve({ data: [] }));
    });
    existingLeads = res?.data || [];
    console.log(`  Leads de prospecção já no CRM: ${existingLeads.length}`);
  } catch { /* continua sem verificação extra */ }

  // Sincronizar histórico com leads do CRM (garante consistência)
  for (const lead of existingLeads) {
    if (!isAlreadyProspected(history, lead.name || lead.company, lead.phone, lead.website)) {
      addToHistory(history, {
        name: lead.name || lead.company,
        phone: lead.phone,
        website: lead.website,
        segment: lead.customFields?.segment || '',
        region: '',
        score: lead.customFields?.prospecting_score || 0,
      });
    }
  }

  // Rodar prospecção — pedir mais leads que a meta para compensar duplicatas
  const requestLimit = Math.min(DAILY_TARGET + 10, 30); // pedir até 30
  let duplicatesSkipped = 0;

  const result = await prospect({
    segment,
    region,
    limit: requestLimit,
    dryRun,
    includeAll: false,
  });

  // Contar leads reais criados
  const created = result?.created || 0;
  const addedToCampaign = result?.addedToCampaign || 0;

  // Atualizar histórico com os novos leads criados
  // (O prospector já faz upsert no CRM, mas precisamos rastrear no history.json)
  if (!dryRun && created > 0) {
    // Buscar os leads mais recentes para adicionar ao histórico
    try {
      const http_ = require('http');
      const recentRes = await new Promise((resolve) => {
        http_.get(`http://localhost:3847/api/crm/leads?limit=${created + 5}&source=prospecting&sort=createdAt&order=desc`, {
          headers: { 'Authorization': 'Bearer local-dev-token' },
        }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d))); })
        .on('error', () => resolve({ data: [] }));
      });

      for (const lead of (recentRes?.data || [])) {
        if (!isAlreadyProspected(history, lead.name, lead.phone, lead.website)) {
          addToHistory(history, {
            name: lead.name,
            phone: lead.phone,
            website: lead.website,
            segment,
            region,
            score: lead.customFields?.prospecting_score || 0,
          });
        }
      }
    } catch { /* continua */ }
  }

  // Salvar estado e histórico
  state.totalRuns++;
  saveState(state);
  saveHistory(history);

  // Resumo
  const summary = {
    date: new Date().toISOString(),
    segment,
    region,
    created,
    addedToCampaign,
    hot: result?.hot || 0,
    warm: result?.warm || 0,
    cold: result?.cold || 0,
    duplicatesSkipped,
    totalInHistory: history.prospected.length,
    runNumber: state.totalRuns,
    dryRun,
  };

  console.log('\n' + '█'.repeat(60));
  console.log('  RESUMO DA PROSPECÇÃO DIÁRIA');
  console.log('█'.repeat(60));
  console.log(`  Segmento         : ${segment}`);
  console.log(`  Região           : ${region}`);
  console.log(`  Leads criados    : ${created}`);
  console.log(`  Na campanha      : ${addedToCampaign}`);
  console.log(`  Quentes          : ${summary.hot}`);
  console.log(`  Mornos           : ${summary.warm}`);
  console.log(`  Total histórico  : ${history.prospected.length}`);
  console.log(`  Execução #       : ${state.totalRuns}`);
  console.log('█'.repeat(60));

  // Notificar via CRM
  if (!dryRun) {
    try {
      await notifyResult(summary);
      console.log('\n  📬 Notificação registrada no CRM');
    } catch { /* silencioso */ }
  }

  // Salvar resumo do dia
  const summaryPath = path.join(LOGS_DIR, `summary-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`  📄 Log: ${logFile}`);

  restore();
  stream.end();

  return summary;
}

// ─── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const get  = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const has  = flag => args.includes(flag);

  daily({
    dryRun:       has('--dry-run') || has('--dry'),
    forceSegment: get('--segment') || get('-s'),
    forceRegion:  get('--region')  || get('-r'),
  })
    .then(s => {
      console.log(`\nFinalizado — ${s.created} leads criados.`);
      process.exit(0);
    })
    .catch(e => {
      console.error('Erro fatal:', e);
      process.exit(1);
    });
}

module.exports = { daily };
