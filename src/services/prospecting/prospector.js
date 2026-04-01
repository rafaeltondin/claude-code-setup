/**
 * RIWER LABS — SCRIPT DE PROSPECÇÃO AUTOMÁTICA
 * Fluxo: Google Maps → Scrape → Score → CRM → Campanha
 *
 * Uso:
 *   node prospector.js --segment "clínicas odontológicas" --region "Florianópolis SC" --limit 20
 *   node prospector.js --segment "imobiliárias" --region "Imbituba SC" --limit 10 --dry-run
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ─── Config ────────────────────────────────────────────────────────────────
const TOOLS_CLI    = path.join(__dirname, '..', 'tools-cli.js'); // mantido para referência
const { executeTool } = require(path.join(__dirname, '..', 'chat-tools'));
const CAMPAIGN_ID  = 'cmmoe6r6m000bw0f4wo239spm'; // Prospecção Riwer Labs — SC 2026
const CRM_API      = 'http://localhost:3847/api/crm';
const CRM_TOKEN    = 'local-dev-token';

// Pontuação de oportunidade — quanto mais alto, maior a dor digital
const SCORING = {
  pagespeedMobileLow:    30,  // mobile < 60 → alta urgência
  pagespeedMobileMedium: 15,  // mobile 60-75 → urgência média
  seoScoreLow:           20,  // SEO < 50 → oportunidade forte
  seoScoreMedium:        10,  // SEO 50-65 → oportunidade
  noWhatsapp:            20,  // sem botão/link WhatsApp detectado
  noChatbot:             15,  // sem script de chat detectado
  oldCopyright:          10,  // copyright < 2024
  noSsl:                 15,  // sem HTTPS
};

// ─── Helpers ───────────────────────────────────────────────────────────────
async function cli(tool, args = {}) {
  // Chamar executeTool diretamente — sem subprocess, sem problemas de encoding
  try {
    const result = await executeTool(tool, args);
    if (typeof result === 'string') {
      try { return JSON.parse(result); } catch { return { raw: result }; }
    }
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

function http(method, path_, body) {
  const http_ = require('http');
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3847, path: path_, method,
      headers: {
        'Authorization': `Bearer ${CRM_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
        ...(data ? { 'Content-Length': Buffer.byteLength(data, 'utf8') } : {}),
      },
    };
    const req = http_.request(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', reject);
    if (data) req.write(data, 'utf8');
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(icon, msg, detail = '') {
  const ts = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${ts}] ${icon} ${msg}${detail ? ` — ${detail}` : ''}`);
}

// ─── Análise do site ────────────────────────────────────────────────────────
async function analyzeSite(url) {
  if (!url || !url.startsWith('http')) return { score: 0, signals: [], url: null };

  log('🔍', `Analisando site`, url);

  const [scrapeResult, seoResult, psResult] = await Promise.allSettled([
    Promise.resolve(cli('scrape_website', { url })),
    Promise.resolve(cli('seo_check', { url })),
    Promise.resolve(cli('pagespeed', { url, strategy: 'mobile' })),
  ]);

  const scrape = scrapeResult.status === 'fulfilled' ? scrapeResult.value : {};
  const seo    = seoResult.status === 'fulfilled'    ? seoResult.value    : {};
  const ps     = psResult.status === 'fulfilled'     ? psResult.value     : {};

  const signals = [];
  let score = 0;

  // ── PageSpeed Mobile ──
  const psScore = ps?.data?.score ?? ps?.score ?? ps?.lighthouseResult?.categories?.performance?.score * 100 ?? null;
  if (psScore !== null) {
    if (psScore < 50) {
      score += SCORING.pagespeedMobileLow;
      signals.push({ type: 'pagespeed_low', label: `Site muito lento no celular (${psScore}/100)`, value: psScore });
    } else if (psScore < 75) {
      score += SCORING.pagespeedMobileMedium;
      signals.push({ type: 'pagespeed_med', label: `Site lento no celular (${psScore}/100)`, value: psScore });
    }
  }

  // ── SEO Score ──
  const seoScore = seo?.data?.score ?? seo?.score ?? null;
  if (seoScore !== null) {
    if (seoScore < 50) {
      score += SCORING.seoScoreLow;
      signals.push({ type: 'seo_low', label: `SEO fraco (${seoScore}/100)`, value: seoScore });
    } else if (seoScore < 65) {
      score += SCORING.seoScoreMedium;
      signals.push({ type: 'seo_med', label: `SEO abaixo do ideal (${seoScore}/100)`, value: seoScore });
    }
  }

  // ── Conteúdo do site (WhatsApp, chatbot, copyright) ──
  const content = JSON.stringify(scrape).toLowerCase();

  if (!content.includes('whatsapp') && !content.includes('wa.me') && !content.includes('api.whatsapp')) {
    score += SCORING.noWhatsapp;
    signals.push({ type: 'no_whatsapp', label: 'Sem WhatsApp detectado no site' });
  }

  const chatbotKeywords = ['tawk', 'tidio', 'intercom', 'drift', 'zendesk', 'hubspot', 'chatwoot', 'botconversa', 'chatbot'];
  if (!chatbotKeywords.some(kw => content.includes(kw))) {
    score += SCORING.noChatbot;
    signals.push({ type: 'no_chatbot', label: 'Sem sistema de chat/chatbot detectado' });
  }

  const yearMatch = content.match(/copyright.*?(\d{4})|©.*?(\d{4})/);
  const copyrightYear = yearMatch ? parseInt(yearMatch[1] || yearMatch[2]) : null;
  if (copyrightYear && copyrightYear < 2024) {
    score += SCORING.oldCopyright;
    signals.push({ type: 'old_copyright', label: `Site desatualizado (copyright ${copyrightYear})` });
  }

  if (!url.startsWith('https')) {
    score += SCORING.noSsl;
    signals.push({ type: 'no_ssl', label: 'Site sem HTTPS (SSL)' });
  }

  // ── Problema principal para personalização ──
  const mainProblem = signals[0]?.label || 'processo de captação de clientes poderia ser mais automatizado';

  return {
    url,
    score: Math.min(score, 100),
    signals,
    mainProblem,
    insights: signals.slice(0, 3).map(s => s.label),
    psScore,
    seoScore,
  };
}

// ─── Segmento → Solução Riwer ───────────────────────────────────────────────
function getSegmentSolutions(segment) {
  const seg = segment.toLowerCase();

  if (seg.includes('clín') || seg.includes('saúde') || seg.includes('médic') || seg.includes('odont')) {
    return {
      segLabel: 'clínicas e serviços de saúde',
      solucao1: 'Chatbot para agendamento automático 24/7',
      resultado1: 'redução de 70% em ligações para marcação',
      solucao2: 'Automação de follow-up pós-consulta',
      resultado2: 'aumento de 40% no retorno de pacientes',
      situacaoAntes: 'recepcionista respondendo WhatsApp manualmente, fila de espera por agendamento',
      solucaoCase: 'chatbot com IA para triagem e agendamento + envio automático de lembretes',
      resultadoCase: '300 agendamentos/mês automatizados, 0 leads perdidos fora do horário',
    };
  }

  if (seg.includes('imobil') || seg.includes('imóvel') || seg.includes('aluguel')) {
    return {
      segLabel: 'imobiliárias e gestão de imóveis',
      solucao1: 'Bot de qualificação de leads via WhatsApp',
      resultado1: 'triagem automática de 80% das consultas iniciais',
      solucao2: 'Sistema de matching IA (perfil do cliente × imóveis)',
      resultado2: 'redução de 50% no tempo de visitas improdutivas',
      situacaoAntes: 'corretores gastando 3h/dia respondendo perguntas básicas por WhatsApp',
      solucaoCase: 'bot NLP que qualifica interesse, faixa de preço e localização antes do corretor entrar',
      resultadoCase: 'corretores dedicam 100% do tempo a leads já qualificados, vendas +28% em 90 dias',
    };
  }

  if (seg.includes('contabil') || seg.includes('contador') || seg.includes('contabilidade')) {
    return {
      segLabel: 'escritórios de contabilidade',
      solucao1: 'RPA para lançamentos e conciliação bancária',
      resultado1: 'eliminação de 60% das tarefas repetitivas da equipe',
      solucao2: 'OCR para leitura automática de notas fiscais',
      resultado2: 'processamento 10x mais rápido de documentos',
      situacaoAntes: 'equipe fazendo lançamentos manuais 4h/dia por cliente',
      solucaoCase: 'RPA que importa extratos, classifica lançamentos e gera relatório automaticamente',
      resultadoCase: 'de 4h para 20 minutos por cliente/mês — equipe realocada para consultoria',
    };
  }

  if (seg.includes('e-commerce') || seg.includes('loja') || seg.includes('varejo')) {
    return {
      segLabel: 'e-commerce e varejo',
      solucao1: 'Sistema de recomendação de produtos com IA',
      resultado1: 'aumento médio de 25-35% no ticket médio',
      solucao2: 'Bot de recuperação de carrinho abandonado',
      resultado2: 'recuperação de 15-20% dos carrinhos perdidos',
      situacaoAntes: 'loja sem personalização — todos os clientes vendo os mesmos produtos',
      solucaoCase: 'motor de recomendação baseado no histórico de navegação e compras',
      resultadoCase: 'ticket médio +32%, taxa de recompra +18% em 60 dias',
    };
  }

  // Genérico
  return {
    segLabel: 'empresas de serviços',
    solucao1: 'Automação de atendimento via WhatsApp + chatbot IA',
    resultado1: 'atendimento 24/7 sem custo adicional de pessoal',
    solucao2: 'Automação de processos repetitivos (RPA)',
    resultado2: 'redução de 50-70% no tempo operacional',
    situacaoAntes: 'equipe gastando horas em tarefas manuais repetitivas',
    solucaoCase: 'automação do fluxo principal com IA + notificações automáticas',
    resultadoCase: '40h/mês economizadas, equipe focada em atividades estratégicas',
  };
}

// ─── Criar ou buscar lead no CRM ────────────────────────────────────────────
async function upsertLead(leadData) {
  // Verificar se já existe
  const search = await http('GET', `/api/crm/leads?search=${encodeURIComponent(leadData.phone || leadData.name)}&limit=5`);
  const existing = search?.data?.find(l =>
    l.phone === leadData.phone || l.email === leadData.email ||
    (l.company && leadData.company && l.company.toLowerCase() === leadData.company.toLowerCase())
  );

  if (existing) {
    log('⚡', `Lead já existe no CRM`, `${existing.name} — ${existing.company}`);
    return { id: existing.id, isNew: false };
  }

  const created = await http('POST', '/api/crm/leads', leadData);
  const id = created?.data?.id || created?.id;
  if (!id) throw new Error(`Falha ao criar lead: ${JSON.stringify(created).slice(0, 200)}`);
  return { id, isNew: true };
}

// ─── Adicionar lead à campanha ──────────────────────────────────────────────
async function addToCampaign(leadId, campaignId) {
  const res = await http('POST', `/api/crm/campaigns/${campaignId}/leads`, { leadIds: [leadId] });
  return res?.success || false;
}

// ─── Adicionar nota ao lead ─────────────────────────────────────────────────
async function addLeadNote(leadId, content) {
  await http('POST', `/api/crm/leads/${leadId}/notes`, { content, isPrivate: true });
}

// ─── Filtro de diretórios (não são negócios reais) ─────────────────────────
const DIRECTORY_DOMAINS = [
  'cylex.com', 'eguias.net', 'doctoralia.com', 'guiatelefone.com',
  'locaisdobrasil.com', 'encontraflorianopolis.com', 'hagah.com',
  'apontador.com', 'telelistas.net', 'guiamais.com', 'kekanto.com',
  'yelp.com', 'tripadvisor.com', 'foursquare.com', 'yellowpages',
  'paginasamarelas.com', 'listamais.com', 'classificados',
  'infoisinfo.com', 'hotfrog.com', 'brownbook.net', 'tupalo.com',
  'opendi.com', 'justdial.com', 'chamberofcommerce.com',
  'findglocal.com', 'salao.com.br',
];

function isDirectory(url, name) {
  if (!url) return false;
  const u = url.toLowerCase();
  if (DIRECTORY_DOMAINS.some(d => u.includes(d))) return true;
  // Nomes genéricos como "10 MELHORES..." ou "Clínicas em..."
  const n = (name || '').toLowerCase();
  if (/^\d+\s+(melhores|top|best)/i.test(n)) return true;
  if (/em\s+\w+,?\s+\w{2}\s*[-–—]/.test(n)) return true; // "... em Florianópolis, SC -"
  return false;
}

// ─── Processar um resultado do Maps ────────────────────────────────────────
async function processMapResult(result, segment, options) {
  const { dryRun = false } = options;

  const name   = result.name || result.title || '';
  const addr   = result.address || result.vicinity || '';
  const phone  = result.phone || result.formatted_phone_number || '';
  const site   = result.website || result.url || '';
  const rating = result.rating || null;

  if (!name) return null;

  // Filtrar diretórios — não são leads reais
  if (isDirectory(site, name)) {
    log('🚫', `Diretório/listagem — pulando`, name.slice(0, 60));
    return null;
  }

  log('📍', name, addr);

  // Analisar site se disponível
  let analysis = { score: 20, signals: [], insights: [], mainProblem: 'processo operacional poderia ser mais automatizado', url: site };
  if (site) {
    try {
      analysis = await analyzeSite(site);
      await sleep(1500); // respeitar rate limits
    } catch (e) {
      log('⚠️', 'Erro ao analisar site', e.message);
    }
  }

  const tier = analysis.score >= 70 ? '🔴 Quente' : analysis.score >= 40 ? '🟡 Morno' : '🔵 Frio';
  log('📊', `Score: ${analysis.score}/100 — ${tier}`, analysis.signals.slice(0, 2).map(s => s.label).join('; '));

  // Pular leads muito frios em modo normal (threshold baixo pois PageSpeed pode estar indisponível)
  if (analysis.score < 15 && !options.includeAll) {
    log('⏭️', 'Score muito baixo — pulando', `Score: ${analysis.score}`);
    return null;
  }

  if (dryRun) {
    log('🧪', '[DRY-RUN] Lead seria criado', `${name} | Score: ${analysis.score}`);
    return { name, score: analysis.score, dryRun: true };
  }

  const solutions = getSegmentSolutions(segment);

  // Preparar tags
  const tags = [
    `segmento:${solutions.segLabel.split(' ')[0]}`,
    analysis.score >= 70 ? 'prioridade:alta' : analysis.score >= 40 ? 'prioridade:media' : 'prioridade:baixa',
    ...analysis.signals.slice(0, 2).map(s => `problema:${s.type}`),
    'origem:prospecting-sc',
    'campanha:riwerlabs-2026',
  ];

  // Dados do lead
  const leadData = {
    name:        name,
    company:     name,
    phone:       phone ? phone.replace(/\D/g, '') : undefined,
    email:       undefined, // será completado manualmente se necessário
    address:     addr || undefined,
    status:      'new',
    temperature: analysis.score >= 70 ? 'hot' : analysis.score >= 40 ? 'warm' : 'cold',
    source:      'prospecting',
    tags:        tags,
    customFields: {
      website:           site || analysis.url || '',
      segment:           solutions.segLabel,
      prospecting_score: analysis.score,
      problema_encontrado: analysis.mainProblem,
      insight_1:         analysis.insights[0] || '',
      insight_2:         analysis.insights[1] || '',
      insight_3:         analysis.insights[2] || '',
      solucao_1:         solutions.solucao1,
      resultado_1:       solutions.resultado1,
      solucao_2:         solutions.solucao2,
      resultado_2:       solutions.resultado2,
      problema_principal: analysis.mainProblem,
      impacto_estimado:  analysis.signals[0] ? `Perda estimada de oportunidades por ${analysis.signals[0].label.toLowerCase()}` : '',
      oportunidade_1:    solutions.solucao1,
      oportunidade_2:    solutions.solucao2,
      segmento:          solutions.segLabel,
      situacao_antes:    solutions.situacaoAntes,
      solucao_case:      solutions.solucaoCase,
      resultado_case:    solutions.resultadoCase,
      rating:            rating ? String(rating) : '',
    },
  };

  // Criar/atualizar lead
  let leadId;
  try {
    const { id, isNew } = await upsertLead(leadData);
    leadId = id;
    log(isNew ? '✅' : '♻️', isNew ? 'Lead criado no CRM' : 'Lead já existia', `ID: ${id}`);
  } catch (e) {
    log('❌', 'Erro ao criar lead', e.message);
    return null;
  }

  // Adicionar nota com o diagnóstico completo
  const noteContent = [
    `📊 DIAGNÓSTICO AUTOMÁTICO — Score: ${analysis.score}/100 (${tier})`,
    `🌐 Site: ${site || 'não informado'}`,
    ``,
    `SINAIS ENCONTRADOS:`,
    ...analysis.signals.map(s => `  • ${s.label}`),
    ``,
    `SOLUÇÕES SUGERIDAS:`,
    `  → ${solutions.solucao1} (${solutions.resultado1})`,
    `  → ${solutions.solucao2} (${solutions.resultado2})`,
    ``,
    `Fonte: Google Maps — ${new Date().toLocaleDateString('pt-BR')}`,
  ].join('\n');

  try {
    await addLeadNote(leadId, noteContent);
    log('📝', 'Nota de diagnóstico adicionada');
  } catch (e) { /* silencioso */ }

  // Adicionar à campanha (apenas leads quentes/mornos)
  if (analysis.score >= 40) {
    try {
      const added = await addToCampaign(leadId, CAMPAIGN_ID);
      log(added ? '🎯' : '⚠️', added ? 'Adicionado à campanha' : 'Falha ao adicionar à campanha');
    } catch (e) {
      log('⚠️', 'Erro ao adicionar à campanha', e.message);
    }
  }

  return {
    id: leadId,
    name,
    score: analysis.score,
    tier,
    signals: analysis.signals.length,
    addedToCampaign: analysis.score >= 40,
  };
}

