/**
 * Tools: TEXT — text_utils, word_counter, calculator, unit_converter, date_calculator, bio_generator
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'text_utils',
      description: 'Utilitários de texto: base64 encode/decode, MD5/SHA256 hash, URL encode/decode, slugify, JWT decode, UUID generate, contagem de caracteres/palavras.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['base64_encode', 'base64_decode', 'md5', 'sha256', 'url_encode', 'url_decode', 'slugify', 'jwt_decode', 'uuid', 'count', 'json_minify', 'json_prettify'], description: 'Operação a executar' },
          text: { type: 'string', description: 'Texto de entrada (obrigatório exceto para uuid)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'word_counter',
      description: 'Conta palavras, caracteres (com/sem espaços), linhas, parágrafos, frases, tempo de leitura estimado. Aceita texto ou arquivo.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Texto para analisar ou caminho para arquivo (.txt, .md, .html)' },
          strip_html: { type: 'boolean', description: 'Remover tags HTML antes de contar. Padrão: true' },
          detailed: { type: 'boolean', description: 'Incluir frequência de palavras (top 20). Padrão: false' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Calculadora com expressões matemáticas, porcentagem, regra de 3, markup, margem e desconto. Aceita expressões como "2+2", "15% de 200", "regra de 3: 100->50, 80->?".',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Expressão matemática. Ex: "2+2", "sqrt(144)", "15% de 200", "100/3"' },
          action: { type: 'string', enum: ['eval', 'percentage', 'rule_of_three', 'markup', 'margin', 'discount'], description: 'Tipo de cálculo. Padrão: eval' },
          values: { type: 'object', description: 'Valores para ações especiais. Ex: {price:100, cost:60} para margin, {a1:100, b1:50, a2:80} para regra de 3, {value:200, percent:15} para percentage/discount' }
        },
        required: ['expression']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'unit_converter',
      description: 'Converte unidades: comprimento (px,rem,em,cm,in,mm,pt,m,km,ft,yd,mi), peso (kg,g,lb,oz,mg,ton), temperatura (C,F,K), dados (B,KB,MB,GB,TB), tempo (s,ms,min,h,d), velocidade (kmh,mph,ms).',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Valor numérico a converter' },
          from: { type: 'string', description: 'Unidade de origem. Ex: px, kg, C, MB, min' },
          to: { type: 'string', description: 'Unidade de destino. Ex: rem, lb, F, GB, h' }
        },
        required: ['value', 'from', 'to']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'date_calculator',
      description: 'Calcula diferença entre datas, adiciona/subtrai dias, dias úteis, feriados BR, dia da semana, idade.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['diff', 'add', 'subtract', 'weekday', 'age', 'business_days', 'info'], description: 'Ação: diff (diferença), add/subtract (somar/subtrair dias), weekday (dia da semana), age (idade), business_days (dias úteis entre datas), info (info completa de uma data)' },
          date1: { type: 'string', description: 'Data principal. Formatos: YYYY-MM-DD, DD/MM/YYYY, "today", "now"' },
          date2: { type: 'string', description: 'Segunda data (para diff/business_days)' },
          days: { type: 'number', description: 'Quantidade de dias (para add/subtract)' }
        },
        required: ['action', 'date1']
      }
    }
  },
  // ── BIO GENERATOR ───────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'bio_generator',
      description: 'Gera bio para perfil social baseado em dados fornecidos. Cria 3 variações usando templates por plataforma e tom. Sem necessidade de API externa.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome completo ou nome de exibição' },
          role: { type: 'string', description: 'Cargo ou profissão. Ex: "CEO", "Nutricionista", "Designer UX"' },
          company: { type: 'string', description: 'Nome da empresa ou negócio (opcional)' },
          keywords: { type: 'string', description: 'Palavras-chave ou especialidades separadas por vírgula. Ex: "saúde, emagrecimento, nutrição funcional"' },
          platform: { type: 'string', enum: ['instagram', 'linkedin', 'twitter', 'whatsapp'], description: 'Plataforma de destino. Padrão: instagram' },
          tone: { type: 'string', enum: ['professional', 'casual', 'creative'], description: 'Tom da bio. Padrão: professional' },
          max_length: { type: 'number', description: 'Comprimento máximo em caracteres. Padrão: 150 para Instagram, 220 para LinkedIn, 160 para Twitter, 200 para WhatsApp' }
        },
        required: ['name', 'role', 'keywords']
      }
    }
  }
];

const handlers = {
  async text_utils(args, ctx) {
    try {
      const { action, text = '' } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';
      const crypto = require('crypto');

      switch (action) {
        case 'base64_encode':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return Buffer.from(text, 'utf8').toString('base64');
        case 'base64_decode':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return Buffer.from(text, 'base64').toString('utf8');
        case 'md5':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return crypto.createHash('md5').update(text).digest('hex');
        case 'sha256':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return crypto.createHash('sha256').update(text).digest('hex');
        case 'url_encode':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return encodeURIComponent(text);
        case 'url_decode':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return decodeURIComponent(text);
        case 'slugify':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        case 'jwt_decode': {
          if (!text) return 'Parâmetro "text" é obrigatório';
          const parts = text.split('.');
          if (parts.length < 2) return 'Token JWT inválido (esperado 3 partes separadas por .)';
          const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          if (payload.exp) payload._exp_readable = new Date(payload.exp * 1000).toISOString();
          if (payload.iat) payload._iat_readable = new Date(payload.iat * 1000).toISOString();
          return JSON.stringify({ header, payload }, null, 2);
        }
        case 'uuid':
          return crypto.randomUUID();
        case 'count':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return JSON.stringify({ chars: text.length, words: text.trim().split(/\s+/).length, lines: text.split('\n').length, bytes: Buffer.byteLength(text, 'utf8') });
        case 'json_minify':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return JSON.stringify(JSON.parse(text));
        case 'json_prettify':
          if (!text) return 'Parâmetro "text" é obrigatório';
          return JSON.stringify(JSON.parse(text), null, 2);
        default:
          return `Ação "${action}" não reconhecida. Use: base64_encode, base64_decode, md5, sha256, url_encode, url_decode, slugify, jwt_decode, uuid, count, json_minify, json_prettify`;
      }
    } catch (e) {
      return `Erro text_utils: ${e.message}`;
    }
  },

  async word_counter(args, ctx) {
    try {
      const { input, strip_html = true, detailed = false } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      let text = input;
      // Se for arquivo, ler
      if (input.length < 500 && /\.(txt|md|html|htm|csv|json|js|ts|py|css|liquid)$/i.test(input)) {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (fs.existsSync(filePath)) text = fs.readFileSync(filePath, 'utf8');
      }

      // Strip HTML se necessário
      let cleanText = text;
      if (strip_html) cleanText = text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');

      const chars = cleanText.length;
      const charsNoSpaces = cleanText.replace(/\s/g, '').length;
      const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      const lines = cleanText.split(/\r?\n/).length;
      const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim()).length;
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim()).length;
      const readingTimeMin = Math.ceil(wordCount / 200); // 200 wpm
      const speakingTimeMin = Math.ceil(wordCount / 130); // 130 wpm

      let output = `Contagem de Texto:\n`;
      output += `• Palavras: ${wordCount.toLocaleString()}\n`;
      output += `• Caracteres (com espaços): ${chars.toLocaleString()}\n`;
      output += `• Caracteres (sem espaços): ${charsNoSpaces.toLocaleString()}\n`;
      output += `• Linhas: ${lines.toLocaleString()}\n`;
      output += `• Parágrafos: ${paragraphs}\n`;
      output += `• Frases: ${sentences}\n`;
      output += `• Tempo de leitura: ~${readingTimeMin} min\n`;
      output += `• Tempo de fala: ~${speakingTimeMin} min\n`;
      output += `• Média palavras/frase: ${sentences > 0 ? (wordCount / sentences).toFixed(1) : 0}`;

      if (detailed && wordCount > 0) {
        const freq = {};
        words.forEach(w => {
          const lower = w.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúüç]/gi, '');
          if (lower.length > 2) freq[lower] = (freq[lower] || 0) + 1;
        });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
        output += '\n\nTop 20 palavras:\n';
        sorted.forEach(([word, count], i) => {
          const pct = ((count / wordCount) * 100).toFixed(1);
          output += `  ${i + 1}. "${word}" — ${count}x (${pct}%)\n`;
        });
      }

      return output;
    } catch (e) {
      return `Erro word_counter: ${e.message}`;
    }
  },

  async calculator(args, ctx) {
    try {
      const { expression, action = 'eval', values = {} } = args;
      if (!expression && !values) return 'Parâmetro "expression" é obrigatório';

      switch (action) {
        case 'percentage': {
          const { value, percent } = values.value ? values : { value: parseFloat(expression), percent: 10 };
          const result = (value * percent) / 100;
          return `${percent}% de ${value} = ${result}\n${value} + ${percent}% = ${value + result}\n${value} - ${percent}% = ${value - result}`;
        }
        case 'rule_of_three': {
          const { a1, b1, a2 } = values;
          if (!a1 || !b1 || !a2) return 'Para regra de 3, informe values: {a1, b1, a2}. Ex: Se 100→50, 80→?';
          const b2 = (a2 * b1) / a1;
          return `Regra de 3:\n${a1} → ${b1}\n${a2} → ${b2}`;
        }
        case 'markup': {
          const { cost, markup_percent } = values;
          if (!cost || !markup_percent) return 'Informe values: {cost, markup_percent}';
          const price = cost * (1 + markup_percent / 100);
          return `Custo: ${cost}\nMarkup: ${markup_percent}%\nPreço de venda: ${price.toFixed(2)}\nLucro: ${(price - cost).toFixed(2)}`;
        }
        case 'margin': {
          const { price, cost } = values;
          if (!price || !cost) return 'Informe values: {price, cost}';
          const margin = ((price - cost) / price) * 100;
          const markup = ((price - cost) / cost) * 100;
          return `Preço: ${price}\nCusto: ${cost}\nLucro: ${(price - cost).toFixed(2)}\nMargem: ${margin.toFixed(2)}%\nMarkup: ${markup.toFixed(2)}%`;
        }
        case 'discount': {
          const { value, percent } = values.value ? values : { value: parseFloat(expression), percent: 10 };
          const discounted = value * (1 - percent / 100);
          const saved = value - discounted;
          return `Original: ${value}\nDesconto: ${percent}%\nEconomia: ${saved.toFixed(2)}\nPreço final: ${discounted.toFixed(2)}`;
        }
        default: { // eval
          // Sanitizar: permitir apenas números, operadores, parênteses e funções math
          const sanitized = expression.replace(/\s+/g, '');

          // Mapear funções comuns para Math.*
          let expr = expression
            .replace(/\bsqrt\(/g, 'Math.sqrt(')
            .replace(/\bcbrt\(/g, 'Math.cbrt(')
            .replace(/\babs\(/g, 'Math.abs(')
            .replace(/\bceil\(/g, 'Math.ceil(')
            .replace(/\bfloor\(/g, 'Math.floor(')
            .replace(/\bround\(/g, 'Math.round(')
            .replace(/\bpow\(/g, 'Math.pow(')
            .replace(/\blog\(/g, 'Math.log(')
            .replace(/\blog2\(/g, 'Math.log2(')
            .replace(/\blog10\(/g, 'Math.log10(')
            .replace(/\bsin\(/g, 'Math.sin(')
            .replace(/\bcos\(/g, 'Math.cos(')
            .replace(/\btan\(/g, 'Math.tan(')
            .replace(/\bPI\b/g, 'Math.PI')
            .replace(/\bE\b/g, 'Math.E')
            .replace(/\bmin\(/g, 'Math.min(')
            .replace(/\bmax\(/g, 'Math.max(')
            .replace(/\^/g, '**');

          // Bloquear qualquer coisa perigosa
          if (/[a-zA-Z_$]/.test(expr.replace(/Math\.\w+/g, '').replace(/\d+e[+-]?\d+/gi, ''))) {
            return `Expressão contém caracteres não permitidos. Use apenas números, operadores (+,-,*,/,^,%) e funções math (sqrt, pow, abs, round, etc.)`;
          }

          const result = new Function(`"use strict"; return (${expr})`)();
          if (typeof result !== 'number' || !isFinite(result)) return `Resultado inválido: ${result}`;
          return `${expression} = ${result}`;
        }
      }
    } catch (e) {
      return `Erro calculator: ${e.message}`;
    }
  },

  async unit_converter(args, ctx) {
    try {
      const { value, from, to } = args;
      if (value === undefined || !from || !to) return 'Parâmetros obrigatórios: value, from, to';

      // Tabelas de conversão (tudo para unidade base)
      const length = { px: 1, rem: 16, em: 16, pt: 1.333, cm: 37.795, mm: 3.7795, in: 96, m: 3779.5, km: 3779500, ft: 28.8, yd: 86.4, mi: 6082560 };
      const weight = { mg: 0.001, g: 1, kg: 1000, ton: 1000000, oz: 28.3495, lb: 453.592 };
      const temp = { C: 'celsius', F: 'fahrenheit', K: 'kelvin' };
      const data = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
      const time = { ms: 1, s: 1000, min: 60000, h: 3600000, d: 86400000 };
      const speed = { ms: 1, kmh: 0.27778, mph: 0.44704 };

      // Detectar grupo
      let result;

      if (temp[from] && temp[to]) {
        // Temperatura — conversão especial
        if (from === 'C' && to === 'F') result = (value * 9/5) + 32;
        else if (from === 'F' && to === 'C') result = (value - 32) * 5/9;
        else if (from === 'C' && to === 'K') result = value + 273.15;
        else if (from === 'K' && to === 'C') result = value - 273.15;
        else if (from === 'F' && to === 'K') result = (value - 32) * 5/9 + 273.15;
        else if (from === 'K' && to === 'F') result = (value - 273.15) * 9/5 + 32;
        else result = value;
      } else {
        // Encontrar grupo
        const groups = [length, weight, data, time, speed];
        let group = null;
        for (const g of groups) {
          if (g[from] !== undefined && g[to] !== undefined) { group = g; break; }
        }
        if (!group) return `Não consigo converter de "${from}" para "${to}". Verifique as unidades. Disponíveis:\n- Comprimento: px, rem, em, pt, cm, mm, in, m, km, ft, yd, mi\n- Peso: mg, g, kg, ton, oz, lb\n- Temperatura: C, F, K\n- Dados: B, KB, MB, GB, TB\n- Tempo: ms, s, min, h, d\n- Velocidade: ms, kmh, mph`;

        const baseValue = value * group[from];
        result = baseValue / group[to];
      }

      const formatted = Number.isInteger(result) ? result : parseFloat(result.toFixed(6));
      return `${value} ${from} = ${formatted} ${to}`;
    } catch (e) {
      return `Erro unit_converter: ${e.message}`;
    }
  },

  async bio_generator(args, ctx) {
    try {
      const { name, role, company, keywords, platform = 'instagram', tone = 'professional' } = args;
      if (!name) return 'Parâmetro "name" é obrigatório';
      if (!role) return 'Parâmetro "role" é obrigatório';
      if (!keywords) return 'Parâmetro "keywords" é obrigatório';

      // Limites padrão por plataforma
      const defaultMaxLength = { instagram: 150, linkedin: 220, twitter: 160, whatsapp: 200 };
      const maxLength = args.max_length || defaultMaxLength[platform] || 150;

      // Parse das keywords
      const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean);

      // Mapa de emojis por setor (baseado em palavras-chave e role)
      const combined = `${role} ${keywords}`.toLowerCase();
      let sectorEmoji = '✨';
      if (/tech|dev|software|programa|código|engineer|ti\b|dados|ia\b|ai\b/.test(combined)) sectorEmoji = '💻';
      else if (/saúde|saude|médic|medic|nutri|farmac|fisio|enferm|psicol/.test(combined)) sectorEmoji = '🏥';
      else if (/marketing|vendas|growth|ads|tráfego|trafego|digital/.test(combined)) sectorEmoji = '📈';
      else if (/food|aliment|chef|culiná|gastro|restaur|café|cafe/.test(combined)) sectorEmoji = '🍽️';
      else if (/fitness|treino|personal|academia|esporte|muscula/.test(combined)) sectorEmoji = '💪';
      else if (/educa|professor|ensino|curso|pedagog|coach|mentor/.test(combined)) sectorEmoji = '📚';
      else if (/direito|advog|jurídic|juridic|lei\b|legal/.test(combined)) sectorEmoji = '⚖️';
      else if (/design|criativ|arte|visual|ux\b|ui\b|branding/.test(combined)) sectorEmoji = '🎨';
      else if (/financ|invest|contábil|contabil|econom|banco|criptomoeda/.test(combined)) sectorEmoji = '💰';

      // CTAs por plataforma e tom
      const ctas = {
        instagram: {
          professional: ['👇 Agende uma consulta', '📩 DM para mais informações', '🔗 Link na bio'],
          casual: ['📩 Me manda uma DM!', '👇 Fala comigo aqui!', '💬 Vem conversar!'],
          creative: ['✉️ Bora criar algo incrível?', '🚀 DM aberta para parcerias!', '💡 Me chama no Direct!']
        },
        linkedin: {
          professional: ['Conecte-se comigo para trocar experiências.', 'Aberto a novas oportunidades.', 'Vamos conversar?'],
          casual: ['Gosto de boas conversas — conecta comigo!', 'Sempre aberto a novas conexões!', 'Me manda uma mensagem!'],
          creative: ['Vamos construir algo relevante juntos?', 'Se minha área te interessa, conecta!', 'Buscando projetos que façam diferença.']
        },
        twitter: {
          professional: ['DM aberta.', 'Opiniões pessoais.', 'Tweets sobre ' + kwList[0] + '.'],
          casual: ['DM aberta sempre!', 'Falando sobre tudo e nada.', 'RT ≠ endosso.'],
          creative: ['Tweeting from the edge.', '140 chars de caos organizado.', 'Curioso por natureza.']
        },
        whatsapp: {
          professional: ['Atendimento via WhatsApp.', 'Envie uma mensagem para saber mais.', 'Respondo em horário comercial.'],
          casual: ['Me manda uma mensagem!', 'Ativo por aqui!', 'Chama no zap!'],
          creative: ['Deixa uma mensagem e a gente conversa!', 'Ideias boas surgem na conversa!', 'Online e pronto para trocar uma ideia!']
        }
      };

      const ctaOptions = ctas[platform]?.[tone] || ctas.instagram.professional;
      const companyStr = company ? company : '';

      // Formatar keywords de acordo com plataforma e tom
      const kwFormatted = {
        instagram: {
          professional: kwList.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' | '),
          casual: kwList.map(k => `${k}`).join(' | '),
          creative: kwList.map(k => `${k}`).join(' ✦ ')
        },
        linkedin: {
          professional: kwList.join(', '),
          casual: kwList.join(', '),
          creative: kwList.join(' · ')
        },
        twitter: {
          professional: kwList.slice(0, 3).map(k => '#' + k.replace(/\s+/g, '')).join(' '),
          casual: kwList.slice(0, 3).map(k => '#' + k.replace(/\s+/g, '')).join(' '),
          creative: kwList.slice(0, 3).map(k => '#' + k.replace(/\s+/g, '')).join(' ')
        },
        whatsapp: {
          professional: kwList.join(', '),
          casual: kwList.join(', '),
          creative: kwList.join(' | ')
        }
      };
      const kw = kwFormatted[platform]?.[tone] || kwList.join(', ');

      // Gerar 3 variações baseadas em templates
      const variations = [];

      if (platform === 'instagram') {
        if (tone === 'professional') {
          variations.push(`${sectorEmoji} ${role}${companyStr ? ' | ' + companyStr : ''}\n${kw}\n${ctaOptions[0]}`);
          variations.push(`${sectorEmoji} ${role}${companyStr ? ' @ ' + companyStr : ''}\n${kw}\n${ctaOptions[1]}`);
          variations.push(`${name} • ${role}${companyStr ? ' — ' + companyStr : ''}\n${sectorEmoji} ${kw}\n${ctaOptions[2]}`);
        } else if (tone === 'casual') {
          variations.push(`${sectorEmoji} ${name}\n${role}${companyStr ? ' na ' + companyStr : ''}\n${kw}\n${ctaOptions[0]}`);
          variations.push(`oi! sou ${name} ${sectorEmoji}\n${role}${companyStr ? ' @ ' + companyStr : ''}\n${kw}\n${ctaOptions[1]}`);
          variations.push(`${sectorEmoji} ${role}${companyStr ? ' | ' + companyStr : ''}\n${kw}\n${ctaOptions[2]}`);
        } else { // creative
          variations.push(`${sectorEmoji} ${role}\n✦ ${kw}\n${companyStr ? companyStr + ' ✦ ' : ''}${ctaOptions[0]}`);
          variations.push(`${name} ${sectorEmoji}\n${role}${companyStr ? ' × ' + companyStr : ''}\n${kw}\n${ctaOptions[1]}`);
          variations.push(`[ ${role} ]${companyStr ? ' @ ' + companyStr : ''}\n${sectorEmoji} ${kw}\n${ctaOptions[2]}`);
        }
      } else if (platform === 'linkedin') {
        const kwSentence = kwList.slice(0, 3).join(', ');
        variations.push(`${role}${companyStr ? ' na ' + companyStr : ''}. Especialista em ${kwSentence}. ${ctaOptions[0]}`);
        variations.push(`${sectorEmoji} ${role}${companyStr ? ' | ' + companyStr : ''}. Trabalho com ${kwSentence}. ${ctaOptions[1]}`);
        variations.push(`${name} — ${role}${companyStr ? ' @ ' + companyStr : ''}. Foco em ${kwSentence}. ${ctaOptions[2]}`);
      } else if (platform === 'twitter') {
        variations.push(`${sectorEmoji} ${role}${companyStr ? ' @ ' + companyStr : ''} | ${kw}\n${ctaOptions[0]}`);
        variations.push(`${name} • ${role}${companyStr ? ' | ' + companyStr : ''}\n${kw} ${ctaOptions[1]}`);
        variations.push(`${sectorEmoji} ${role} | ${kw}\n${companyStr ? companyStr + ' • ' : ''}${ctaOptions[2]}`);
      } else { // whatsapp
        variations.push(`${sectorEmoji} ${name} - ${role}\n${companyStr ? companyStr + '\n' : ''}${kw}\n${ctaOptions[0]}`);
        variations.push(`${name}\n${sectorEmoji} ${role}${companyStr ? ' | ' + companyStr : ''}\n${kw}\n${ctaOptions[1]}`);
        variations.push(`${sectorEmoji} ${role}\n${name}${companyStr ? ' — ' + companyStr : ''}\n${kw}\n${ctaOptions[2]}`);
      }

      // Truncar para maxLength
      const truncated = variations.map(v => {
        if (v.length <= maxLength) return v;
        return v.substring(0, maxLength - 3) + '...';
      });

      let output = `Bio Generator — Plataforma: ${platform} | Tom: ${tone} | Limite: ${maxLength} chars\n`;
      output += `${'─'.repeat(60)}\n`;
      truncated.forEach((bio, i) => {
        output += `\nVariação ${i + 1} (${bio.length} chars):\n${bio}\n`;
        output += `${'─'.repeat(60)}\n`;
      });

      return output;
    } catch (e) {
      return `Erro bio_generator: ${e.message}`;
    }
  },

  async date_calculator(args, ctx) {
    try {
      const { action, date1, date2, days = 0 } = args;
      if (!action || !date1) return 'Parâmetros obrigatórios: action, date1';

      const WEEKDAYS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      // Feriados nacionais BR (fixos + Páscoa-dependentes)
      function getHolidaysBR(year) {
        const fixed = [`${year}-01-01`, `${year}-04-21`, `${year}-05-01`, `${year}-09-07`, `${year}-10-12`, `${year}-11-02`, `${year}-11-15`, `${year}-12-25`];
        // Páscoa (Gauss)
        const a = year % 19, b = Math.floor(year / 100), c = year % 100;
        const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        const easter = new Date(year, month, day);
        const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
        const fmt = (d) => d.toISOString().split('T')[0];
        fixed.push(fmt(easter)); // Páscoa
        fixed.push(fmt(addDays(easter, -2))); // Sexta-feira Santa
        fixed.push(fmt(addDays(easter, -47))); // Carnaval (terça)
        fixed.push(fmt(addDays(easter, -48))); // Carnaval (segunda)
        fixed.push(fmt(addDays(easter, 60))); // Corpus Christi
        return fixed;
      }

      function parseDate(str) {
        if (!str) return new Date();
        if (str === 'today' || str === 'now' || str === 'hoje') return new Date();
        // DD/MM/YYYY
        const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (brMatch) return new Date(+brMatch[3], +brMatch[2] - 1, +brMatch[1]);
        return new Date(str);
      }

      const d1 = parseDate(date1);
      if (isNaN(d1.getTime())) return `Data inválida: "${date1}". Use YYYY-MM-DD ou DD/MM/YYYY`;

      switch (action) {
        case 'diff': {
          if (!date2) return 'Para diff, informe date2';
          const d2 = parseDate(date2);
          if (isNaN(d2.getTime())) return `Data inválida: "${date2}"`;
          const diffMs = Math.abs(d2 - d1);
          const diffDays = Math.floor(diffMs / 86400000);
          const diffWeeks = Math.floor(diffDays / 7);
          const diffMonths = Math.floor(diffDays / 30.44);
          const diffYears = Math.floor(diffDays / 365.25);
          const hours = Math.floor(diffMs / 3600000);
          return `Diferença entre ${d1.toLocaleDateString('pt-BR')} e ${d2.toLocaleDateString('pt-BR')}:\n• ${diffDays} dias\n• ${diffWeeks} semanas e ${diffDays % 7} dias\n• ${diffMonths} meses\n• ${diffYears} anos\n• ${hours.toLocaleString()} horas`;
        }
        case 'add':
        case 'subtract': {
          const mult = action === 'subtract' ? -1 : 1;
          const result = new Date(d1);
          result.setDate(result.getDate() + (days * mult));
          return `${d1.toLocaleDateString('pt-BR')} ${action === 'add' ? '+' : '-'} ${days} dias = ${result.toLocaleDateString('pt-BR')} (${WEEKDAYS_PT[result.getDay()]})`;
        }
        case 'weekday': {
          return `${d1.toLocaleDateString('pt-BR')} é ${WEEKDAYS_PT[d1.getDay()]}`;
        }
        case 'age': {
          const now = new Date();
          let years = now.getFullYear() - d1.getFullYear();
          let months = now.getMonth() - d1.getMonth();
          let daysAge = now.getDate() - d1.getDate();
          if (daysAge < 0) { months--; daysAge += 30; }
          if (months < 0) { years--; months += 12; }
          const totalDays = Math.floor((now - d1) / 86400000);
          return `Nascimento: ${d1.toLocaleDateString('pt-BR')}\nIdade: ${years} anos, ${months} meses e ${daysAge} dias\nTotal: ${totalDays.toLocaleString()} dias vividos`;
        }
        case 'business_days': {
          if (!date2) return 'Para business_days, informe date2';
          const d2 = parseDate(date2);
          if (isNaN(d2.getTime())) return `Data inválida: "${date2}"`;
          const start = d1 < d2 ? d1 : d2;
          const end = d1 < d2 ? d2 : d1;
          const year = start.getFullYear();
          const holidays = [...getHolidaysBR(year), ...getHolidaysBR(year + 1)];
          let count = 0;
          const cur = new Date(start);
          while (cur <= end) {
            const dow = cur.getDay();
            const iso = cur.toISOString().split('T')[0];
            if (dow !== 0 && dow !== 6 && !holidays.includes(iso)) count++;
            cur.setDate(cur.getDate() + 1);
          }
          return `Entre ${start.toLocaleDateString('pt-BR')} e ${end.toLocaleDateString('pt-BR')}:\n• ${count} dias úteis\n• ${Math.floor((end - start) / 86400000)} dias corridos`;
        }
        case 'info': {
          const year = d1.getFullYear();
          const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
          const startOfYear = new Date(year, 0, 1);
          const dayOfYear = Math.floor((d1 - startOfYear) / 86400000) + 1;
          const endOfYear = new Date(year, 11, 31);
          const daysLeft = Math.floor((endOfYear - d1) / 86400000);
          const weekNum = Math.ceil(dayOfYear / 7);
          return `Data: ${d1.toLocaleDateString('pt-BR')}\nDia da semana: ${WEEKDAYS_PT[d1.getDay()]}\nMês: ${MONTHS_PT[d1.getMonth()]}\nDia do ano: ${dayOfYear}/365\nSemana: ${weekNum}\nDias restantes no ano: ${daysLeft}\nAno bissexto: ${isLeap ? 'Sim' : 'Não'}\nTimestamp Unix: ${Math.floor(d1.getTime() / 1000)}\nISO 8601: ${d1.toISOString()}`;
        }
        default:
          return `Ação "${action}" não reconhecida. Use: diff, add, subtract, weekday, age, business_days, info`;
      }
    } catch (e) {
      return `Erro date_calculator: ${e.message}`;
    }
  }
};

module.exports = { definitions, handlers };
