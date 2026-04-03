#!/usr/bin/env node
/**
 * META ADS REPORT — Relatorio completo de campanhas ativas
 *
 * Hierarquia: Conta > Campanhas Ativas > Ad Sets > Anuncios
 * Metricas ecommerce: spend, impressions, clicks, CTR, CPC, ATC, checkout, purchases, revenue, ROAS, CPA
 *
 * USO:
 *   node meta-ads-report.js                          # last_7d (padrao)
 *   node meta-ads-report.js --period last_30d        # ultimos 30 dias
 *   node meta-ads-report.js --period last_14d        # ultimos 14 dias
 *   node meta-ads-report.js --since 2026-03-01 --until 2026-03-07  # periodo customizado
 *   node meta-ads-report.js --campaign-id 123456     # apenas uma campanha
 *   node meta-ads-report.js --json                   # saida JSON (para integracao)
 *   node meta-ads-report.js --no-ads                 # sem detalhar anuncios
 *   node meta-ads-report.js --pause AD_ID            # pausar um anuncio
 *   node meta-ads-report.js --activate AD_ID         # ativar um anuncio
 */

const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────────
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
const INSIGHTS_FIELDS = 'impressions,spend,clicks,ctr,cpc,actions,action_values,purchase_roas,cost_per_action_type';
const CONCURRENCY = 5; // max parallel requests

// ── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}
const hasFlag = (name) => args.includes(`--${name}`);

const PERIOD = getArg('period', 'last_7d');
const SINCE = getArg('since', null);
const UNTIL = getArg('until', null);
const CAMPAIGN_FILTER = getArg('campaign-id', null);
const JSON_OUTPUT = hasFlag('json');
const NO_ADS = hasFlag('no-ads');
const PAUSE_AD = getArg('pause', null);
const ACTIVATE_AD = getArg('activate', null);

// ── Credentials ─────────────────────────────────────────────────────────────
let FB_TOKEN, FB_ACCOUNT_ID;

function loadCredentials() {
  const vault = require(path.join(__dirname, 'credential-vault.js'));
  const envVars = vault.getEnvVars();
  FB_TOKEN = envVars.FB_ACCESS_TOKEN;
  FB_ACCOUNT_ID = envVars.FB_AD_ACCOUNT_ID;
  if (!FB_TOKEN) throw new Error('FB_ACCESS_TOKEN nao encontrado no vault');
  if (!FB_ACCOUNT_ID) throw new Error('FB_AD_ACCOUNT_ID nao encontrado no vault');
}

