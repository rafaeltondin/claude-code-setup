/**
 * Knowledge Base Search Engine
 * Sistema de indexação e busca em documentos Markdown
 *
 * Este módulo permite buscar informações na base de conhecimento primária
 * que deve ser usada como fonte prioritária de informações pelo Claude Code.
 */

const fs = require('fs');
const path = require('path');

// Importa sistema de cache
let cache = null;
try {
    cache = require('./kb-cache');
} catch (e) {
    // Cache não disponível, continua sem cache
}

// Diretório base da Knowledge Base
const KNOWLEDGE_BASE_DIR = path.join(__dirname);

// Dicionário de sinônimos para expansão de queries
// Termos que NÃO devem ser usados como discriminadores em queries KB
// Aparecem em tantos docs que geram falsos positivos
const STOPWORDS_KB = new Set([
    'labs', 'riwer', 'rafael', 'tondin', 'sabola',
    'completo', 'completa', 'documentacao', 'guia',
    'base', 'para', 'como', 'usar', 'sobre',
]);

const SYNONYMS = {
    'hospedagem': ['hosting', 'servidor', 'deploy', 'vps'],
    'hosting': ['hospedagem', 'servidor', 'deploy', 'vps'],
    'servidor': ['hosting', 'hospedagem', 'vps', 'server'],
    'server': ['servidor', 'hosting', 'hospedagem', 'vps'],
    'marketing': ['anuncios', 'publicidade', 'ads', 'campanha'],
    'anuncios': ['marketing', 'publicidade', 'ads', 'campanha'],
    'publicidade': ['marketing', 'anuncios', 'ads', 'campanha'],
    'ads': ['marketing', 'anuncios', 'publicidade', 'campanha'],
    'website': ['site', 'pagina', 'landing page', 'web'],
    'site': ['website', 'pagina', 'landing page', 'web'],
    'pagina': ['site', 'website', 'landing page', 'web'],
    'banco de dados': ['database', 'bd', 'sql', 'mysql', 'postgresql'],
    'database': ['banco de dados', 'bd', 'sql', 'mysql', 'postgresql'],
    'ssl': ['https', 'certificado', 'seguranca', 'tls'],
    'certificado': ['ssl', 'https', 'seguranca', 'tls'],
    'ia': ['ai', 'inteligencia artificial', 'machine learning', 'llm'],
    'ai': ['ia', 'inteligencia artificial', 'machine learning', 'llm'],
    'prompts': ['prompt engineering', 'ia', 'llm', 'chatgpt'],
    'frontend': ['front-end', 'html', 'css', 'javascript', 'ui'],
    'backend': ['back-end', 'api', 'servidor', 'database']
};

// Categorias padronizadas
const CATEGORIES = ['Infraestrutura', 'Marketing', 'Desenvolvimento', 'Shopify', 'AI', 'Documentacao', 'Automacao', 'Credenciais'];

/**
 * Logger utilitário para debugging
 */
const logger = {
    info: (msg, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[KnowledgeBase][${timestamp}] INFO: ${msg}`, data ? JSON.stringify(data) : '');
    },
    error: (msg, error = null) => {
        const timestamp = new Date().toISOString();
        console.error(`[KnowledgeBase][${timestamp}] ERROR: ${msg}`, error ? error.message : '');
        if (error?.stack) console.error(`[KnowledgeBase] Stack: ${error.stack}`);
    },
    debug: (msg, data = null) => {
        if (process.env.KB_DEBUG === 'true') {
            const timestamp = new Date().toISOString();
            console.log(`[KnowledgeBase][${timestamp}] DEBUG: ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
};

/**
 * Extrai metadados do frontmatter YAML de um arquivo Markdown
 * @param {string} content - Conteúdo do arquivo Markdown
 * @returns {Object} - Objeto com metadados e conteúdo limpo
 */
function extractFrontmatter(content) {
    logger.debug('Extraindo frontmatter do documento');

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        logger.debug('Nenhum frontmatter encontrado');
        return { metadata: {}, content: content };
    }

    const frontmatterText = match[1];
    const cleanContent = content.replace(frontmatterRegex, '');

    // Parse simples de YAML
    const metadata = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Remove aspas se existirem
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Trata arrays simples [tag1, tag2]
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim());
            }

            metadata[key] = value;
        }
    }

    logger.debug('Metadados extraídos', metadata);
    return { metadata, content: cleanContent };
}

