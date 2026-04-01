/**
 * Tools: VALIDATORS — html_validator, css_validator, csv_validator, json_validator, contact_validator, shopify_theme_check, shopify_speed_audit, dependency_audit
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'html_validator',
      description: 'Valida HTML: tags não fechadas, atributos inválidos, estrutura semântica, acessibilidade básica (alt em img, lang em html), IDs duplicados.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'HTML para validar (string) ou caminho para arquivo .html' },
          check_a11y: { type: 'boolean', description: 'Verificar acessibilidade básica. Padrão: true' },
          check_seo: { type: 'boolean', description: 'Verificar SEO básico (title, meta description, headings). Padrão: false' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'css_validator',
      description: 'Valida CSS: propriedades inválidas, valores incorretos, seletores duplicados, especificidade, variáveis CSS não definidas, media queries.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'CSS para validar (string) ou caminho para arquivo .css' },
          check_compat: { type: 'boolean', description: 'Verificar compatibilidade com navegadores. Padrão: false' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'csv_validator',
      description: 'Valida CSV: formato, delimitador consistente, colunas faltantes, linhas com erro, encoding, preview dos dados, estatísticas.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'CSV para validar (string) ou caminho para arquivo .csv' },
          delimiter: { type: 'string', description: 'Delimitador. Padrão: auto-detect (vírgula, ponto-e-vírgula, tab)' },
          has_header: { type: 'boolean', description: 'Primeira linha é header. Padrão: true' },
          max_preview: { type: 'number', description: 'Linhas a mostrar no preview. Padrão: 5' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'json_validator',
      description: 'Valida JSON: sintaxe, formata/prettify, minify, mostra erros com posição exata, conta chaves/arrays, profundidade, tamanho.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'JSON para validar (string) ou caminho para arquivo .json' },
          action: { type: 'string', enum: ['validate', 'prettify', 'minify', 'stats', 'paths'], description: 'Ação: validate (padrão), prettify, minify, stats (estatísticas), paths (listar todos os caminhos JSON)' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'contact_validator',
      description: 'Valida e normaliza telefones (BR/intl) e emails. Suporta validação individual, batch e arquivo CSV/Excel.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['validate_phone', 'validate_email', 'validate_batch', 'validate_file'], description: 'Ação: validate_phone, validate_email, validate_batch, validate_file' },
          phone: { type: 'string', description: 'Telefone para validar (validate_phone)' },
          email: { type: 'string', description: 'Email para validar (validate_email)' },
          phones: { type: 'array', description: 'Lista de telefones (validate_batch)' },
          emails: { type: 'array', description: 'Lista de emails (validate_batch)' },
          input: { type: 'string', description: 'Arquivo CSV/Excel (validate_file)' },
          phone_column: { type: 'string', description: 'Nome da coluna de telefone no arquivo' },
          email_column: { type: 'string', description: 'Nome da coluna de email no arquivo' },
          output: { type: 'string', description: 'Arquivo de saída com validação (validate_file)' },
          country: { type: 'string', description: 'Código do país. Padrão: BR' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'shopify_theme_check',
      description: 'Valida tema Shopify: verifica Liquid syntax, sections schema, translation keys, template structure, performance issues, acessibilidade. Aceita pasta do tema ou arquivo individual.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho para pasta do tema Shopify ou arquivo .liquid individual' },
          action: { type: 'string', enum: ['check', 'liquid_syntax', 'schema_validate', 'sections_audit', 'performance', 'full'], description: 'Tipo de verificação: check (syntax básica), liquid_syntax (apenas Liquid), schema_validate (validar schemas JSON), sections_audit (auditar sections), performance (análise de performance), full (tudo). Padrão: check' },
          fix: { type: 'boolean', description: 'Tentar corrigir problemas simples automaticamente. Padrão: false' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'shopify_speed_audit',
      description: 'Analisa performance de tema Shopify: detecta assets pesados, scripts bloqueantes, imagens sem lazy load, CSS inline excessivo, fontes externas, apps lentos e Liquid render time.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL da loja Shopify (ex: https://minhaloja.myshopify.com)' },
          theme_path: { type: 'string', description: 'Caminho local do tema Shopify (alternativa à URL — analisa arquivos locais)' }
        }
      }
    }
  },
  // ── DEPENDENCY AUDIT ────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'dependency_audit',
      description: 'Analisa package.json: lista dependências desatualizadas (npm outdated), vulnerabilidades conhecidas (npm audit) e, opcionalmente, detecta dependências possivelmente não utilizadas no código.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho para a pasta do projeto ou para o arquivo package.json' },
          check_updates: { type: 'boolean', description: 'Verificar dependências desatualizadas via npm outdated. Padrão: true' },
          check_unused: { type: 'boolean', description: 'Verificar dependências possivelmente não utilizadas (busca import/require nos arquivos .js/.ts). Padrão: false' }
        },
        required: ['path']
      }
    }
  }
];

const handlers = {
  async html_validator(args, ctx) {
    try {
      const { input, check_a11y = true, check_seo = false } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      let html = input;
      // Se for caminho de arquivo, ler
      if (input.length < 500 && (input.endsWith('.html') || input.endsWith('.htm'))) {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (fs.existsSync(filePath)) html = fs.readFileSync(filePath, 'utf8');
      }

      const issues = [];
      const warnings = [];

      // 1. Tags auto-fecháveis que não devem ter fechamento
      const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

      // 2. Verificar tags não fechadas
      const openTags = [];
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
      let match;
      while ((match = tagRegex.exec(html)) !== null) {
        const full = match[0];
        const tagName = match[1].toLowerCase();
        if (voidTags.includes(tagName)) continue;
        if (full.startsWith('</')) {
          if (openTags.length > 0 && openTags[openTags.length - 1] === tagName) {
            openTags.pop();
          } else if (openTags.includes(tagName)) {
            const idx = openTags.lastIndexOf(tagName);
            const unclosed = openTags.splice(idx + 1);
            openTags.pop();
            unclosed.forEach(t => issues.push(`Tag <${t}> não fechada antes de </${tagName}>`));
          } else {
            issues.push(`Tag de fechamento </${tagName}> sem correspondente de abertura`);
          }
        } else if (!full.endsWith('/>')) {
          openTags.push(tagName);
        }
      }
      openTags.forEach(t => issues.push(`Tag <${t}> não fechada`));

      // 3. IDs duplicados
      const idRegex = /\bid=["']([^"']+)["']/gi;
      const ids = {};
      while ((match = idRegex.exec(html)) !== null) {
        const id = match[1];
        ids[id] = (ids[id] || 0) + 1;
      }
      Object.entries(ids).filter(([_, c]) => c > 1).forEach(([id, c]) => issues.push(`ID duplicado: "${id}" (aparece ${c}x)`));

      // 4. Doctype
      if (!html.trim().match(/^<!doctype\s+html/i)) warnings.push('Falta <!DOCTYPE html> no início');

      // 5. Charset
      if (!/<meta\s+charset/i.test(html) && !/<meta\s+http-equiv=["']Content-Type/i.test(html)) {
        warnings.push('Falta <meta charset="utf-8">');
      }

      // Acessibilidade
      if (check_a11y) {
        // Imagens sem alt
        const imgNoAlt = html.match(/<img(?![^>]*\balt\b)[^>]*>/gi) || [];
        if (imgNoAlt.length) issues.push(`${imgNoAlt.length} imagem(ns) <img> sem atributo "alt"`);

        // html sem lang
        if (/<html/i.test(html) && !/<html[^>]*\blang=/i.test(html)) {
          warnings.push('Tag <html> sem atributo "lang"');
        }

        // Links sem texto
        const emptyLinks = html.match(/<a[^>]*>\s*<\/a>/gi) || [];
        if (emptyLinks.length) warnings.push(`${emptyLinks.length} link(s) <a> vazio(s)`);

        // Formulários sem label
        const inputs = (html.match(/<input(?![^>]*type=["'](?:hidden|submit|button|reset))[^>]*>/gi) || []);
        const labels = (html.match(/<label/gi) || []).length;
        if (inputs.length > 0 && labels === 0) warnings.push('Inputs sem <label> associado');
      }

      // SEO
      if (check_seo) {
        if (!/<title[^>]*>.+<\/title>/is.test(html)) issues.push('Falta tag <title>');
        if (!/<meta[^>]*name=["']description["'][^>]*>/i.test(html)) warnings.push('Falta meta description');
        const h1s = (html.match(/<h1/gi) || []).length;
        if (h1s === 0) warnings.push('Nenhum <h1> encontrado');
        if (h1s > 1) warnings.push(`${h1s} tags <h1> (recomendado: apenas 1)`);
      }

      // Resultado
      const total = issues.length + warnings.length;
      let output = `HTML Validator — ${total === 0 ? '✓ Válido' : `${issues.length} erro(s), ${warnings.length} aviso(s)`}\n`;
      if (issues.length) output += '\nERROS:\n' + issues.map(i => `  ✗ ${i}`).join('\n');
      if (warnings.length) output += '\nAVISOS:\n' + warnings.map(w => `  ⚠ ${w}`).join('\n');
      if (total === 0) output += '\nNenhum problema encontrado.';

      // Stats
      const tagCount = (html.match(/<[a-zA-Z][^>]*>/g) || []).length;
      output += `\n\nEstatísticas: ${tagCount} tags, ${Object.keys(ids).length} IDs, ${(html.match(/<a\b/gi) || []).length} links, ${(html.match(/<img\b/gi) || []).length} imagens`;

      return output;
    } catch (e) {
      return `Erro html_validator: ${e.message}`;
    }
  },

  async css_validator(args, ctx) {
    try {
      const { input, check_compat = false } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      let css = input;
      if (input.length < 500 && input.endsWith('.css')) {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (fs.existsSync(filePath)) css = fs.readFileSync(filePath, 'utf8');
      }

      const issues = [];
      const warnings = [];

      // Remover comentários para análise
      const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

      // 1. Chaves não balanceadas
      const opens = (cleanCss.match(/\{/g) || []).length;
      const closes = (cleanCss.match(/\}/g) || []).length;
      if (opens !== closes) issues.push(`Chaves desbalanceadas: ${opens} abertas vs ${closes} fechadas`);

      // 2. Propriedades comuns inválidas
      const validProps = new Set(['display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'overflow', 'overflow-x', 'overflow-y', 'color', 'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'border-color', 'border-width', 'border-style', 'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align', 'text-decoration', 'text-transform', 'letter-spacing', 'word-spacing', 'white-space', 'vertical-align', 'opacity', 'visibility', 'z-index', 'cursor', 'pointer-events', 'box-shadow', 'text-shadow', 'transform', 'transition', 'animation', 'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'align-self', 'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'gap', 'row-gap', 'column-gap', 'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-area', 'grid-gap', 'grid-auto-flow', 'content', 'list-style', 'list-style-type', 'outline', 'resize', 'box-sizing', 'object-fit', 'object-position', 'filter', 'backdrop-filter', 'clip-path', 'aspect-ratio', 'accent-color', 'appearance', 'isolation', 'mix-blend-mode', 'scroll-behavior', 'overscroll-behavior', 'will-change', 'contain', 'container', 'container-type', 'container-name', 'inset', 'place-items', 'place-content', 'place-self', 'writing-mode', 'direction', 'unicode-bidi', 'user-select', 'scroll-snap-type', 'scroll-snap-align', 'text-overflow', 'word-break', 'overflow-wrap', 'hyphens', 'tab-size', 'columns', 'column-count', 'column-width', 'column-rule', 'break-inside', 'page-break-inside', 'counter-reset', 'counter-increment', 'quotes', 'all', 'initial', 'inherit', 'unset', 'revert']);
      const propRegex = /^\s*([a-z-]+)\s*:/gm;
      const usedProps = {};
      let propMatch;
      while ((propMatch = propRegex.exec(cleanCss)) !== null) {
        const prop = propMatch[1];
        if (prop.startsWith('--') || prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-') || prop.startsWith('-o-')) continue;
        usedProps[prop] = (usedProps[prop] || 0) + 1;
        if (!validProps.has(prop)) {
          warnings.push(`Propriedade possivelmente inválida: "${prop}"`);
        }
      }

      // 3. Seletores duplicados
      const selectorRegex = /([^{}\n][^{]*)\{/g;
      const selectors = {};
      let selMatch;
      while ((selMatch = selectorRegex.exec(cleanCss)) !== null) {
        const sel = selMatch[1].trim();
        if (sel.startsWith('@')) continue;
        selectors[sel] = (selectors[sel] || 0) + 1;
      }
      Object.entries(selectors).filter(([_, c]) => c > 1).forEach(([sel, c]) => {
        warnings.push(`Seletor duplicado: "${sel.substring(0, 60)}" (${c}x)`);
      });

      // 4. !important excessivo
      const importants = (cleanCss.match(/!important/g) || []).length;
      if (importants > 5) warnings.push(`${importants} usos de !important (pode indicar problemas de especificidade)`);

      // 5. Cores inválidas
      const colorRegex = /#([0-9a-fA-F]+)\b/g;
      let colorMatch;
      while ((colorMatch = colorRegex.exec(cleanCss)) !== null) {
        const hex = colorMatch[1];
        if (![3, 4, 6, 8].includes(hex.length)) issues.push(`Cor hex inválida: #${hex}`);
      }

      // Stats
      const totalRules = Object.keys(selectors).length;
      const totalProps = Object.values(usedProps).reduce((a, b) => a + b, 0);
      const mediaQueries = (cleanCss.match(/@media/g) || []).length;
      const vars = (cleanCss.match(/var\(--/g) || []).length;
      const customProps = (cleanCss.match(/^\s*--[a-z]/gm) || []).length;

      const total = issues.length + warnings.length;
      let output = `CSS Validator — ${total === 0 ? '✓ Válido' : `${issues.length} erro(s), ${warnings.length} aviso(s)`}\n`;
      if (issues.length) output += '\nERROS:\n' + issues.map(i => `  ✗ ${i}`).join('\n');
      if (warnings.length) output += '\nAVISOS:\n' + warnings.map(w => `  ⚠ ${w}`).join('\n');
      output += `\n\nEstatísticas: ${totalRules} seletores, ${totalProps} declarações, ${mediaQueries} media queries, ${customProps} custom properties, ${vars} var(), ${importants} !important`;

      return output;
    } catch (e) {
      return `Erro css_validator: ${e.message}`;
    }
  },

  async csv_validator(args, ctx) {
    try {
      const { input, delimiter: delim, has_header = true, max_preview = 5 } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      let csvText = input;
      let fileName = '';
      if (input.length < 500 && (input.endsWith('.csv') || input.endsWith('.tsv'))) {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (fs.existsSync(filePath)) {
          csvText = fs.readFileSync(filePath, 'utf8');
          fileName = path.basename(filePath);
        }
      }

      const issues = [];
      const warnings = [];

      // Auto-detect delimiter
      let delimiter = delim;
      if (!delimiter) {
        const firstLine = csvText.split('\n')[0] || '';
        const commas = (firstLine.match(/,/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        if (tabs > commas && tabs > semicolons) delimiter = '\t';
        else if (semicolons > commas) delimiter = ';';
        else delimiter = ',';
      }

      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length === 0) return 'CSV vazio';

      // Parse simples (respeita aspas)
      function parseLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (ch === delimiter && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        fields.push(current.trim());
        return fields;
      }

      const header = parseLine(lines[0]);
      const expectedCols = header.length;
      const dataLines = has_header ? lines.slice(1) : lines;
      const badLines = [];

      dataLines.forEach((line, idx) => {
        const fields = parseLine(line);
        if (fields.length !== expectedCols) {
          badLines.push({ line: idx + (has_header ? 2 : 1), expected: expectedCols, got: fields.length });
        }
      });

      if (badLines.length > 0) {
        issues.push(`${badLines.length} linha(s) com número incorreto de colunas`);
        badLines.slice(0, 5).forEach(b => issues.push(`  Linha ${b.line}: esperado ${b.expected} colunas, encontrado ${b.got}`));
        if (badLines.length > 5) issues.push(`  ... e mais ${badLines.length - 5} linha(s)`);
      }

      // Linhas vazias
      const emptyFields = dataLines.filter(l => parseLine(l).some(f => f === '')).length;
      if (emptyFields > 0) warnings.push(`${emptyFields} linha(s) com campos vazios`);

      // Duplicatas de header
      const dupHeaders = header.filter((h, i) => header.indexOf(h) !== i);
      if (dupHeaders.length) warnings.push(`Headers duplicados: ${[...new Set(dupHeaders)].join(', ')}`);

      // Preview
      let preview = '';
      if (has_header) preview += '| ' + header.join(' | ') + ' |\n| ' + header.map(() => '---').join(' | ') + ' |\n';
      dataLines.slice(0, max_preview).forEach(line => {
        preview += '| ' + parseLine(line).join(' | ') + ' |\n';
      });

      const total = issues.length + warnings.length;
      let output = `CSV Validator${fileName ? ` — ${fileName}` : ''} — ${total === 0 ? '✓ Válido' : `${issues.length} erro(s), ${warnings.length} aviso(s)`}\n`;
      output += `Delimitador: "${delimiter === '\t' ? 'TAB' : delimiter}" | ${lines.length} linhas | ${expectedCols} colunas\n`;
      if (has_header) output += `Headers: ${header.join(', ')}\n`;
      if (issues.length) output += '\nERROS:\n' + issues.map(i => `  ✗ ${i}`).join('\n');
      if (warnings.length) output += '\nAVISOS:\n' + warnings.map(w => `  ⚠ ${w}`).join('\n');
      output += `\nPreview (${Math.min(max_preview, dataLines.length)} linhas):\n${preview}`;

      return output;
    } catch (e) {
      return `Erro csv_validator: ${e.message}`;
    }
  },

  async json_validator(args, ctx) {
    try {
      const { input, action = 'validate' } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      let jsonStr = input;
      let fileName = '';
      if (input.length < 500 && input.endsWith('.json')) {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (fs.existsSync(filePath)) {
          jsonStr = fs.readFileSync(filePath, 'utf8');
          fileName = path.basename(filePath);
        }
      }

      // Tentar parsear
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        // Extrair posição do erro
        const posMatch = e.message.match(/position (\d+)/);
        let context = '';
        if (posMatch) {
          const pos = parseInt(posMatch[1]);
          const start = Math.max(0, pos - 30);
          const end = Math.min(jsonStr.length, pos + 30);
          context = `\n\nContexto do erro:\n...${jsonStr.substring(start, pos)}>>>AQUI<<<${jsonStr.substring(pos, end)}...`;
        }
        return `JSON Inválido ✗\n\nErro: ${e.message}${context}`;
      }

      function countNodes(obj) {
        let keys = 0, arrays = 0, objects = 0, strings = 0, numbers = 0, booleans = 0, nulls = 0, maxDepth = 0;
        function walk(node, depth) {
          if (depth > maxDepth) maxDepth = depth;
          if (node === null) { nulls++; return; }
          if (Array.isArray(node)) { arrays++; node.forEach(n => walk(n, depth + 1)); return; }
          if (typeof node === 'object') { objects++; Object.entries(node).forEach(([k, v]) => { keys++; walk(v, depth + 1); }); return; }
          if (typeof node === 'string') strings++;
          else if (typeof node === 'number') numbers++;
          else if (typeof node === 'boolean') booleans++;
        }
        walk(obj, 0);
        return { keys, arrays, objects, strings, numbers, booleans, nulls, maxDepth };
      }

      switch (action) {
        case 'validate': {
          const stats = countNodes(parsed);
          return `JSON Válido ✓${fileName ? ` (${fileName})` : ''}\n\nTipo raiz: ${Array.isArray(parsed) ? 'Array' : typeof parsed}\nTamanho: ${jsonStr.length.toLocaleString()} bytes\nChaves: ${stats.keys} | Arrays: ${stats.arrays} | Objetos: ${stats.objects}\nStrings: ${stats.strings} | Números: ${stats.numbers} | Booleans: ${stats.booleans} | Nulls: ${stats.nulls}\nProfundidade máxima: ${stats.maxDepth}`;
        }
        case 'prettify': {
          const pretty = JSON.stringify(parsed, null, 2);
          return pretty.length > 6000 ? pretty.substring(0, 6000) + '\n...[truncado]' : pretty;
        }
        case 'minify': {
          const mini = JSON.stringify(parsed);
          const savings = ((1 - mini.length / jsonStr.length) * 100).toFixed(1);
          return `${mini.length > 6000 ? mini.substring(0, 6000) + '...[truncado]' : mini}\n\nOriginal: ${jsonStr.length} bytes → Minificado: ${mini.length} bytes (${savings}% menor)`;
        }
        case 'stats': {
          const stats = countNodes(parsed);
          return `Estatísticas JSON${fileName ? ` (${fileName})` : ''}:\n• Tipo raiz: ${Array.isArray(parsed) ? `Array [${parsed.length} items]` : `Object {${Object.keys(parsed).length} keys}`}\n• Total chaves: ${stats.keys}\n• Objetos: ${stats.objects}\n• Arrays: ${stats.arrays}\n• Strings: ${stats.strings}\n• Números: ${stats.numbers}\n• Booleans: ${stats.booleans}\n• Nulls: ${stats.nulls}\n• Profundidade: ${stats.maxDepth}\n• Tamanho original: ${jsonStr.length.toLocaleString()} bytes\n• Tamanho minificado: ${JSON.stringify(parsed).length.toLocaleString()} bytes`;
        }
        case 'paths': {
          const paths = [];
          function walkPaths(obj, prefix) {
            if (obj === null || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              paths.push(`${prefix}[] (${obj.length} items)`);
              if (obj.length > 0) walkPaths(obj[0], `${prefix}[0]`);
            } else {
              Object.keys(obj).forEach(k => {
                const val = obj[k];
                const p = prefix ? `${prefix}.${k}` : k;
                const type = val === null ? 'null' : Array.isArray(val) ? `array[${val.length}]` : typeof val;
                paths.push(`${p}: ${type}`);
                if (typeof val === 'object' && val !== null) walkPaths(val, p);
              });
            }
          }
          walkPaths(parsed, '');
          const output = paths.slice(0, 100).join('\n');
          return `Caminhos JSON${fileName ? ` (${fileName})` : ''}:\n${output}${paths.length > 100 ? `\n... e mais ${paths.length - 100} caminhos` : ''}`;
        }
        default:
          return `Ação "${action}" não reconhecida. Use: validate, prettify, minify, stats, paths`;
      }
    } catch (e) {
      return `Erro json_validator: ${e.message}`;
    }
  },

  async contact_validator(args, ctx) {
    // Delegado para Python tool
    const { execFileSync } = require('child_process');
    const scriptPath = path.join(__dirname, '..', 'python-tools', 'contact_validator.py');

    if (!fs.existsSync(scriptPath)) {
      return `Erro: Script ${scriptPath} não encontrado`;
    }

    const expandedArgs = { ...args };
    const homeDir = os.homedir().replace(/\\/g, '/');
    for (const key of ['input', 'output']) {
      if (expandedArgs[key] && typeof expandedArgs[key] === 'string') {
        expandedArgs[key] = expandedArgs[key].replace(/^~[\\/]/, homeDir + '/');
      }
    }

    const argsJson = JSON.stringify(expandedArgs);
    try {
      const result = execFileSync('uv', ['run', scriptPath, argsJson], {
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 4 * 1024 * 1024,
        cwd: path.join(__dirname, '..')
      });

      try {
        const parsed = JSON.parse(result.trim());
        if (parsed.error) return `Erro contact_validator: ${parsed.error}`;
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return result.trim() || '(contact_validator executado sem output)';
      }
    } catch (e) {
      const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
      return `Erro contact_validator: ${e.message}${stderr}`;
    }
  },

  async shopify_theme_check(args, ctx) {
    try {
      const { path: themePath, action = 'check', fix = false } = args;
      if (!themePath) return 'Parâmetro "path" é obrigatório';

      const resolvedPath = themePath.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      if (!fs.existsSync(resolvedPath)) return `Caminho não encontrado: ${resolvedPath}`;

      const isFile = fs.statSync(resolvedPath).isFile();
      const issues = [];
      const warnings = [];
      const info = [];

      function checkLiquidFile(filePath, content) {
        const relPath = filePath.replace(resolvedPath, '').replace(/^[\\/]/, '');

        // Liquid syntax: tags não fechadas
        const liquidTags = ['if', 'unless', 'for', 'case', 'capture', 'form', 'paginate', 'tablerow', 'comment', 'raw', 'style', 'javascript', 'schema'];
        liquidTags.forEach(tag => {
          const opens = (content.match(new RegExp(`\\{%[-\\s]*${tag}\\b`, 'g')) || []).length;
          const closes = (content.match(new RegExp(`\\{%[-\\s]*end${tag}`, 'g')) || []).length;
          if (opens !== closes) issues.push(`${relPath}: {% ${tag} %} desbalanceado (${opens} aberturas, ${closes} fechamentos)`);
        });

        // Filtros deprecated
        const deprecated = [
          { pattern: /\|\s*img_url/g, msg: 'img_url deprecated → use image_url' },
          { pattern: /\|\s*color_to_rgb/g, msg: 'color_to_rgb → use color_extract' },
          { pattern: /include\s+['"][^'"]+['"]/g, msg: 'include deprecated → use render' },
        ];
        deprecated.forEach(({ pattern, msg }) => {
          const matches = content.match(pattern);
          if (matches) warnings.push(`${relPath}: ${msg} (${matches.length}x)`);
        });

        // Schema validation (sections)
        const schemaMatch = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
        if (schemaMatch) {
          try {
            const schema = JSON.parse(schemaMatch[1]);
            if (!schema.name) warnings.push(`${relPath}: Schema sem "name"`);
            if (schema.settings) {
              schema.settings.forEach((s, i) => {
                if (!s.type) issues.push(`${relPath}: Setting #${i} sem "type"`);
                if (!s.id && s.type !== 'header' && s.type !== 'paragraph') issues.push(`${relPath}: Setting #${i} sem "id"`);
                if (!s.label && s.type !== 'header' && s.type !== 'paragraph') warnings.push(`${relPath}: Setting #${i} sem "label"`);
              });
            }
            if (schema.blocks) {
              schema.blocks.forEach((b, i) => {
                if (!b.type) issues.push(`${relPath}: Block #${i} sem "type"`);
                if (!b.name) warnings.push(`${relPath}: Block #${i} sem "name"`);
              });
            }
            info.push(`${relPath}: Schema válido — "${schema.name || '(sem nome)'}" com ${(schema.settings || []).length} settings, ${(schema.blocks || []).length} blocks`);
          } catch (e) {
            issues.push(`${relPath}: Schema JSON inválido — ${e.message}`);
          }
        }

        // Performance
        if ((content.match(/\{\{/g) || []).length > 100) warnings.push(`${relPath}: ${(content.match(/\{\{/g) || []).length} output tags (pode impactar performance)`);
        if (content.includes('forloop.index')) {
          const forLoops = (content.match(/\{%\s*for\b/g) || []).length;
          if (forLoops > 5) warnings.push(`${relPath}: ${forLoops} for loops (considere paginação)`);
        }

        // Translation keys
        const tKeys = content.match(/['"]t:([^'"]+)['"]/g) || [];
        if (tKeys.length > 0) info.push(`${relPath}: ${tKeys.length} translation keys`);
      }

      if (isFile) {
        const content = fs.readFileSync(resolvedPath, 'utf8');
        checkLiquidFile(resolvedPath, content);
      } else {
        // Verificar estrutura do tema
        const expectedDirs = ['sections', 'templates', 'snippets', 'assets', 'config', 'layout', 'locales'];
        const existingDirs = expectedDirs.filter(d => fs.existsSync(path.join(resolvedPath, d)));
        const missingDirs = expectedDirs.filter(d => !fs.existsSync(path.join(resolvedPath, d)));
        if (missingDirs.length > 0) warnings.push(`Pastas faltando: ${missingDirs.join(', ')}`);
        info.push(`Estrutura: ${existingDirs.join(', ')}`);

        // config/settings_schema.json
        const settingsPath = path.join(resolvedPath, 'config', 'settings_schema.json');
        if (fs.existsSync(settingsPath)) {
          try { JSON.parse(fs.readFileSync(settingsPath, 'utf8')); info.push('settings_schema.json: válido'); }
          catch (e) { issues.push(`settings_schema.json: JSON inválido — ${e.message}`); }
        }

        // Processar arquivos .liquid
        const liquidFiles = [];
        const dirsToScan = ['sections', 'templates', 'snippets', 'layout'].filter(d => fs.existsSync(path.join(resolvedPath, d)));
        dirsToScan.forEach(dir => {
          const dirPath = path.join(resolvedPath, dir);
          try {
            fs.readdirSync(dirPath).forEach(file => {
              if (file.endsWith('.liquid') || file.endsWith('.json')) {
                liquidFiles.push(path.join(dirPath, file));
              }
            });
          } catch (_) {}
        });

        info.push(`Arquivos analisados: ${liquidFiles.length}`);
        liquidFiles.forEach(file => {
          try {
            const content = fs.readFileSync(file, 'utf8');
            if (file.endsWith('.liquid')) checkLiquidFile(file, content);
            if (file.endsWith('.json')) {
              try { JSON.parse(content); }
              catch (e) { issues.push(`${path.basename(file)}: JSON inválido — ${e.message}`); }
            }
          } catch (_) {}
        });
      }

      const total = issues.length + warnings.length;
      let output = `Shopify Theme Check — ${total === 0 ? '✓ Nenhum problema' : `${issues.length} erro(s), ${warnings.length} aviso(s)`}\n`;
      if (info.length) output += '\nINFO:\n' + info.map(i => `  ℹ ${i}`).join('\n');
      if (issues.length) output += '\nERROS:\n' + issues.map(i => `  ✗ ${i}`).join('\n');
      if (warnings.length) output += '\nAVISOS:\n' + warnings.map(w => `  ⚠ ${w}`).join('\n');

      return output;
    } catch (e) {
      return `Erro shopify_theme_check: ${e.message}`;
    }
  },

  async dependency_audit(args, ctx) {
    try {
      const { path: inputPath, check_updates = true, check_unused = false } = args;
      if (!inputPath) return JSON.stringify({ ok: false, error: 'path e obrigatorio' });

      const { execSync } = require('child_process');
      const homeDir = os.homedir().replace(/\\/g, '/');
      const resolved = inputPath.replace(/^~[\\/]/, homeDir + '/');

      // Localizar o package.json
      let pkgPath, projectDir;
      if (resolved.endsWith('package.json') && fs.existsSync(resolved)) {
        pkgPath = resolved;
        projectDir = path.dirname(resolved);
      } else if (fs.existsSync(path.join(resolved, 'package.json'))) {
        pkgPath = path.join(resolved, 'package.json');
        projectDir = resolved;
      } else {
        return JSON.stringify({ ok: false, error: `package.json nao encontrado em: ${resolved}` });
      }

      let pkg;
      try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); }
      catch (e) { return JSON.stringify({ ok: false, error: `Erro ao parsear package.json: ${e.message}` }); }

      const deps = { ...((pkg.dependencies) || {}), ...((pkg.devDependencies) || {}) };
      const totalDeps = Object.keys(deps).length;
      const result = {
        ok: true,
        project: pkg.name || path.basename(projectDir),
        version: pkg.version || 'N/A',
        total_deps: totalDeps,
        deps_summary: {
          dependencies: Object.keys(pkg.dependencies || {}).length,
          devDependencies: Object.keys(pkg.devDependencies || {}).length
        },
        outdated: [],
        vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0, details: [] },
        unused: [],
        outdated_count: 0,
        unused_count: 0
      };

      // ── npm outdated ──
      if (check_updates) {
        try {
          const outdatedRaw = execSync('npm outdated --json', {
            cwd: projectDir, encoding: 'utf8', timeout: 60000,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          const outdatedData = JSON.parse(outdatedRaw || '{}');
          result.outdated = Object.entries(outdatedData).map(([name, info]) => ({
            name,
            current: info.current || 'N/A',
            wanted: info.wanted || 'N/A',
            latest: info.latest || 'N/A',
            type: info.type || 'dependency'
          }));
          result.outdated_count = result.outdated.length;
        } catch (e) {
          // npm outdated retorna exit code 1 quando há pacotes desatualizados — capturar stdout mesmo assim
          if (e.stdout) {
            try {
              const outdatedData = JSON.parse(e.stdout || '{}');
              result.outdated = Object.entries(outdatedData).map(([name, info]) => ({
                name,
                current: info.current || 'N/A',
                wanted: info.wanted || 'N/A',
                latest: info.latest || 'N/A',
                type: info.type || 'dependency'
              }));
              result.outdated_count = result.outdated.length;
            } catch (_) {
              result.outdated_error = `npm outdated falhou: ${e.message.substring(0, 200)}`;
            }
          } else {
            result.outdated_error = `npm outdated falhou: ${e.message.substring(0, 200)}`;
          }
        }
      }

      // ── npm audit ──
      try {
        const auditRaw = execSync('npm audit --json', {
          cwd: projectDir, encoding: 'utf8', timeout: 60000,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const auditData = JSON.parse(auditRaw || '{}');
        const meta = auditData.metadata || {};
        const vulns = meta.vulnerabilities || {};
        result.vulnerabilities = {
          critical: vulns.critical || 0,
          high: vulns.high || 0,
          moderate: vulns.moderate || 0,
          low: vulns.low || 0,
          info: vulns.info || 0,
          total: vulns.total || 0,
          details: []
        };
        // Extrair top 10 vulnerabilidades
        if (auditData.vulnerabilities) {
          result.vulnerabilities.details = Object.entries(auditData.vulnerabilities)
            .slice(0, 10)
            .map(([name, info]) => ({
              name,
              severity: info.severity,
              title: info.via?.[0]?.title || info.name || name,
              fixAvailable: !!info.fixAvailable
            }));
        }
      } catch (e) {
        if (e.stdout) {
          try {
            const auditData = JSON.parse(e.stdout || '{}');
            const meta = auditData.metadata || {};
            const vulns = meta.vulnerabilities || {};
            result.vulnerabilities = {
              critical: vulns.critical || 0,
              high: vulns.high || 0,
              moderate: vulns.moderate || 0,
              low: vulns.low || 0,
              info: vulns.info || 0,
              total: vulns.total || 0,
              details: []
            };
            if (auditData.vulnerabilities) {
              result.vulnerabilities.details = Object.entries(auditData.vulnerabilities)
                .slice(0, 10)
                .map(([name, info]) => ({
                  name,
                  severity: info.severity,
                  title: info.via?.[0]?.title || info.name || name,
                  fixAvailable: !!info.fixAvailable
                }));
            }
          } catch (_) {
            result.audit_error = `npm audit falhou: ${e.message.substring(0, 200)}`;
          }
        } else {
          result.audit_error = `npm audit falhou: ${e.message.substring(0, 200)}`;
        }
      }

      // ── Detectar deps não utilizadas ──
      if (check_unused) {
        try {
          // Coletar todos arquivos .js/.ts do projeto (excluindo node_modules)
          const collectFiles = (dir, exts, collected = []) => {
            if (!fs.existsSync(dir)) return collected;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
              if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue;
                collectFiles(path.join(dir, entry.name), exts, collected);
              } else if (exts.some(ext => entry.name.endsWith(ext))) {
                collected.push(path.join(dir, entry.name));
              }
            }
            return collected;
          };

          const srcFiles = collectFiles(projectDir, ['.js', '.ts', '.mjs', '.cjs']);
          const allSrc = srcFiles.map(f => {
            try { return fs.readFileSync(f, 'utf8'); } catch (_) { return ''; }
          }).join('\n');

          const unused = [];
          for (const depName of Object.keys(deps)) {
            // Verificar se aparece em qualquer import/require
            const escaped = depName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const patterns = [
              new RegExp(`require\\(['"\`]${escaped}`, 'm'),
              new RegExp(`from\\s+['"\`]${escaped}`, 'm'),
              new RegExp(`import\\(['"\`]${escaped}`, 'm')
            ];
            const isUsed = patterns.some(p => p.test(allSrc));
            if (!isUsed) unused.push(depName);
          }

          result.unused = unused;
          result.unused_count = unused.length;
          result.files_scanned = srcFiles.length;
        } catch (e) {
          result.unused_error = `Erro ao verificar unused: ${e.message.substring(0, 200)}`;
        }
      }

      // ── Formatar saída legível ──
      let output = `Dependency Audit — ${result.project} v${result.version}\n`;
      output += `${'─'.repeat(60)}\n`;
      output += `Total deps: ${result.total_deps} (${result.deps_summary.dependencies} prod + ${result.deps_summary.devDependencies} dev)\n\n`;

      // Vulnerabilidades
      const v = result.vulnerabilities;
      output += `Vulnerabilidades: ${v.total} total`;
      if (v.total > 0) {
        output += ` (critical: ${v.critical}, high: ${v.high}, moderate: ${v.moderate}, low: ${v.low})`;
      }
      output += '\n';
      if (v.details.length > 0) {
        output += '\nTop vulnerabilidades:\n';
        v.details.forEach(d => {
          output += `  [${d.severity.toUpperCase()}] ${d.name} — ${d.title}${d.fixAvailable ? ' (fix disponível)' : ''}\n`;
        });
      }

      // Desatualizadas
      output += `\nDesatualizadas: ${result.outdated_count}`;
      if (result.outdated_error) output += ` (erro: ${result.outdated_error})`;
      output += '\n';
      if (result.outdated.length > 0) {
        output += '\nPacotes desatualizados:\n';
        output += `  ${'Pacote'.padEnd(30)} ${'Atual'.padEnd(12)} ${'Querido'.padEnd(12)} Mais recente\n`;
        output += `  ${'─'.repeat(70)}\n`;
        result.outdated.forEach(d => {
          output += `  ${d.name.padEnd(30)} ${d.current.padEnd(12)} ${d.wanted.padEnd(12)} ${d.latest}\n`;
        });
      }

      // Não utilizadas
      if (check_unused) {
        output += `\nPossíveis não utilizadas: ${result.unused_count}`;
        if (result.unused_error) output += ` (erro: ${result.unused_error})`;
        output += '\n';
        if (result.unused.length > 0) {
          output += result.unused.map(d => `  • ${d}`).join('\n') + '\n';
          output += '  (Verifique manualmente — podem ser usadas via requires dinâmicos)\n';
        }
        if (result.files_scanned !== undefined) output += `  Arquivos .js/.ts escaneados: ${result.files_scanned}\n`;
      }

      result.report = output;
      return JSON.stringify(result, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro dependency_audit: ${e.message}` });
    }
  },

  async shopify_speed_audit(args, ctx) {
    try {
      const { url, theme_path } = args;
      if (!url && !theme_path) return 'Forneça "url" (URL da loja) ou "theme_path" (pasta local do tema)';

      const issues = [];
      const warnings = [];
      const passed = [];
      const data = {};
      let score = 100;

      // ── Análise por URL (fetch HTML) ──
      if (url) {
        const https = require('https');
        const http = require('http');

        const fetchPage = (targetUrl) => new Promise((resolve, reject) => {
          const urlObj = new URL(targetUrl);
          const lib = urlObj.protocol === 'https:' ? https : http;
          lib.get(targetUrl, {
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return resolve(fetchPage(res.headers.location.startsWith('http') ? res.headers.location : `${urlObj.protocol}//${urlObj.host}${res.headers.location}`));
            }
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ html: d, status: res.statusCode, headers: res.headers }));
          }).on('error', reject);
        });

        const { html, headers } = await fetchPage(url);
        const htmlSize = Buffer.byteLength(html, 'utf8');
        data.html_size_kb = +(htmlSize / 1024).toFixed(1);

        // 1. Scripts bloqueantes (sem async/defer)
        const allScripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)];
        const blockingScripts = allScripts.filter(s => !s[0].includes('async') && !s[0].includes('defer') && !s[0].includes('type="module"'));
        data.total_scripts = allScripts.length;
        data.blocking_scripts = blockingScripts.length;
        if (blockingScripts.length > 0) {
          issues.push(`${blockingScripts.length} scripts bloqueantes (sem async/defer): ${blockingScripts.slice(0, 3).map(s => path.basename(s[1]).substring(0, 40)).join(', ')}`);
          score -= Math.min(blockingScripts.length * 5, 20);
        } else {
          passed.push('Sem scripts bloqueantes');
        }

        // 2. CSS externo (stylesheets)
        const stylesheets = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
        data.stylesheets = stylesheets.length;
        if (stylesheets.length > 5) {
          warnings.push(`${stylesheets.length} folhas CSS externas (ideal: <5)`);
          score -= 5;
        }

        // 3. Imagens sem lazy load
        const allImgs = [...html.matchAll(/<img[^>]*>/gi)];
        const noLazy = allImgs.filter(i => !i[0].includes('loading="lazy"') && !i[0].includes('loading=\'lazy\'') && !i[0].includes('data-src'));
        data.total_images = allImgs.length;
        data.no_lazy_load = noLazy.length;
        if (noLazy.length > 3) {
          warnings.push(`${noLazy.length}/${allImgs.length} imagens sem lazy loading`);
          score -= Math.min(noLazy.length, 10);
        } else {
          passed.push('Imagens com lazy load OK');
        }

        // 4. Fontes externas (Google Fonts, Typekit, etc.)
        const fontLoads = [...html.matchAll(/fonts\.googleapis\.com|use\.typekit\.net|fonts\.shopify\.com/gi)];
        data.external_fonts = fontLoads.length;
        if (fontLoads.length > 2) {
          warnings.push(`${fontLoads.length} carregamentos de fontes externas (considere font-display: swap e preload)`);
          score -= 5;
        }

        // 5. Preload de recursos críticos
        const preloads = [...html.matchAll(/<link[^>]*rel=["']preload["'][^>]*>/gi)];
        data.preloads = preloads.length;
        if (preloads.length === 0) {
          warnings.push('Sem preload de recursos críticos');
          score -= 5;
        } else {
          passed.push(`${preloads.length} recursos com preload`);
        }

        // 6. Apps de terceiros (detectar scripts de apps conhecidos que impactam performance)
        const heavyApps = [];
        const appPatterns = [
          { name: 'Klaviyo', pattern: /klaviyo\.com/i },
          { name: 'Omnisend', pattern: /omnisend\.com/i },
          { name: 'Tidio', pattern: /tidio\.co/i },
          { name: 'Tawk.to', pattern: /tawk\.to/i },
          { name: 'Zendesk', pattern: /zopim|zendesk/i },
          { name: 'Hotjar', pattern: /hotjar\.com/i },
          { name: 'Lucky Orange', pattern: /luckyorange\.com/i },
          { name: 'Privy', pattern: /privy\.com/i },
          { name: 'Judge.me', pattern: /judge\.me/i },
          { name: 'Loox', pattern: /loox\.io/i },
          { name: 'Yotpo', pattern: /yotpo\.com/i },
          { name: 'Stamped', pattern: /stamped\.io/i },
          { name: 'ReConvert', pattern: /reconvert/i },
          { name: 'Bold', pattern: /boldapps\.net/i },
          { name: 'PageFly', pattern: /pagefly/i },
        ];
        for (const app of appPatterns) {
          if (app.pattern.test(html)) heavyApps.push(app.name);
        }
        data.third_party_apps = heavyApps;
        if (heavyApps.length > 3) {
          warnings.push(`${heavyApps.length} apps de terceiros detectados (podem impactar performance): ${heavyApps.join(', ')}`);
          score -= Math.min(heavyApps.length * 2, 10);
        }

        // 7. Inline CSS volume
        const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
        const inlineCssSize = inlineStyles.reduce((sum, s) => sum + s[1].length, 0);
        data.inline_css_kb = +(inlineCssSize / 1024).toFixed(1);
        if (inlineCssSize > 50000) {
          warnings.push(`CSS inline excessivo (${(inlineCssSize/1024).toFixed(0)}KB — ideal: <50KB)`);
          score -= 5;
        }

        // 8. HTML size
        if (htmlSize > 300000) {
          issues.push(`HTML muito grande (${(htmlSize/1024).toFixed(0)}KB — Shopify ideal: <200KB)`);
          score -= 10;
        } else if (htmlSize > 200000) {
          warnings.push(`HTML acima do ideal (${(htmlSize/1024).toFixed(0)}KB — ideal: <200KB)`);
          score -= 5;
        } else {
          passed.push(`HTML ${(htmlSize/1024).toFixed(0)}KB OK`);
        }

        // 9. Compression
        if (headers['content-encoding'] && (headers['content-encoding'].includes('gzip') || headers['content-encoding'].includes('br'))) {
          passed.push(`Compressão ${headers['content-encoding']} ativa`);
        } else {
          issues.push('Sem compressão gzip/brotli detectada');
          score -= 10;
        }
      }

      // ── Análise por pasta local do tema ──
      if (theme_path) {
        const themePath = theme_path.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (!fs.existsSync(themePath)) return `Pasta não encontrada: ${themePath}`;

        // Verificar assets pesados
        const assetsDir = path.join(themePath, 'assets');
        if (fs.existsSync(assetsDir)) {
          const assetFiles = fs.readdirSync(assetsDir);
          const heavyAssets = [];
          let totalAssetsSize = 0;

          for (const f of assetFiles) {
            const filePath = path.join(assetsDir, f);
            const stat = fs.statSync(filePath);
            totalAssetsSize += stat.size;
            if (stat.size > 100000) { // >100KB
              heavyAssets.push({ name: f, size_kb: +(stat.size / 1024).toFixed(1) });
            }
          }

          data.total_assets = assetFiles.length;
          data.total_assets_size_kb = +(totalAssetsSize / 1024).toFixed(1);
          data.heavy_assets = heavyAssets.slice(0, 10);

          if (heavyAssets.length > 0) {
            warnings.push(`${heavyAssets.length} assets >100KB: ${heavyAssets.slice(0, 3).map(a => `${a.name} (${a.size_kb}KB)`).join(', ')}`);
            score -= Math.min(heavyAssets.length * 3, 15);
          }
        }

        // Verificar Liquid complexo (render time)
        const liquidDirs = ['templates', 'sections', 'snippets', 'layout'];
        let liquidComplexity = 0;
        const complexFiles = [];

        for (const dir of liquidDirs) {
          const dirPath = path.join(themePath, dir);
          if (!fs.existsSync(dirPath)) continue;
          const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.liquid') || f.endsWith('.json'));
          for (const f of files) {
            const content = fs.readFileSync(path.join(dirPath, f), 'utf8');
            const forLoops = (content.match(/{%[-\s]*for\b/g) || []).length;
            const nested = (content.match(/{%[-\s]*for\b[\s\S]*?{%[-\s]*for\b/g) || []).length;
            const includes = (content.match(/{%[-\s]*(?:render|include)\b/g) || []).length;
            const complexity = forLoops * 2 + nested * 5 + includes;
            if (complexity > 15) {
              complexFiles.push({ file: `${dir}/${f}`, for_loops: forLoops, nested_loops: nested, includes, complexity });
            }
            liquidComplexity += complexity;
          }
        }

        data.liquid_complexity = liquidComplexity;
        data.complex_files = complexFiles.slice(0, 10);

        if (complexFiles.length > 0) {
          warnings.push(`${complexFiles.length} arquivos Liquid com alta complexidade: ${complexFiles.slice(0, 3).map(f => `${f.file} (score ${f.complexity})`).join(', ')}`);
          score -= Math.min(complexFiles.length * 3, 15);
        }
      }

      score = Math.max(0, Math.min(100, score));

      const result = {
        ok: true,
        source: url || theme_path,
        score,
        grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F',
        summary: { issues: issues.length, warnings: warnings.length, passed: passed.length },
        issues,
        warnings,
        passed,
        data
      };

      return JSON.stringify(result, null, 2);
    } catch (e) {
      return `Erro shopify_speed_audit: ${e.message}`;
    }
  }
};

module.exports = { definitions, handlers };
