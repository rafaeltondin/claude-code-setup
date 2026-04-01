#!/usr/bin/env node
'use strict';
/**
 * smart-prospector.js — Pipeline de Prospecção Inteligente Riwer Labs
 *
 * Analisa leads do CRM em profundidade (site, SEO, SSL, DNS, Instagram, GMB)
 * e gera mensagens 100% personalizadas com tom consultivo e dados técnicos reais.
 *
 * Uso:
 *   node smart-prospector.js analyze <leadId>       — Analisa 1 lead
 *   node smart-prospector.js generate <leadId>       — Gera mensagem personalizada
 *   node smart-prospector.js preview <leadId>        — Análise + mensagem (sem enviar)
 *   node smart-prospector.js send <leadId>           — Envia mensagem (requer análise prévia)
 *   node smart-prospector.js run [limit]             — Pipeline completo para N leads (preview, sem envio)
 */

const http = require('http');
const path = require('path');
const { execSync } = require('child_process');

const CRM_HOST = 'localhost';
const CRM_PORT = 3847;
const CRM_TOKEN = 'local-dev-token';
const TOOLS_CLI = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'task-scheduler', 'tools-cli.js');

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function crmRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: CRM_HOST, port: CRM_PORT,
      path: `/api/crm${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${CRM_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    };
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr, 'utf8');

    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr, 'utf8');
    req.end();
  });
}

function toolsCli(tool, args = '') {
  try {
    const cmd = `node "${TOOLS_CLI}" ${tool} ${args}`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
    try { return JSON.parse(result); } catch { return result.trim(); }
  } catch (e) {
    const stdout = e.stdout?.toString() || '';
    if (stdout.trim()) {
      try { return JSON.parse(stdout); } catch { return stdout.trim(); }
    }
    return { error: e.message?.slice(0, 200), stdout, stderr: (e.stderr?.toString() || '').slice(0, 200) };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function cleanCompanyName(raw) {
  let name = raw;
  name = name.split(/\s*[|–—]\s*/)[0].trim();
  // Remover sufixos genéricos
  name = name.replace(/\s*-\s*(Imóveis|Clínica|Hospital|Empresa|Negócios).*$/i, '').trim();
  if (name.length > 40) name = name.slice(0, 40).trim();
  return name;
}

function extractDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

// ═══════════════════════════════════════════════════════════════════
// 1. ANÁLISE PROFUNDA DO LEAD
// ═══════════════════════════════════════════════════════════════════

async function analyzeLead(lead) {
  const analysis = {
    leadId: lead.id,
    leadName: lead.name,
    company: lead.company || lead.name,
    companyClean: cleanCompanyName(lead.company || lead.name),
    phone: lead.phone,
    timestamp: new Date().toISOString(),
    website: null,
    domain: null,
    // Resultados das análises
    scrape: null,          // Conteúdo do site (copy, serviços, sobre)
    pagespeed: null,       // { score, fcp, lcp, tbt, cls }
    seo: null,             // { score, grade, issues, warnings, passed }
    ssl: null,             // { ok, issuer, daysLeft, protocol }
    dns: null,             // { mx, txt, spf, dmarc }
    instagram: null,       // { found, handle }
    google_business: null, // { found, rating }
    // Findings organizados
    strengths: [],         // O que a empresa faz bem
    opportunities: [],     // Onde a Riwer Labs pode agregar
    techData: {},          // Dados técnicos concretos
  };

  // Extrair website
  let customFields = {};
  try { customFields = JSON.parse(lead.customFields || '{}'); } catch {}
  let website = customFields.website || null;

  // Se não tem website, buscar via Google
  if (!website) {
    console.log(`  [GOOGLE] Buscando site de "${analysis.companyClean}"...`);
    const searchResult = toolsCli('google_search', `query="${analysis.companyClean} site oficial" num_results=5`);
    if (searchResult && !searchResult.error) {
      const resultStr = typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult);
      const urlMatch = resultStr.match(/https?:\/\/(?!google|facebook|instagram|youtube|linkedin)[^\s"',\]]+/);
      if (urlMatch) {
        website = urlMatch[0];
        console.log(`  [GOOGLE] Site encontrado: ${website}`);
      }
    }
  }

  analysis.website = website;
  analysis.domain = website ? extractDomain(website) : null;

  if (!website) {
    console.log(`  [SKIP] Sem website para ${analysis.companyClean}`);
    analysis.opportunities.push({
      area: 'Presença Digital',
      desc: 'Criação de site profissional com SEO e funil de conversão',
    });
    return analysis;
  }

  // ── 1. Scrape do site ─────────────────────────────────────────
  console.log(`  [SCRAPE] Analisando ${website}...`);
  try {
    const scrapeResult = toolsCli('scrape_website', `url="${website}"`);
    if (scrapeResult && !scrapeResult.error) {
      analysis.scrape = scrapeResult;
      const scrapeStr = typeof scrapeResult === 'string' ? scrapeResult : JSON.stringify(scrapeResult);

      // Extrair telefone do site se o lead não tem
      if (!analysis.phone || analysis.phone.length < 5) {
        const phoneMatch = scrapeStr.match(/(?:\+55|55)?[\s.-]*\(?(\d{2})\)?[\s.-]*(\d{4,5})[\s.-]*(\d{4})/);
        if (phoneMatch) {
          analysis.extractedPhone = phoneMatch[0].replace(/[^\d+]/g, '');
          console.log(`  [SCRAPE] Telefone encontrado: ${analysis.extractedPhone}`);
        }
        const whatsMatch = scrapeStr.match(/(?:wa\.me|whatsapp\.com\/send\?phone=|whatsapp.*?)(\+?\d{10,13})/i);
        if (whatsMatch && !analysis.extractedPhone) {
          analysis.extractedPhone = whatsMatch[1];
          console.log(`  [SCRAPE] WhatsApp encontrado: ${analysis.extractedPhone}`);
        }
      }

      // Extrair email
      const emailMatch = scrapeStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        analysis.extractedEmail = emailMatch[0];
        console.log(`  [SCRAPE] Email encontrado: ${analysis.extractedEmail}`);
      }

      // Extrair pontos fortes do conteúdo
      if (/chatbot|whatsapp.*api|livechat|tawk|intercom|zendesk|crisp|tidio|jivochat/i.test(scrapeStr)) {
        analysis.strengths.push('Já tem atendimento online/chatbot');
      }
      if (/agende|solicite|compre|orçamento|fale conosco/i.test(scrapeStr)) {
        analysis.strengths.push('Site com CTAs (chamadas pra ação)');
      }
      if (!(/chatbot|whatsapp.*api|livechat|tawk|intercom|crisp|tidio|jivochat/i.test(scrapeStr))) {
        analysis.opportunities.push({
          area: 'Atendimento Automático',
          desc: 'Chatbot com IA no WhatsApp/site para atender 24h, agendar e qualificar leads',
        });
      }
    }
  } catch (e) { console.log(`  [SCRAPE] Erro: ${e.message} — pulando`); }

  // ── 2. PageSpeed ──────────────────────────────────────────────
  console.log(`  [PAGESPEED] Testando mobile...`);
  try {
    const psResult = toolsCli('pagespeed', `url="${website}" strategy=mobile`);
    if (psResult && psResult.ok !== false && !psResult.error) {
      const score = psResult.performance || psResult.score;
      if (typeof score === 'number') {
        analysis.pagespeed = {
          score,
          fcp: psResult.fcp || psResult.metrics?.fcp,
          lcp: psResult.lcp || psResult.metrics?.lcp,
          tbt: psResult.tbt || psResult.metrics?.tbt,
          cls: psResult.cls || psResult.metrics?.cls,
        };
        analysis.techData.pagespeed = score;
        if (score >= 80) {
          analysis.strengths.push(`PageSpeed mobile ${score}/100 — bom`);
        } else if (score < 50) {
          analysis.opportunities.push({
            area: 'Performance Web',
            desc: `Site com score ${score}/100 no mobile — otimização pode dobrar a velocidade e melhorar conversão`,
          });
        } else {
          analysis.opportunities.push({
            area: 'Performance Web',
            desc: `Score ${score}/100 no mobile — com otimizações técnicas dá pra chegar em 85+`,
          });
        }
      }
    } else {
      console.log(`  [PAGESPEED] Indisponível — pulando`);
    }
  } catch (e) { console.log(`  [PAGESPEED] Erro — pulando`); }

  // ── 3. SEO Check ──────────────────────────────────────────────
  console.log(`  [SEO] Verificando SEO...`);
  try {
    const seoResult = toolsCli('seo_check', `url="${website}"`);
    if (seoResult && seoResult.ok) {
      analysis.seo = seoResult;
      analysis.techData.seoScore = seoResult.score;
      analysis.techData.seoGrade = seoResult.grade;
      analysis.techData.seoIssues = seoResult.issues || [];
      analysis.techData.seoWarnings = seoResult.warnings || [];
      analysis.techData.seoPassed = seoResult.passed || [];

      if (seoResult.score >= 80) {
        analysis.strengths.push(`SEO nota ${seoResult.score}/100 (${seoResult.grade}) — acima da média`);
      }
      if (seoResult.score < 70 || (seoResult.issues && seoResult.issues.length > 0)) {
        analysis.opportunities.push({
          area: 'SEO Técnico',
          desc: `Nota SEO ${seoResult.score}/100 — ${seoResult.issues?.length || 0} issue(s) e ${seoResult.warnings?.length || 0} warning(s) corrigíveis`,
        });
      }
    }
  } catch (e) { console.log(`  [SEO] Erro — pulando`); }

  // ── 4. SSL Check ──────────────────────────────────────────────
  console.log(`  [SSL] Verificando certificado...`);
  try {
    const sslResult = toolsCli('ssl_check', `domain="${analysis.domain}"`);
    const sslStr = typeof sslResult === 'string' ? sslResult : JSON.stringify(sslResult);

    // Parsear resultado textual
    const daysMatch = sslStr.match(/(\d+)\s*dias?\s*restantes/i);
    const issuerMatch = sslStr.match(/Emissor:\s*(.+)/i);
    const statusMatch = sslStr.match(/Status:\s*(.+)/i);

    analysis.ssl = {
      raw: sslStr,
      daysLeft: daysMatch ? parseInt(daysMatch[1]) : null,
      issuer: issuerMatch ? issuerMatch[1].trim() : null,
      status: statusMatch ? statusMatch[1].trim() : null,
    };

    if (analysis.ssl.daysLeft !== null) {
      analysis.techData.sslDaysLeft = analysis.ssl.daysLeft;
      analysis.techData.sslIssuer = analysis.ssl.issuer;

      if (analysis.ssl.daysLeft > 30) {
        analysis.strengths.push(`SSL ativo (${analysis.ssl.issuer}, ${analysis.ssl.daysLeft} dias restantes)`);
      } else if (analysis.ssl.daysLeft <= 30 && analysis.ssl.daysLeft > 0) {
        analysis.opportunities.push({
          area: 'Segurança (SSL)',
          desc: `Certificado SSL expira em ${analysis.ssl.daysLeft} dias — precisa renovar`,
        });
      }
    }

    if (/não seguro|erro|fail|expired/i.test(sslStr)) {
      analysis.opportunities.push({
        area: 'Segurança (SSL)',
        desc: 'Site sem HTTPS ou com certificado inválido — Google penaliza e Chrome mostra "Não seguro"',
      });
    }
  } catch (e) { console.log(`  [SSL] Erro — pulando`); }

  // ── 5. DNS Lookup ─────────────────────────────────────────────
  console.log(`  [DNS] Verificando registros...`);
  try {
    const dnsResult = toolsCli('dns_lookup', `domain="${analysis.domain}"`);
    const dnsStr = typeof dnsResult === 'string' ? dnsResult : JSON.stringify(dnsResult);

    analysis.dns = { raw: dnsStr };

    // Verificar email (MX)
    const hasMX = /MX:.*\S+\.\S+/i.test(dnsStr) && !/não encontrado|not found/i.test(dnsStr.match(/MX:.*$/m)?.[0] || '');
    analysis.techData.hasMX = hasMX;

    // Verificar SPF/DMARC
    const hasSPF = /spf/i.test(dnsStr);
    const hasDMARC = /dmarc/i.test(dnsStr);
    analysis.techData.hasSPF = hasSPF;
    analysis.techData.hasDMARC = hasDMARC;

    if (hasMX) {
      analysis.strengths.push('Email corporativo configurado (MX ativo)');
      if (!hasSPF || !hasDMARC) {
        analysis.opportunities.push({
          area: 'Email/DNS',
          desc: `Email sem ${!hasSPF ? 'SPF' : ''}${!hasSPF && !hasDMARC ? ' e ' : ''}${!hasDMARC ? 'DMARC' : ''} — emails podem cair no spam`,
        });
      }
    } else {
      analysis.opportunities.push({
        area: 'Email Profissional',
        desc: 'Sem email corporativo configurado — email @suaempresa passa mais credibilidade',
      });
    }
  } catch (e) { console.log(`  [DNS] Erro — pulando`); }

  // ── 6. Instagram ──────────────────────────────────────────────
  console.log(`  [INSTAGRAM] Buscando presença...`);
  try {
    const igSearch = toolsCli('google_search', `query="${analysis.companyClean} instagram" num_results=3`);
    if (igSearch && !igSearch.error) {
      const igStr = typeof igSearch === 'string' ? igSearch : JSON.stringify(igSearch);
      const igMatch = igStr.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'explore') {
        analysis.instagram = { found: true, handle: igMatch[1] };
        analysis.strengths.push(`Instagram ativo: @${igMatch[1]}`);
        console.log(`  [INSTAGRAM] Encontrado: @${igMatch[1]}`);
      } else {
        analysis.instagram = { found: false };
        analysis.opportunities.push({
          area: 'Redes Sociais',
          desc: 'Instagram não encontrado — presença nas redes é essencial para atrair clientes locais',
        });
      }
    }
  } catch (e) { console.log(`  [INSTAGRAM] Erro — pulando`); }

  // ── 7. Google Meu Negócio ─────────────────────────────────────
  console.log(`  [GMB] Verificando Google Meu Negócio...`);
  try {
    const gmbSearch = toolsCli('maps_search', `query="${analysis.companyClean}" location="Santa Catarina"`);
    if (gmbSearch && !gmbSearch.error) {
      const gmbStr = typeof gmbSearch === 'string' ? gmbSearch : JSON.stringify(gmbSearch);
      if (/nenhum resultado|no results|not found|ECONNRESET|obrigat/i.test(gmbStr)) {
        analysis.google_business = { found: false };
        analysis.opportunities.push({
          area: 'Google Meu Negócio',
          desc: 'Empresa não aparece no Google Maps — perda de visibilidade para buscas locais',
        });
      } else {
        analysis.google_business = { found: true };
        const ratingMatch = gmbStr.match(/(\d[.,]\d)\s*(?:estrelas|stars|rating)/i);
        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1].replace(',', '.'));
          analysis.techData.gmbRating = rating;
          analysis.strengths.push(`Google Meu Negócio ativo (nota ${rating})`);
        } else {
          analysis.strengths.push('Presente no Google Maps');
        }
      }
    }
  } catch (e) {
    console.log(`  [GMB] Erro — pulando`);
    analysis.google_business = { found: false, error: e.message };
  }

  // Garantir ao menos 1 oportunidade
  if (analysis.opportunities.length === 0) {
    analysis.opportunities.push({
      area: 'Automação com IA',
      desc: 'Automação de processos internos, follow-ups e atendimento com inteligência artificial',
    });
  }

  return analysis;
}

// ═══════════════════════════════════════════════════════════════════
// 2. GERADOR DE MENSAGEM PERSONALIZADA (TOM CONSULTIVO)
// ═══════════════════════════════════════════════════════════════════

function generateMessage(analysis) {
  const company = analysis.companyClean;
  const rawName = analysis.leadName;

  // Nome: se parece pessoa, usar primeiro nome. Se empresa, usar "pessoal da X"
  const looksLikePerson = /^[A-ZÀ-Ú][a-zà-ú]+\s+[A-ZÀ-Ú]/.test(rawName);
  const greeting = looksLikePerson ? rawName.split(' ')[0] : `pessoal da ${company}`;

  // ── Bloco 1: Saudação + Apresentação ────────────────────────
  let msg = `Oi ${greeting}, tudo bem? 👋\n\n`;
  msg += `Sou o Rafael, da *Riwer Labs* — a gente trabalha com automação, IA e performance digital pra negócios.\n\n`;

  // ── Bloco 2: Contexto (mostra que pesquisou) ────────────────
  if (analysis.website) {
    msg += `Conheci o trabalho da *${company}* e fiz uma análise rápida da presença digital de vocês. `;
    if (analysis.strengths.length > 0) {
      // Elogiar 1-2 pontos fortes
      const topStrengths = analysis.strengths.slice(0, 2);
      msg += `Achei alguns pontos bem legais:\n\n`;
      topStrengths.forEach(s => { msg += `✅ ${s}\n`; });
      msg += `\n`;
    } else {
      msg += `Segue o que encontrei:\n\n`;
    }
  } else {
    msg += `Estou pesquisando empresas do segmento de vocês e não encontrei um site da ${company} — isso por si só já é uma oportunidade enorme.\n\n`;
  }

  // ── Bloco 3: Relatório Técnico (dados concretos) ────────────
  msg += `📊 *Mini-auditoria técnica:*\n\n`;

  // SEO
  if (analysis.techData.seoScore !== undefined) {
    const grade = analysis.techData.seoGrade || '';
    msg += `• *SEO:* Nota ${analysis.techData.seoScore}/100 (${grade})`;
    if (analysis.techData.seoIssues?.length > 0) {
      msg += ` — ${analysis.techData.seoIssues.length} ponto(s) de melhoria`;
    }
    msg += `\n`;
  }

  // PageSpeed
  if (analysis.techData.pagespeed !== undefined) {
    msg += `• *Velocidade mobile:* ${analysis.techData.pagespeed}/100`;
    if (analysis.techData.pagespeed < 50) msg += ` ⚠️ lento`;
    else if (analysis.techData.pagespeed < 70) msg += ` — pode melhorar`;
    else msg += ` ✅`;
    msg += `\n`;
  }

  // SSL
  if (analysis.techData.sslDaysLeft !== undefined) {
    if (analysis.techData.sslDaysLeft > 30) {
      msg += `• *SSL:* Ativo (${analysis.techData.sslIssuer}, ${analysis.techData.sslDaysLeft} dias) ✅\n`;
    } else {
      msg += `• *SSL:* ⚠️ Expira em ${analysis.techData.sslDaysLeft} dias — precisa renovar\n`;
    }
  }

  // DNS/Email
  if (analysis.techData.hasMX !== undefined) {
    if (analysis.techData.hasMX) {
      msg += `• *Email corporativo:* Configurado ✅`;
      if (!analysis.techData.hasSPF || !analysis.techData.hasDMARC) {
        msg += ` (mas sem ${!analysis.techData.hasSPF ? 'SPF' : ''}${!analysis.techData.hasSPF && !analysis.techData.hasDMARC ? '/' : ''}${!analysis.techData.hasDMARC ? 'DMARC' : ''} — risco de cair em spam)`;
      }
      msg += `\n`;
    } else {
      msg += `• *Email corporativo:* Não configurado — email @${analysis.domain} passaria mais credibilidade\n`;
    }
  }

  // Instagram
  if (analysis.instagram) {
    if (analysis.instagram.found) {
      msg += `• *Instagram:* @${analysis.instagram.handle} ✅\n`;
    } else {
      msg += `• *Instagram:* Não encontrado\n`;
    }
  }

  // Google Meu Negócio
  if (analysis.google_business) {
    if (analysis.google_business.found) {
      msg += `• *Google Meu Negócio:* Ativo${analysis.techData.gmbRating ? ` (nota ${analysis.techData.gmbRating})` : ''} ✅\n`;
    } else {
      msg += `• *Google Meu Negócio:* Não encontrado\n`;
    }
  }

  msg += `\n`;

  // ── Bloco 4: Oportunidades (tom positivo) ───────────────────
  const topOpps = analysis.opportunities.slice(0, 3);
  if (topOpps.length > 0) {
    msg += `💡 *Oportunidades que identifiquei:*\n\n`;
    topOpps.forEach(o => {
      msg += `→ *${o.area}:* ${o.desc}\n`;
    });
    msg += `\n`;
  }

  // ── Bloco 5: CTA ────────────────────────────────────────────
  msg += `Na *Riwer Labs* a gente resolve exatamente esses pontos — já ajudamos mais de 30 empresas a escalar com tecnologia e IA.\n\n`;
  msg += `Te mostro em 5 min como aplicaria isso na ${company}? Sem compromisso, é uma consultoria rápida mesmo. 🚀`;

  return msg;
}

// ═══════════════════════════════════════════════════════════════════
// 3. SALVAR ANÁLISE NO CRM
// ═══════════════════════════════════════════════════════════════════

async function saveAnalysisToCRM(analysis) {
  const lead = await crmRequest('GET', `/leads/${analysis.leadId}`);
  let customFields = {};
  try { customFields = JSON.parse(lead.data?.customFields || '{}'); } catch {}

  customFields.analysis_date = analysis.timestamp;
  customFields.website = analysis.website || customFields.website;
  customFields.domain = analysis.domain;
  if (analysis.techData.seoScore) customFields.seo_score = analysis.techData.seoScore;
  if (analysis.techData.pagespeed) customFields.pagespeed_mobile = analysis.techData.pagespeed;
  if (analysis.techData.sslDaysLeft) customFields.ssl_days_left = analysis.techData.sslDaysLeft;
  if (analysis.techData.hasMX !== undefined) customFields.has_mx = analysis.techData.hasMX;
  if (analysis.instagram?.handle) customFields.instagram = analysis.instagram.handle;
  if (analysis.google_business?.found !== undefined) customFields.gmb_found = analysis.google_business.found;
  customFields.strengths_count = analysis.strengths.length;
  customFields.opportunities_count = analysis.opportunities.length;

  // Atualizar telefone/email se extraídos do site
  const updateBody = { customFields: JSON.stringify(customFields) };
  if (analysis.extractedPhone) updateBody.phone = analysis.extractedPhone;
  if (analysis.extractedEmail) updateBody.email = analysis.extractedEmail;

  await crmRequest('PUT', `/leads/${analysis.leadId}`, updateBody);

  // Nota detalhada
  const note = `📊 AUDITORIA DIGITAL — ${new Date().toLocaleDateString('pt-BR')}