/**
 * Lista todos os arquivos Markdown na Knowledge Base
 * @returns {Array<string>} - Array de caminhos absolutos para os arquivos .md
 */
function listKnowledgeFiles() {
    logger.info('Listando arquivos na Knowledge Base', { dir: KNOWLEDGE_BASE_DIR });

    const files = [];

    function walkDir(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Ignora pastas internas do sistema
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        walkDir(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    // Ignora o próprio arquivo de busca
                    if (entry.name !== 'knowledge-search.js') {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            logger.error(`Erro ao listar diretório ${dir}`, error);
        }
    }

    walkDir(KNOWLEDGE_BASE_DIR);
    logger.info(`Encontrados ${files.length} arquivos de conhecimento`);

    return files;
}

/**
 * Carrega e processa um documento da Knowledge Base
 * @param {string} filePath - Caminho do arquivo
 * @returns {Object|null} - Documento processado ou null se erro
 */
function loadDocument(filePath) {
    logger.debug('Carregando documento', { path: filePath });

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { metadata, content: cleanContent } = extractFrontmatter(content);

        // Extrai título do primeiro heading H1
        const titleMatch = cleanContent.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

        // Extrai seções
        const sections = [];
        const sectionRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;

        while ((match = sectionRegex.exec(cleanContent)) !== null) {
            sections.push({
                level: match[1].length,
                title: match[2],
                position: match.index
            });
        }

        const doc = {
            path: filePath,
            relativePath: path.relative(KNOWLEDGE_BASE_DIR, filePath),
            title,
            metadata,
            content: cleanContent,
            sections,
            keywords: extractKeywords(cleanContent, metadata),
            lastModified: fs.statSync(filePath).mtime
        };

        logger.debug('Documento carregado com sucesso', {
            title: doc.title,
            sections: doc.sections.length,
            keywords: doc.keywords.length
        });

        return doc;
    } catch (error) {
        logger.error(`Erro ao carregar documento ${filePath}`, error);
        return null;
    }
}

/**
 * Extrai keywords de um documento para busca
 * @param {string} content - Conteúdo do documento
 * @param {Object} metadata - Metadados do frontmatter
 * @returns {Array<string>} - Array de keywords normalizadas
 */
function extractKeywords(content, metadata) {
    const keywords = new Set();

    // Adiciona tags do frontmatter
    if (metadata.tags) {
        const tags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags];
        tags.forEach(tag => keywords.add(normalizeKeyword(tag)));
    }

    // Adiciona categoria do frontmatter
    if (metadata.category) {
        keywords.add(normalizeKeyword(metadata.category));
    }

    // Adiciona topic do frontmatter
    if (metadata.topic) {
        keywords.add(normalizeKeyword(metadata.topic));
    }

    // NOVO: Extrair do título do documento (primeiro H1)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        const titleWords = titleMatch[1].split(/\s+/);
        titleWords.forEach(word => {
            const normalized = normalizeKeyword(word);
            if (normalized.length > 2) {
                keywords.add(normalized);
            }
        });
    }

    // Extrai palavras dos headings
    const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
    headings.forEach(heading => {
        const text = heading.replace(/^#+\s+/, '');
        text.split(/\s+/).forEach(word => {
            if (word.length > 3) {
                keywords.add(normalizeKeyword(word));
            }
        });
    });

    // Extrai palavras em negrito ou itálico (geralmente importantes)
    const emphasized = content.match(/\*\*([^*]+)\*\*|\*([^*]+)\*/g) || [];
    emphasized.forEach(match => {
        const text = match.replace(/\*/g, '');
        text.split(/\s+/).forEach(word => {
            if (word.length > 3) {
                keywords.add(normalizeKeyword(word));
            }
        });
    });

    // Extrai termos técnicos em backticks
    const codeTerms = content.match(/`([^`]+)`/g) || [];
    codeTerms.forEach(match => {
        const term = match.replace(/`/g, '');
        if (term.length > 2 && term.length < 50) {
            keywords.add(normalizeKeyword(term));
        }
    });

    // NOVO: Extrair termos compostos frequentes (ex: "landing page", "plano de marketing")
    const compoundTerms = content.match(/\b[a-zA-ZÀ-ÿ]+\s+[a-zA-ZÀ-ÿ]+\b/g) || [];
    const frequencyMap = {};
    compoundTerms.forEach(term => {
        const normalized = normalizeKeyword(term);
        if (normalized.length > 5 && normalized.length < 30) {
            frequencyMap[normalized] = (frequencyMap[normalized] || 0) + 1;
        }
    });

    // Adiciona termos compostos que aparecem 3+ vezes
    Object.entries(frequencyMap).forEach(([term, count]) => {
        if (count >= 3) {
            keywords.add(term);
        }
    });

    return Array.from(keywords);
}

