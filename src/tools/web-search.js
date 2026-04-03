/**
 * WEB SEARCH — Módulo de busca web sem APIs pagas
 *
 * Usa DuckDuckGo HTML + Brave Search como motores de busca.
 * Não requer API keys — scraping direto de resultados server-rendered.
 */

const https = require('https');

// ── Helper: fetch HTTPS com redirects ──────────────────────────────────────
function fetchHttps(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Muitos redirects'));
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive'
      },
      rejectUnauthorized: false
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : `${urlObj.protocol}//${urlObj.host}${loc}`;
        return resolve(fetchHttps(next, redirects + 1));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        html: Buffer.concat(chunks).toString('utf8'),
        status: res.statusCode
      }));
    });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// ── Helper: decodificar HTML entities ──────────────────────────────────────
function htmlDecode(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE SEARCH — busca web via DuckDuckGo + Brave
// ════════════════════════════════════════════════════════════════════════════
async function googleSearch(toolArgs) {
  const query = toolArgs.query;
  if (!query) return 'Parâmetro "query" é obrigatório';
  const numResults = Math.min(toolArgs.num_results || 10, 30);
  const encodedQuery = encodeURIComponent(query);
  const results = [];

  // ═══ MOTOR 1: DuckDuckGo HTML (sem JS, server-rendered) ═══
  try {
    const ddg = await fetchHttps(`https://html.duckduckgo.com/html/?q=${encodedQuery}`);
    if (ddg.status === 200 && ddg.html.includes('result__a')) {
      const blocks = ddg.html.split(/class="result\s/i);
      for (let i = 1; i < blocks.length && results.length < numResults; i++) {
        const block = blocks[i].substring(0, 3000);

        // Link e titulo
        const linkM = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!linkM) continue;

        // Ignorar anuncios (DDG redireciona ads via y.js)
        if (linkM[1].includes('/y.js?') || linkM[1].includes('ad_provider')) continue;

        // Extrair URL real (DDG usa redirect ?uddg=)
        let url = linkM[1];
        const realUrl = url.match(/uddg=([^&]+)/);
        if (realUrl) url = decodeURIComponent(realUrl[1]);
        if (!url.startsWith('http')) continue;

        const title = htmlDecode(linkM[2]);
        if (!title || title.length < 3) continue;

        // Snippet
        const snippetM = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span|td|div)/i);
        const snippet = snippetM ? htmlDecode(snippetM[1]).substring(0, 300) : '';

        // Evitar duplicatas
        if (results.find(r => r.url === url)) continue;

        results.push({ position: results.length + 1, title, url, snippet });
      }
    }
  } catch (_) {
    // DDG falhou, tentar Brave
  }

  // ═══ MOTOR 2: Brave Search (fallback ou complemento) ═══
  if (results.length < numResults) {
    try {
      const brave = await fetchHttps(`https://search.brave.com/search?q=${encodedQuery}&source=web`);
      if (brave.status === 200) {
        const posDivs = brave.html.split(/data-pos="/i);
        for (let i = 1; i < posDivs.length && results.length < numResults; i++) {
          const block = posDivs[i].substring(0, 5000);

          // URL — ignorar links do Brave
          const urlM = block.match(/href="(https?:\/\/[^"]+)"/i);
          if (!urlM) continue;
          const url = urlM[1].replace(/&amp;/g, '&');
          if (url.includes('brave.com') || url.includes('search.brave')) continue;

          // Title
          const titleM = block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/(?:span|a|div)/i);
          const title = titleM ? htmlDecode(titleM[1]) : '';

          // Description
          const descM = block.match(/class="[^"]*snippet-description[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)/i)
            || block.match(/class="[^"]*generic-snippet[^"]*"[^>]*>([\s\S]*?)<\/div/i);
          const snippet = descM ? htmlDecode(descM[1]).substring(0, 300) : '';

          if (!title && !snippet) continue;
          if (results.find(r => r.url === url)) continue;

          results.push({
            position: results.length + 1,
            title: title || (() => { try { return new URL(url).hostname; } catch(_) { return url; } })(),
            url,
            snippet
          });
        }
      }
    } catch (_) {
      // Brave falhou
    }
  }

  if (results.length === 0) {
    return `Nenhum resultado encontrado para "${query}". Tente termos diferentes ou mais específicos.`;
  }

  return JSON.stringify({
    query,
    source: 'web_search',
    total_results: results.length,
    results: results.slice(0, numResults)
  }, null, 2);
}