🌐 Site: ${analysis.website || 'NÃO ENCONTRADO'}
📱 Instagram: ${analysis.instagram?.found ? '@' + analysis.instagram.handle : 'N/A'}
📍 GMB: ${analysis.google_business?.found ? 'Sim' : 'Não'}
🔒 SSL: ${analysis.ssl?.status || 'N/A'} (${analysis.techData.sslDaysLeft || '?'} dias)
📧 Email MX: ${analysis.techData.hasMX ? 'Sim' : 'Não'} | SPF: ${analysis.techData.hasSPF ? 'Sim' : 'Não'} | DMARC: ${analysis.techData.hasDMARC ? 'Sim' : 'Não'}
🔍 SEO: ${analysis.techData.seoScore || 'N/A'}/100 (${analysis.techData.seoGrade || '?'})
⚡ PageSpeed: ${analysis.techData.pagespeed || 'N/A'}/100

✅ PONTOS FORTES (${analysis.strengths.length}):
${analysis.strengths.map(s => `  • ${s}`).join('\n') || '  (nenhum identificado)'}

💡 OPORTUNIDADES (${analysis.opportunities.length}):
${analysis.opportunities.map(o => `  • [${o.area}] ${o.desc}`).join('\n')}`;

  await crmRequest('POST', `/leads/${analysis.leadId}/notes`, { content: note });
  console.log(`  [CRM] Análise salva no lead ${analysis.leadId}`);
}

// ═══════════════════════════════════════════════════════════════════
// 4. COMANDOS
// ═══════════════════════════════════════════════════════════════════

async function cmdAnalyze(leadId) {
  console.log(`\n🔍 Analisando lead ${leadId}...\n`);
  const lead = await crmRequest('GET', `/leads/${leadId}`);
  if (!lead.success) throw new Error(`Lead não encontrado: ${leadId}`);

  const analysis = await analyzeLead(lead.data);
  try { await saveAnalysisToCRM(analysis); } catch (e) {
    console.log(`  [CRM] Erro ao salvar (${e.message}) — continuando...`);
  }

  console.log(`\n✅ Análise completa:`);
  console.log(`  Pontos fortes: ${analysis.strengths.length}`);
  analysis.strengths.forEach(s => console.log(`  ✅ ${s}`));
  console.log(`  Oportunidades: ${analysis.opportunities.length}`);
  analysis.opportunities.forEach(o => console.log(`  💡 [${o.area}] ${o.desc}`));

  return analysis;
}

async function cmdGenerate(leadId) {
  const lead = await crmRequest('GET', `/leads/${leadId}`);
  if (!lead.success) throw new Error(`Lead não encontrado: ${leadId}`);

  const analysis = await analyzeLead(lead.data);
  try { await saveAnalysisToCRM(analysis); } catch (e) {
    console.log(`  [CRM] Erro ao salvar (${e.message}) — continuando...`);
  }
  const message = generateMessage(analysis);

  console.log('\n' + '═'.repeat(60));
  console.log('  MENSAGEM PERSONALIZADA');
  console.log('═'.repeat(60));
  console.log(message);
  console.log('═'.repeat(60));

  return { analysis, message };
}

async function cmdPreview(leadId) {
  console.log(`\n🔎 Preview completo para lead ${leadId}\n`);
  const { analysis, message } = await cmdGenerate(leadId);

  console.log('\n📊 RESUMO:');
  console.log(`  Empresa: ${analysis.companyClean}`);
  console.log(`  Site: ${analysis.website || 'N/A'}`);
  console.log(`  SEO: ${analysis.techData.seoScore || 'N/A'}/100`);
  console.log(`  PageSpeed: ${analysis.techData.pagespeed || 'N/A'}/100`);
  console.log(`  SSL: ${analysis.ssl?.status || 'N/A'}`);
  console.log(`  Instagram: ${analysis.instagram?.handle ? '@' + analysis.instagram.handle : 'N/A'}`);
  console.log(`  GMB: ${analysis.google_business?.found ? 'Sim' : 'Não'}`);
  console.log(`  Forças: ${analysis.strengths.length} | Oportunidades: ${analysis.opportunities.length}`);

  return { analysis, message };
}

async function getAlreadyContactedLeadIds() {
  // Buscar leads que já receberam msg da campanha anterior (pausada)
  const blacklist = new Set();
  try {
    // Leads da campanha problemática
    const campaign = await crmRequest('GET', '/campaigns/cmmoe6r6m000bw0f4wo239spm/leads?limit=200');
    if (campaign.data) {
      campaign.data.forEach(cl => {
        // cl.lead.id contém o ID real do lead (não campaignLeadId)
        if (cl.lead?.id) blacklist.add(cl.lead.id);
        else if (cl.leadId) blacklist.add(cl.leadId);
        else if (cl.id && cl.lead) blacklist.add(cl.lead.id || cl.id);
      });
    }
  } catch {}

  // Também excluir leads com status "contacted"
  try {
    const contacted = await crmRequest('GET', '/leads?status=contacted&limit=200');
    if (contacted.data) {
      contacted.data.forEach(l => blacklist.add(l.id));
    }
  } catch {}

  return blacklist;
}

async function cmdRun(limit = 5) {
  console.log(`\n🚀 Pipeline de Prospecção — processando até ${limit} leads\n`);

  // Carregar blacklist de leads já contactados
  const blacklist = await getAlreadyContactedLeadIds();
  console.log(`🚫 ${blacklist.size} leads na blacklist (já receberam msg anterior)\n`);

  const result = await crmRequest('GET', `/leads?status=new&limit=100`);
  if (!result.success) throw new Error('Erro ao buscar leads');

  // Filtrar: precisa ter website no customFields E não estar na blacklist
  const allLeads = result.data.filter(l => {
    let cf = {};
    try { cf = JSON.parse(l.customFields || '{}'); } catch {}
    return cf.website && cf.website.startsWith('http');
  });
  const leads = allLeads.filter(l => !blacklist.has(l.id)).slice(0, limit);

  console.log(`📋 ${leads.length} leads com website elegíveis (${allLeads.length} com site, ${allLeads.length - leads.length} na blacklist)\n`);

  const previews = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    console.log(`\n[${'─'.repeat(50)}]`);
    console.log(`[${i + 1}/${leads.length}] ${lead.name} — ${lead.phone}`);
    console.log(`[${'─'.repeat(50)}]`);

    try {
      const analysis = await analyzeLead(lead);
      try { await saveAnalysisToCRM(analysis); } catch {}
      const message = generateMessage(analysis);

      previews.push({ lead, analysis, message });

      console.log(`\n📝 MENSAGEM:`);
      console.log(message);
      console.log(`\n✅ ${analysis.strengths.length} forças, ${analysis.opportunities.length} oportunidades`);
    } catch (e) {
      console.error(`  ❌ Erro: ${e.message}`);
    }

    if (i < leads.length - 1) {
      console.log(`\n⏳ Aguardando 3s...`);
      await sleep(3000);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESUMO: ${previews.length}/${leads.length} leads analisados`);
  console.log(`  ⚠️  NENHUMA MENSAGEM FOI ENVIADA — apenas preview`);
  console.log(`${'═'.repeat(60)}\n`);

  return previews;
}

