/**
 * Tools: SECURITY — password_generator, hash_generator, security_scan, email_deliverability
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'password_generator',
      description: 'Gera senhas seguras customizáveis. Controla tamanho, uso de maiúsculas, minúsculas, números, símbolos. Mostra entropia.',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Tamanho da senha. Padrão: 16' },
          count: { type: 'number', description: 'Quantidade de senhas a gerar. Padrão: 1' },
          uppercase: { type: 'boolean', description: 'Incluir maiúsculas. Padrão: true' },
          lowercase: { type: 'boolean', description: 'Incluir minúsculas. Padrão: true' },
          numbers: { type: 'boolean', description: 'Incluir números. Padrão: true' },
          symbols: { type: 'boolean', description: 'Incluir símbolos. Padrão: true' },
          exclude: { type: 'string', description: 'Caracteres a excluir. Ex: "0Ol1I"' },
          type: { type: 'string', enum: ['random', 'passphrase', 'pin', 'hex'], description: 'Tipo: random (padrão), passphrase (palavras), pin (só números), hex (hexadecimal)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'security_scan',
      description: 'Scan básico de segurança de um site. Verifica headers HTTP de segurança (HSTS, CSP, X-Frame-Options, etc.), cookies, informações expostas e calcula um score de 0-100 com grade A-F.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site a escanear. Ex: https://www.exemplo.com.br' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'email_deliverability',
      description: 'Testa a deliverability de email de um domínio verificando SPF, DMARC, DKIM, MX records e blacklists (Spamhaus, SpamCop, Barracuda). Retorna score de 0-100 e recomendações.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio a verificar. Ex: exemplo.com.br' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'hash_generator',
      description: 'Gera hashes criptográficos: MD5, SHA1, SHA256, SHA512, bcrypt, HMAC. Aceita texto ou arquivo.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Texto para gerar hash ou caminho de arquivo' },
          algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512', 'bcrypt', 'all'], description: 'Algoritmo. Padrão: sha256. Use "all" para todos de uma vez' },
          hmac_key: { type: 'string', description: 'Chave para HMAC (se quiser HMAC em vez de hash simples)' },
          compare: { type: 'string', description: 'Hash para comparar (verifica se o input gera o mesmo hash)' },
          rounds: { type: 'number', description: 'Rounds para bcrypt. Padrão: 10' }
        },
        required: ['input']
      }
    }
  }
];

const handlers = {
  async password_generator(args, ctx) {
    try {
      const { length = 16, count = 1, uppercase = true, lowercase = true, numbers = true, symbols = true, exclude = '', type = 'random' } = args;
      const crypto = require('crypto');

      if (type === 'pin') {
        const pins = [];
        for (let i = 0; i < count; i++) {
          let pin = '';
          for (let j = 0; j < length; j++) pin += crypto.randomInt(0, 10).toString();
          pins.push(pin);
        }
        return `PIN (${length} dígitos):\n${pins.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      }

      if (type === 'hex') {
        const hexes = [];
        for (let i = 0; i < count; i++) hexes.push(crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length));
        return `Hex (${length} chars):\n${hexes.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
      }

      if (type === 'passphrase') {
        const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu', 'atlas', 'beacon', 'cipher', 'drift', 'ember', 'falcon', 'glacier', 'harbor', 'ivory', 'jasper', 'knight', 'lantern', 'marble', 'nebula', 'oracle', 'phantom', 'quartz', 'raven', 'summit', 'thunder', 'vortex', 'willow', 'zenith', 'azure'];
        const phrases = [];
        const wordCount = length >= 20 ? 5 : length >= 12 ? 4 : 3;
        for (let i = 0; i < count; i++) {
          const parts = [];
          for (let j = 0; j < wordCount; j++) {
            let w = words[crypto.randomInt(0, words.length)];
            if (uppercase && j === 0) w = w.charAt(0).toUpperCase() + w.slice(1);
            parts.push(w);
          }
          if (numbers) parts.push(crypto.randomInt(10, 99).toString());
          phrases.push(parts.join('-'));
        }
        return `Passphrase:\n${phrases.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      }

      // random
      let charset = '';
      if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (numbers) charset += '0123456789';
      if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (exclude) charset = charset.split('').filter(c => !exclude.includes(c)).join('');
      if (!charset) return 'Nenhum conjunto de caracteres selecionado';

      const passwords = [];
      for (let i = 0; i < Math.min(count, 20); i++) {
        let pwd = '';
        for (let j = 0; j < length; j++) pwd += charset[crypto.randomInt(0, charset.length)];
        passwords.push(pwd);
      }

      const entropy = Math.floor(length * Math.log2(charset.length));
      const strength = entropy >= 128 ? 'Muito forte' : entropy >= 80 ? 'Forte' : entropy >= 60 ? 'Razoável' : 'Fraca';

      return `Senha${count > 1 ? 's' : ''} (${length} chars, ${entropy} bits entropia — ${strength}):\n${passwords.map((p, i) => `${count > 1 ? (i + 1) + '. ' : ''}${p}`).join('\n')}`;
    } catch (e) {
      return `Erro password_generator: ${e.message}`;
    }
  },

  async security_scan(args, ctx) {
    try {
      const targetUrl = args.url || '';
      if (!targetUrl) return JSON.stringify({ ok: false, error: 'Parâmetro "url" é obrigatório' });

      let urlObj;
      try { urlObj = new URL(targetUrl); } catch (e) { return JSON.stringify({ ok: false, error: `URL inválida: ${targetUrl}` }); }

      const https = require('https');
      const http = require('http');

      // Faz HEAD primeiro, fallback para GET
      const fetchHeaders = (method) => new Promise((resolve, reject) => {
        const lib = urlObj.protocol === 'https:' ? https : http;
        const opts = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: (urlObj.pathname || '/') + urlObj.search,
          method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SecurityScanner/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          rejectUnauthorized: false
        };
        const req = lib.request(opts, res => {
          res.resume(); // descarta body
          resolve({ status: res.statusCode, headers: res.headers });
        });
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout 15s')); });
        req.on('error', reject);
        req.end();
      });

      let responseHeaders, responseStatus;
      try {
        const r = await fetchHeaders('HEAD');
        responseHeaders = r.headers;
        responseStatus = r.status;
        // Se HEAD retornou redirect, tenta seguir
        if (responseStatus >= 300 && responseStatus < 400 && responseHeaders.location) {
          try {
            const redirectUrl = new URL(responseHeaders.location.startsWith('http') ? responseHeaders.location : `${urlObj.protocol}//${urlObj.host}${responseHeaders.location}`);
            urlObj = redirectUrl;
            const r2 = await fetchHeaders('HEAD');
            responseHeaders = r2.headers;
            responseStatus = r2.status;
          } catch (_) {}
        }
      } catch (_) {
        // Fallback para GET se HEAD falhar
        try {
          const r = await fetchHeaders('GET');
          responseHeaders = r.headers;
          responseStatus = r.status;
        } catch (e) {
          return JSON.stringify({ ok: false, error: `Falha ao conectar: ${e.message}` });
        }
      }

      const h = responseHeaders;
      const issues = [];
      const warnings = [];
      const passed = [];
      let score = 0;

      // 1. HSTS
      if (h['strict-transport-security']) {
        const maxAgeMatch = h['strict-transport-security'].match(/max-age=(\d+)/i);
        const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
        if (maxAge >= 31536000) {
          passed.push('HSTS presente com max-age >= 1 ano');
          score += 10;
        } else {
          warnings.push(`HSTS presente mas max-age insuficiente (${maxAge}s, recomendado: 31536000)`);
          score += 5;
        }
      } else {
        if (urlObj.protocol === 'https:') {
          issues.push('HSTS ausente (Strict-Transport-Security) — vulnerável a downgrade attacks');
        } else {
          warnings.push('Site não usa HTTPS — HSTS não aplicável, mas HTTPS é obrigatório');
        }
      }

      // 2. CSP
      if (h['content-security-policy']) {
        passed.push('Content-Security-Policy presente');
        score += 10;
      } else {
        issues.push('Content-Security-Policy ausente — vulnerável a XSS');
      }

      // 3. X-Content-Type-Options
      if (h['x-content-type-options'] && h['x-content-type-options'].toLowerCase() === 'nosniff') {
        passed.push('X-Content-Type-Options: nosniff');
        score += 10;
      } else if (h['x-content-type-options']) {
        warnings.push(`X-Content-Type-Options presente mas valor incorreto: "${h['x-content-type-options']}" (esperado: nosniff)`);
        score += 5;
      } else {
        issues.push('X-Content-Type-Options ausente — vulnerável a MIME sniffing');
      }

      // 4. X-Frame-Options
      if (h['x-frame-options']) {
        const val = h['x-frame-options'].toUpperCase();
        if (val === 'DENY' || val === 'SAMEORIGIN') {
          passed.push(`X-Frame-Options: ${val}`);
          score += 10;
        } else {
          warnings.push(`X-Frame-Options presente mas valor incomum: "${h['x-frame-options']}"`);
          score += 5;
        }
      } else {
        issues.push('X-Frame-Options ausente — vulnerável a clickjacking');
      }

      // 5. X-XSS-Protection
      if (h['x-xss-protection']) {
        passed.push('X-XSS-Protection presente');
        score += 10;
      } else {
        warnings.push('X-XSS-Protection ausente (deprecated em navegadores modernos, mas recomendado para compatibilidade)');
      }

      // 6. Referrer-Policy
      if (h['referrer-policy']) {
        passed.push(`Referrer-Policy: ${h['referrer-policy']}`);
        score += 10;
      } else {
        warnings.push('Referrer-Policy ausente — pode vazar URLs para terceiros');
      }

      // 7. Permissions-Policy
      if (h['permissions-policy']) {
        passed.push('Permissions-Policy presente');
        score += 10;
      } else {
        warnings.push('Permissions-Policy ausente — sem controle sobre recursos do navegador');
      }

      // 8. Server header (informação exposta)
      if (h['server']) {
        warnings.push(`Server header expõe informações: "${h['server']}" — remova ou ofusque`);
      } else {
        passed.push('Server header não exposto');
        score += 10;
      }

      // 9. X-Powered-By (informação exposta)
      if (h['x-powered-by']) {
        warnings.push(`X-Powered-By expõe tecnologia: "${h['x-powered-by']}" — remova este header`);
      } else {
        passed.push('X-Powered-By não exposto');
        score += 10;
      }

      // 10. Set-Cookie flags
      const cookies = Array.isArray(h['set-cookie']) ? h['set-cookie'] : (h['set-cookie'] ? [h['set-cookie']] : []);
      if (cookies.length > 0) {
        const cookieIssues = [];
        cookies.forEach((cookie, i) => {
          const cLower = cookie.toLowerCase();
          if (!cLower.includes('secure')) cookieIssues.push(`Cookie ${i + 1}: falta flag Secure`);
          if (!cLower.includes('httponly')) cookieIssues.push(`Cookie ${i + 1}: falta flag HttpOnly`);
          if (!cLower.includes('samesite')) cookieIssues.push(`Cookie ${i + 1}: falta atributo SameSite`);
        });
        if (cookieIssues.length === 0) {
          passed.push(`${cookies.length} cookie(s) com flags de segurança corretas`);
          score += 10;
        } else {
          issues.push(...cookieIssues);
        }
      } else {
        score += 10; // sem cookies = sem problema de cookie
      }

      score = Math.min(100, score);
      const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';

      return JSON.stringify({
        ok: true,
        url: targetUrl,
        http_status: responseStatus,
        score,
        grade,
        summary: { issues: issues.length, warnings: warnings.length, passed: passed.length },
        issues,
        warnings,
        passed,
        headers_found: Object.keys(h).sort()
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro security_scan: ${e.message}` });
    }
  },

  async email_deliverability(args, ctx) {
    try {
      const domain = (args.domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      if (!domain) return JSON.stringify({ ok: false, error: 'Parâmetro "domain" é obrigatório' });

      const dns = require('dns').promises;
      const results = {};
      let score = 0;
      const issues = [];
      const recommendations = [];

      // 1. SPF
      try {
        const txtRecords = await dns.resolveTxt(domain);
        const spfRecord = txtRecords.find(r => r.join('').startsWith('v=spf1'));
        if (spfRecord) {
          const spfStr = spfRecord.join('');
          const isStrict = spfStr.includes('-all');
          const isSoftFail = spfStr.includes('~all');
          score += 25;
          results.spf = {
            found: true,
            record: spfStr,
            policy: isStrict ? 'strict (-all)' : isSoftFail ? 'soft fail (~all)' : 'neutral/pass (+all)',
            status: isStrict ? 'PASS' : isSoftFail ? 'WARN' : 'FAIL'
          };
          if (!isStrict && !isSoftFail) {
            issues.push('SPF sem política de rejeição (-all ou ~all)');
            recommendations.push('Adicione "-all" ao final do SPF para rejeitar emails não autorizados');
          } else if (isSoftFail && !isStrict) {
            recommendations.push('Considere mudar SPF de "~all" (soft fail) para "-all" (strict) após validar todos os senders');
          }
        } else {
          results.spf = { found: false, record: null, status: 'FAIL' };
          issues.push('SPF não encontrado');
          recommendations.push(`Adicione um registro TXT no DNS de ${domain}: "v=spf1 include:_spf.google.com -all" (ajuste conforme seu provedor)`);
        }
      } catch (e) {
        results.spf = { found: false, record: null, status: 'ERROR', error: e.message };
        issues.push(`Erro ao verificar SPF: ${e.message}`);
      }

      // 2. DMARC
      try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
        const dmarcRecord = dmarcRecords.find(r => r.join('').startsWith('v=DMARC1'));
        if (dmarcRecord) {
          const dmarcStr = dmarcRecord.join('');
          const policyMatch = dmarcStr.match(/p=(none|quarantine|reject)/i);
          const policy = policyMatch ? policyMatch[1].toLowerCase() : 'none';
          score += 25;
          results.dmarc = {
            found: true,
            record: dmarcStr,
            policy,
            status: policy === 'reject' ? 'PASS' : policy === 'quarantine' ? 'WARN' : 'WARN'
          };
          if (policy === 'none') {
            recommendations.push('DMARC com p=none não oferece proteção. Mude para p=quarantine ou p=reject após monitorar relatórios');
          } else if (policy === 'quarantine') {
            recommendations.push('Considere mover DMARC para p=reject para proteção máxima');
          }
        } else {
          results.dmarc = { found: false, record: null, status: 'FAIL' };
          issues.push('DMARC não encontrado');
          recommendations.push(`Adicione: _dmarc.${domain} TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"`);
        }
      } catch (e) {
        results.dmarc = { found: false, record: null, status: 'FAIL', error: e.message };
        issues.push('DMARC não encontrado');
        recommendations.push(`Adicione: _dmarc.${domain} TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"`);
      }

      // 3. DKIM — tenta múltiplos selectors
      const dkimSelectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'mail', 'dkim', 'smtp'];
      let dkimFound = false;
      let dkimRecord = null;
      let dkimSelector = null;
      for (const selector of dkimSelectors) {
        try {
          const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
          const dkimRec = records.find(r => r.join('').includes('v=DKIM1') || r.join('').includes('k=rsa') || r.join('').includes('p='));
          if (dkimRec) {
            dkimFound = true;
            dkimRecord = dkimRec.join('').substring(0, 200);
            dkimSelector = selector;
            break;
          }
        } catch (_) { /* selector não existe */ }
      }
      if (dkimFound) {
        score += 25;
        results.dkim = { found: true, selector: dkimSelector, record_preview: dkimRecord, status: 'PASS' };
      } else {
        results.dkim = { found: false, selector: null, record_preview: null, status: 'FAIL', selectors_tried: dkimSelectors };
        issues.push('DKIM não encontrado (testados selectors: default, google, selector1, selector2, k1, mail, dkim, smtp)');
        recommendations.push('Configure DKIM no seu provedor de email e adicione o registro TXT no DNS');
      }

      // 4. MX Records
      try {
        const mxRecords = await dns.resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
          score += 15;
          const sorted = mxRecords.sort((a, b) => a.priority - b.priority);
          results.mx = {
            found: true,
            records: sorted.map(r => ({ priority: r.priority, exchange: r.exchange })),
            status: 'PASS'
          };
        } else {
          results.mx = { found: false, records: [], status: 'FAIL' };
          issues.push('Nenhum registro MX encontrado');
          recommendations.push(`Configure registros MX para ${domain} no seu provedor de DNS`);
        }
      } catch (e) {
        results.mx = { found: false, records: [], status: 'FAIL', error: e.message };
        issues.push(`Erro ao verificar MX: ${e.message}`);
      }

      // 5. Blacklist check
      const blacklists = [
        { name: 'Spamhaus', host: 'zen.spamhaus.org' },
        { name: 'SpamCop', host: 'bl.spamcop.net' },
        { name: 'Barracuda', host: 'b.barracudacentral.org' }
      ];

      const blacklistResults = [];
      let listedCount = 0;

      // Resolve o IP do servidor de email (primeiro MX)
      let ipToCheck = null;
      if (results.mx && results.mx.records && results.mx.records.length > 0) {
        try {
          const mxHost = results.mx.records[0].exchange;
          const addresses = await dns.resolve4(mxHost);
          if (addresses && addresses.length > 0) ipToCheck = addresses[0];
        } catch (_) {}
      }
      // Fallback: resolve IP do próprio domínio
      if (!ipToCheck) {
        try {
          const addresses = await dns.resolve4(domain);
          if (addresses && addresses.length > 0) ipToCheck = addresses[0];
        } catch (_) {}
      }

      if (ipToCheck) {
        const reversed = ipToCheck.split('.').reverse().join('.');
        for (const bl of blacklists) {
          try {
            await dns.resolve4(`${reversed}.${bl.host}`);
            // Se resolver, está listado
            blacklistResults.push({ blacklist: bl.name, listed: true, ip: ipToCheck });
            listedCount++;
            issues.push(`IP ${ipToCheck} está listado na blacklist ${bl.name} (${bl.host})`);
          } catch (_) {
            // NXDOMAIN = não listado
            blacklistResults.push({ blacklist: bl.name, listed: false, ip: ipToCheck });
          }
        }
        if (listedCount === 0) {
          score += 10;
          results.blacklist = { ip_checked: ipToCheck, results: blacklistResults, status: 'PASS' };
        } else {
          results.blacklist = { ip_checked: ipToCheck, results: blacklistResults, status: 'FAIL' };
          recommendations.push(`Remova o IP ${ipToCheck} das blacklists: ${blacklistResults.filter(b => b.listed).map(b => b.blacklist).join(', ')}`);
        }
      } else {
        results.blacklist = { ip_checked: null, results: [], status: 'SKIP', reason: 'Não foi possível resolver o IP do servidor de email' };
        score += 10; // neutro se não conseguiu verificar
      }

      score = Math.min(100, score);
      const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';

      return JSON.stringify({
        ok: true,
        domain,
        score,
        grade,
        summary: `SPF: ${results.spf?.status || 'N/A'} | DMARC: ${results.dmarc?.status || 'N/A'} | DKIM: ${results.dkim?.status || 'N/A'} | MX: ${results.mx?.status || 'N/A'} | Blacklist: ${results.blacklist?.status || 'N/A'}`,
        issues,
        recommendations,
        details: results
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro email_deliverability: ${e.message}` });
    }
  },

  async hash_generator(args, ctx) {
    try {
      const { input, algorithm = 'sha256', hmac_key, compare, rounds = 10 } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';
      const crypto = require('crypto');

      let text = input;
      // Se for arquivo, ler como buffer
      let isFile = false;
      if (input.length < 500) {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          text = fs.readFileSync(filePath);
          isFile = true;
        }
      }

      function hashIt(algo, data) {
        if (hmac_key) return crypto.createHmac(algo, hmac_key).update(data).digest('hex');
        return crypto.createHash(algo).update(data).digest('hex');
      }

      if (algorithm === 'bcrypt') {
        try {
          // bcrypt via crypto scrypt como alternativa (bcrypt nativo requer dependência)
          const salt = crypto.randomBytes(16).toString('hex');
          const derived = crypto.scryptSync(typeof text === 'string' ? text : text.toString(), salt, 64).toString('hex');
          if (compare) {
            const [compSalt, compHash] = compare.includes(':') ? compare.split(':') : ['', compare];
            if (compSalt) {
              const testHash = crypto.scryptSync(typeof text === 'string' ? text : text.toString(), compSalt, 64).toString('hex');
              return testHash === compHash ? '✓ Hash corresponde!' : '✗ Hash NÃO corresponde';
            }
            return '✗ Para comparar scrypt, forneça no formato salt:hash';
          }
          return `Scrypt (equivalente bcrypt, rounds=${rounds}):\n${salt}:${derived}\n\nSalt: ${salt}\nHash: ${derived}`;
        } catch (e) {
          return `Erro bcrypt/scrypt: ${e.message}`;
        }
      }

      if (algorithm === 'all') {
        const algos = ['md5', 'sha1', 'sha256', 'sha512'];
        const prefix = hmac_key ? 'HMAC-' : '';
        let output = `Hashes${isFile ? ` do arquivo "${path.basename(input)}"` : ''}${hmac_key ? ' (HMAC)' : ''}:\n`;
        algos.forEach(a => {
          output += `\n${prefix}${a.toUpperCase()}: ${hashIt(a, typeof text === 'string' ? text : text)}`;
        });
        return output;
      }

      const hash = hashIt(algorithm, text);

      if (compare) {
        const match = hash.toLowerCase() === compare.toLowerCase();
        return match ? `✓ Hash ${algorithm.toUpperCase()} corresponde!` : `✗ Hash ${algorithm.toUpperCase()} NÃO corresponde\nEsperado: ${compare}\nObtido:   ${hash}`;
      }

      return `${hmac_key ? 'HMAC-' : ''}${algorithm.toUpperCase()}${isFile ? ` (${path.basename(input)})` : ''}:\n${hash}`;
    } catch (e) {
      return `Erro hash_generator: ${e.message}`;
    }
  }
};

module.exports = { definitions, handlers };
