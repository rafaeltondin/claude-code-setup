/**
 * Tools: WEB — fetch_api, scrape_website, seo_check, pagespeed, landing_page_tracker, responsive_check, payment_link
 */
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'fetch_api',
      description: 'Chamada HTTP a APIs externas (Meta Ads, Shopify, Evolution/WhatsApp, Google, etc.). Use call_crm para o CRM local.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa da API externa' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'Método HTTP' },
          headers: { type: 'object', description: 'Headers HTTP como objeto JSON' },
          body: { type: 'string', description: 'Body da requisição (string JSON ou texto)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scrape_website',
      description: `Raspa um site e extrai informações estruturadas da identidade visual e contato.
Coleta automaticamente:
- Texto completo da página (limpo, sem HTML)
- Cores da identidade visual (hex/rgb mais usados no CSS)
- Logotipo (og:image, favicon, apple-touch-icon, <img> com "logo")
- WhatsApp (links wa.me, api.whatsapp.com, números próximos à palavra "whatsapp")
- E-mails (links mailto: e regex no conteúdo)
- Título e meta description

Use para analisar sites de concorrentes, clientes ou referências antes de criar anúncios, landing pages ou estratégias.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site a raspar. Ex: https://www.exemplo.com.br' },
          includeText: { type: 'boolean', description: 'Incluir o texto completo da página. Padrão: true' },
          maxTextLength: { type: 'number', description: 'Limite de caracteres do texto extraído. Padrão: 5000' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'seo_check',
      description: `Analisa SEO de uma URL. Verifica titulo, meta description, headings, imagens, links, performance, schema markup e mais.
Retorna score SEO e lista de problemas/recomendacoes.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site/pagina a analisar' },
          checks: {
            type: 'string',
            description: 'Checks a executar separados por virgula. Padrao: all. Opcoes: meta, headings, images, links, performance, schema, social, mobile'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'landing_page_tracker',
      description: 'Verifica se uma landing page tem pixels e scripts de rastreamento instalados corretamente (Meta Pixel, GA4, GTM, Hotjar, LinkedIn Insight, TikTok Pixel). Retorna quais foram encontrados e os IDs extraídos.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa da landing page a verificar. Ex: https://www.exemplo.com.br' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'pagespeed',
      description: `OBRIGATORIO quando o usuario pedir: velocidade, speed, performance, nota do site, tempo de carregamento, lighthouse, pagespeed ou core web vitals. Consulta o Google PageSpeed Insights REAL para obter scores de 0-100 de Performance, Acessibilidade, SEO e Boas Praticas + Core Web Vitals (LCP, FCP, TBT, CLS, Speed Index). NUNCA use execute_node com http.request para medir velocidade — isso mede latencia de rede, NAO performance real.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site/pagina a analisar' },
          strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Estrategia de analise. Padrao: mobile' },
          categories: { type: 'string', description: 'Categorias separadas por virgula. Padrao: performance,accessibility,seo,best-practices' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'responsive_check',
      description: 'Tira screenshots de uma URL em múltiplos viewports para verificar responsividade. Requer Puppeteer instalado.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa da página a verificar' },
          viewports: { type: 'string', description: 'Viewports separados por vírgula no formato WIDTHxHEIGHT. Padrão: "375x667,768x1024,1280x800,1920x1080"' },
          output_dir: { type: 'string', description: 'Diretório onde salvar os screenshots. Padrão: "~/.claude/temp/responsive"' },
          format: { type: 'string', enum: ['png', 'jpeg'], description: 'Formato dos screenshots. Padrão: png' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'payment_link',
      description: 'Gera link de pagamento via Stripe ou QR Code Pix (EMV padrão BR). Para Pix, requer PIX_KEY no vault. Para Stripe, requer STRIPE_SECRET_KEY no vault.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Valor em reais (ex: 99.90)' },
          description: { type: 'string', description: 'Descrição do produto/serviço' },
          method: { type: 'string', enum: ['stripe', 'pix'], description: 'Método de pagamento. Padrão: pix' },
          customer_name: { type: 'string', description: 'Nome do cliente (opcional)' },
          customer_email: { type: 'string', description: 'E-mail do cliente (opcional)' },
          expires_hours: { type: 'number', description: 'Horas até expiração. Padrão: 24' }
        },
        required: ['amount', 'description']
      }
    }
  },
];

const handlers = {
  async fetch_api(args, ctx) {
    return new Promise((resolve) => {
      const { url, method = 'GET', headers = {}, body } = args;
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (e) {
        return resolve(`URL inválida: ${url}`);
      }
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;
      const bodyBuf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8') : null;
      const opts = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {})
        }
      };
      const req = lib.request(opts, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          const truncated = data.length > 8000 ? data.substring(0, 8000) + '\n...[truncado]' : data;
          resolve(`HTTP ${res.statusCode}\n${truncated}`);
        });
      });
      req.setTimeout(15000, () => { req.destroy(); resolve('Erro HTTP: timeout de 15s excedido'); });
      req.on('error', e => resolve(`Erro HTTP: ${e.message}`));
      if (bodyBuf) req.write(bodyBuf);
      req.end();
    });
  },

  async scrape_website(args, ctx) {
    try {
      const targetUrl = args.url || '';
      if (!targetUrl) return 'Parâmetro "url" é obrigatório';

      // Fetch HTML com suporte a redirects
      const fetchHtml = (url, redirectCount = 0) => new Promise((resolve, reject) => {
        if (redirectCount > 5) return reject(new Error('Muitos redirecionamentos'));
        let urlObj;
        try { urlObj = new URL(url); } catch (e) { return reject(new Error(`URL inválida: ${url}`)); }
        const lib = urlObj.protocol === 'https:' ? https : http;
        const req = lib.request({
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: (urlObj.pathname || '/') + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          }
        }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const next = res.headers.location.startsWith('http')
              ? res.headers.location
              : `${urlObj.protocol}//${urlObj.host}${res.headers.location.startsWith('/') ? '' : '/'}${res.headers.location}`;
            res.resume();
            return resolve(fetchHtml(next, redirectCount + 1));
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: url, status: res.statusCode }));
        });
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout (20s)')); });
        req.on('error', reject);
        req.end();
      });

      const { html, finalUrl, status } = await fetchHtml(targetUrl);
      if (status >= 400) return `Erro HTTP ${status} ao acessar ${targetUrl}`;

      const baseUrl = new URL(finalUrl);
      const baseOrigin = baseUrl.origin;

      // Helper: resolver URL relativa para absoluta
      const resolveUrl = (href) => {
        if (!href) return '';
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return baseUrl.protocol + href;
        if (href.startsWith('/')) return baseOrigin + href;
        return baseOrigin + '/' + href;
      };

      // --- 1. TEXTO ---
      const includeText = args.includeText !== false;
      const maxTextLength = args.maxTextLength || 5000;
      let textContent = '';
      if (includeText) {
        textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
          .replace(/\s+/g, ' ').trim()
          .substring(0, maxTextLength);
      }

      // --- 2. CORES ---
      const colorCount = {};
      const styleBlocks = [...html.matchAll(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
      const inlineStyles = [...html.matchAll(/style="([^"]{1,500})"/gi)].map(m => m[1]);
      const allCss = [...styleBlocks, ...inlineStyles].join(' ');

      // Hex colors
      const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
      let hm;
      while ((hm = hexPattern.exec(allCss)) !== null) {
        let h = hm[1].toUpperCase();
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        // Ignorar preto/branco/cinza puro e transparente
        if (['FFFFFF','000000','111111','222222','333333','444444','555555',
             'EEEEEE','DDDDDD','CCCCCC','BBBBBB','AAAAAA','999999','F5F5F5',
             'FAFAFA','E5E5E5','F0F0F0'].includes(h)) continue;
        colorCount[`#${h}`] = (colorCount[`#${h}`] || 0) + 1;
      }
      // RGB/RGBA
      const rgbPattern = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
      let rm;
      while ((rm = rgbPattern.exec(allCss)) !== null) {
        const [r, g, b] = [parseInt(rm[1]), parseInt(rm[2]), parseInt(rm[3])];
        if ((r < 15 && g < 15 && b < 15) || (r > 240 && g > 240 && b > 240)) continue;
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        colorCount[hex] = (colorCount[hex] || 0) + 1;
      }
      const colors = Object.entries(colorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([color, count]) => ({ color, occurrences: count }));

      // --- 3. LOGOTIPO ---
      const logos = [];
      // og:image
      const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogImg) logos.push({ type: 'og:image', url: resolveUrl(ogImg[1]) });

      // favicon
      const favicon = html.match(/<link[^>]+rel=["'][^"']*(?:shortcut\s+icon|icon)[^"']*["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
      if (favicon) logos.push({ type: 'favicon', url: resolveUrl(favicon[1]) });

      // apple-touch-icon
      const appleIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i);
      if (appleIcon) logos.push({ type: 'apple-touch-icon', url: resolveUrl(appleIcon[1]) });

      // <img> com "logo" no src, alt, class ou id
      const imgTags = [...html.matchAll(/<img[^>]{1,500}>/gi)];
      for (const m of imgTags) {
        const tag = m[0];
        if (!/logo|brand|marca/i.test(tag)) continue;
        const srcM = tag.match(/src=["']([^"']+)["']/i);
        const altM = tag.match(/alt=["']([^"']+)["']/i);
        if (srcM) {
          logos.push({ type: 'img-logo', url: resolveUrl(srcM[1]), alt: altM ? altM[1] : '' });
          if (logos.filter(l => l.type === 'img-logo').length >= 3) break;
        }
      }

      // --- 4. WHATSAPP ---
      const whatsapps = [];
      // wa.me e api.whatsapp.com
      const waLinks = [...html.matchAll(/href=["']https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[/?]?([^"'&\s]*)/gi)];
      for (const m of waLinks) {
        const num = m[1].replace(/[^\d]/g, '');
        if (num.length >= 8 && !whatsapps.includes(num)) whatsapps.push(num);
      }
      // wa.me no texto
      const waText = [...html.matchAll(/wa\.me\/(\d+)/g)];
      for (const m of waText) {
        if (!whatsapps.includes(m[1])) whatsapps.push(m[1]);
      }
      // Números BR (formato +55) próximos à palavra whatsapp
      const waBr = [...html.matchAll(/whatsapp[^<>"]{0,150}?(\+?55\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/gi)];
      for (const m of waBr) {
        const num = m[1].replace(/\D/g, '');
        if (num.length >= 10 && !whatsapps.includes(num)) whatsapps.push(num);
      }
      // data-* com phone perto de whatsapp
      const dataPhone = [...html.matchAll(/data-(?:phone|number|whatsapp)=["'](\+?[\d\s\-()]{8,20})["']/gi)];
      for (const m of dataPhone) {
        const num = m[1].replace(/\D/g, '');
        if (num.length >= 8 && !whatsapps.includes(num)) whatsapps.push(num);
      }

      // --- 5. EMAILS ---
      const emails = [];
      // mailto: links
      const mailtoLinks = [...html.matchAll(/href=["']mailto:([^"'?&#\s]+)/gi)];
      for (const m of mailtoLinks) {
        const email = m[1].toLowerCase().trim();
        if (!emails.includes(email)) emails.push(email);
      }
      // Regex no texto limpo
      const textForEmail = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
      const emailRe = /\b[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,6}\b/g;
      const emailMatches = [...textForEmail.matchAll(emailRe)];
      for (const m of emailMatches) {
        const email = m[0].toLowerCase();
        if (!emails.includes(email) &&
            !email.includes('example') && !email.includes('placeholder') &&
            !email.includes('sentry') && !email.includes('@2x')) {
          emails.push(email);
        }
        if (emails.length >= 10) break;
      }

      // --- 6. TÍTULO E DESCRIÇÃO ---
      const titleM = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
      const title = titleM ? titleM[1].trim() : '';
      const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,500})["']/i)
        || html.match(/<meta[^>]+content=["']([^"']{1,500})["'][^>]+name=["']description["']/i);
      const description = descM ? descM[1].trim() : '';

      const result = {
        url: finalUrl,
        title,
        description,
        colors,
        logos,
        whatsapp: whatsapps.slice(0, 5),
        emails: emails.slice(0, 10),
        ...(includeText ? { text: textContent } : {})
      };

      return JSON.stringify(result, null, 2).substring(0, 12000);
    } catch (e) {
      return `Erro ao raspar site: ${e.message}`;
    }
  },

  async seo_check(args, ctx) {
    const url = args.url || '';
    if (!url) return JSON.stringify({ ok: false, error: 'url e obrigatoria' });

    const checksArg = (args.checks || 'all').toLowerCase().split(',').map(s => s.trim());
    const doAll = checksArg.includes('all');

    try {
      // Buscar pagina
      const fetchUrl = new URL(url);
      const proto = fetchUrl.protocol === 'https:' ? https : http;
      const html = await new Promise((resolve, reject) => {
        const req = proto.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' } }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Seguir redirect
            proto.get(res.headers.location, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' } }, res2 => {
              let d = '';
              res2.on('data', c => d += c);
              res2.on('end', () => resolve(d));
            }).on('error', reject);
            return;
          }
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(d));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout ao carregar pagina')); });
      });

      const issues = [];
      const warnings = [];
      const passed = [];
      const data = {};
      let score = 100;

      // ── META ──
      if (doAll || checksArg.includes('meta')) {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        const description = descMatch ? descMatch[1].trim() : '';
        const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
        const robots = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
        const viewport = html.match(/<meta[^>]*name=["']viewport["']/i);

        data.title = { text: title, length: title.length };
        data.description = { text: description, length: description.length };
        data.canonical = canonical ? canonical[1] : null;
        data.robots = robots ? robots[1] : null;

        if (!title) { issues.push('Sem tag <title>'); score -= 15; }
        else if (title.length < 30) { warnings.push(`Title muito curto (${title.length} chars, recomendado: 30-60)`); score -= 5; }
        else if (title.length > 60) { warnings.push(`Title muito longo (${title.length} chars, recomendado: 30-60)`); score -= 3; }
        else passed.push('Title OK');

        if (!description) { issues.push('Sem meta description'); score -= 10; }
        else if (description.length < 70) { warnings.push(`Description curta (${description.length} chars, recomendado: 70-160)`); score -= 3; }
        else if (description.length > 160) { warnings.push(`Description longa (${description.length} chars, recomendado: 70-160)`); score -= 2; }
        else passed.push('Meta description OK');

        if (!canonical) { warnings.push('Sem canonical URL'); score -= 3; }
        else passed.push('Canonical definida');

        if (!viewport) { issues.push('Sem meta viewport (mobile)'); score -= 10; }
        else passed.push('Viewport OK');
      }

      // ── HEADINGS ──
      if (doAll || checksArg.includes('headings')) {
        const h1s = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
        const h2s = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
        const h3s = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];

        data.headings = {
          h1_count: h1s.length,
          h1_text: h1s.map(h => h.replace(/<[^>]*>/g, '').trim()).slice(0, 3),
          h2_count: h2s.length,
          h3_count: h3s.length
        };

        if (h1s.length === 0) { issues.push('Sem tag H1'); score -= 10; }
        else if (h1s.length > 1) { warnings.push(`Multiplos H1 (${h1s.length}), recomendado: apenas 1`); score -= 3; }
        else passed.push('H1 unico OK');

        if (h2s.length === 0) { warnings.push('Sem tags H2'); score -= 3; }
      }

      // ── IMAGES ──
      if (doAll || checksArg.includes('images')) {
        const imgs = html.match(/<img[^>]*>/gi) || [];
        const withoutAlt = imgs.filter(i => !i.match(/alt=["'][^"']+["']/i));

        data.images = { total: imgs.length, without_alt: withoutAlt.length };

        if (withoutAlt.length > 0) {
          warnings.push(`${withoutAlt.length}/${imgs.length} imagens sem alt text`);
          score -= Math.min(withoutAlt.length * 2, 10);
        } else if (imgs.length > 0) {
          passed.push('Todas imagens com alt text');
        }
      }

      // ── LINKS ──
      if (doAll || checksArg.includes('links')) {
        const links = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
        const internal = links.filter(l => {
          const href = (l.match(/href=["']([^"']*)["']/i) || [])[1] || '';
          return href.startsWith('/') || href.includes(fetchUrl.hostname);
        });
        const external = links.length - internal.length;
        const nofollow = links.filter(l => l.match(/rel=["'][^"']*nofollow[^"']*["']/i));

        data.links = { total: links.length, internal: internal.length, external, nofollow: nofollow.length };
      }

      // ── PERFORMANCE ──
      if (doAll || checksArg.includes('performance')) {
        const htmlSize = Buffer.byteLength(html, 'utf8');
        const scripts = html.match(/<script[^>]*>/gi) || [];
        const styles = html.match(/<link[^>]*stylesheet[^>]*>/gi) || [];
        const inlineStyles = html.match(/<style[^>]*>/gi) || [];

        data.performance = {
          html_size_kb: +(htmlSize / 1024).toFixed(1),
          scripts: scripts.length,
          stylesheets: styles.length,
          inline_styles: inlineStyles.length
        };

        if (htmlSize > 200000) { warnings.push(`HTML grande (${(htmlSize/1024).toFixed(0)}KB)`); score -= 5; }
        if (scripts.length > 15) { warnings.push(`Muitos scripts (${scripts.length})`); score -= 3; }
      }

      // ── SCHEMA ──
      if (doAll || checksArg.includes('schema')) {
        const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        data.schema = { json_ld_count: jsonLd.length };

        if (jsonLd.length > 0) {
          try {
            data.schema.types = jsonLd.map(s => {
              const content = s.replace(/<[^>]*>/g, '');
              const parsed = JSON.parse(content);
              return parsed['@type'] || 'unknown';
            });
          } catch {}
          passed.push(`Schema markup encontrado (${jsonLd.length} blocos)`);
        } else {
          warnings.push('Sem schema markup (JSON-LD)');
          score -= 5;
        }
      }

      // ── SOCIAL ──
      if (doAll || checksArg.includes('social')) {
        const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
        const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
        const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
        const twCard = html.match(/<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']*)["']/i);

        data.social = {
          og_title: ogTitle ? ogTitle[1] : null,
          og_description: ogDesc ? ogDesc[1] : null,
          og_image: ogImage ? ogImage[1] : null,
          twitter_card: twCard ? twCard[1] : null
        };

        if (!ogTitle) { warnings.push('Sem og:title'); score -= 3; }
        if (!ogImage) { warnings.push('Sem og:image'); score -= 3; }
        if (ogTitle && ogImage) passed.push('Open Graph tags OK');
      }

      score = Math.max(0, Math.min(100, score));

      return JSON.stringify({
        ok: true,
        url,
        score,
        grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F',
        summary: { issues: issues.length, warnings: warnings.length, passed: passed.length },
        issues,
        warnings,
        passed,
        data
      });
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao analisar SEO: ${e.message}` });
    }
  },

  async landing_page_tracker(args, ctx) {
    try {
      const targetUrl = args.url || '';
      if (!targetUrl) return JSON.stringify({ ok: false, error: 'Parâmetro "url" é obrigatório' });

      // Reutiliza o mesmo padrão de fetchHtml do scrape_website
      const fetchHtml = (url, redirectCount = 0) => new Promise((resolve, reject) => {
        if (redirectCount > 5) return reject(new Error('Muitos redirecionamentos'));
        let urlObj;
        try { urlObj = new URL(url); } catch (e) { return reject(new Error(`URL inválida: ${url}`)); }
        const lib = urlObj.protocol === 'https:' ? https : http;
        const req = lib.request({
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: (urlObj.pathname || '/') + urlObj.search,
          method: 'GET',
          rejectUnauthorized: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          }
        }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const next = res.headers.location.startsWith('http')
              ? res.headers.location
              : `${urlObj.protocol}//${urlObj.host}${res.headers.location.startsWith('/') ? '' : '/'}${res.headers.location}`;
            res.resume();
            return resolve(fetchHtml(next, redirectCount + 1));
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: url, status: res.statusCode }));
        });
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout (20s)')); });
        req.on('error', reject);
        req.end();
      });

      const { html, finalUrl, status } = await fetchHtml(targetUrl);
      if (status >= 400) return JSON.stringify({ ok: false, error: `Erro HTTP ${status} ao acessar ${targetUrl}` });

      const trackers = {};

      // 1. Meta Pixel (Facebook)
      {
        const found = /fbq\('init'|facebook\.com\/tr|connect\.facebook\.net\/en_US\/fbevents\.js/i.test(html);
        let id = null;
        let snippet = null;
        if (found) {
          // Tenta extrair pixel ID do fbq('init', 'XXXXXXX')
          const idMatch = html.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i);
          if (idMatch) id = idMatch[1];
          // Tenta extrair do pixel no iframe/img fallback
          if (!id) {
            const imgMatch = html.match(/facebook\.com\/tr[?][^"'\s]*id=(\d+)/i);
            if (imgMatch) id = imgMatch[1];
          }
          const snippetMatch = html.match(/(fbq\('[^)]{0,200}\)|facebook\.com\/tr[^\s"'<]{0,100}|connect\.facebook\.net[^\s"'<]{0,100})/i);
          if (snippetMatch) snippet = snippetMatch[1].substring(0, 100);
        }
        trackers.meta_pixel = { found, id, snippet_preview: snippet };
      }

      // 2. Google Analytics / GA4
      {
        const found = /gtag\s*\(\s*['"]config['"]|googletagmanager\.com\/gtag\/js|google-analytics\.com\/analytics\.js/i.test(html);
        let id = null;
        let snippet = null;
        if (found) {
          // GA4: G-XXXXXXXX
          const ga4Match = html.match(/gtag\s*\(\s*['"]config['"]\s*,\s*['"]([GU][A-Z0-9\-]+)['"]/i);
          if (ga4Match) id = ga4Match[1];
          // UA-XXXXX-X (Universal Analytics)
          if (!id) {
            const uaMatch = html.match(/['"]?(UA-\d+-\d+)['"]?/i);
            if (uaMatch) id = uaMatch[1];
          }
          // G- via src param
          if (!id) {
            const srcMatch = html.match(/googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/i);
            if (srcMatch) id = srcMatch[1];
          }
          const snippetMatch = html.match(/(gtag\([^)]{0,200}\)|google-analytics\.com[^\s"'<]{0,100}|googletagmanager\.com\/gtag[^\s"'<]{0,100})/i);
          if (snippetMatch) snippet = snippetMatch[1].substring(0, 100);
        }
        trackers.google_analytics = { found, id, snippet_preview: snippet };
      }

      // 3. Google Tag Manager
      {
        const found = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i.test(html);
        let id = null;
        let snippet = null;
        if (found) {
          const idMatch = html.match(/GTM-([A-Z0-9]+)/i);
          if (idMatch) id = 'GTM-' + idMatch[1];
          const snippetMatch = html.match(/(googletagmanager\.com\/gtm\.js[^\s"'<]{0,100}|GTM-[A-Z0-9]+)/i);
          if (snippetMatch) snippet = snippetMatch[1].substring(0, 100);
        }
        trackers.google_tag_manager = { found, id, snippet_preview: snippet };
      }

      // 4. Hotjar
      {
        const found = /hotjar\.com|hj\s*\(\s*['"]init['"]/i.test(html);
        let id = null;
        let snippet = null;
        if (found) {
          const idMatch = html.match(/hj\s*\(\s*['"]init['"]\s*,\s*(\d+)/i);
          if (idMatch) id = idMatch[1];
          if (!id) {
            const siteIdMatch = html.match(/hjid\s*[:=]\s*(\d+)/i);
            if (siteIdMatch) id = siteIdMatch[1];
          }
          const snippetMatch = html.match(/(hotjar\.com[^\s"'<]{0,100}|hj\([^)]{0,100}\))/i);
          if (snippetMatch) snippet = snippetMatch[1].substring(0, 100);
        }
        trackers.hotjar = { found, id, snippet_preview: snippet };
      }

      // 5. LinkedIn Insight
      {
        const found = /snap\.licdn\.com\/li\.lms-analytics|_linkedin_partner_id/i.test(html);
        let id = null;
        let snippet = null;
        if (found) {
          const idMatch = html.match(/_linkedin_partner_id\s*=\s*['"]?(\d+)['"]?/i);
          if (idMatch) id = idMatch[1];
          const snippetMatch = html.match(/(snap\.licdn\.com[^\s"'<]{0,100}|_linkedin_partner_id[^\n;]{0,100})/i);
          if (snippetMatch) snippet = snippetMatch[1].substring(0, 100);
        }
        trackers.linkedin_insight = { found, id, snippet_preview: snippet };
      }

      // 6. TikTok Pixel
      {
        const found = /analytics\.tiktok\.com|ttq\.load/i.test(html);
        let id = null;
        let snippet = null;
        if (found) {
          const idMatch = html.match(/ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/i);
          if (idMatch) id = idMatch[1];
          const snippetMatch = html.match(/(analytics\.tiktok\.com[^\s"'<]{0,100}|ttq\.load[^)]{0,100}\))/i);
          if (snippetMatch) snippet = snippetMatch[1].substring(0, 100);
        }
        trackers.tiktok_pixel = { found, id, snippet_preview: snippet };
      }

      const found_count = Object.values(trackers).filter(t => t.found).length;
      const total = Object.keys(trackers).length;

      return JSON.stringify({
        ok: true,
        url: finalUrl,
        summary: `${found_count}/${total} trackers encontrados`,
        trackers
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro landing_page_tracker: ${e.message}` });
    }
  },

  async pagespeed(args, ctx) {
    const url = args.url || '';
    if (!url) return JSON.stringify({ ok: false, error: 'url e obrigatoria' });

    const strategy = args.strategy || 'mobile';
    const categoriesArg = args.categories || 'performance,accessibility,seo,best-practices';
    const categories = categoriesArg.split(',').map(c => c.trim());

    // ── Helper: parsear resultado do Lighthouse ──
    function parseLighthouseResult(result) {
      const lhr = result.lighthouseResult;
      if (!lhr) return null;

      const scores = {};
      for (const [key, cat] of Object.entries(lhr.categories || {})) {
        scores[key] = { score: Math.round((cat.score || 0) * 100), title: cat.title };
      }

      const metrics = {};
      const audits = lhr.audits || {};
      const metricMap = {
        'largest-contentful-paint': 'LCP', 'first-contentful-paint': 'FCP',
        'total-blocking-time': 'TBT', 'cumulative-layout-shift': 'CLS',
        'speed-index': 'Speed Index', 'interactive': 'TTI', 'server-response-time': 'TTFB'
      };
      for (const [auditId, label] of Object.entries(metricMap)) {
        if (audits[auditId]) {
          metrics[label] = {
            value: audits[auditId].displayValue || audits[auditId].numericValue,
            score: audits[auditId].score !== null ? Math.round((audits[auditId].score || 0) * 100) : null
          };
        }
      }

      const fieldData = {};
      if (result.loadingExperience?.metrics) {
        for (const [key, metric] of Object.entries(result.loadingExperience.metrics)) {
          fieldData[key] = { percentile: metric.percentile, category: metric.category };
        }
      }

      const opportunities = [];
      for (const [, audit] of Object.entries(audits)) {
        if (audit.score !== null && audit.score < 0.9 && audit.details?.type === 'opportunity') {
          opportunities.push({
            title: audit.title,
            description: audit.description?.substring(0, 200),
            savings: audit.details?.overallSavingsMs ? `${Math.round(audit.details.overallSavingsMs)}ms` : null,
            score: Math.round((audit.score || 0) * 100)
          });
        }
      }
      opportunities.sort((a, b) => (a.score || 0) - (b.score || 0));

      const diagnostics = [];
      for (const [, audit] of Object.entries(audits)) {
        if (audit.score !== null && audit.score < 0.5 && audit.details?.type !== 'opportunity' && audit.scoreDisplayMode !== 'informative') {
          diagnostics.push({ title: audit.title, displayValue: audit.displayValue || null, score: Math.round((audit.score || 0) * 100) });
        }
      }
      diagnostics.sort((a, b) => (a.score || 0) - (b.score || 0));

      return {
        scores, core_web_vitals: metrics,
        field_data: Object.keys(fieldData).length > 0 ? fieldData : null,
        opportunities: opportunities.slice(0, 10),
        diagnostics: diagnostics.slice(0, 10),
        summary: `Performance: ${scores.performance?.score || '?'}/100 | A11y: ${scores.accessibility?.score || '?'}/100 | SEO: ${scores.seo?.score || '?'}/100 | Best Practices: ${scores['best-practices']?.score || '?'}/100`
      };
    }

    // ── Metodo 1: API REST (rapido, com quota) ──
    async function tryApi() {
      let apiKey = '';
      try {
        const vault = require(path.join(__dirname, '..', 'credential-vault.js'));
        const envVars = vault.getEnvVars();
        apiKey = envVars.GOOGLE_PAGESPEED_KEY || envVars.GOOGLE_API_KEY || '';
      } catch {}
      const keyParam = apiKey ? `&key=${apiKey}` : '';
      const categoryParams = categories.map(c => `&category=${encodeURIComponent(c)}`).join('');
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${categoryParams}${keyParam}`;

      const raw = await new Promise((resolve, reject) => {
        https.get(apiUrl, { timeout: 60000 }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout API')); });
      });

      const result = JSON.parse(raw);
      if (result.error) throw new Error(result.error.message || 'Erro API');

      const parsed = parseLighthouseResult(result);
      if (!parsed) throw new Error('Sem dados Lighthouse');
      return { ...parsed, method: 'api' };
    }

    // ── Metodo 2: Headless browser (sem quota, mais lento) ──
    async function tryBrowser() {
      const puppeteer = require('puppeteer');
      const psiUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy}`;

      let browser;
      try {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

        // Navegar para o PageSpeed web.dev
        await page.goto(psiUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Aguardar os resultados carregarem (o score aparece nos gauge elements)
        // O PageSpeed web.dev usa a API internamente e mostra os resultados
        // Vamos interceptar a chamada de API que ele faz
        const apiResult = await page.evaluate(async (targetUrl, strat) => {
          // Tentar extrair via API interna do pagespeed.web.dev
          try {
            const categoryList = ['performance', 'accessibility', 'seo', 'best-practices'];
            const cats = categoryList.map(c => `&category=${c}`).join('');
            const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${strat}${cats}`;
            const resp = await fetch(apiUrl);
            if (resp.ok) {
              return await resp.json();
            }
          } catch {}
          return null;
        }, url, strategy);

        if (apiResult && apiResult.lighthouseResult) {
          const parsed = parseLighthouseResult(apiResult);
          if (parsed) return { ...parsed, method: 'browser-api' };
        }

        // Fallback: esperar os scores aparecerem no DOM e extrair
        await page.waitForSelector('.lh-gauge__percentage, [class*="gauge"]', { timeout: 120000 });
        // Dar tempo extra para todos os scores carregarem
        await new Promise(r => setTimeout(r, 5000));

        const scores = await page.evaluate(() => {
          const result = {};
          // Tentar extrair dos gauges do pagespeed.web.dev
          const gauges = document.querySelectorAll('.lh-gauge__wrapper, .lh-column .lh-gauge');
          gauges.forEach(g => {
            const label = g.querySelector('.lh-gauge__label')?.textContent?.trim()?.toLowerCase() || '';
            const score = g.querySelector('.lh-gauge__percentage')?.textContent?.trim();
            if (label && score) {
              const key = label.includes('perform') ? 'performance' :
                          label.includes('access') ? 'accessibility' :
                          label.includes('best') ? 'best-practices' :
                          label.includes('seo') ? 'seo' : label;
              result[key] = { score: parseInt(score) || 0, title: label };
            }
          });

          // Extrair metricas se disponiveis
          const metrics = {};
          const metricEls = document.querySelectorAll('.lh-metric');
          metricEls.forEach(el => {
            const title = el.querySelector('.lh-metric__title')?.textContent?.trim() || '';
            const value = el.querySelector('.lh-metric__value')?.textContent?.trim() || '';
            if (title && value) {
              const key = title.includes('Largest') ? 'LCP' :
                          title.includes('First Contentful') ? 'FCP' :
                          title.includes('Total Blocking') ? 'TBT' :
                          title.includes('Cumulative') ? 'CLS' :
                          title.includes('Speed') ? 'Speed Index' :
                          title.includes('Interactive') ? 'TTI' : title;
              metrics[key] = { value, score: null };
            }
          });

          // Extrair oportunidades
          const opps = [];
          const oppEls = document.querySelectorAll('.lh-audit--load-opportunity');
          oppEls.forEach(el => {
            const title = el.querySelector('.lh-audit__title')?.textContent?.trim() || '';
            const savings = el.querySelector('.lh-audit__display-text')?.textContent?.trim() || '';
            if (title) opps.push({ title, savings: savings || null, score: 0 });
          });

          return { scores: result, metrics, opportunities: opps };
        });

        return {
          scores: scores.scores || {},
          core_web_vitals: scores.metrics || {},
          field_data: null,
          opportunities: (scores.opportunities || []).slice(0, 10),
          diagnostics: [],
          summary: Object.entries(scores.scores || {}).map(([k, v]) => `${v.title || k}: ${v.score}/100`).join(' | '),
          method: 'browser-scrape'
        };
      } finally {
        if (browser) await browser.close().catch(() => {});
      }
    }

    try {
      // Tentar API primeiro (rapido)
      try {
        const apiResult = await tryApi();
        return JSON.stringify({ ok: true, url, strategy, ...apiResult });
      } catch (apiErr) {
        console.log(`[pagespeed] API falhou (${apiErr.message}), tentando via headless browser...`);
      }

      // Fallback: headless browser
      try {
        const browserResult = await tryBrowser();
        return JSON.stringify({ ok: true, url, strategy, ...browserResult });
      } catch (browserErr) {
        return JSON.stringify({ ok: false, error: `API e browser falharam. API: quota excedida. Browser: ${browserErr.message}` });
      }
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro PageSpeed: ${e.message}` });
    }
  },

  async responsive_check(args, ctx) {
    const { url, viewports: viewportsArg, output_dir: outputDirArg, format = 'png' } = args;
    if (!url) return JSON.stringify({ ok: false, error: 'Parâmetro "url" é obrigatório' });

    const viewportsStr = viewportsArg || '375x667,768x1024,1280x800,1920x1080';
    const outputDir = (outputDirArg || '~/.claude/temp/responsive').replace(/^~/, require('os').homedir());
    const fmt = ['png', 'jpeg'].includes(format) ? format : 'png';

    // Parsear viewports
    const viewports = [];
    for (const vp of viewportsStr.split(',')) {
      const m = vp.trim().match(/^(\d+)[xX](\d+)$/);
      if (m) viewports.push({ width: parseInt(m[1]), height: parseInt(m[2]) });
    }
    if (viewports.length === 0) return JSON.stringify({ ok: false, error: 'Nenhum viewport válido encontrado. Use o formato "WIDTHxHEIGHT".' });

    // Garantir diretório de saída
    if (!fs.existsSync(outputDir)) {
      try { fs.mkdirSync(outputDir, { recursive: true }); } catch (e) {
        return JSON.stringify({ ok: false, error: `Não foi possível criar o diretório de saída: ${e.message}` });
      }
    }

    // Extrair domínio para nomear arquivos
    let domain = 'page';
    try { domain = new URL(url).hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9_-]/g, '_'); } catch {}

    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      return JSON.stringify({
        ok: false,
        error: 'Puppeteer não encontrado. Instale com: npm install puppeteer',
        hint: 'Execute "npm install puppeteer" na pasta do task-scheduler e tente novamente.'
      });
    }

    let browser;
    const results = [];
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });
      const page = await browser.newPage();

      for (const vp of viewports) {
        const filename = `${domain}_${vp.width}x${vp.height}.${fmt}`;
        const outputPath = path.join(outputDir, filename);
        try {
          await page.setViewport({ width: vp.width, height: vp.height });
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          await page.screenshot({ path: outputPath, fullPage: false, type: fmt });
          let sizeKb = null;
          try { sizeKb = +(fs.statSync(outputPath).size / 1024).toFixed(1); } catch {}
          results.push({ viewport: `${vp.width}x${vp.height}`, file: outputPath, size_kb: sizeKb, ok: true });
        } catch (vpErr) {
          results.push({ viewport: `${vp.width}x${vp.height}`, file: outputPath, ok: false, error: vpErr.message });
        }
      }
    } finally {
      if (browser) await browser.close().catch(() => {});
    }

    const successful = results.filter(r => r.ok).length;
    return JSON.stringify({
      ok: true,
      url,
      output_dir: outputDir,
      format: fmt,
      summary: `${successful}/${results.length} screenshots gerados`,
      screenshots: results
    }, null, 2);
  },

  async payment_link(args, ctx) {
    const { amount, description, method = 'pix', customer_name, customer_email, expires_hours = 24 } = args;
    if (!amount || amount <= 0) return JSON.stringify({ ok: false, error: 'Parâmetro "amount" deve ser um número positivo' });
    if (!description) return JSON.stringify({ ok: false, error: 'Parâmetro "description" é obrigatório' });

    // Helper: buscar credencial do vault
    const getCredential = async (name) => {
      try {
        const vault = require(path.join(__dirname, '..', 'credential-vault.js'));
        const envVars = vault.getEnvVars();
        return envVars[name] || null;
      } catch { return null; }
    };

    if (method === 'pix') {
      // ── PIX EMV ──
      const pixKey = await getCredential('PIX_KEY');
      if (!pixKey) return JSON.stringify({ ok: false, error: 'Credencial PIX_KEY não encontrada no vault. Cadastre com: vault_manage action=set name=PIX_KEY value=<sua_chave_pix>' });

      const merchantName = (await getCredential('PIX_MERCHANT_NAME') || 'RIWER LABS').toUpperCase().substring(0, 25);
      const merchantCity = (await getCredential('PIX_MERCHANT_CITY') || 'FLORIANOPOLIS').toUpperCase().substring(0, 15);

      const amountStr = amount.toFixed(2);
      const txid = Date.now().toString(16).toUpperCase().substring(0, 25);

      // Helper: formatar campo EMV TLV
      const emv = (id, value) => {
        const len = String(value.length).padStart(2, '0');
        return `${id}${len}${value}`;
      };

      // ID 26: Merchant Account Info
      const gui = emv('00', 'br.gov.bcb.pix') + emv('01', pixKey);
      const id26 = emv('26', gui);

      // ID 62: Additional Data
      const id62 = emv('62', emv('05', txid));

      // Montar payload sem CRC
      const payloadNoCrc =
        emv('00', '01') +           // Payload format indicator
        id26 +                       // Merchant account info
        emv('52', '0000') +          // MCC
        emv('53', '986') +           // Transaction currency (BRL)
        emv('54', amountStr) +       // Transaction amount
        emv('58', 'BR') +            // Country code
        emv('59', merchantName) +    // Merchant name
        emv('60', merchantCity) +    // Merchant city
        id62 +                       // Additional data
        '6304';                      // CRC placeholder (sem valor ainda)

      // Calcular CRC16 CCITT-FALSE (poly=0x1021, init=0xFFFF)
      const calcCrc16 = (str) => {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
          crc ^= str.charCodeAt(i) << 8;
          for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            else crc = (crc << 1) & 0xFFFF;
          }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
      };

      const crc = calcCrc16(payloadNoCrc);
      const pixPayload = payloadNoCrc + crc;

      // Tentar gerar QR Code PNG (opcional — não falha se não tiver o módulo)
      let qrCodePath = null;
      try {
        const qrcode = require('qrcode');
        const os = require('os');
        const qrDir = path.join(os.homedir(), '.claude', 'temp');
        if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
        qrCodePath = path.join(qrDir, `pix_qr_${txid}.png`);
        await qrcode.toFile(qrCodePath, pixPayload, { errorCorrectionLevel: 'M', width: 400 });
      } catch {}

      return JSON.stringify({
        ok: true,
        method: 'pix',
        amount: amountStr,
        description,
        txid,
        merchant_name: merchantName,
        merchant_city: merchantCity,
        pix_payload: pixPayload,
        ...(qrCodePath ? { qr_code_file: qrCodePath } : { qr_code_note: 'Instale o módulo "qrcode" (npm install qrcode) para gerar o PNG do QR Code automaticamente.' }),
        instructions: 'Copie o "pix_payload" e cole no app do banco (opção "Pix copia e cola") para efetuar o pagamento.'
      }, null, 2);

    } else if (method === 'stripe') {
      // ── STRIPE ──
      const stripeKey = await getCredential('STRIPE_SECRET_KEY');
      if (!stripeKey) return JSON.stringify({ ok: false, error: 'Credencial STRIPE_SECRET_KEY não encontrada no vault. Cadastre com: vault_manage action=set name=STRIPE_SECRET_KEY value=<sua_chave>' });

      const amountCents = Math.round(amount * 100);

      // Montar body form-urlencoded
      const bodyParams = [
        `line_items[0][price_data][currency]=brl`,
        `line_items[0][price_data][product_data][name]=${encodeURIComponent(description)}`,
        `line_items[0][price_data][unit_amount]=${amountCents}`,
        `line_items[0][quantity]=1`
      ];
      if (customer_email) bodyParams.push(`customer_email=${encodeURIComponent(customer_email)}`);
      const bodyStr = bodyParams.join('&');
      const bodyBuf = Buffer.from(bodyStr, 'utf8');

      // Auth Basic: STRIPE_SECRET_KEY como username, senha vazia
      const authB64 = Buffer.from(`${stripeKey}:`).toString('base64');

      const stripeResult = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.stripe.com',
          port: 443,
          path: '/v1/payment_links',
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authB64}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': bodyBuf.length
          }
        };
        const req = https.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode, body: data }); }
          });
        });
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout Stripe (15s)')); });
        req.on('error', reject);
        req.write(bodyBuf);
        req.end();
      });

      if (stripeResult.status !== 200 || !stripeResult.body?.url) {
        const errMsg = stripeResult.body?.error?.message || JSON.stringify(stripeResult.body).substring(0, 300);
        return JSON.stringify({ ok: false, error: `Stripe retornou status ${stripeResult.status}: ${errMsg}` });
      }

      return JSON.stringify({
        ok: true,
        method: 'stripe',
        amount: amount.toFixed(2),
        description,
        payment_link: stripeResult.body.url,
        payment_link_id: stripeResult.body.id,
        ...(customer_email ? { customer_email } : {}),
        ...(customer_name ? { customer_name } : {})
      }, null, 2);

    } else {
      return JSON.stringify({ ok: false, error: `Método "${method}" inválido. Use "pix" ou "stripe".` });
    }
  },
};

module.exports = { definitions, handlers };
