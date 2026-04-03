const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE_DIR = __dirname;

function normalizeKeyword(keyword) {
    return keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim();
}

function extractFrontmatter(content) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { metadata: {}, content: content };
    }

    const frontmatterText = match[1];
    const cleanContent = content.replace(frontmatterRegex, '');
    const metadata = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim());
            }
            metadata[key] = value;
        }
    }

    return { metadata, content: cleanContent };
}

function extractKeywords(content, metadata) {
    const keywords = new Set();

    if (metadata.tags) {
        const tags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags];
        tags.forEach(tag => keywords.add(normalizeKeyword(tag)));
    }

    if (metadata.category) {
        keywords.add(normalizeKeyword(metadata.category));
    }

    if (metadata.topic) {
        keywords.add(normalizeKeyword(metadata.topic));
    }

    const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
    headings.forEach(heading => {
        const text = heading.replace(/^#+\s+/, '');
        text.split(/\s+/).forEach(word => {
            if (word.length > 3) {
                keywords.add(normalizeKeyword(word));
            }
        });
    });

    const emphasized = content.match(/\*\*([^*]+)\*\*|\*([^*]+)\*/g) || [];
    emphasized.forEach(match => {
        const text = match.replace(/\*/g, '');
        text.split(/\s+/).forEach(word => {
            if (word.length > 3) {
                keywords.add(normalizeKeyword(word));
            }
        });
    });

    const codeTerms = content.match(/`([^`]+)`/g) || [];
    codeTerms.forEach(match => {
        const term = match.replace(/`/g, '');
        if (term.length > 2 && term.length < 50) {
            keywords.add(normalizeKeyword(term));
        }
    });

    return Array.from(keywords);
}

function loadDocument(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { metadata, content: cleanContent } = extractFrontmatter(content);

        const titleMatch = cleanContent.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

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

        return doc;
    } catch (error) {
        console.error(`Erro ao carregar documento ${filePath}:`, error.message);
        return null;
    }
}

function calculateRelevance(query, doc) {
    const queryTerms = query.toLowerCase().split(/\s+/).map(normalizeKeyword).filter(t => t.length > 2);
    let score = 0;
    const debug = {
        queryTerms,
        titleMatches: [],
        keywordMatches: [],
        contentMatches: [],
        metadataMatches: [],
        sectionMatches: []
    };

    // Match no título (peso alto)
    const normalizedTitle = normalizeKeyword(doc.title);
    for (const term of queryTerms) {
        if (normalizedTitle.includes(term)) {
            score += 30;
            debug.titleMatches.push({ term, score: 30 });
        }
    }

    // Match nas keywords (peso médio-alto)
    for (const term of queryTerms) {
        for (const keyword of doc.keywords) {
            if (keyword.includes(term) || term.includes(keyword)) {
                score += 20;
                debug.keywordMatches.push({ term, keyword, score: 20 });
            }
        }
    }

    // Match no conteúdo (peso médio)
    const normalizedContent = normalizeKeyword(doc.content);
    for (const term of queryTerms) {
        const regex = new RegExp(term, 'gi');
        const matches = normalizedContent.match(regex);
        if (matches) {
            const addedScore = Math.min(matches.length * 2, 20);
            score += addedScore;
            debug.contentMatches.push({ term, count: matches.length, score: addedScore });
        }
    }

    // Match nos metadados (peso médio)
    const metadataStr = JSON.stringify(doc.metadata).toLowerCase();
    for (const term of queryTerms) {
        if (metadataStr.includes(term)) {
            score += 15;
            debug.metadataMatches.push({ term, score: 15 });
        }
    }

    // Match em headings de seções (peso médio)
    for (const section of doc.sections) {
        const normalizedSectionTitle = normalizeKeyword(section.title);
        for (const term of queryTerms) {
            if (normalizedSectionTitle.includes(term)) {
                score += 10;
                debug.sectionMatches.push({ term, section: section.title, score: 10 });
            }
        }
    }

    debug.totalScore = Math.min(score, 100);
    return debug;
}

// TESTE
const testQueries = [
    "credenciais servidor SSH FTP",
    "beliscai.click cyberpanel artedente",
    "cyberpanel hospedagem dominio deploy",
    "marketing landing page"
];

const targetDocs = [
    "MEU_SERVIDOR_CYBERPANEL.md",
    "MARKETING-DIGITAL-PLANO-GUIA-COMPLETO.md",
    "LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md"
];

console.log("===== TESTE DE RELEVÂNCIA - KNOWLEDGE BASE =====\n");

targetDocs.forEach(docName => {
    const docPath = path.join(KNOWLEDGE_BASE_DIR, docName);

    if (!fs.existsSync(docPath)) {
        console.log(`ARQUIVO NÃO ENCONTRADO: ${docName}\n`);
        return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`DOCUMENTO: ${docName}`);
    console.log(`${'='.repeat(80)}\n`);

    const doc = loadDocument(docPath);

    if (!doc) {
        console.log(`ERRO ao carregar documento\n`);
        return;
    }

    console.log(`Título: ${doc.title}`);
    console.log(`Metadata:`, doc.metadata);
    console.log(`Total de Keywords: ${doc.keywords.length}`);
    console.log(`Primeiras 50 Keywords:`, doc.keywords.slice(0, 50).join(', '));
    console.log(`\n`);

    testQueries.forEach(query => {
        console.log(`\n${'-'.repeat(80)}`);
        console.log(`QUERY: "${query}"`);
        console.log(`${'-'.repeat(80)}\n`);

        const debug = calculateRelevance(query, doc);

        console.log(`Query Terms:`, debug.queryTerms);
        console.log(`\nSCORE TOTAL: ${debug.totalScore}`);
        console.log(`\nDETALHES DO SCORE:`);
        console.log(`  - Title Matches (30 pts cada):`, debug.titleMatches);
        console.log(`  - Keyword Matches (20 pts cada):`, debug.keywordMatches.slice(0, 10), debug.keywordMatches.length > 10 ? `... (+${debug.keywordMatches.length - 10} mais)` : '');
        console.log(`  - Content Matches (2 pts/match, max 20):`, debug.contentMatches);
        console.log(`  - Metadata Matches (15 pts cada):`, debug.metadataMatches);
        console.log(`  - Section Matches (10 pts cada):`, debug.sectionMatches.slice(0, 10), debug.sectionMatches.length > 10 ? `... (+${debug.sectionMatches.length - 10} mais)` : '');
    });

    console.log(`\n`);
});

console.log("\n===== FIM DO TESTE =====\n");