// ── API helpers ─────────────────────────────────────────────────────────────
function apiGet(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}/${endpoint}${sep}access_token=${FB_TOKEN}`;
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function apiPost(endpoint, body) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  const postData = new URLSearchParams({ ...body, access_token: FB_TOKEN }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 15000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function dateParams() {
  if (SINCE && UNTIL) return `&time_range={"since":"${SINCE}","until":"${UNTIL}"}`;
  return `&date_preset=${PERIOD}`;
}

// Run promises with concurrency limit
async function parallelLimit(tasks, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ── Extract ecommerce metrics from insights ─────────────────────────────────
function extractMetrics(d) {
  if (!d) return null;
  const getAction = (arr, type) => (arr || []).find(a => a.action_type === type)?.value || 0;
  const getCost = (arr, type) => (arr || []).find(a => a.action_type === type)?.value || 0;

  const spend = parseFloat(d.spend || 0);
  const purchases = parseInt(getAction(d.actions, 'purchase')) || 0;
  const revenue = parseFloat(getAction(d.action_values, 'omni_purchase')) || 0;
  const roas = parseFloat(getAction(d.purchase_roas, 'omni_purchase')) || 0;
  const cpa = purchases > 0 ? spend / purchases : 0;

  return {
    spend,
    impressions: parseInt(d.impressions || 0),
    clicks: parseInt(d.clicks || 0),
    ctr: parseFloat(d.ctr || 0),
    cpc: parseFloat(d.cpc || 0),
    link_clicks: parseInt(getAction(d.actions, 'link_click')) || 0,
    landing_page_views: parseInt(getAction(d.actions, 'landing_page_view')) || 0,
    view_content: parseInt(getAction(d.actions, 'view_content')) || 0,
    add_to_cart: parseInt(getAction(d.actions, 'add_to_cart')) || 0,
    initiate_checkout: parseInt(getAction(d.actions, 'initiate_checkout')) || 0,
    add_payment_info: parseInt(getAction(d.actions, 'add_payment_info')) || 0,
    purchases,
    revenue,
    roas,
    cpa,
    video_views: parseInt(getAction(d.actions, 'video_view')) || 0
  };
}

// ── Formatting helpers ──────────────────────────────────────────────────────
function money(v) { return `R$ ${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`; }
function num(v) { return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function pct(v) { return `${v.toFixed(2)}%`; }

function printMetrics(m, indent = '') {
  if (!m) { console.log(`${indent}  Sem dados no periodo`); return; }
  console.log(`${indent}  Spend: ${money(m.spend)} | Impressoes: ${num(m.impressions)} | Clicks: ${num(m.clicks)} | CTR: ${pct(m.ctr)} | CPC: ${money(m.cpc)}`);
  console.log(`${indent}  Link Clicks: ${num(m.link_clicks)} | LPV: ${num(m.landing_page_views)} | View Content: ${num(m.view_content)}`);
  console.log(`${indent}  ATC: ${num(m.add_to_cart)} | Checkout: ${num(m.initiate_checkout)} | Payment: ${num(m.add_payment_info)}`);
  console.log(`${indent}  Compras: ${num(m.purchases)} | Receita: ${money(m.revenue)} | ROAS: ${m.roas > 0 ? m.roas.toFixed(2) + 'x' : '-'} | CPA: ${m.cpa > 0 ? money(m.cpa) : '-'}`);
  if (m.video_views > 0) console.log(`${indent}  Video Views: ${num(m.video_views)}`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  loadCredentials();

  // Handle pause/activate actions
  if (PAUSE_AD) {
    const res = await apiPost(PAUSE_AD, { status: 'PAUSED' });
    console.log(res.success ? `Anuncio ${PAUSE_AD} PAUSADO com sucesso.` : `Erro: ${JSON.stringify(res.error)}`);
    return;
  }
  if (ACTIVATE_AD) {
    const res = await apiPost(ACTIVATE_AD, { status: 'ACTIVE' });
    console.log(res.success ? `Anuncio ${ACTIVATE_AD} ATIVADO com sucesso.` : `Erro: ${JSON.stringify(res.error)}`);
    return;
  }

  const periodLabel = SINCE && UNTIL ? `${SINCE} a ${UNTIL}` : PERIOD;

  // 1. Get active campaigns
  let campaigns;
  if (CAMPAIGN_FILTER) {
    const camp = await apiGet(`${CAMPAIGN_FILTER}?fields=id,name,status,effective_status,objective,daily_budget`);
    campaigns = [camp];
  } else {
    const res = await apiGet(`${FB_ACCOUNT_ID}/campaigns?fields=id,name,status,effective_status,objective,daily_budget&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50`);
    campaigns = res.data || [];
  }

  if (campaigns.length === 0) {
    console.log('Nenhuma campanha ativa encontrada.');
    return;
  }

  // 2. For each campaign: get insights + ad sets
  const report = [];

  const campaignTasks = campaigns.map(camp => async () => {
    const campData = {
      id: camp.id,
      name: camp.name,
      objective: camp.objective,
      daily_budget: camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : null,
      metrics: null,
      adsets: []
    };

    // Campaign insights
    const insightsRes = await apiGet(`${camp.id}/insights?fields=${INSIGHTS_FIELDS}${dateParams()}`);
    if (insightsRes.data && insightsRes.data[0]) {
      campData.metrics = extractMetrics(insightsRes.data[0]);
    }

    // Ad sets
    const adsetsRes = await apiGet(`${camp.id}/adsets?fields=id,name,status,effective_status,daily_budget,optimization_goal&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50`);
    const adsets = adsetsRes.data || [];

    // For each ad set: get insights + ads
    const adsetTasks = adsets.map(adset => async () => {
      const adsetData = {
        id: adset.id,
        name: adset.name,
        daily_budget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null,
        optimization_goal: adset.optimization_goal,
        metrics: null,
        ads: []
      };

      // Ad set insights
      const adsetInsights = await apiGet(`${adset.id}/insights?fields=${INSIGHTS_FIELDS}${dateParams()}`);
      if (adsetInsights.data && adsetInsights.data[0]) {
        adsetData.metrics = extractMetrics(adsetInsights.data[0]);
      }

      // Ads (unless --no-ads)
      if (!NO_ADS) {
        const adsRes = await apiGet(`${adset.id}/ads?fields=id,name,status,effective_status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50`);
        const ads = adsRes.data || [];

        const adTasks = ads.map(ad => async () => {
          const adData = { id: ad.id, name: ad.name, metrics: null };
          const adInsights = await apiGet(`${ad.id}/insights?fields=${INSIGHTS_FIELDS}${dateParams()}`);
          if (adInsights.data && adInsights.data[0]) {
            adData.metrics = extractMetrics(adInsights.data[0]);
          }
          return adData;
        });

        adsetData.ads = await parallelLimit(adTasks, CONCURRENCY);
        // Sort ads by ROAS desc
        adsetData.ads.sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0));
      }

      return adsetData;
    });

    campData.adsets = await parallelLimit(adsetTasks, CONCURRENCY);
    // Sort adsets by spend desc
    campData.adsets.sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0));

    return campData;
  });

  const results = await parallelLimit(campaignTasks, 3); // 3 campaigns in parallel
  // Sort campaigns by spend desc
  results.sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0));

  // ── Output ──────────────────────────────────────────────────────────────
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ period: periodLabel, campaigns: results }, null, 2));
    return;
  }

  // Pretty print
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║             META ADS REPORT — CAMPANHAS ATIVAS                 ║');
  console.log(`║  Periodo: ${periodLabel.padEnd(53)}║`);
  console.log(`║  Campanhas ativas: ${results.length.toString().padEnd(44)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  for (const camp of results) {
    console.log('');
    console.log(`┌─ CAMPANHA: ${camp.name}`);
    console.log(`│  ID: ${camp.id} | Objetivo: ${camp.objective || '-'} | Budget: ${camp.daily_budget ? money(camp.daily_budget) + '/dia' : 'CBO'}`);
    printMetrics(camp.metrics, '│');

    if (camp.adsets.length > 0) {
      console.log('│');
      for (let i = 0; i < camp.adsets.length; i++) {
        const adset = camp.adsets[i];
        const isLast = i === camp.adsets.length - 1;
        const prefix = isLast ? '└' : '├';
        const cont = isLast ? ' ' : '│';

        console.log(`│  ${prefix}── AD SET: ${adset.name}`);
        console.log(`│  ${cont}   ID: ${adset.id} | Budget: ${adset.daily_budget ? money(adset.daily_budget) + '/dia' : 'CBO'} | Goal: ${adset.optimization_goal || '-'}`);
        if (adset.metrics) printMetrics(adset.metrics, `│  ${cont}  `);
        else console.log(`│  ${cont}     Sem dados no periodo`);

        if (adset.ads.length > 0) {
          console.log(`│  ${cont}`);
          console.log(`│  ${cont}   Anuncios (${adset.ads.length}):`);
          // Table header
          const hdr = '│  ' + cont + '   ' + 'Nome'.padEnd(40) + ' Spend'.padEnd(12) + ' Compras'.padEnd(9) + ' Receita'.padEnd(14) + ' ROAS'.padEnd(8) + ' CPA'.padEnd(12) + ' ATC'.padEnd(6) + ' Chk';
          console.log(hdr);
          console.log('│  ' + cont + '   ' + '─'.repeat(105));
          for (const ad of adset.ads) {
            const m = ad.metrics;
            if (m) {
              const name = ad.name.length > 38 ? ad.name.substring(0, 35) + '...' : ad.name;
              const line = '│  ' + cont + '   ' +
                name.padEnd(40) +
                money(m.spend).padStart(11) + ' ' +
                num(m.purchases).padStart(8) + ' ' +
                money(m.revenue).padStart(13) + ' ' +
                (m.roas > 0 ? m.roas.toFixed(2) + 'x' : '-').padStart(7) + ' ' +
                (m.cpa > 0 ? money(m.cpa) : '-').padStart(11) + ' ' +
                num(m.add_to_cart).padStart(5) + ' ' +
                num(m.initiate_checkout).padStart(5);
              console.log(line);
            } else {
              console.log('│  ' + cont + '   ' + ad.name.padEnd(40) + ' (sem dados)');
            }
          }
        }
        console.log('│');
      }
    }
    console.log('└──────────────────────────────────────────────────────────────────');
  }

  // Summary
  console.log('');
  console.log('═══ RESUMO GERAL ═══');
  const totalSpend = results.reduce((s, c) => s + (c.metrics?.spend || 0), 0);
  const totalRevenue = results.reduce((s, c) => s + (c.metrics?.revenue || 0), 0);
  const totalPurchases = results.reduce((s, c) => s + (c.metrics?.purchases || 0), 0);
  const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  console.log(`  Spend total: ${money(totalSpend)}`);
  console.log(`  Receita total: ${money(totalRevenue)}`);
  console.log(`  Compras totais: ${num(totalPurchases)}`);
  console.log(`  ROAS geral: ${totalRoas.toFixed(2)}x`);
  console.log(`  CPA medio: ${totalCpa > 0 ? money(totalCpa) : '-'}`);
  console.log('');
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