/**
 * Normaliza uma keyword para busca
 * @param {string} keyword - Keyword original
 * @returns {string} - Keyword normalizada
 */
function normalizeKeyword(keyword) {
    return keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '')
        .trim();
}

/**
 * Verifica se um termo aparece como palavra completa dentro de uma keyword.
 * Previne falsos positivos como "labs" matching "riwerlabs" ou "topazlabs".
 * @param {string} keyword - Keyword do documento (normalizada)
 * @param {string} term - Termo da query (normalizado)
 * @returns {boolean}
 */
function isWordMatch(keyword, term) {
    if (keyword === term) return true;
    // Divide keyword em tokens por separadores comuns e verifica igualdade exata
    const tokens = keyword.split(/[\s\-_./:]+/);
    return tokens.some(t => t === term);
}

/**
 * Calcula score de relevância entre query e documento
 * @param {string} query - Query de busca
 * @param {Object} doc - Documento carregado
 * @returns {number} - Score de relevância (0-100)
 */
function calculateRelevance(query, doc) {
    const queryTerms = query.toLowerCase().split(/\s+/)
        .map(normalizeKeyword)
        .filter(t => t.length > 3 && !STOPWORDS_KB.has(t));
    if (queryTerms.length === 0) return 0;

    let score = 0;

    // Match no título (peso alto)
    const normalizedTitle = normalizeKeyword(doc.title);
    for (const term of queryTerms) {
        if (normalizedTitle.includes(term)) {
            score += 30;
        }
    }

    // NOVO: Boost para filename match
    const normalizedFilename = normalizeKeyword(path.basename(doc.path, '.md'));
    for (const term of queryTerms) {
        if (normalizedFilename.includes(term)) {
            score += 25; // Peso alto para match no nome do arquivo
        }
    }

    // NOVO: Bonus extra para o PRIMEIRO termo da query (termo mais específico/intencional)
    // Garante que "fiber" em "fiber Riwer Labs" tenha precedência sobre "riwer"/"labs"
    const primaryTerm = queryTerms[0];
    if (normalizedTitle.includes(primaryTerm)) {
        score += 40; // Bonus extra: título contém o termo principal
    }
    if (normalizedFilename.includes(primaryTerm)) {
        score += 35; // Bonus extra: filename contém o termo principal
    }

    // Match nas keywords (peso médio-alto)
    // Usa word-boundary matching para evitar falsos positivos:
    // "labs" NÃO deve fazer match em "riwerlabs"; "fiber" SIM deve fazer match em "fiber"
    const cappedKeywords = doc.keywords.slice(0, 300); // Limitar a 300 para evitar blowup quadrático
    for (const term of queryTerms) {
        for (const keyword of cappedKeywords) {
            if (isWordMatch(keyword, term)) {
                score += 20;
            }
        }
    }

    // Match no conteúdo (peso médio)
    const normalizedContent = normalizeKeyword(doc.content);
    for (const term of queryTerms) {
        const regex = new RegExp(term, 'gi');
        const matches = normalizedContent.match(regex);
        if (matches) {
            score += Math.min(matches.length * 2, 20);
        }
    }

    // Match nos metadados (peso médio)
    const metadataStr = JSON.stringify(doc.metadata).toLowerCase();
    for (const term of queryTerms) {
        if (metadataStr.includes(term)) {
            score += 15;
        }
    }

    // Match em headings de seções (peso médio)
    for (const section of doc.sections) {
        const normalizedSectionTitle = normalizeKeyword(section.title);
        for (const term of queryTerms) {
            if (normalizedSectionTitle.includes(term)) {
                score += 10;
            }
        }
    }

    // NOVO: Penalizar documentos genéricos de API/documentação completa
    const genericTerms = ['documentacao completa', 'api', 'guia completo'];
    let isGeneric = false;
    for (const genericTerm of genericTerms) {
        if (normalizedTitle.includes(genericTerm) || normalizedFilename.includes(genericTerm.replace(/\s+/g, ''))) {
            isGeneric = true;
            break;
        }
    }

    // Penaliza docs genéricos apenas se não houver match direto nos termos da query
    if (isGeneric) {
        let hasDirectMatch = false;
        for (const term of queryTerms) {
            // Verifica se o termo da query está no título ou filename (match direto)
            if (normalizedTitle.split(/\s+/).includes(term) || normalizedFilename.split(/\s+/).includes(term)) {
                hasDirectMatch = true;
                break;
            }
        }

        // Se não houver match direto, penaliza
        if (!hasDirectMatch) {
            score *= 0.7; // Reduz 30% do score
        }
    }

    return Math.round(score);
}

