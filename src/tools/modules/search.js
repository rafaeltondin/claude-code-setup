/**
 * Tools: BUSCA — search_kb, google_search, maps_search, search_in_files, find_files
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const { googleSearch, mapsSearch } = require('../web-search');

// Tool Utils — Circuit Breaker, Cache, Timeout
let toolUtils = null;
try { toolUtils = require('../tool-utils'); } catch (_) {}

const definitions = [
  {
    type: 'function',
    function: {
      name: 'search_kb',
      description: 'Busca documentação, guias e APIs na Knowledge Base local. Use para saber como usar uma API ou encontrar configurações.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termos de busca. Ex: "Meta Ads API campaigns", "Shopify orders", "Evolution WhatsApp groups"' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'google_search',
      description: `Busca no Google e retorna resultados organicos (titulo, URL, snippet).
OBRIGATORIO para: pesquisar na web, buscar informacoes externas, prospectar leads, investigar empresas/pessoas, comparar concorrentes.
NAO usa API paga — scraping direto.

Parametros:
- query: termos de busca (aceita operadores Google: site:, intitle:, "frase exata", -excluir)
- num_results: quantidade de resultados (padrao: 10, max: 30)
- lang: idioma (padrao: pt-BR)
- country: pais (padrao: BR)

Exemplos:
- "médicos dermatologistas Garopaba SC"
- "site:linkedin.com CEO empresa X"
- "\"clinica odontologica\" Florianopolis telefone"`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termos de busca no Google. Aceita operadores: site:, intitle:, "frase", -excluir' },
          num_results: { type: 'number', description: 'Quantidade de resultados a retornar. Padrao: 10, Max: 30' },
          lang: { type: 'string', description: 'Idioma dos resultados. Padrao: pt-BR' },
          country: { type: 'string', description: 'Pais para resultados locais. Padrao: BR' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'maps_search',
      description: `Busca negocios/estabelecimentos no Google Maps por categoria + localizacao.
OBRIGATORIO para: prospectar leads locais, encontrar empresas por cidade/bairro, buscar telefones e enderecos de negocios.
NAO usa API paga — scraping direto.

Retorna para cada resultado: nome, endereco, telefone, rating, reviews, categoria, website.

Exemplos:
- query: "dentistas", location: "Garopaba SC"
- query: "restaurantes italianos", location: "Florianopolis centro"
- query: "clinica veterinaria", location: "Porto Alegre RS"`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Tipo de negocio ou categoria. Ex: "dentistas", "restaurantes", "academias"' },
          location: { type: 'string', description: 'Cidade, bairro ou regiao. Ex: "Garopaba SC", "Florianopolis centro"' },
          num_results: { type: 'number', description: 'Quantidade maxima de resultados. Padrao: 20' }
        },
        required: ['query', 'location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_in_files',
      description: 'Busca texto ou padrão regex dentro de arquivos (equivalente ao grep/rg). Retorna arquivo, linha e contexto.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Texto ou regex a buscar. Ex: "TODO", "function handleClick", "api_key\\s*=.*"' },
          path: { type: 'string', description: 'Diretório ou arquivo onde buscar. Ex: C:/Users/USER/Desktop/projeto' },
          recursive: { type: 'boolean', description: 'Buscar recursivamente em subpastas. Padrão: true' },
          fileFilter: { type: 'string', description: 'Filtrar por extensão. Ex: ".js", ".py", ".html". Se omitido, busca em todos os arquivos de texto.' },
          caseSensitive: { type: 'boolean', description: 'Diferencia maiúsculas/minúsculas. Padrão: false' },
          maxResults: { type: 'number', description: 'Máximo de resultados. Padrão: 50' }
        },
        required: ['pattern', 'path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_files',
      description: 'Encontra arquivos por nome ou padrão glob em um diretório (equivalente ao find/Glob). Ex: "*.html", "package.json", "*config*".',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Diretório raiz onde procurar' },
          pattern: { type: 'string', description: 'Padrão de nome de arquivo. Suporta * e ?. Ex: "*.js", "*.test.*", "package.json", "*config*"' },
          recursive: { type: 'boolean', description: 'Buscar em subpastas. Padrão: true' },
          maxResults: { type: 'number', description: 'Máximo de resultados. Padrão: 100' }
        },
        required: ['path', 'pattern']
      }
    }
  },
];

const handlers = {
  async search_kb(args, ctx) {
    try {
      const kbPath = path.join(__dirname, '..', '..', 'knowledge-base', 'knowledge-search.js');
      if (!fs.existsSync(kbPath)) return 'Knowledge base não encontrada';
      const result = execSync(`node "${kbPath}" "${args.query.replace(/"/g, '\\"')}"`, {
        cwd: path.dirname(kbPath),
        timeout: 30000,
        encoding: 'utf8'
      });
      return result.substring(0, 6000) || 'Nenhum resultado encontrado';
    } catch (e) {
      return `Erro ao buscar KB: ${e.message}`;
    }
  },

  async google_search(args, ctx) {
    try {
      if (toolUtils) {
        const cached = toolUtils.getCached('google_search', args);
        if (cached) return cached;
        const result = await toolUtils.withCircuitBreaker('google_search', () =>
          toolUtils.withTimeout(googleSearch(args), 25000, 'google_search')
        );
        toolUtils.setCached('google_search', args, result);
        return result;
      }
      return await googleSearch(args);
    } catch (e) {
      return `Erro ao buscar na web: ${e.message}`;
    }
  },

  async maps_search(args, ctx) {
    try {
      if (toolUtils) {
        const cached = toolUtils.getCached('maps_search', args);
        if (cached) return cached;
        const result = await toolUtils.withCircuitBreaker('maps_search', () =>
          toolUtils.withTimeout(mapsSearch(args), 25000, 'maps_search')
        );
        toolUtils.setCached('maps_search', args, result);
        return result;
      }
      return await mapsSearch(args);
    } catch (e) {
      return `Erro ao buscar negócios: ${e.message}`;
    }
  },

  async search_in_files(args, ctx) {
    try {
      const pattern = args.pattern || '';
      const searchPath = args.path || '';
      if (!pattern) return 'Parâmetro "pattern" é obrigatório';
      if (!searchPath) return 'Parâmetro "path" é obrigatório';
      if (!fs.existsSync(searchPath)) return `Caminho não encontrado: ${searchPath}`;

      const recursive = args.recursive !== false;
      const fileFilter = args.fileFilter || null;
      const caseSensitive = args.caseSensitive === true;
      const maxResults = args.maxResults || 50;
      const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');

      const TEXT_EXTS = new Set(['.js','.ts','.jsx','.tsx','.mjs','.cjs','.json','.html','.htm','.css','.scss','.less','.md','.txt','.py','.php','.rb','.go','.rs','.java','.cs','.cpp','.c','.h','.sh','.bash','.ps1','.yaml','.yml','.toml','.ini','.env','.xml','.svg','.vue','.liquid','.njk','.ejs']);

      const results = [];

      function searchFile(filePath) {
        if (results.length >= maxResults) return;
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, i) => {
            if (results.length >= maxResults) return;
            regex.lastIndex = 0;
            if (regex.test(line)) {
              results.push(`${filePath}:${i + 1}: ${line.trimEnd().slice(0, 200)}`);
            }
          });
        } catch (_) {}
      }

      function walk(dirPath) {
        if (results.length >= maxResults) return;
        let entries;
        try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch (_) { return; }
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          const full = path.join(dirPath, entry.name);
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          if (entry.isDirectory() && recursive) { walk(full); continue; }
          if (!entry.isFile()) continue;
          const ext = path.extname(entry.name).toLowerCase();
          if (fileFilter && ext !== fileFilter) continue;
          if (!fileFilter && !TEXT_EXTS.has(ext)) continue;
          searchFile(full);
        }
      }

      const stat = fs.statSync(searchPath);
      if (stat.isDirectory()) {
        walk(searchPath);
      } else {
        searchFile(searchPath);
      }

      if (results.length === 0) return `Nenhum resultado para "${pattern}" em ${searchPath}`;
      const header = `${results.length} resultado(s)${results.length >= maxResults ? ' (limite atingido)' : ''} para "${pattern}":\n`;
      return header + results.join('\n');
    } catch (e) {
      return `Erro na busca: ${e.message}`;
    }
  },

  async find_files(args, ctx) {
    try {
      const searchPath = args.path || '';
      const pattern = args.pattern || '*';
      if (!searchPath) return 'Parâmetro "path" é obrigatório';
      if (!fs.existsSync(searchPath)) return `Diretório não encontrado: ${searchPath}`;

      const recursive = args.recursive !== false;
      const maxResults = args.maxResults || 100;
      const results = [];

      // Converte glob simples (* e ?) para regex
      function globToRegex(glob) {
        const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`, 'i');
      }
      const re = globToRegex(pattern);

      function walk(dirPath, depth = 0) {
        if (results.length >= maxResults) return;
        let entries;
        try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch (_) { return; }
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          const full = path.join(dirPath, entry.name);
          if (re.test(entry.name)) {
            try {
              const s = fs.statSync(full);
              results.push(`${full} (${entry.isDirectory() ? 'DIR' : s.size + 'B'})`);
            } catch (_) { results.push(full); }
          }
          if (entry.isDirectory() && recursive && depth < 8) walk(full, depth + 1);
        }
      }

      walk(searchPath);
      if (results.length === 0) return `Nenhum arquivo encontrado com padrão "${pattern}" em ${searchPath}`;
      return `${results.length} arquivo(s) encontrado(s)${results.length >= maxResults ? ' (limite atingido)' : ''}:\n` + results.join('\n');
    } catch (e) {
      return `Erro ao buscar arquivos: ${e.message}`;
    }
  },
};

module.exports = { definitions, handlers };
