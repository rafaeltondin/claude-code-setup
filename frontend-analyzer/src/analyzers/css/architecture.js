import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

/**
 * Analisa arquitetura e organização do CSS (imports, seletores, consistência)
 * @param {Array} cssFiles - Array de objetos CSS parseados
 * @returns {Array<Issue>} - Array de issues detectados
 */
export function analyzeArchitecture(cssFiles) {
    console.log('[ArchitectureAnalyzer] INÍCIO', {
        totalArquivos: cssFiles.length,
        timestamp: new Date().toISOString()
    });

    const issues = [];

    // Contadores globais
    const allFontSizes = new Set();
    const allColors = new Set();

    cssFiles.forEach((file, fileIndex) => {
        console.log(`[ArchitectureAnalyzer] Processando arquivo ${fileIndex + 1}/${cssFiles.length}`, {
            arquivo: file.path
        });

        if (!file.parsed || !file.parsed.ast) {
            console.log(`[ArchitectureAnalyzer] Arquivo sem AST`, { arquivo: file.path });
            return;
        }

        // REGRA 1: css-import-usage
        console.log(`[ArchitectureAnalyzer] [${file.path}] Verificando @import...`);

        file.parsed.ast.walkAtRules('import', (atRule) => {
            console.log(`[ArchitectureAnalyzer] [${file.path}] @import encontrado`, {
                params: atRule.params,
                linha: atRule.source?.start?.line
            });

            issues.push(new Issue({
                type: 'css-import-usage',
                severity: SEVERITY.HIGH,
                category: CATEGORY.PERFORMANCE,
                message: `@import detected in CSS file`,
                description: `@import blocks rendering and creates a request chain (serial loading). The browser can't discover imported stylesheets until it downloads and parses the parent CSS, causing render delays.`,
                location: {
                    file: file.path,
                    line: atRule.source?.start?.line || 0,
                    column: atRule.source?.start?.column || 0
                },
                codeSnippet: `@import ${atRule.params};`,
                suggestion: `Use <link> tags in HTML instead of @import. This allows parallel downloads: <link rel="stylesheet" href="...">`
            }));
        });

        // REGRA 2: empty-rules
        console.log(`[ArchitectureAnalyzer] [${file.path}] Verificando regras vazias...`);

        file.parsed.ast.walkRules((rule) => {
            const declarationCount = rule.nodes?.filter(n => n.type === 'decl').length || 0;

            if (declarationCount === 0) {
                console.log(`[ArchitectureAnalyzer] [${file.path}] Regra vazia`, {
                    seletor: rule.selector,
                    linha: rule.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'empty-rules',
                    severity: SEVERITY.LOW,
                    category: CATEGORY.CSS,
                    message: `Empty CSS rule: '${rule.selector}'`,
                    description: `The rule '${rule.selector}' has no declarations. This is dead code that increases file size unnecessarily.`,
                    location: {
                        file: file.path,
                        line: rule.source?.start?.line || 0,
                        column: rule.source?.start?.column || 0
                    },
                    codeSnippet: `${rule.selector} { /* empty */ }`,
                    suggestion: `Remove this empty rule or add declarations to it.`
                }));
            }
        });

        // REGRA 3: id-in-selector
        console.log(`[ArchitectureAnalyzer] [${file.path}] Verificando IDs em seletores...`);

        file.parsed.ast.walkRules((rule) => {
            if (/#[a-zA-Z]/.test(rule.selector)) {
                console.log(`[ArchitectureAnalyzer] [${file.path}] ID em seletor`, {
                    seletor: rule.selector,
                    linha: rule.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'id-in-selector',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.CSS,
                    message: `ID selector used: '${rule.selector}'`,
                    description: `ID selectors have very high specificity (0,1,0,0), making styles hard to override. This creates maintainability issues and specificity wars.`,
                    location: {
                        file: file.path,
                        line: rule.source?.start?.line || 0,
                        column: rule.source?.start?.column || 0
                    },
                    codeSnippet: `${rule.selector} { ... }`,
                    suggestion: `Use classes instead of IDs for styling. IDs should be reserved for JavaScript hooks and fragment identifiers.`
                }));
            }
        });

        // REGRA 4: qualified-selector
        console.log(`[ArchitectureAnalyzer] [${file.path}] Verificando seletores qualificados...`);

        file.parsed.ast.walkRules((rule) => {
            // Selecionar partes do seletor separadas por vírgula, espaço, >, +, ~
            const selectorParts = rule.selector.split(/[\s,>+~]+/);

            selectorParts.forEach(part => {
                // Detectar tag + class/id: div.class, a#id, span.text
                if (/^[a-z]+[.#]/i.test(part.trim())) {
                    console.log(`[ArchitectureAnalyzer] [${file.path}] Seletor qualificado`, {
                        seletor: rule.selector,
                        parte: part,
                        linha: rule.source?.start?.line
                    });

                    issues.push(new Issue({
                        type: 'qualified-selector',
                        severity: SEVERITY.LOW,
                        category: CATEGORY.CSS,
                        message: `Qualified selector: '${part}' in '${rule.selector}'`,
                        description: `Tag qualifying a class/ID (like '${part}') is unnecessary. Classes and IDs are already unique enough. This increases specificity needlessly and hurts performance slightly.`,
                        location: {
                            file: file.path,
                            line: rule.source?.start?.line || 0,
                            column: rule.source?.start?.column || 0
                        },
                        codeSnippet: `${rule.selector} { ... }`,
                        suggestion: `Remove the tag qualifier. Use '${part.substring(part.search(/[.#]/))}' instead of '${part}'.`
                    }));
                }
            });
        });

        // REGRA 5: float-for-layout
        console.log(`[ArchitectureAnalyzer] [${file.path}] Verificando float para layout...`);

        file.parsed.ast.walkDecls('float', (decl) => {
            if (decl.value === 'left' || decl.value === 'right') {
                console.log(`[ArchitectureAnalyzer] [${file.path}] float usado para layout`, {
                    valor: decl.value,
                    linha: decl.source?.start?.line,
                    seletor: decl.parent?.selector
                });

                issues.push(new Issue({
                    type: 'float-for-layout',
                    severity: SEVERITY.LOW,
                    category: CATEGORY.CSS,
                    message: `float: ${decl.value} used for layout`,
                    description: `Using 'float' for layout is an outdated technique from the pre-Flexbox/Grid era. Floats were designed for wrapping text around images, not for page layout.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `${decl.parent?.selector || 'selector'} {\n  float: ${decl.value};\n}`,
                    suggestion: `Use modern layout techniques: 'display: flex;' for one-dimensional layouts or 'display: grid;' for two-dimensional layouts.`
                }));
            }
        });

        // REGRA 6 e 7: Coletar font-sizes e colors globalmente
        console.log(`[ArchitectureAnalyzer] [${file.path}] Coletando font-sizes e cores...`);

        file.parsed.ast.walkDecls((decl) => {
            // Coletar font-sizes
            if (decl.prop === 'font-size') {
                allFontSizes.add(decl.value.trim());
            }

            // Coletar cores
            if (['color', 'background-color', 'border-color'].includes(decl.prop)) {
                // Normalizar valores de cor
                const colorValue = decl.value.trim().toLowerCase();

                // Ignorar valores como 'transparent', 'inherit', 'currentColor'
                if (!['transparent', 'inherit', 'currentcolor', 'initial', 'unset'].includes(colorValue)) {
                    allColors.add(colorValue);
                }
            }

            // Extrair cores de propriedades shorthand
            if (decl.prop === 'background') {
                // background pode conter cores: background: red url(...) repeat
                const colorMatch = decl.value.match(/#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-z]+/gi);
                if (colorMatch) {
                    colorMatch.forEach(c => {
                        const normalized = c.trim().toLowerCase();
                        if (!['transparent', 'inherit', 'currentcolor', 'initial', 'unset', 'no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'cover', 'contain', 'center', 'top', 'bottom', 'left', 'right'].includes(normalized)) {
                            allColors.add(normalized);
                        }
                    });
                }
            }

            if (decl.prop === 'border') {
                // border: 1px solid red
                const colorMatch = decl.value.match(/#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-z]+/gi);
                if (colorMatch) {
                    colorMatch.forEach(c => {
                        const normalized = c.trim().toLowerCase();
                        if (!['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden', 'transparent', 'inherit', 'currentcolor', 'initial', 'unset'].includes(normalized)) {
                            allColors.add(normalized);
                        }
                    });
                }
            }
        });

        // REGRA 8: commented-code-blocks
        console.log(`[ArchitectureAnalyzer] [${file.path}] Verificando blocos de código comentados...`);

        if (file.content) {
            // Encontrar blocos de comentários grandes
            const commentRegex = /\/\*[\s\S]{200,}?\*\//g;
            const commentMatches = file.content.matchAll(commentRegex);

            for (const match of commentMatches) {
                const commentContent = match[0];

                // Verificar se o comentário contém código CSS (seletores, chaves, declarações)
                const hasSelectors = /[a-z.-_#][a-z0-9-_]*\s*\{/i.test(commentContent);
                const hasDeclarations = /[a-z-]+\s*:\s*[^;]+;/i.test(commentContent);

                if (hasSelectors || hasDeclarations) {
                    // Calcular linha aproximada
                    const beforeComment = file.content.substring(0, match.index);
                    const lineNumber = (beforeComment.match(/\n/g) || []).length + 1;

                    console.log(`[ArchitectureAnalyzer] [${file.path}] Bloco de código comentado`, {
                        tamanho: commentContent.length,
                        linha: lineNumber
                    });

                    issues.push(new Issue({
                        type: 'commented-code-blocks',
                        severity: SEVERITY.LOW,
                        category: CATEGORY.CSS,
                        message: `Large commented code block detected`,
                        description: `Found a ${commentContent.length}-character comment block that appears to contain CSS code. Commented-out code should be removed, not left in the codebase. Use version control (git) to track old code.`,
                        location: {
                            file: file.path,
                            line: lineNumber,
                            column: 0
                        },
                        codeSnippet: commentContent.substring(0, 200) + (commentContent.length > 200 ? '...' : ''),
                        suggestion: `Remove commented code. If you need to keep it for reference, use git history instead.`
                    }));
                }
            }
        }
    });

    // REGRA 6: too-many-font-sizes (global check)
    console.log('[ArchitectureAnalyzer] Verificação global: too-many-font-sizes', {
        totalFontSizes: allFontSizes.size
    });

    if (allFontSizes.size > 10) {
        console.log(`[ArchitectureAnalyzer] Muitos font-sizes diferentes`, {
            total: allFontSizes.size,
            limite: 10,
            valores: Array.from(allFontSizes)
        });

        issues.push(new Issue({
            type: 'too-many-font-sizes',
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            message: `Too many unique font-sizes (${allFontSizes.size} found)`,
            description: `Found ${allFontSizes.size} different font-size values across the project. This indicates inconsistent typography and lack of a design system. Typical projects should have 5-8 font sizes maximum (headings h1-h6, body, small).`,
            location: {
                file: 'Global',
                line: 0,
                column: 0
            },
            codeSnippet: `/* Found ${allFontSizes.size} unique font-sizes:\n${Array.from(allFontSizes).slice(0, 10).join(', ')}${allFontSizes.size > 10 ? ', ...' : ''} */`,
            suggestion: `Establish a typographic scale using CSS variables. Example:\n:root {\n  --font-xs: 0.75rem;\n  --font-sm: 0.875rem;\n  --font-base: 1rem;\n  --font-lg: 1.125rem;\n  --font-xl: 1.25rem;\n  /* ... up to 8 sizes */\n}`
        }));
    }

    // REGRA 7: too-many-unique-colors (global check)
    console.log('[ArchitectureAnalyzer] Verificação global: too-many-unique-colors', {
        totalColors: allColors.size
    });

    if (allColors.size > 20) {
        console.log(`[ArchitectureAnalyzer] Muitas cores diferentes`, {
            total: allColors.size,
            limite: 20,
            valores: Array.from(allColors).slice(0, 20)
        });

        issues.push(new Issue({
            type: 'too-many-unique-colors',
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            message: `Too many unique colors (${allColors.size} found)`,
            description: `Found ${allColors.size} different color values across the project. This indicates lack of a consistent color palette and design system. Most projects should use 8-15 colors maximum (primary, secondary, accent, grays, success, warning, error).`,
            location: {
                file: 'Global',
                line: 0,
                column: 0
            },
            codeSnippet: `/* Found ${allColors.size} unique colors:\n${Array.from(allColors).slice(0, 15).join(', ')}${allColors.size > 15 ? ', ...' : ''} */`,
            suggestion: `Create a color palette using CSS variables. Example:\n:root {\n  --color-primary: #007bff;\n  --color-secondary: #6c757d;\n  --color-success: #28a745;\n  --color-danger: #dc3545;\n  --color-gray-100: #f8f9fa;\n  --color-gray-900: #212529;\n  /* ... up to 15 colors */\n}`
        }));
    }

    console.log('[ArchitectureAnalyzer] FIM', {
        totalIssues: issues.length,
        totalFontSizes: allFontSizes.size,
        totalColors: allColors.size,
        timestamp: new Date().toISOString()
    });

    return issues;
}
