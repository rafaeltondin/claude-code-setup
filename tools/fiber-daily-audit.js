#!/usr/bin/env node
/**
 * Fiber — Auditoria Diária de Criativos Meta Ads
 * Coleta dados das campanhas ativas, aplica critérios do framework e gera relatório markdown.
 * Prompt CRM: e219abe7-9312-4a07-abf2-350b4b216faf
 * KB: META-ADS-CREATIVE-TESTING-FRAMEWORK-FIBER.md
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCOUNT = 'act_459578268603260';
const HOME = process.env.HOME || process.env.USERPROFILE;
const TEMP = path.join(HOME, '.claude', 'temp');
const VAULT_PATH = path.join(HOME, '.claude', 'task-scheduler', 'tools-cli.js');

const today = new Date();
const dateStr = today.toISOString().split('T')[0];
const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);
const reportPath = path.join(TEMP, `fiber-daily-report-${dateStr}.md`);

// Ensure temp dir exists
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

function graphAPI(urlPath) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v21.0/${urlPath}`;
    https.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function getToken() {
  return new Promise((resolve, reject) => {
    const { execSync } = require('child_process');
    try {
      const out = execSync(`node "${VAULT_PATH}" get_credential name=FB_ACCESS_TOKEN`, { encoding: 'utf8' });
      // Extract token from output (skip [chat-tools] lines)
      const lines = out.split('\n').filter(l => !l.startsWith('['));
      resolve(lines.join('').trim());
    } catch (e) { reject(e); }
  });
}

function daysSince(dateString) {
  const start = new Date(dateString);
  const now = new Date();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function classifyPhase(days) {
  if (days <= 0) return 'Dia 0 (Preparação)';
  if (days <= 4) return `Dia ${days} (Learning)`;
  if (days === 5) return 'Dia 5 (1a Decisão)';
  if (days <= 9) return `Dia ${days} (Maturação)`;
  if (days === 10) return 'Dia 10 (2a Decisão)';
  if (days <= 14) return `Dia ${days} (Confirmação)`;
  return `Dia ${days} (Escala)`;
}

function classifyAction(roas, cpa, ctr, purchases, spend, days, frequency) {
  if (days < 5) return { status: '⏳ LEARNING', color: 'gray', action: 'Não tocar' };

  // Day 5 criteria
  if (days >= 5 && days < 10) {
    if (roas < 1.0 || (cpa > 200) || (ctr < 0.5 && spend > 500) || (purchases === 0 && spend > 500))
      return { status: '🔴 PAUSAR', color: 'red', action: 'Pausar (Seção 5.1: ROAS<1.0 ou CPA>R$200 ou CTR<0.5%)' };
    if (roas >= 2.5 && cpa <= 100)
      return { status: '🟢 PROMISSOR', color: 'green', action: 'Manter — candidato a escala' };
    return { status: '🟡 OBSERVAR', color: 'yellow', action: 'Manter e monitorar' };
  }

  // Day 10+ criteria
  if (days >= 10) {
    if (frequency > 6.0)
      return { status: '🔴 FADIGA', color: 'red', action: `Pausar ou refresh (Seção 6: freq ${frequency.toFixed(1)} > 6.0)` };
    if (roas < 2.0)
      return { status: '🔴 PAUSAR', color: 'red', action: `Pausar definitivo (Seção 5.2: ROAS ${roas.toFixed(2)} < 2.0)` };
    if (roas >= 2.5 && purchases >= 15)
      return { status: '🟢 ESCALAR', color: 'green', action: 'Migrar para CBO via Post ID' };
    if (roas >= 2.5)
      return { status: '🟢 WINNER', color: 'green', action: 'Manter — ROAS forte, acumular mais conversões' };
    if (roas >= 2.0 && roas < 2.5)
      return { status: '🟡 BORDERLINE', color: 'yellow', action: `Estender +7 dias (ROAS ${roas.toFixed(2)} borderline)` };
  }

  return { status: '🟡 OBSERVAR', color: 'yellow', action: 'Monitorar' };
}

async function main() {
  console.log(`[Fiber Audit] Iniciando auditoria diária — ${dateStr} ${timeStr}`);

  // 1. Get token
  let TOKEN;
  try {
    TOKEN = await getToken();
    console.log('[Fiber Audit] Token obtido');
  } catch (e) {
    console.error('[Fiber Audit] ERRO ao obter token:', e.message);
    process.exit(1);
  }

  // 2. Get active campaigns
  let campaigns;
  try {
    const result = await graphAPI(`${ACCOUNT}/campaigns?fields=id,name,status,effective_status,daily_budget,start_time&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=100&access_token=${TOKEN}`);
    campaigns = result.data || [];
    console.log(`[Fiber Audit] ${campaigns.length} campanhas ativas`);
  } catch (e) {
    console.error('[Fiber Audit] ERRO ao buscar campanhas:', e.message);
    process.exit(1);
  }

  // 3. Get insights (last 7 days)
  let insights;
  try {
    const result = await graphAPI(`${ACCOUNT}/insights?fields=campaign_name,campaign_id,spend,impressions,clicks,ctr,actions,action_values,purchase_roas,frequency&level=campaign&filtering=[{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}]&date_preset=last_7d&limit=100&access_token=${TOKEN}`);
    insights = result.data || [];
    console.log(`[Fiber Audit] ${insights.length} campanhas com insights`);
  } catch (e) {
    console.error('[Fiber Audit] ERRO ao buscar insights:', e.message);
    insights = [];
  }

  // 4. Map insights by campaign_id
  const insightsMap = {};
  for (const i of insights) {
    const purchases = parseInt(i.actions?.find(a => a.action_type === 'purchase')?.value || 0);
    const revenue = parseFloat(i.action_values?.find(a => a.action_type === 'purchase')?.value || 0);
    const roas = parseFloat(i.purchase_roas?.find(a => a.action_type === 'omni_purchase')?.value || 0);
    insightsMap[i.campaign_id] = {
      name: i.campaign_name,
      spend: parseFloat(i.spend),
      impressions: parseInt(i.impressions),
      clicks: parseInt(i.clicks),
      ctr: parseFloat(i.ctr),
      purchases,
      revenue,
      roas,
      frequency: parseFloat(i.frequency || 0),
      cpa: purchases > 0 ? parseFloat(i.spend) / purchases : 0
    };
  }

  // 5. Classify campaigns
  const testCampaigns = [];
  const scaleCampaigns = [];
  const remarkCampaigns = [];
  const noData = [];

  let totalSpend = 0, totalPurchases = 0, totalRevenue = 0;

  for (const c of campaigns) {
    const days = daysSince(c.start_time);
    const data = insightsMap[c.id];
    const name = c.name;

    if (!data || data.spend === 0) {
      noData.push({ name, id: c.id, days, phase: classifyPhase(days) });
      continue;
    }

    totalSpend += data.spend;
    totalPurchases += data.purchases;
    totalRevenue += data.revenue;

    const classification = classifyAction(data.roas, data.cpa, data.ctr, data.purchases, data.spend, days, data.frequency);

    const entry = {
      name, id: c.id, days, phase: classifyPhase(days),
      spend: data.spend, roas: data.roas, cpa: data.cpa,
      purchases: data.purchases, ctr: data.ctr, frequency: data.frequency,
      ...classification
    };

    if (name.includes('REMARKETING') || name.includes('CATÁLOGO') || name.includes('CÁTALOGO'))
      remarkCampaigns.push(entry);
    else if (name.includes('SOLO') || (parseInt(c.daily_budget) <= 15000 && !name.includes('ESCALA')))
      testCampaigns.push(entry);
    else
      scaleCampaigns.push(entry);
  }

  // 6. Find previous report
  let previousNotes = '';
  const files = fs.readdirSync(TEMP).filter(f => f.startsWith('fiber-daily-report-') && f !== `fiber-daily-report-${dateStr}.md`).sort();
  if (files.length > 0) {
    const lastReport = fs.readFileSync(path.join(TEMP, files[files.length - 1]), 'utf8');
    const nextStepsMatch = lastReport.match(/## Próximos Passos[\s\S]*?(?=## |$)/);
    if (nextStepsMatch) previousNotes = nextStepsMatch[0].trim();
  }

  // 7. Actions to take
  const actionsTaken = [];
  const actionsRecommended = [];

  for (const c of [...testCampaigns, ...scaleCampaigns, ...remarkCampaigns]) {
    if (c.status === '🔴 PAUSAR' || c.status === '🔴 FADIGA') {
      actionsTaken.push(`- **PAUSAR recomendado:** ${c.name} (ROAS ${c.roas.toFixed(2)}, CPA R$${c.cpa.toFixed(0)}, Dia ${c.days}, Freq ${c.frequency.toFixed(1)}) — ${c.action}`);
    }
    if (c.status === '🟢 ESCALAR') {
      actionsRecommended.push(`- **ESCALAR recomendado:** ${c.name} (ROAS ${c.roas.toFixed(2)}, ${c.purchases} compras) — Migrar para CBO via Post ID`);
    }
  }

  // 8. Generate report
  const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';
  const avgCpa = totalPurchases > 0 ? (totalSpend / totalPurchases).toFixed(0) : 'N/A';

  let report = `# Fiber — Relatório Diário de Criativos
**Data:** ${dateStr} | **Agente:** Automático (fiber-daily-audit.js) | **Horário:** ${timeStr}

---

## Resumo Executivo
- Campanhas ativas: ${campaigns.length}
- Gasto total (últimos 7d): R$${totalSpend.toFixed(2)}
- ROAS médio (últimos 7d): ${avgRoas}
- Compras totais (últimos 7d): ${totalPurchases}
- CPA médio: R$${avgCpa}

---

## Status das Campanhas de Teste

| Campanha | Dia | Gasto 7d | ROAS | CPA | Conv. | CTR | Freq. | Status |
|---------|-----|---------|------|-----|-------|-----|-------|--------|
`;

  for (const c of testCampaigns.sort((a, b) => b.roas - a.roas)) {
    report += `| ${c.name.substring(0, 45)} | ${c.days} | R$${c.spend.toFixed(0)} | ${c.roas.toFixed(2)} | R$${c.cpa.toFixed(0)} | ${c.purchases} | ${c.ctr.toFixed(2)}% | ${c.frequency.toFixed(1)} | ${c.status} |\n`;
  }

  if (noData.length > 0) {
    report += `\n### Campanhas sem dados (recém-criadas)\n`;
    for (const c of noData) {
      report += `- ${c.name} — ${c.phase}\n`;
    }
  }

  report += `\n### Ações de pausa recomendadas:\n`;
  const testPauses = actionsTaken.filter(a => !a.includes('REMARKETING') && !a.includes('CATÁLOGO'));
  report += testPauses.length > 0 ? testPauses.join('\n') + '\n' : '- Nenhuma ação de pausa necessária hoje\n';

  report += `\n---\n\n## Status das Campanhas de Escala\n\n| Campanha | Dia | Gasto 7d | ROAS | CPA | Conv. | Freq. | Status |\n|---------|-----|---------|------|-----|-------|-------|--------|\n`;
  for (const c of scaleCampaigns.sort((a, b) => b.roas - a.roas)) {
    report += `| ${c.name.substring(0, 45)} | ${c.days} | R$${c.spend.toFixed(0)} | ${c.roas.toFixed(2)} | R$${c.cpa.toFixed(0)} | ${c.purchases} | ${c.frequency.toFixed(1)} | ${c.status} |\n`;
  }

  report += `\n---\n\n## Campanhas de Remarketing / Catálogo\n\n| Campanha | ROAS 7d | CPA | Conv. | Freq. | Status |\n|---------|---------|-----|-------|-------|--------|\n`;
  for (const c of remarkCampaigns.sort((a, b) => b.roas - a.roas)) {
    report += `| ${c.name.substring(0, 45)} | ${c.roas.toFixed(2)} | R$${c.cpa.toFixed(0)} | ${c.purchases} | ${c.frequency.toFixed(1)} | ${c.status} |\n`;
  }

  report += `\n---\n\n## Ações Recomendadas\n\n### Pausas:\n`;
  report += actionsTaken.length > 0 ? actionsTaken.join('\n') + '\n' : '- Nenhuma\n';
  report += `\n### Escalas:\n`;
  report += actionsRecommended.length > 0 ? actionsRecommended.join('\n') + '\n' : '- Nenhuma\n';

  report += `\n---\n\n## Próximos Passos (para o agente de amanhã)\n\n`;

  // Auto-generate next steps
  const soloNoData = noData.filter(c => c.name.includes('SOLO'));
  if (soloNoData.length > 0) {
    const soloDay = soloNoData[0].days + 1;
    if (soloDay < 5) {
      report += `### Prioridade ALTA:\n- [ ] Campanhas SOLO estão no Dia ${soloDay} — NÃO TOCAR (learning phase)\n- [ ] Verificar se começaram a gastar normalmente\n`;
    } else if (soloDay === 5) {
      report += `### Prioridade ALTA:\n- [ ] Campanhas SOLO atingem Dia 5 amanhã — APLICAR CRITÉRIOS DE DECISÃO (Seção 5.1)\n- [ ] Pausar criativos com ROAS < 1.0, CTR < 0.5%, 0 conversões\n`;
    } else if (soloDay === 10) {
      report += `### Prioridade ALTA:\n- [ ] Campanhas SOLO atingem Dia 10 amanhã — DECISÃO FINAL (Seção 5.2)\n- [ ] Classificar cada criativo: PAUSAR / ESTENDER / ESCALAR\n`;
    }
  }

  const fatigued = [...testCampaigns, ...scaleCampaigns, ...remarkCampaigns].filter(c => c.frequency > 5.0);
  if (fatigued.length > 0) {
    report += `\n### Prioridade ALTA — Fadiga criativa:\n`;
    for (const c of fatigued) {
      report += `- [ ] ${c.name} — Frequência ${c.frequency.toFixed(1)} (limite: 6.0). Considerar refresh ou pausa.\n`;
    }
  }

  report += `\n### Nova rodada de teste necessária?\n`;
  const activeTests = testCampaigns.filter(c => c.days < 14);
  if (activeTests.length < 4) {
    report += `- Sim — Apenas ${activeTests.length} testes ativos. Preparar 4-6 novos criativos.\n`;
  } else {
    report += `- Não — ${activeTests.length} testes em andamento. Aguardar conclusão.\n`;
  }

  if (previousNotes) {
    report += `\n---\n\n## Contexto do dia anterior\n\n${previousNotes}\n`;
  }

  report += `\n---\n\n## Notas técnicas\n- Relatório gerado automaticamente por fiber-daily-audit.js\n- Critérios baseados em: META-ADS-CREATIVE-TESTING-FRAMEWORK-FIBER.md (KB)\n- Prompt completo: CRM ID e219abe7-9312-4a07-abf2-350b4b216faf\n- Para análise mais profunda, executar o prompt manualmente no Claude\n`;

  // 9. Save report
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`[Fiber Audit] Relatório salvo: ${reportPath}`);
  console.log(`[Fiber Audit] Campanhas: ${campaigns.length} ativas, ${totalPurchases} compras, ROAS ${avgRoas}`);

  if (actionsTaken.length > 0) {
    console.log(`[Fiber Audit] ⚠️  ${actionsTaken.length} ação(ões) de pausa recomendada(s) — revisar relatório`);
  }

  if (actionsRecommended.length > 0) {
    console.log(`[Fiber Audit] 🟢 ${actionsRecommended.length} campanha(s) candidata(s) a escala`);
  }
}

main().catch(e => {
  console.error('[Fiber Audit] ERRO FATAL:', e.message);
  process.exit(1);
});
