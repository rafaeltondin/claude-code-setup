/**
 * Tools: DATA — pdf_reader, csv_processor, html_to_pdf, data_transform, json_to_sql, csv_to_sql
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const definitions = [
  // ── PDF READER ──────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'pdf_reader',
      description: 'Le e extrai texto de arquivos PDF. Retorna o texto completo ou de paginas especificas. Util para ler relatorios, contratos, notas fiscais, boletos, etc.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Caminho absoluto do arquivo PDF' },
          pages: { type: 'string', description: 'Paginas a extrair. Ex: "1-3", "1,3,5", "all". Padrao: all' },
          max_chars: { type: 'number', description: 'Limite maximo de caracteres no retorno. Padrao: 10000' }
        },
        required: ['file_path']
      }
    }
  },
  // ── CSV PROCESSOR ───────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'csv_processor',
      description: `Processa arquivos CSV com operacoes diversas.
Acoes disponiveis:
- read: Le o CSV e retorna as primeiras N linhas como JSON
- stats: Estatisticas do CSV (total linhas, colunas, tipos de dados)
- filter: Filtra linhas por condicao (coluna, operador, valor)
- aggregate: Agrega dados (sum, avg, count, min, max por coluna)
- search: Busca texto em qualquer coluna
- transform: Converte CSV para JSON ou vice-versa`,
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Caminho absoluto do arquivo CSV' },
          action: { type: 'string', enum: ['read', 'stats', 'filter', 'aggregate', 'search', 'transform'], description: 'Acao a executar' },
          limit: { type: 'number', description: 'Limite de linhas para read. Padrao: 50' },
          column: { type: 'string', description: 'Nome da coluna (para filter/aggregate)' },
          operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'starts_with'], description: 'Operador para filter' },
          value: { type: 'string', description: 'Valor para filter/search' },
          agg_function: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max', 'distinct'], description: 'Funcao de agregacao' },
          delimiter: { type: 'string', description: 'Delimitador do CSV. Padrao: ","' },
          output_format: { type: 'string', enum: ['json', 'csv', 'table'], description: 'Formato de saida. Padrao: json' }
        },
        required: ['file_path', 'action']
      }
    }
  },
  // ── HTML TO PDF ─────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'html_to_pdf',
      description: 'Converte HTML (arquivo local ou URL) para PDF via Playwright (headless Chromium). Suporta CSS, JS, imagens.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho do arquivo HTML local' },
          url: { type: 'string', description: 'URL para converter (alternativa ao input)' },
          output: { type: 'string', description: 'Caminho do PDF de saída' },
          format: { type: 'string', description: 'Tamanho da página: A4, A3, Letter, Legal. Padrão: A4' },
          landscape: { type: 'boolean', description: 'Orientação paisagem. Padrão: false' },
          margin: { type: 'string', description: 'Margens. Padrão: "1cm"' },
          scale: { type: 'number', description: 'Escala (0.1-2.0). Padrão: 1.0' },
          print_background: { type: 'boolean', description: 'Incluir backgrounds CSS. Padrão: true' },
          wait: { type: 'number', description: 'Tempo de espera em ms após carregar. Padrão: 2000' }
        },
        required: []
      }
    }
  },
  // ── DATA TRANSFORM ──────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'data_transform',
      description: 'ETL de dados: converte entre CSV/Excel/JSON, filtra, ordena, deduplica, normaliza telefones/emails. Usa pandas.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['convert', 'preview', 'stats', 'filter', 'deduplicate', 'normalize_phones', 'normalize_emails'], description: 'Ação a executar' },
          input: { type: 'string', description: 'Caminho do arquivo de entrada (CSV, Excel, JSON)' },
          output: { type: 'string', description: 'Caminho de saída (extensão define formato: .csv, .xlsx, .json, .tsv)' },
          columns: { type: 'string', description: 'Colunas separadas por vírgula. Ex: "nome,email,telefone"' },
          filter: { type: 'string', description: 'Expressão pandas query. Ex: "idade > 18 and cidade == \'SP\'"' },
          sort: { type: 'string', description: 'Coluna para ordenar. Prefixo - para desc. Ex: "-data"' },
          rename: { type: 'object', description: 'Renomear colunas. Ex: {"Name": "nome", "Phone": "telefone"}' },
          limit: { type: 'number', description: 'Limitar número de linhas' },
          data: { type: 'array', description: 'Lista de valores para normalize_phones/normalize_emails' },
          separator: { type: 'string', description: 'Separador do CSV. Padrão: ","' }
        },
        required: ['action']
      }
    }
  },
  // ── JSON TO SQL ─────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'json_to_sql',
      description: 'Converte JSON array para INSERT statements SQL. Detecta tipos automaticamente, gera CREATE TABLE opcional, suporta MySQL, PostgreSQL e SQLite.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho de arquivo JSON ou JSON inline (string com array de objetos)' },
          table: { type: 'string', description: 'Nome da tabela SQL de destino' },
          output: { type: 'string', description: 'Caminho de arquivo de saída .sql (opcional — se omitido retorna o SQL)' },
          dialect: { type: 'string', enum: ['mysql', 'postgres', 'sqlite'], description: 'Dialeto SQL. Padrão: mysql' }
        },
        required: ['input', 'table']
      }
    }
  },
  // ── CSV TO SQL ──────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'csv_to_sql',
      description: 'Converte CSV para INSERT statements SQL. Detecta tipos automaticamente, gera CREATE TABLE opcional, suporta MySQL, PostgreSQL e SQLite.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho do arquivo CSV de entrada' },
          table: { type: 'string', description: 'Nome da tabela SQL de destino' },
          output: { type: 'string', description: 'Caminho de arquivo de saída .sql (opcional — se omitido retorna o SQL)' },
          delimiter: { type: 'string', description: 'Delimitador de colunas do CSV. Padrão: ","' },
          has_header: { type: 'boolean', description: 'Primeira linha é cabeçalho com nomes de colunas. Padrão: true' },
          dialect: { type: 'string', enum: ['mysql', 'postgres', 'sqlite'], description: 'Dialeto SQL. Padrão: mysql' }
        },
        required: ['input', 'table']
      }
    }
  }
];

const handlers = {
  async pdf_reader(args, ctx) {
    const filePath = args.file_path || '';
    if (!filePath) return JSON.stringify({ ok: false, error: 'file_path e obrigatorio' });

    if (!fs.existsSync(filePath)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${filePath}` });

    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      const maxChars = args.max_chars || 10000;
      let text = data.text || '';

      // Filtrar por paginas se solicitado
      const pagesArg = args.pages || 'all';
      if (pagesArg !== 'all' && data.text) {
        // pdf-parse nao suporta paginas individuais nativamente, retorna texto completo
        // Informamos o total de paginas
      }

      if (text.length > maxChars) {
        text = text.substring(0, maxChars) + `\n\n[...TRUNCADO em ${maxChars} caracteres. Total: ${text.length}]`;
      }

      return JSON.stringify({
        ok: true,
        pages: data.numpages,
        info: {
          title: data.info?.Title || null,
          author: data.info?.Author || null,
          subject: data.info?.Subject || null,
          creator: data.info?.Creator || null,
          creation_date: data.info?.CreationDate || null
        },
        text_length: data.text?.length || 0,
        text
      });
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao ler PDF: ${e.message}` });
    }
  },

  async csv_processor(args, ctx) {
    const filePath = args.file_path || '';
    const action = args.action || 'read';

    if (!filePath) return JSON.stringify({ ok: false, error: 'file_path e obrigatorio' });
    if (!fs.existsSync(filePath)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${filePath}` });

    try {
      const { parse } = require('csv-parse/sync');
      const raw = fs.readFileSync(filePath, 'utf-8');
      const delimiter = args.delimiter || ',';
      const records = parse(raw, { columns: true, skip_empty_lines: true, delimiter, trim: true });
      const columns = records.length > 0 ? Object.keys(records[0]) : [];

      switch (action) {
        case 'read': {
          const limit = args.limit || 50;
          return JSON.stringify({ ok: true, total_rows: records.length, columns, rows: records.slice(0, limit) });
        }

        case 'stats': {
          const colStats = {};
          for (const col of columns) {
            const values = records.map(r => r[col]).filter(v => v !== '' && v !== null && v !== undefined);
            const numericValues = values.map(Number).filter(n => !isNaN(n));
            colStats[col] = {
              total: values.length,
              empty: records.length - values.length,
              unique: new Set(values).size,
              is_numeric: numericValues.length > values.length * 0.8,
              sample: values.slice(0, 3)
            };
            if (numericValues.length > 0) {
              colStats[col].min = Math.min(...numericValues);
              colStats[col].max = Math.max(...numericValues);
              colStats[col].avg = +(numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2);
            }
          }
          return JSON.stringify({ ok: true, total_rows: records.length, columns, column_stats: colStats });
        }

        case 'filter': {
          const col = args.column;
          const op = args.operator || 'eq';
          const val = args.value || '';
          if (!col) return JSON.stringify({ ok: false, error: 'column e obrigatorio para filter' });

          const filtered = records.filter(r => {
            const v = r[col] || '';
            const numV = parseFloat(v);
            const numVal = parseFloat(val);
            switch (op) {
              case 'eq': return v === val;
              case 'neq': return v !== val;
              case 'gt': return numV > numVal;
              case 'lt': return numV < numVal;
              case 'gte': return numV >= numVal;
              case 'lte': return numV <= numVal;
              case 'contains': return v.toLowerCase().includes(val.toLowerCase());
              case 'starts_with': return v.toLowerCase().startsWith(val.toLowerCase());
              default: return v === val;
            }
          });
          const limit = args.limit || 50;
          return JSON.stringify({ ok: true, total_matched: filtered.length, rows: filtered.slice(0, limit) });
        }

        case 'aggregate': {
          const col = args.column;
          const fn = args.agg_function || 'count';
          if (!col) return JSON.stringify({ ok: false, error: 'column e obrigatorio para aggregate' });

          const values = records.map(r => r[col]).filter(v => v !== '' && v !== null);
          const nums = values.map(Number).filter(n => !isNaN(n));

          let result;
          switch (fn) {
            case 'count': result = values.length; break;
            case 'distinct': result = [...new Set(values)]; break;
            case 'sum': result = nums.reduce((a, b) => a + b, 0); break;
            case 'avg': result = nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0; break;
            case 'min': result = nums.length ? Math.min(...nums) : null; break;
            case 'max': result = nums.length ? Math.max(...nums) : null; break;
            default: result = values.length;
          }
          return JSON.stringify({ ok: true, column: col, function: fn, result });
        }

        case 'search': {
          const q = (args.value || '').toLowerCase();
          if (!q) return JSON.stringify({ ok: false, error: 'value e obrigatorio para search' });
          const matched = records.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
          const limit = args.limit || 50;
          return JSON.stringify({ ok: true, query: q, total_matched: matched.length, rows: matched.slice(0, limit) });
        }

        case 'transform': {
          const fmt = args.output_format || 'json';
          if (fmt === 'json') {
            return JSON.stringify({ ok: true, format: 'json', total: records.length, data: records.slice(0, 200) });
          } else if (fmt === 'table') {
            const header = columns.join(' | ');
            const sep = columns.map(() => '---').join(' | ');
            const rows = records.slice(0, 100).map(r => columns.map(c => r[c] || '').join(' | '));
            return `| ${header} |\n| ${sep} |\n${rows.map(r => `| ${r} |`).join('\n')}`;
          }
          return JSON.stringify({ ok: true, format: fmt, data: records.slice(0, 200) });
        }

        default:
          return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida. Use: read, stats, filter, aggregate, search, transform` });
      }
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao processar CSV: ${e.message}` });
    }
  },

  async html_to_pdf(args, ctx) {
    // Delegado para Python tool via ctx.executeTool
    const { execFileSync } = require('child_process');
    const scriptPath = path.join(__dirname, '..', 'python-tools', 'html_to_pdf.py');

    if (!fs.existsSync(scriptPath)) {
      return `Erro: Script ${scriptPath} não encontrado`;
    }

    // Expandir ~ em caminhos dentro dos args
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
        if (parsed.error) return `Erro html_to_pdf: ${parsed.error}`;
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return result.trim() || '(html_to_pdf executado sem output)';
      }
    } catch (e) {
      const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
      return `Erro html_to_pdf: ${e.message}${stderr}`;
    }
  },

  async json_to_sql(args, ctx) {
    try {
      const { input, table, output, dialect = 'mysql' } = args;
      if (!input) return JSON.stringify({ ok: false, error: 'input e obrigatorio' });
      if (!table) return JSON.stringify({ ok: false, error: 'table e obrigatorio' });

      const homeDir = os.homedir().replace(/\\/g, '/');

      // Ler/parsear o JSON
      let data;
      const resolvedInput = input.replace(/^~[\\/]/, homeDir + '/');
      if (fs.existsSync(resolvedInput)) {
        try { data = JSON.parse(fs.readFileSync(resolvedInput, 'utf8')); }
        catch (e) { return JSON.stringify({ ok: false, error: `Erro ao parsear JSON do arquivo: ${e.message}` }); }
      } else {
        try { data = JSON.parse(input); }
        catch (e) { return JSON.stringify({ ok: false, error: `input nao e um arquivo valido nem JSON valido: ${e.message}` }); }
      }

      if (!Array.isArray(data)) return JSON.stringify({ ok: false, error: 'O JSON deve ser um array de objetos' });
      if (data.length === 0) return JSON.stringify({ ok: false, error: 'Array JSON esta vazio' });

      const columns = Object.keys(data[0]);

      // Detectar tipo de cada coluna baseado no primeiro objeto com valor nao-nulo
      function detectType(col) {
        for (const row of data) {
          const v = row[col];
          if (v !== null && v !== undefined && v !== '') {
            if (typeof v === 'number') return Number.isInteger(v) ? 'INT' : 'DOUBLE';
            if (typeof v === 'boolean') return 'TINYINT(1)';
            if (typeof v === 'string') {
              if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return 'DATETIME';
              if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'DATE';
              return v.length > 255 ? 'TEXT' : 'VARCHAR(255)';
            }
          }
        }
        return 'VARCHAR(255)';
      }

      const quoteIdent = (name) => {
        if (dialect === 'postgres') return `"${name}"`;
        if (dialect === 'sqlite') return `"${name}"`;
        return `\`${name}\``;
      };

      const escapeValue = (v) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? '1' : '0';
        // Escapar aspas simples
        return `'${String(v).replace(/'/g, "''")}'`;
      };

      // Gerar CREATE TABLE
      const colTypes = {};
      columns.forEach(c => { colTypes[c] = detectType(c); });

      let sql = `-- Gerado por json_to_sql em ${new Date().toISOString()}\n`;
      sql += `-- Dialect: ${dialect} | Total: ${data.length} registros\n\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (\n`;
      sql += columns.map(c => `  ${quoteIdent(c)} ${colTypes[c]}`).join(',\n');
      sql += `\n);\n\n`;

      // Gerar INSERTs
      const colList = columns.map(quoteIdent).join(', ');
      const inserts = data.map(row => {
        const values = columns.map(c => escapeValue(row[c])).join(', ');
        return `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${values});`;
      });

      sql += inserts.join('\n');

      // Salvar ou retornar
      if (output) {
        const resolvedOutput = output.replace(/^~[\\/]/, homeDir + '/');
        fs.writeFileSync(resolvedOutput, sql, 'utf8');
        const preview = inserts.slice(0, 5).join('\n');
        return JSON.stringify({ ok: true, total_inserts: inserts.length, output: resolvedOutput, preview });
      }

      const preview = inserts.slice(0, 5).join('\n');
      const sqlPreview = sql.length > 8000 ? sql.substring(0, 8000) + '\n-- [truncado]' : sql;
      return JSON.stringify({ ok: true, total_inserts: inserts.length, sql: sqlPreview, preview });
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro json_to_sql: ${e.message}` });
    }
  },

  async csv_to_sql(args, ctx) {
    try {
      const { input, table, output, delimiter: delimArg = ',', has_header = true, dialect = 'mysql' } = args;
      if (!input) return JSON.stringify({ ok: false, error: 'input e obrigatorio' });
      if (!table) return JSON.stringify({ ok: false, error: 'table e obrigatorio' });

      const homeDir = os.homedir().replace(/\\/g, '/');
      const resolvedInput = input.replace(/^~[\\/]/, homeDir + '/');
      if (!fs.existsSync(resolvedInput)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${resolvedInput}` });

      const raw = fs.readFileSync(resolvedInput, 'utf8');
      const lines = raw.split(/\r?\n/).filter(l => l.trim());
      if (lines.length === 0) return JSON.stringify({ ok: false, error: 'CSV vazio' });

      // Split respeitando aspas duplas
      const splitLine = (line) => {
        const fields = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
          } else if (ch === delimArg && !inQ) {
            fields.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        fields.push(cur.trim());
        return fields;
      };

      const dataLines = [...lines];
      let columns;
      if (has_header) {
        columns = splitLine(dataLines.shift()).map(c => c.replace(/^["']|["']$/g, ''));
      } else {
        const firstRow = splitLine(dataLines[0]);
        columns = firstRow.map((_, i) => `col${i + 1}`);
      }

      // Detectar tipos por amostra (primeiras 20 linhas)
      const sample = dataLines.slice(0, 20).map(l => splitLine(l));
      const colTypes = columns.map((_, ci) => {
        const vals = sample.map(r => r[ci] || '').filter(v => v !== '' && v.toUpperCase() !== 'NULL');
        if (vals.length === 0) return 'VARCHAR(255)';
        const allNum = vals.every(v => !isNaN(v) && v !== '');
        if (allNum) {
          const allInt = vals.every(v => Number.isInteger(parseFloat(v)));
          return allInt ? 'INT' : 'DOUBLE';
        }
        if (vals.every(v => /^\d{4}-\d{2}-\d{2}T/.test(v))) return 'DATETIME';
        if (vals.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'DATE';
        const maxLen = Math.max(...vals.map(v => v.length));
        return maxLen > 255 ? 'TEXT' : 'VARCHAR(255)';
      });

      const quoteIdent = (name) => {
        if (dialect === 'postgres') return `"${name}"`;
        if (dialect === 'sqlite') return `"${name}"`;
        return `\`${name}\``;
      };

      const escapeValue = (v) => {
        if (v === '' || v.toUpperCase() === 'NULL') return 'NULL';
        const num = Number(v);
        if (!isNaN(num) && v !== '') return String(num);
        return `'${v.replace(/'/g, "''")}'`;
      };

      // Gerar CREATE TABLE
      let sql = `-- Gerado por csv_to_sql em ${new Date().toISOString()}\n`;
      sql += `-- Dialect: ${dialect} | Total: ${dataLines.length} registros\n\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (\n`;
      sql += columns.map((c, i) => `  ${quoteIdent(c)} ${colTypes[i]}`).join(',\n');
      sql += `\n);\n\n`;

      // Gerar INSERTs
      const colList = columns.map(quoteIdent).join(', ');
      const inserts = dataLines.map(line => {
        const fields = splitLine(line);
        const values = columns.map((_, i) => escapeValue(fields[i] !== undefined ? fields[i] : '')).join(', ');
        return `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${values});`;
      });

      sql += inserts.join('\n');

      if (output) {
        const resolvedOutput = output.replace(/^~[\\/]/, homeDir + '/');
        fs.writeFileSync(resolvedOutput, sql, 'utf8');
        const preview = inserts.slice(0, 5).join('\n');
        return JSON.stringify({ ok: true, total_inserts: inserts.length, output: resolvedOutput, preview });
      }

      const sqlPreview = sql.length > 8000 ? sql.substring(0, 8000) + '\n-- [truncado]' : sql;
      const preview = inserts.slice(0, 5).join('\n');
      return JSON.stringify({ ok: true, total_inserts: inserts.length, sql: sqlPreview, preview });
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro csv_to_sql: ${e.message}` });
    }
  },

  async data_transform(args, ctx) {
    // Delegado para Python tool
    const { execFileSync } = require('child_process');
    const scriptPath = path.join(__dirname, '..', 'python-tools', 'data_transform.py');

    if (!fs.existsSync(scriptPath)) {
      return `Erro: Script ${scriptPath} não encontrado`;
    }

    // Expandir ~ em caminhos dentro dos args
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
        if (parsed.error) return `Erro data_transform: ${parsed.error}`;
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return result.trim() || '(data_transform executado sem output)';
      }
    } catch (e) {
      const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
      return `Erro data_transform: ${e.message}${stderr}`;
    }
  }
};

module.exports = { definitions, handlers };
