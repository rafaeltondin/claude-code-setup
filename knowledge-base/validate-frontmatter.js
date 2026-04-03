/**
 * Script de Validação de Frontmatter da Knowledge Base
 *
 * Verifica se todos os documentos .md possuem frontmatter completo
 * e alerta sobre campos obrigatórios faltantes.
 */

const fs = require('fs');
const path = require('path');

// Diretório da Knowledge Base
const KNOWLEDGE_BASE_DIR = path.join(__dirname);

// Campos obrigatórios
const REQUIRED_FIELDS = ['title', 'category', 'tags'];

// Campos recomendados
const RECOMMENDED_FIELDS = ['topic', 'priority', 'last_updated'];

/**
 * Extrai frontmatter de um arquivo Markdown
 */
function extractFrontmatter(content) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return null;
    }

    const frontmatterText = match[1];
    const metadata = {};
    const lines = frontmatterText.split('\n');
    let currentKey = null;
    let currentArray = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(':');

        // Verifica se é um item de array YAML (começa com '-')
        if (line.trim().startsWith('-') && currentArray) {
            const item = line.trim().substring(1).trim();
            if (item) {
                currentArray.push(item);
            }
            continue;
        }

        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Finaliza array anterior se existir
            if (currentArray && currentKey) {
                metadata[currentKey] = currentArray;
                currentArray = null;
                currentKey = null;
            }

            // Remove aspas
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Trata arrays inline [tag1, tag2]
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim());
                metadata[key] = value;
            }
            // Verifica se é início de array YAML (valor vazio após ':')
            else if (value === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
                currentKey = key;
                currentArray = [];
            }
            // Valor simples
            else {
                metadata[key] = value;
            }
        }
    }

    // Finaliza último array se existir
    if (currentArray && currentKey) {
        metadata[currentKey] = currentArray;
    }

    return metadata;
}

/**
 * Lista todos os arquivos .md na Knowledge Base
 */
function listMarkdownFiles() {
    const files = [];

    function walkDir(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        walkDir(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    // Ignora arquivos de sistema
                    if (!entry.name.startsWith('.') &&
                        entry.name !== 'knowledge-search.js' &&
                        entry.name !== 'validate-frontmatter.js') {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Erro ao listar diretório ${dir}:`, error.message);
        }
    }

    walkDir(KNOWLEDGE_BASE_DIR);
    return files;
}

/**
 * Valida frontmatter de um documento
 */
function validateDocument(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(KNOWLEDGE_BASE_DIR, filePath);
    const metadata = extractFrontmatter(content);

    const issues = [];
    const warnings = [];

    // Verifica se tem frontmatter
    if (!metadata) {
        issues.push('❌ CRÍTICO: Frontmatter ausente');
        return { path: relativePath, issues, warnings, metadata: null };
    }

    // Verifica campos obrigatórios
    for (const field of REQUIRED_FIELDS) {
        if (!metadata[field]) {
            issues.push(`❌ OBRIGATÓRIO: Campo "${field}" ausente`);
        } else if (Array.isArray(metadata[field]) && metadata[field].length === 0) {
            issues.push(`❌ OBRIGATÓRIO: Campo "${field}" está vazio`);
        }
    }

    // Verifica campos recomendados
    for (const field of RECOMMENDED_FIELDS) {
        if (!metadata[field]) {
            warnings.push(`⚠️  RECOMENDADO: Campo "${field}" ausente`);
        }
    }

    // Validações específicas
    if (metadata.tags) {
        const tags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags];
        if (tags.length < 3) {
            warnings.push(`⚠️  RECOMENDADO: Adicionar mais tags (mínimo 3, atual: ${tags.length})`);
        }
        if (tags.length > 20) {
            warnings.push(`⚠️  ATENÇÃO: Muitas tags (máximo recomendado: 20, atual: ${tags.length})`);
        }
    }

    if (metadata.priority && !['low', 'medium', 'high'].includes(metadata.priority.toLowerCase())) {
        warnings.push(`⚠️  ATENÇÃO: Priority deve ser "low", "medium" ou "high"`);
    }

    return { path: relativePath, issues, warnings, metadata };
}

/**
 * Executa validação completa
 */
function runValidation() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  KNOWLEDGE BASE - VALIDAÇÃO DE FRONTMATTER              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const files = listMarkdownFiles();

    if (files.length === 0) {
        console.log('⚠️  Nenhum arquivo .md encontrado na Knowledge Base\n');
        return;
    }

    console.log(`📚 Total de documentos: ${files.length}\n`);

    let totalIssues = 0;
    let totalWarnings = 0;
    const problemDocs = [];

    for (const filePath of files) {
        const result = validateDocument(filePath);

        if (result.issues.length > 0 || result.warnings.length > 0) {
            problemDocs.push(result);
            totalIssues += result.issues.length;
            totalWarnings += result.warnings.length;
        }
    }

    // Exibe documentos com problemas
    if (problemDocs.length > 0) {
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('❌ DOCUMENTOS COM PROBLEMAS:\n');

        for (const doc of problemDocs) {
            console.log(`📄 ${doc.path}`);

            if (doc.issues.length > 0) {
                console.log('   Issues críticos:');
                doc.issues.forEach(issue => console.log(`      ${issue}`));
            }

            if (doc.warnings.length > 0) {
                console.log('   Avisos:');
                doc.warnings.forEach(warning => console.log(`      ${warning}`));
            }

            console.log();
        }
    }

    // Resumo final
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 RESUMO DA VALIDAÇÃO:\n');

    const validDocs = files.length - problemDocs.length;
    const validPercentage = ((validDocs / files.length) * 100).toFixed(1);

    console.log(`   ✅ Documentos válidos: ${validDocs}/${files.length} (${validPercentage}%)`);
    console.log(`   ❌ Issues críticos: ${totalIssues}`);
    console.log(`   ⚠️  Avisos: ${totalWarnings}`);
    console.log();

    if (problemDocs.length === 0) {
        console.log('🎉 PARABÉNS! Todos os documentos estão com frontmatter completo!\n');
    } else {
        console.log('📝 AÇÃO NECESSÁRIA: Corrija os issues críticos nos documentos listados acima.\n');
        console.log('💡 DICA: Use o template abaixo para adicionar frontmatter:\n');
        console.log('---');
        console.log('title: "Título do Documento"');
        console.log('category: "Categoria"');
        console.log('tags:');
        console.log('  - tag1');
        console.log('  - tag2');
        console.log('  - tag3');
        console.log('topic: "Tópico Principal"');
        console.log('priority: high');
        console.log('last_updated: "2025-12-23"');
        console.log('---\n');
    }

    // Exit code
    process.exit(problemDocs.length > 0 ? 1 : 0);
}

// Executa validação
if (require.main === module) {
    runValidation();
}

module.exports = {
    validateDocument,
    listMarkdownFiles,
    extractFrontmatter
};