// ════════════════════════════════════════════════════════════════════════════
// MAPS SEARCH — busca local via DuckDuckGo + Brave + scrape de diretórios
// ════════════════════════════════════════════════════════════════════════════
async function mapsSearch(toolArgs) {
  const query = toolArgs.query;
  const location = toolArgs.location;
  if (!query) return 'Parâmetro "query" é obrigatório';
  if (!location) return 'Parâmetro "location" é obrigatório';
  const numResults = Math.min(toolArgs.num_results || 20, 40);
  const businesses = [];

  // ═══ ESTRATEGIA 1: DuckDuckGo — busca local ═══
  try {
    const ddgQ = encodeURIComponent(`${query} ${location} telefone endereço contato`);
    const ddg = await fetchHttps(`https://html.duckduckgo.com/html/?q=${ddgQ}`);
    if (ddg.status === 200) {
      const blocks = ddg.html.split(/class="result\s/i);
      for (let i = 1; i < blocks.length && businesses.length < numResults; i++) {
        const block = blocks[i].substring(0, 3000);

        const linkM = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!linkM) continue;
        if (linkM[1].includes('/y.js?') || linkM[1].includes('ad_provider')) continue;

        let url = linkM[1];
        const realUrl = url.match(/uddg=([^&]+)/);
        if (realUrl) url = decodeURIComponent(realUrl[1]);
        if (!url.startsWith('http')) continue;

        const title = htmlDecode(linkM[2]);
        const snippetM = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span|td|div)/i);
        const snippet = snippetM ? htmlDecode(snippetM[1]) : '';

        // Extrair telefone do snippet ou titulo
        const phoneMatch = snippet.match(/\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/)
          || snippet.match(/\d{2}\s\d{4,5}[-\s]?\d{4}/)
          || title.match(/\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/);
        const phone = phoneMatch ? phoneMatch[0] : '';

        // Extrair endereço do snippet
        const addrMatch = snippet.match(/((?:R\.|Rua|Av\.|Avenida|Rod\.|Al\.|Alameda|Trav\.|Praça|Estr\.)[^,.]{5,80}(?:,\s*\d{1,5})?(?:\s*[-–]\s*[^,.]{3,40})?)/i);
        const address = addrMatch ? addrMatch[1].trim() : '';

        if (title && !businesses.find(b => b.name === title)) {
          businesses.push({
            name: title,
            address,
            phone,
            rating: '',
            reviews: '',
            category: query,
            website: url,
            _snippet: snippet.substring(0, 200)
          });
        }
      }
    }
  } catch (_) {}

  // ═══ ESTRATEGIA 2: Brave Search — busca local ═══
  if (businesses.length < numResults) {
    try {
      const braveQ = encodeURIComponent(`${query} ${location}`);
      const brave = await fetchHttps(`https://search.brave.com/search?q=${braveQ}&source=web`);
      if (brave.status === 200) {
        const posDivs = brave.html.split(/data-pos="/i);
        for (let i = 1; i < posDivs.length && businesses.length < numResults; i++) {
          const block = posDivs[i].substring(0, 5000);

          const urlM = block.match(/href="(https?:\/\/[^"]+)"/i);
          if (!urlM) continue;
          const url = urlM[1].replace(/&amp;/g, '&');
          if (url.includes('brave.com') || url.includes('search.brave')) continue;

          const titleM = block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/(?:span|a|div)/i);
          const title = titleM ? htmlDecode(titleM[1]) : '';

          const descM = block.match(/class="[^"]*snippet-description[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)/i)
            || block.match(/class="[^"]*generic-snippet[^"]*"[^>]*>([\s\S]*?)<\/div/i);
          const desc = descM ? htmlDecode(descM[1]) : '';

          if (!title) continue;
          if (businesses.find(b => b.name === title)) continue;

          const phoneMatch = desc.match(/\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/)
            || desc.match(/\d{2}\s\d{4,5}[-\s]?\d{4}/);
          const addrMatch = desc.match(/((?:R\.|Rua|Av\.|Avenida|Rod\.|Al\.|Alameda|Trav\.|Praça|Estr\.)[^,.]{5,80}(?:,\s*\d{1,5})?)/i);

          businesses.push({
            name: title,
            address: addrMatch ? addrMatch[1].trim() : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            rating: '',
            reviews: '',
            category: query,
            website: url,
            _snippet: desc.substring(0, 200)
          });
        }
      }
    } catch (_) {}
  }

  // ═══ ESTRATEGIA 3: Scrape de diretório (doctoralia, guiatelefone, etc.) ═══
  if (businesses.length > 0 && businesses.length < numResults) {
    const directoryDomains = ['doctoralia', 'guiatelefone', 'dentistas.net', 'listadasaude', 'ident.com', 'telelistas', 'apontador'];
    const directories = businesses.filter(b =>
      b.website && directoryDomains.some(d => b.website.includes(d))
    );

    for (const dir of directories.slice(0, 2)) {
      try {
        const dirPage = await fetchHttps(dir.website);
        if (dirPage.status === 200) {
          // Extrair nomes de profissionais (Dr., Dra., Clínica, etc.)
          const nameRegex = /(?:Dr[a]?\.?\s+[A-ZÀ-Ü][a-zà-ü]+(?:\s+(?:de|do|da|dos|das)\s+)?(?:\s+[A-ZÀ-Ü][a-zà-ü]+){1,4})/g;
          const profNames = [...dirPage.html.matchAll(nameRegex)].map(m => m[0].trim());

          // Extrair telefones
          const phoneRegex = /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g;
          const allPhones = [...dirPage.html.matchAll(phoneRegex)].map(m => m[0]);

          // Extrair endereços
          const addrRegex = /((?:R\.|Rua|Av\.|Avenida|Rod\.|Al\.|Alameda|Trav\.|Praça|Estr\.)[^<]{5,120})/gi;
          const addrs = [...dirPage.html.matchAll(addrRegex)].map(m => htmlDecode(m[1]).substring(0, 100));

          // Adicionar profissionais encontrados
          const seen = new Set(businesses.map(b => b.name.toLowerCase()));
          for (let j = 0; j < profNames.length && businesses.length < numResults; j++) {
            const name = profNames[j];
            if (seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            businesses.push({
              name,
              address: addrs[j] || '',
              phone: allPhones[j] || '',
              rating: '',
              reviews: '',
              category: query,
              website: dir.website,
              _snippet: ''
            });
          }
        }
      } catch (_) {}
    }
  }

  // Deduplicar e limpar
  const seen = new Set();
  const uniqueBusinesses = [];
  for (const b of businesses) {
    const key = b.name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(key) && key.length > 1) {
      seen.add(key);
      // Remover campo interno _snippet
      const { _snippet, ...clean } = b;
      uniqueBusinesses.push(clean);
    }
  }

  if (uniqueBusinesses.length === 0) {
    return `Nenhum negócio encontrado para "${query}" em "${location}". Tente termos mais específicos ou uma localização diferente.`;
  }

  return JSON.stringify({
    query,
    location,
    total_results: uniqueBusinesses.length,
    businesses: uniqueBusinesses.slice(0, numResults)
  }, null, 2);
}

module.exports = { googleSearch, mapsSearch };