/**
 * Extrai trecho relevante do documento baseado na query
 * @param {Object} doc - Documento carregado
 * @param {string} query - Query de busca
 * @param {number} contextSize - Tamanho do contexto em caracteres
 * @returns {string} - Trecho relevante
 */
function extractRelevantSnippet(doc, query, contextSize = 500) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const content = doc.content;

    // Encontra a primeira ocorrência de qualquer termo
    let bestPosition = -1;
    let bestTerm = '';

    for (const term of queryTerms) {
        const pos = content.toLowerCase().indexOf(term);
        if (pos !== -1 && (bestPosition === -1 || pos < bestPosition)) {
            bestPosition = pos;
            bestTerm = term;
        }
    }

    if (bestPosition === -1) {
        // Retorna o início do documento se não encontrar termo
        return content.substring(0, contextSize) + (content.length > contextSize ? '...' : '');
    }

    // Extrai contexto ao redor da primeira ocorrência
    const start = Math.max(0, bestPosition - contextSize / 2);
    const end = Math.min(content.length, bestPosition + contextSize / 2);

    let snippet = content.substring(start, end);

    // Ajusta para não cortar palavras
    if (start > 0) {
        const firstSpace = snippet.indexOf(' ');
        if (firstSpace > 0) {
            snippet = '...' + snippet.substring(firstSpace + 1);
        }
    }

    if (end < content.length) {
        const lastSpace = snippet.lastIndexOf(' ');
        if (lastSpace > 0) {
            snippet = snippet.substring(0, lastSpace) + '...';
        }
    }

    return snippet;
}

/**
 * Expande query com sinônimos
 * @param {string} query - Query original
 * @returns {string} - Query expandida com sinônimos
 */
function expandQueryWithSynonyms(query) {
    const queryLower = query.toLowerCase();
    const expandedTerms = new Set([query]);

    // Adiciona a query original
    const queryWords = queryLower.split(/\s+/);

    // Para cada palavra da query, adiciona sinônimos
    for (const word of queryWords) {
        const normalized = normalizeKeyword(word);
        if (SYNONYMS[normalized]) {
            SYNONYMS[normalized].forEach(synonym => expandedTerms.add(synonym));
        }
    }

    // Para termos compostos
    const normalizedQuery = normalizeKeyword(queryLower);
    if (SYNONYMS[normalizedQuery]) {
        SYNONYMS[normalizedQuery].forEach(synonym => expandedTerms.add(synonym));
    }

    return Array.from(expandedTerms).join(' ');
}

/**
 * Busca documentos relevantes na Knowledge Base
 * @param {string} query - Query de busca
 * @param {Object} options - Opções de busca
 * @returns {Array<Object>} - Array de resultados ordenados por relevância
 */
