import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

/**
 * Analisa uso de recursos CSS modernos (custom properties, @keyframes, @font-face, etc.)
 * @param {Array} cssFiles - Array de objetos CSS parseados
 * @returns {Array<Issue>} - Array de issues detectados
 */
export function analyzeModernCSS(cssFiles) {
    console.log('[ModernCSSAnalyzer] INÍCIO', {
        totalArquivos: cssFiles.length,
        timestamp: new Date().toISOString()
    });

    const issues = [];

    // Coletar dados globais primeiro (para regras 2-5)
    const declaredVars = new Set();
    const usedVars = new Set();
    const declaredKeyframes = new Map(); // name -> {file, line}
    const usedKeyframes = new Set();
    const declaredFontFaces = new Map(); // font-family -> {file, line}
    const usedFontFamilies = new Set();

    console.log('[ModernCSSAnalyzer] FASE 1: Coleta de dados globais');

    // PRIMEIRA PASSAGEM: Coletar declarações e usos
    cssFiles.forEach((file, fileIndex) => {
        console.log(`[ModernCSSAnalyzer] [Coleta] Arquivo ${fileIndex + 1}/${cssFiles.length}`, {
            arquivo: file.path
        });

        if (!file.parsed || !file.parsed.ast) {
            console.log(`[ModernCSSAnalyzer] [Coleta] Arquivo sem AST`, { arquivo: file.path });
            return;
        }

        // Coletar custom properties declaradas e usadas
        file.parsed.ast.walkDecls((decl) => {
            // Custom property declaration (--name: value)
            if (decl.prop.startsWith('--')) {
                declaredVars.add(decl.prop);
                console.log(`[ModernCSSAnalyzer] [Coleta] Custom property declarada`, {
                    propriedade: decl.prop,
                    arquivo: file.path,
                    linha: decl.source?.start?.line
                });
            }

            // var() usage
            const varMatches = decl.value.matchAll(/var\((--[a-zA-Z0-9_-]+)/g);
            for (const match of varMatches) {
                usedVars.add(match[1]);
                console.log(`[ModernCSSAnalyzer] [Coleta] var() usado`, {
                    variavel: match[1],
                    propriedade: decl.prop,
                    arquivo: file.path,
                    linha: decl.source?.start?.line
                });
            }

            // font-family usage
            if (decl.prop === 'font-family' || decl.prop === 'font') {
                const fontNames = decl.value
                    .split(',')
                    .map(f => f.trim().replace(/^["']|["']$/g, ''))
                    .filter(f => !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(f.toLowerCase()));

                fontNames.forEach(fontName => {
                    usedFontFamilies.add(fontName);
                    console.log(`[ModernCSSAnalyzer] [Coleta] font-family usado`, {
                        fonte: fontName,
                        arquivo: file.path,
                        linha: decl.source?.start?.line
                    });
                });
            }

            // animation-name usage
            if (decl.prop === 'animation-name') {
                const names = decl.value.split(',').map(n => n.trim());
                names.forEach(name => {
                    if (name !== 'none') {
                        usedKeyframes.add(name);
                        console.log(`[ModernCSSAnalyzer] [Coleta] animation-name usado`, {
                            nome: name,
                            arquivo: file.path,
                            linha: decl.source?.start?.line
                        });
                    }
                });
            }

            // animation shorthand usage
            if (decl.prop === 'animation') {
                // Nome da animação é geralmente o primeiro valor não-numérico
                const parts = decl.value.split(/\s+/);
                const keywords = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'infinite',
                                 'forwards', 'backwards', 'both', 'none', 'normal', 'reverse',
                                 'alternate', 'alternate-reverse', 'running', 'paused', 'step-start', 'step-end'];

                parts.forEach(part => {
                    if (!/^\d/.test(part) && !keywords.includes(part.toLowerCase()) && part !== 'none') {
                        usedKeyframes.add(part);
                        console.log(`[ModernCSSAnalyzer] [Coleta] animation shorthand usado`, {
                            nome: part,
                            valor: decl.value,
                            arquivo: file.path,
                            linha: decl.source?.start?.line
                        });
                    }
                });
            }
        });

        // Coletar @keyframes declarados
        file.parsed.ast.walkAtRules('keyframes', (keyframe) => {
            const name = keyframe.params.trim();
            declaredKeyframes.set(name, {
                file: file.path,
                line: keyframe.source?.start?.line || 0
            });
            console.log(`[ModernCSSAnalyzer] [Coleta] @keyframes declarado`, {
                nome: name,
                arquivo: file.path,
                linha: keyframe.source?.start?.line
            });
        });

        // Coletar @font-face declarados
        file.parsed.ast.walkAtRules('font-face', (fontFace) => {
            let fontFamilyName = null;

            fontFace.walkDecls('font-family', (decl) => {
                fontFamilyName = decl.value.replace(/^["']|["']$/g, '').trim();
            });

            if (fontFamilyName) {
                declaredFontFaces.set(fontFamilyName, {
                    file: file.path,
                    line: fontFace.source?.start?.line || 0
                });
                console.log(`[ModernCSSAnalyzer] [Coleta] @font-face declarado`, {
                    fontFamily: fontFamilyName,
                    arquivo: file.path,
                    linha: fontFace.source?.start?.line
                });
            }
        });
    });

    console.log('[ModernCSSAnalyzer] Dados globais coletados', {
        declaredVars: declaredVars.size,
        usedVars: usedVars.size,
        declaredKeyframes: declaredKeyframes.size,
        usedKeyframes: usedKeyframes.size,
        declaredFontFaces: declaredFontFaces.size,
        usedFontFamilies: usedFontFamilies.size
    });

    // SEGUNDA PASSAGEM: Analisar issues por arquivo
    console.log('[ModernCSSAnalyzer] FASE 2: Análise de issues');

    cssFiles.forEach((file, fileIndex) => {
        console.log(`[ModernCSSAnalyzer] [Análise] Arquivo ${fileIndex + 1}/${cssFiles.length}`, {
            arquivo: file.path
        });

        if (!file.parsed || !file.parsed.ast) {
            return;
        }

        // REGRA 1: var-no-fallback
        console.log(`[ModernCSSAnalyzer] [${file.path}] Verificando var() sem fallback...`);

        file.parsed.ast.walkDecls((decl) => {
            // Regex: var(--name) sem vírgula (sem fallback)
            const varNoFallbackRegex = /var\(--[a-zA-Z0-9_-]+\)/g;
            const matches = decl.value.matchAll(varNoFallbackRegex);

            for (const match of matches) {
                console.log(`[ModernCSSAnalyzer] [${file.path}] var() sem fallback`, {
                    var: match[0],
                    propriedade: decl.prop,
                    valor: decl.value,
                    linha: decl.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'var-no-fallback',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.CSS,
                    message: `CSS variable ${match[0]} without fallback value`,
                    description: `The custom property ${match[0]} is used without a fallback value. If the variable is undefined, the property will be invalid and the browser will ignore it entirely.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `${decl.prop}: ${decl.value};`,
                    suggestion: `Provide a fallback value: ${match[0].replace(')', ', fallback-value)')}. Example: var(--primary-color, #007bff)`
                }));
            }
        });

        // REGRA 2: var-undeclared
        console.log(`[ModernCSSAnalyzer] [${file.path}] Verificando var() não-declaradas...`);

        file.parsed.ast.walkDecls((decl) => {
            const varMatches = decl.value.matchAll(/var\((--[a-zA-Z0-9_-]+)/g);

            for (const match of varMatches) {
                const varName = match[1];

                if (!declaredVars.has(varName)) {
                    console.log(`[ModernCSSAnalyzer] [${file.path}] var() não-declarada`, {
                        variavel: varName,
                        propriedade: decl.prop,
                        linha: decl.source?.start?.line
                    });

                    issues.push(new Issue({
                        type: 'var-undeclared',
                        severity: SEVERITY.HIGH,
                        category: CATEGORY.CSS,
                        message: `CSS variable '${varName}' used but never declared`,
                        description: `The custom property '${varName}' is referenced via var() but is never declared anywhere in the CSS. This will result in an invalid property value.`,
                        location: {
                            file: file.path,
                            line: decl.source?.start?.line || 0,
                            column: decl.source?.start?.column || 0
                        },
                        codeSnippet: `${decl.prop}: ${decl.value};`,
                        suggestion: `Declare '${varName}' in :root or another selector: :root { ${varName}: value; }`
                    }));
                }
            }
        });

        // REGRA 6: gap-without-support-check
        console.log(`[ModernCSSAnalyzer] [${file.path}] Verificando gap com flexbox...`);

        file.parsed.ast.walkRules((rule) => {
            let hasFlexDisplay = false;
            let hasGap = false;
            let gapDecl = null;

            rule.walkDecls((decl) => {
                if (decl.prop === 'display' && decl.value.includes('flex')) {
                    hasFlexDisplay = true;
                }
                if (decl.prop === 'gap') {
                    hasGap = true;
                    gapDecl = decl;
                }
            });

            if (hasFlexDisplay && hasGap && gapDecl) {
                console.log(`[ModernCSSAnalyzer] [${file.path}] gap com display: flex`, {
                    seletor: rule.selector,
                    linha: gapDecl.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'gap-without-support-check',
                    severity: SEVERITY.LOW,
                    category: CATEGORY.COMPATIBILITY,
                    message: `'gap' property used with flexbox layout`,
                    description: `The 'gap' property with flexbox (display: flex) wasn't supported in older Safari versions (< 14.1, released Apr 2021). This is mostly safe now, but verify browser support for your target audience.`,
                    location: {
                        file: file.path,
                        line: gapDecl.source?.start?.line || 0,
                        column: gapDecl.source?.start?.column || 0
                    },
                    codeSnippet: `${rule.selector} {\n  display: flex;\n  gap: ${gapDecl.value};\n}`,
                    suggestion: `Check caniuse.com for flexbox gap support. Consider margin-based spacing as fallback for older browsers if needed.`
                }));
            }
        });
    });

    // REGRA 3: var-unused (global check)
    console.log('[ModernCSSAnalyzer] Verificação global: var-unused');

    declaredVars.forEach(varName => {
        if (!usedVars.has(varName)) {
            console.log(`[ModernCSSAnalyzer] Custom property não-usada`, {
                variavel: varName
            });

            issues.push(new Issue({
                type: 'var-unused',
                severity: SEVERITY.LOW,
                category: CATEGORY.CSS,
                message: `CSS variable '${varName}' declared but never used`,
                description: `The custom property '${varName}' is declared but never referenced via var() anywhere in the CSS. This is dead code.`,
                location: {
                    file: 'Global',
                    line: 0,
                    column: 0
                },
                codeSnippet: `${varName}: /* some value */; /* Never used */`,
                suggestion: `Remove '${varName}' or start using it: var(${varName})`
            }));
        }
    });

    // REGRA 4: keyframes-unused (global check)
    console.log('[ModernCSSAnalyzer] Verificação global: keyframes-unused');

    declaredKeyframes.forEach((info, keyframeName) => {
        if (!usedKeyframes.has(keyframeName)) {
            console.log(`[ModernCSSAnalyzer] @keyframes não-usado`, {
                nome: keyframeName,
                arquivo: info.file,
                linha: info.line
            });

            issues.push(new Issue({
                type: 'keyframes-unused',
                severity: SEVERITY.LOW,
                category: CATEGORY.CSS,
                message: `@keyframes '${keyframeName}' declared but never used`,
                description: `The @keyframes '${keyframeName}' is declared but never referenced in any animation-name or animation property. This is dead CSS code.`,
                location: {
                    file: info.file,
                    line: info.line,
                    column: 0
                },
                codeSnippet: `@keyframes ${keyframeName} { ... } /* Never used */`,
                suggestion: `Remove @keyframes '${keyframeName}' or apply it: animation-name: ${keyframeName};`
            }));
        }
    });

    // REGRA 5: font-face-unused (global check)
    console.log('[ModernCSSAnalyzer] Verificação global: font-face-unused');

    declaredFontFaces.forEach((info, fontFamily) => {
        if (!usedFontFamilies.has(fontFamily)) {
            console.log(`[ModernCSSAnalyzer] @font-face não-usado`, {
                fontFamily,
                arquivo: info.file,
                linha: info.line
            });

            issues.push(new Issue({
                type: 'font-face-unused',
                severity: SEVERITY.MEDIUM,
                category: CATEGORY.CSS,
                message: `@font-face '${fontFamily}' declared but never used`,
                description: `The font '${fontFamily}' is declared via @font-face but never referenced in any font-family property. The browser will still download this font file, wasting bandwidth.`,
                location: {
                    file: info.file,
                    line: info.line,
                    column: 0
                },
                codeSnippet: `@font-face { font-family: "${fontFamily}"; ... } /* Never used */`,
                suggestion: `Remove @font-face for '${fontFamily}' or use it: font-family: "${fontFamily}";`
            }));
        }
    });

    console.log('[ModernCSSAnalyzer] FIM', {
        totalIssues: issues.length,
        timestamp: new Date().toISOString()
    });

    return issues;
}
