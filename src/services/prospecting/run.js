/**
 * RIWER LABS — PAINEL DE PROSPECÇÃO (CLI Interativo)
 * Uso: node run.js
 */
'use strict';

const readline = require('readline');
const { prospect } = require('./prospector');

// ─── Regiões e segmentos pré-configurados ──────────────────────────────────
const REGIOES = [
  'Florianópolis SC',
  'São José SC',
  'Palhoça SC',
  'Biguaçu SC',
  'Imbituba SC',
  'Garopaba SC',
  'Laguna SC',
  'Tubarão SC',
];

const SEGMENTOS = [
  { label: 'Clínicas odontológicas',   query: 'clínicas odontológicas' },
  { label: 'Clínicas médicas',          query: 'clínicas médicas' },
  { label: 'Imobiliárias',              query: 'imobiliárias' },
  { label: 'Escritórios de advocacia',  query: 'escritórios de advocacia' },
  { label: 'Contabilidades',            query: 'escritórios de contabilidade' },
  { label: 'Academias / Fitness',       query: 'academias de ginástica' },
  { label: 'Restaurantes / Delivery',   query: 'restaurantes' },
  { label: 'Clínicas veterinárias',     query: 'clínicas veterinárias' },
  { label: 'Salões de beleza',          query: 'salões de beleza' },
  { label: 'Distribuidoras / Atacado',  query: 'distribuidoras atacado' },
  { label: 'Digitação livre...',        query: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function menu(title, items) {
  console.log('\n' + '─'.repeat(50));
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
  items.forEach((item, i) => {
    const label = typeof item === 'string' ? item : item.label;
    console.log(`  [${i + 1}] ${label}`);
  });
  console.log('─'.repeat(50));
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   RIWER LABS — PROSPECÇÃO AUTOMÁTICA IA          ║');
  console.log('║   Florianópolis + Grande Florianópolis + Litoral  ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // ── Selecionar segmento ──
  menu('SELECIONE O SEGMENTO', SEGMENTOS);
  const segIdx = parseInt(await ask('\n  Número do segmento: ')) - 1;

  if (isNaN(segIdx) || segIdx < 0 || segIdx >= SEGMENTOS.length) {
    console.log('Opção inválida. Saindo.');
    rl.close(); return;
  }

  let segment = SEGMENTOS[segIdx].query;
  if (!segment) {
    segment = await ask('  Digite o segmento: ');
  }

  // ── Selecionar regiões (múltipla) ──
  menu('SELECIONE AS REGIÕES (separe por vírgula, ex: 1,3,5)', REGIOES);
  const regionInput = await ask('\n  Número(s) da(s) região(ões): ');
  const regionIdxs  = regionInput.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < REGIOES.length);

  if (regionIdxs.length === 0) {
    console.log('Nenhuma região selecionada. Saindo.');
    rl.close(); return;
  }

  const regions = regionIdxs.map(i => REGIOES[i]);

  // ── Limite por região ──
  const limitStr = await ask(`\n  Quantos leads por região? [padrão: 15]: `);
  const limit = parseInt(limitStr) || 15;

  // ── Dry run? ──
  const dryRunStr = await ask('\n  Modo DRY-RUN (apenas testar, não salvar)? [s/N]: ');
  const dryRun = dryRunStr.toLowerCase() === 's';

  // ── Confirmação ──
  console.log('\n' + '═'.repeat(50));
  console.log('  RESUMO DA PROSPECÇÃO');
  console.log('═'.repeat(50));
  console.log(`  Segmento  : ${segment}`);
  console.log(`  Regiões   : ${regions.join(', ')}`);
  console.log(`  Limite    : ${limit} por região (${limit * regions.length} total)`);
  console.log(`  Modo      : ${dryRun ? '🧪 DRY-RUN' : '🔴 PRODUÇÃO — vai criar leads reais'}`);
  console.log('═'.repeat(50));

  const confirm = await ask('\n  Confirmar e iniciar? [S/n]: ');
  if (confirm.toLowerCase() === 'n') {
    console.log('Cancelado.');
    rl.close(); return;
  }

  rl.close();

  // ── Executar para cada região ──
  const allResults = [];
  for (const region of regions) {
    console.log(`\n${'▶'.repeat(3)} INICIANDO: ${segment} em ${region}`);
    try {
      const r = await prospect({ segment, region, limit, dryRun });
      allResults.push({ region, ...r });
    } catch (e) {
      console.error(`Erro em ${region}:`, e.message);
    }
  }

  // ── Resumo final ──
  console.log('\n' + '═'.repeat(60));
  console.log('  RESUMO GERAL DE TODAS AS REGIÕES');
  console.log('═'.repeat(60));

  let totalCreated = 0, totalCampaign = 0, totalHot = 0;
  for (const r of allResults) {
    console.log(`  📍 ${r.region}`);
    console.log(`     Criados: ${r.created} | Campanha: ${r.addedToCampaign} | 🔴 ${r.hot} | 🟡 ${r.warm}`);
    totalCreated  += r.created || 0;
    totalCampaign += r.addedToCampaign || 0;
    totalHot      += r.hot || 0;
  }

  console.log('─'.repeat(60));
  console.log(`  TOTAL: ${totalCreated} leads criados | ${totalCampaign} na campanha | ${totalHot} quentes`);
  console.log('═'.repeat(60));
  console.log('\n  ✅ Acesse o CRM: http://localhost:3847/leads');
  console.log('  📊 Campanha: http://localhost:3847/campaigns\n');
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