function search(query, options = {}) {
    const {
        maxResults = 5,
        minScore = 10,
        includeContent = true,
        snippetSize = 500,
        category = null  // NOVO: Filtro por categoria
    } = options;

    logger.info('Iniciando busca na Knowledge Base', { query, options });

    // Verifica cache de busca
    if (cache) {
        cache.cleanupCache();
        const cacheKey = cache.generateSearchKey(query, options);
        const cachedResults = cache.loadSearchCache(cacheKey);
        if (cachedResults) {
            logger.info('Cache HIT - retornando resultados do cache');
            return cachedResults;
        }
        logger.debug('Cache MISS - executando busca');
    }

    // NOVO: Expande query com sinônimos
    const expandedQuery = expandQueryWithSynonyms(query);
    logger.debug('Query expandida com sinônimos', { original: query, expanded: expandedQuery });

    const files = listKnowledgeFiles();

    if (files.length === 0) {
        logger.info('Nenhum documento encontrado na Knowledge Base');
        return [];
    }

    const results = [];

    for (const filePath of files) {
        const doc = loadDocument(filePath);

        if (!doc) continue;

        // NOVO: Filtro por categoria
        if (category && doc.metadata.category !== category) {
            logger.debug(`Documento filtrado por categoria`, { doc: doc.relativePath, category: doc.metadata.category });
            continue;
        }

        // Calcula relevância com query expandida
        const score = calculateRelevance(expandedQuery, doc);

        if (score >= minScore) {
            const result = {
                path: doc.relativePath,
                title: doc.title,
                score,          // raw score for sorting
                displayScore: Math.min(score, 100),  // capped for display
                metadata: doc.metadata,
                sections: doc.sections.map(s => s.title)
            };

            if (includeContent) {
                result.snippet = extractRelevantSnippet(doc, expandedQuery, snippetSize);
                result.fullContent = doc.content;
            }

            results.push(result);
        }
    }

    // Ordenação por raw score (sem cap), depois por especificidade do título, depois por data
    results.sort((a, b) => {
        // Primeiro por raw score (sem cap — docs com mais matches no título ganham)
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        // Em caso de empate, priorizar docs mais específicos (sem "completo"/"documentacao" genérico)
        const aIsGeneric = a.title.toLowerCase().includes('completo') ||
                           a.title.toLowerCase().includes('documentacao') ||
                           a.path.toLowerCase().includes('documentacao-completa');
        const bIsGeneric = b.title.toLowerCase().includes('completo') ||
                           b.title.toLowerCase().includes('documentacao') ||
                           b.path.toLowerCase().includes('documentacao-completa');

        if (aIsGeneric && !bIsGeneric) return 1;
        if (!aIsGeneric && bIsGeneric) return -1;

        // Por último, por data de modificação (mais recente primeiro)
        return new Date(b.metadata.last_updated || 0) - new Date(a.metadata.last_updated || 0);
    });

    // Limita resultados
    const limitedResults = results.slice(0, maxResults);

    logger.info(`Busca concluída: ${limitedResults.length} resultados encontrados`, {
        totalDocs: files.length,
        matchingDocs: results.length,
        returnedDocs: limitedResults.length
    });

    // Salva no cache
    if (cache) {
        const cacheKey = cache.generateSearchKey(query, options);
        cache.saveSearchCache(cacheKey, limitedResults);
        logger.debug('Resultados salvos no cache');
    }

    return limitedResults;
}

/**
 * Formata resultados de busca para uso pelo Claude Code
 * @param {Array<Object>} results - Resultados da busca
 * @param {string} query - Query original
 * @returns {string} - Texto formatado para contexto
 */
function formatResultsForContext(results, query) {
    if (results.length === 0) {
        return `[Knowledge Base] Nenhum documento encontrado para: "${query}"\n`;
    }

    let output = `\n=== KNOWLEDGE BASE - FONTE PRIMÁRIA DE CONHECIMENTO ===\n`;
    output += `Query: "${query}"\n`;
    output += `Documentos encontrados: ${results.length}\n`;
    output += `IMPORTANTE: Use ESTAS informações como base primária para sua resposta.\n`;
    output += `==========================================\n\n`;

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        output += `--- Documento ${i + 1}: ${result.title} ---\n`;
        output += `Arquivo: ${result.path}\n`;
        output += `Relevância: ${result.displayScore ?? Math.min(result.score, 100)}%\n`;

        if (result.metadata && Object.keys(result.metadata).length > 0) {
            output += `Metadados: ${JSON.stringify(result.metadata)}\n`;
        }

        if (result.sections && result.sections.length > 0) {
            output += `Seções: ${result.sections.join(', ')}\n`;
        }

        output += `\nConteúdo:\n${result.fullContent || result.snippet}\n`;
        output += `\n--- Fim do Documento ${i + 1} ---\n\n`;
    }

    output += `=== FIM DA KNOWLEDGE BASE ===\n\n`;
    output += `INSTRUÇÃO: Baseie sua resposta PRIORITARIAMENTE nas informações acima.\n`;
    output += `Se a informação não estiver na Knowledge Base, você pode complementar com seu conhecimento geral.\n\n`;

    return output;
}