async function cmdSend(leadId) {
  const lead = await crmRequest('GET', `/leads/${leadId}`);
  if (!lead.success) throw new Error(`Lead não encontrado: ${leadId}`);
  if (!lead.data.phone) throw new Error('Lead sem telefone');

  // Verificar se já recebeu msg anterior
  const blacklist = await getAlreadyContactedLeadIds();
  if (blacklist.has(leadId)) {
    console.log('⚠️  Este lead já recebeu mensagem da campanha anterior. Pulando.');
    console.log('   Para forçar o envio, use: send --force <leadId>');
    return { skipped: true, reason: 'already_contacted' };
  }

  const analysis = await analyzeLead(lead.data);
  const message = generateMessage(analysis);

  console.log('\n📤 Enviando mensagem personalizada...');
  console.log(`  Para: ${lead.data.name} (${lead.data.phone})`);

  const sendResult = await crmRequest('POST', '/messages/whatsapp', {
    leadId: lead.data.id,
    content: message,
  });

  if (sendResult.success) {
    console.log('  ✅ Mensagem enviada!');
    await crmRequest('PUT', `/leads/${leadId}`, { status: 'contacted', temperature: 'warm' });
  } else {
    console.error('  ❌ Erro ao enviar:', sendResult.error || sendResult);
  }

  return sendResult;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const [,, command, arg] = process.argv;

  switch (command) {
    case 'analyze':
      if (!arg) { console.error('Uso: analyze <leadId>'); process.exit(1); }
      await cmdAnalyze(arg);
      break;
    case 'generate':
      if (!arg) { console.error('Uso: generate <leadId>'); process.exit(1); }
      await cmdGenerate(arg);
      break;
    case 'preview':
      if (!arg) { console.error('Uso: preview <leadId>'); process.exit(1); }
      await cmdPreview(arg);
      break;
    case 'send':
      if (!arg) { console.error('Uso: send <leadId>'); process.exit(1); }
      await cmdSend(arg);
      break;
    case 'run':
      await cmdRun(parseInt(arg) || 5);
      break;
    default:
      console.log(`
Smart Prospector — Riwer Labs

Comandos:
  analyze <leadId>       Analisa 1 lead (site, SEO, SSL, DNS, Instagram, GMB)
  generate <leadId>      Gera mensagem personalizada
  preview <leadId>       Análise completa + mensagem (sem enviar)
  send <leadId>          Envia mensagem (requer análise prévia)
  run [limit]            Pipeline completo para N leads (preview, sem envio)
`);
  }
}

main().catch(e => { console.error('\n❌ ERRO:', e.message); process.exit(1); });