// ─── Função principal ───────────────────────────────────────────────────────
async function prospect(options = {}) {
  const {
    segment  = 'clínicas odontológicas',
    region   = 'Florianópolis SC',
    limit    = 20,
    dryRun   = false,
    includeAll = false,
    campaignId = CAMPAIGN_ID,
  } = options;

  console.log('\n' + '═'.repeat(60));
  console.log('  RIWER LABS — PROSPECÇÃO AUTOMÁTICA');
  console.log('═'.repeat(60));
  console.log(`  Segmento : ${segment}`);
  console.log(`  Região   : ${region}`);
  console.log(`  Limite   : ${limit} leads`);
  console.log(`  Modo     : ${dryRun ? '🧪 DRY-RUN (nada será salvo)' : '🔴 PRODUÇÃO'}`);
  console.log(`  Campanha : ${campaignId}`);
  console.log('═'.repeat(60) + '\n');

  // 1. Buscar em múltiplas fontes (Maps + Google Search)
  log('🗺️', `Buscando "${segment}" em "${region}"...`);

  const [mapsResult, searchResult] = await Promise.allSettled([
    cli('maps_search', { query: segment, location: region }),
    cli('google_search', { query: `${segment} ${region} telefone contato site`, num_results: 20 }),
  ]);

  // Combinar resultados das duas fontes
  const mapsPlaces = (mapsResult.status === 'fulfilled'
    ? (mapsResult.value?.businesses || mapsResult.value?.data?.results || [])
    : []).map(p => ({ ...p, _source: 'maps' }));

  const searchPlaces = (searchResult.status === 'fulfilled'
    ? (searchResult.value?.results || searchResult.value?.data || [])
    : []).map(p => ({
      name: p.title,
      website: p.url,
      address: '',
      phone: '',
      _source: 'search',
      _snippet: p.snippet || '',
    }));

  // Deduplicar por domínio do site
  const seen = new Set();
  const places = [];
  for (const p of [...mapsPlaces, ...searchPlaces]) {
    const site = (p.website || p.url || '').replace(/https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    const key = site || p.name;
    if (!seen.has(key)) {
      seen.add(key);
      places.push(p);
    }
  }

  if (places.length === 0) {
    log('❌', 'Nenhum resultado encontrado');
    return { total: 0, created: 0, addedToCampaign: 0 };
  }

  log('📌', `${places.length} lugares encontrados (${mapsPlaces.length} Maps + ${searchPlaces.length} Search) — processando até ${limit}...`);

  // 2. Processar cada resultado
  const toProcess = places.slice(0, limit);
  const results = [];
  let created = 0;
  let addedToCampaign = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const place = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}]`);

    try {
      const result = await processMapResult(place, segment, { dryRun, includeAll, campaignId });
      if (result) {
        results.push(result);
        if (!result.dryRun) {
          created++;
          if (result.addedToCampaign) addedToCampaign++;
        }
      }
    } catch (e) {
      log('❌', `Erro ao processar ${place.name || 'unknown'}`, e.message);
    }

    // Pausa entre processamentos para evitar rate limit
    if (i < toProcess.length - 1) await sleep(2000);
  }

  // ─── Relatório Final ───────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  RELATÓRIO FINAL');
  console.log('═'.repeat(60));
  console.log(`  Lugares encontrados  : ${places.length}`);
  console.log(`  Processados          : ${toProcess.length}`);
  console.log(`  Leads criados no CRM : ${created}`);
  console.log(`  Adicionados à campanha: ${addedToCampaign}`);
  console.log(`  Pulados (score baixo): ${toProcess.length - results.length}`);

  const hot  = results.filter(r => r.score >= 70).length;
  const warm = results.filter(r => r.score >= 40 && r.score < 70).length;
  const cold = results.filter(r => r.score < 40).length;
  console.log(`\n  Por temperatura:`);
  console.log(`    🔴 Quentes (≥70): ${hot}`);
  console.log(`    🟡 Mornos (40-69): ${warm}`);
  console.log(`    🔵 Frios (<40):  ${cold}`);
  console.log('═'.repeat(60) + '\n');

  // Salvar relatório
  if (!dryRun) {
    const reportPath = path.join(__dirname, `report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({ segment, region, results, summary: { created, addedToCampaign, hot, warm, cold } }, null, 2));
    console.log(`📄 Relatório salvo: ${reportPath}`);
  }

  return { total: places.length, processed: toProcess.length, created, addedToCampaign, hot, warm, cold };
}

// ─── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const get  = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const has  = flag => args.includes(flag);

  const options = {
    segment:    get('--segment')  || get('-s') || 'clínicas odontológicas',
    region:     get('--region')   || get('-r') || 'Florianópolis SC',
    limit:      parseInt(get('--limit') || get('-l') || '20'),
    dryRun:     has('--dry-run')  || has('--dry'),
    includeAll: has('--all'),
    campaignId: get('--campaign') || CAMPAIGN_ID,
  };

  prospect(options)
    .then(() => process.exit(0))
    .catch(e => { console.error('Erro fatal:', e); process.exit(1); });
}

module.exports = { prospect, analyzeSite, getSegmentSolutions };