/**
 * Função principal de busca para uso externo
 * @param {string} query - Query de busca
 * @returns {string} - Contexto formatado para Claude Code
 */
function searchAndFormat(query) {
    logger.info('searchAndFormat chamado', { query });

    const results = search(query, {
        maxResults: 5,
        minScore: 5,
        includeContent: true,
        snippetSize: 1000
    });

    return formatResultsForContext(results, query);
}

/**
 * Lista todos os tópicos disponíveis na Knowledge Base
 * @returns {Array<Object>} - Array de tópicos com metadados
 */
function listTopics() {
    logger.info('Listando todos os tópicos da Knowledge Base');

    const files = listKnowledgeFiles();
    const topics = [];

    for (const filePath of files) {
        const doc = loadDocument(filePath);
        if (doc) {
            topics.push({
                path: doc.relativePath,
                title: doc.title,
                metadata: doc.metadata,  // CORRIGIDO: Retorna metadata completo
                category: doc.metadata.category || 'Geral',
                tags: doc.metadata.tags || [],
                sections: doc.sections.map(s => s.title)
            });
        }
    }

    logger.info(`Total de ${topics.length} tópicos encontrados`);
    return topics;
}

/**
 * Retorna estatísticas do cache e da KB
 * @returns {Object} - Estatísticas
 */
function getStats() {
    const files = listKnowledgeFiles();
    const cacheStats = cache ? cache.getStats() : { indexCached: false, searchesCached: 0 };

    return {
        totalDocuments: files.length,
        ...cacheStats,
        cacheEnabled: cache !== null
    };
}

/**
 * Invalida o cache (usar quando KB muda)
 */
function invalidateCache() {
    if (cache) {
        cache.invalidateAll();
    }
}

// Exporta funções para uso externo
module.exports = {
    search,
    searchAndFormat,
    listTopics,
    listKnowledgeFiles,
    loadDocument,
    extractKeywords,
    getStats,
    invalidateCache,
    KNOWLEDGE_BASE_DIR
};

// Se executado diretamente, executa busca de teste
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Uso: node knowledge-search.js <query> [--category=<categoria>]');
        console.log('\nOpções:');
        console.log('  --category=<categoria>  Filtrar por categoria específica');
        console.log('\nCategorias disponíveis:');
        CATEGORIES.forEach(cat => console.log(`  - ${cat}`));
        console.log('\nTópicos disponíveis:');
        const topics = listTopics();

        if (topics.length === 0) {
            console.log('  (Nenhum documento na Knowledge Base ainda)');
            console.log('\nPara adicionar documentos:');
            console.log('  1. Crie arquivos .md na pasta knowledge-base/');
            console.log('  2. Use frontmatter YAML para metadados (opcional)');
            console.log('  3. Organize por pastas/categorias se desejar');
        } else {
            // Agrupa por categoria
            const byCategory = {};
            topics.forEach(t => {
                const cat = t.metadata.category || 'Sem categoria';
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(t);
            });

            Object.keys(byCategory).sort().forEach(cat => {
                console.log(`\n  ${cat}:`);
                byCategory[cat].forEach(t => {
                    console.log(`    - ${t.title}`);
                });
            });
        }
    } else {
        // Extrai categoria se fornecida
        let category = null;
        const queryArgs = [];

        for (const arg of args) {
            if (arg.startsWith('--category=')) {
                category = arg.substring('--category='.length);
            } else {
                queryArgs.push(arg);
            }
        }

        const query = queryArgs.join(' ');

        if (category) {
            // Busca com filtro de categoria
            const results = search(query, {
                maxResults: 5,
                minScore: 5,
                includeContent: true,
                snippetSize: 1000,
                category: category
            });

            if (results.length === 0) {
                console.log(`\n❌ Nenhum resultado encontrado para "${query}" na categoria "${category}"`);
                console.log(`\nCategorias disponíveis: ${CATEGORIES.join(', ')}`);
            } else {
                console.log(`\n✅ ${results.length} documento(s) encontrado(s) - Categoria: ${category}\n`);
                results.forEach((r, i) => {
                    console.log(`${i + 1}. ${r.title} (${r.score}%)`);
                });
            }
        } else {
            // Busca normal
            const context = searchAndFormat(query);
            console.log(context);
        }
    }
}
