import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

/**
 * Analisa problemas relacionados a animações e transições CSS
 * @param {Array} cssFiles - Array de objetos CSS parseados
 * @returns {Array<Issue>} - Array de issues detectados
 */
export function analyzeAnimation(cssFiles) {
    console.log('[AnimationAnalyzer] INÍCIO', {
        totalArquivos: cssFiles.length,
        timestamp: new Date().toISOString()
    });

    const issues = [];

    // Propriedades que causam reflow
    const reflowProperties = [
        'width', 'height', 'top', 'left', 'right', 'bottom',
        'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
        'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right'
    ];

    // Contadores globais
    let totalKeyframes = 0;
    let totalWillChange = 0;
    let totalAnimations = 0;
    let totalTransitions = 0;

    cssFiles.forEach((file, fileIndex) => {
        console.log(`[AnimationAnalyzer] Processando arquivo ${fileIndex + 1}/${cssFiles.length}`, {
            arquivo: file.path
        });

        // Verificar se file.parsed.ast existe
        if (!file.parsed || !file.parsed.ast) {
            console.log(`[AnimationAnalyzer] Arquivo sem AST`, { arquivo: file.path });
            return;
        }

        let fileHasAnimationOrTransition = false;
        let hasReducedMotionQuery = false;

        // REGRA 1: reflow-in-keyframes
        // Procurar @keyframes com propriedades que causam reflow
        console.log(`[AnimationAnalyzer] [${file.path}] Buscando @keyframes...`);

        file.parsed.ast.walkAtRules('keyframes', (keyframe) => {
            totalKeyframes++;
            const keyframeName = keyframe.params;

            console.log(`[AnimationAnalyzer] [${file.path}] @keyframes encontrado`, {
                nome: keyframeName,
                linha: keyframe.source?.start?.line
            });

            keyframe.walkDecls((decl) => {
                if (reflowProperties.includes(decl.prop)) {
                    console.log(`[AnimationAnalyzer] [${file.path}] Propriedade de reflow em @keyframes`, {
                        keyframe: keyframeName,
                        propriedade: decl.prop,
                        valor: decl.value,
                        linha: decl.source?.start?.line
                    });

                    issues.push(new Issue({
                        type: 'reflow-in-keyframes',
                        severity: SEVERITY.HIGH,
                        category: CATEGORY.PERFORMANCE,
                        message: `Animation property '${decl.prop}' causes layout reflow`,
                        description: `The property '${decl.prop}' in @keyframes '${keyframeName}' triggers layout recalculation on every frame, hurting performance. Use transform or opacity instead.`,
                        location: {
                            file: file.path,
                            line: decl.source?.start?.line || 0,
                            column: decl.source?.start?.column || 0
                        },
                        codeSnippet: `@keyframes ${keyframeName} {\n  ${decl.prop}: ${decl.value};\n}`,
                        suggestion: `Replace with transform properties. Example: Instead of 'left', use 'transform: translateX()'. Instead of 'width', use 'transform: scaleX()'.`
                    }));
                }
            });
        });

        // REGRA 2: box-shadow-in-animation
        console.log(`[AnimationAnalyzer] [${file.path}] Verificando box-shadow em animations...`);

        file.parsed.ast.walkAtRules('keyframes', (keyframe) => {
            keyframe.walkDecls('box-shadow', (decl) => {
                console.log(`[AnimationAnalyzer] [${file.path}] box-shadow em @keyframes`, {
                    keyframe: keyframe.params,
                    linha: decl.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'box-shadow-in-animation',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.PERFORMANCE,
                    message: `box-shadow animated in @keyframes '${keyframe.params}'`,
                    description: `Animating box-shadow causes expensive repaints on every frame. This significantly impacts performance, especially on mobile devices.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `@keyframes ${keyframe.params} {\n  box-shadow: ${decl.value};\n}`,
                    suggestion: `Use pseudo-elements with opacity changes, or pre-render the shadow effect. Avoid animating box-shadow directly.`
                }));
            });
        });

        // Verificar box-shadow com transition
        file.parsed.ast.walkDecls('transition', (decl) => {
            if (decl.value.includes('box-shadow')) {
                console.log(`[AnimationAnalyzer] [${file.path}] box-shadow em transition`, {
                    valor: decl.value,
                    linha: decl.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'box-shadow-in-animation',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.PERFORMANCE,
                    message: `box-shadow in transition property`,
                    description: `Transitioning box-shadow causes repaints. This is less severe than keyframe animation but still impacts performance.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `transition: ${decl.value};`,
                    suggestion: `Consider using opacity on a pseudo-element with the shadow pre-applied, or use filter: drop-shadow() which can be GPU accelerated.`
                }));
            }
        });

        // REGRA 3 e 4: will-change
        console.log(`[AnimationAnalyzer] [${file.path}] Verificando will-change...`);

        file.parsed.ast.walkDecls('will-change', (decl) => {
            totalWillChange++;

            console.log(`[AnimationAnalyzer] [${file.path}] will-change encontrado`, {
                valor: decl.value,
                linha: decl.source?.start?.line,
                parent: decl.parent?.selector || 'unknown'
            });

            // REGRA 4: will-change-not-dynamic
            const parentSelector = decl.parent?.selector || '';
            const isDynamic = /:hover|:focus|:active|:target/.test(parentSelector);

            if (!isDynamic) {
                console.log(`[AnimationAnalyzer] [${file.path}] will-change em seletor não-dinâmico`, {
                    seletor: parentSelector
                });

                issues.push(new Issue({
                    type: 'will-change-not-dynamic',
                    severity: SEVERITY.LOW,
                    category: CATEGORY.PERFORMANCE,
                    message: `will-change on non-dynamic selector '${parentSelector}'`,
                    description: `will-change should be applied dynamically (via :hover, :focus, JS) rather than statically. Static will-change keeps optimization active all the time, wasting memory.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `${parentSelector} {\n  will-change: ${decl.value};\n}`,
                    suggestion: `Apply will-change on :hover or via JavaScript before the animation starts, and remove it when done.`
                }));
            }
        });

        // REGRA 5: transition-all-detected
        console.log(`[AnimationAnalyzer] [${file.path}] Verificando transition: all...`);

        file.parsed.ast.walkDecls('transition', (decl) => {
            totalTransitions++;
            fileHasAnimationOrTransition = true;

            if (decl.value.trim() === 'all' || decl.value.startsWith('all ')) {
                console.log(`[AnimationAnalyzer] [${file.path}] transition: all detectado`, {
                    linha: decl.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'transition-all-detected',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.CSS,
                    message: `transition: all detected`,
                    description: `Using 'transition: all' transitions every property that changes, including unintended ones. This hurts performance and can cause unexpected animations.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `transition: ${decl.value};`,
                    suggestion: `Specify exact properties to transition: 'transition: opacity 0.3s, transform 0.3s;'`
                }));
            }
        });

        file.parsed.ast.walkDecls('transition-property', (decl) => {
            if (decl.value.trim() === 'all') {
                console.log(`[AnimationAnalyzer] [${file.path}] transition-property: all detectado`, {
                    linha: decl.source?.start?.line
                });

                issues.push(new Issue({
                    type: 'transition-all-detected',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.CSS,
                    message: `transition-property: all detected`,
                    description: `Using 'transition-property: all' transitions every property, which is inefficient and can cause unexpected animations.`,
                    location: {
                        file: file.path,
                        line: decl.source?.start?.line || 0,
                        column: decl.source?.start?.column || 0
                    },
                    codeSnippet: `transition-property: ${decl.value};`,
                    suggestion: `List specific properties: 'transition-property: opacity, transform;'`
                }));
            }
        });

        // Detectar animation property
        file.parsed.ast.walkDecls('animation', (decl) => {
            totalAnimations++;
            fileHasAnimationOrTransition = true;

            // REGRA 7: animation-duration-too-long
            const durationMatch = decl.value.match(/(\d+(?:\.\d+)?)s/);
            if (durationMatch) {
                const duration = parseFloat(durationMatch[1]);
                if (duration > 10) {
                    console.log(`[AnimationAnalyzer] [${file.path}] Animation com duração excessiva`, {
                        duracao: duration,
                        linha: decl.source?.start?.line
                    });

                    issues.push(new Issue({
                        type: 'animation-duration-too-long',
                        severity: SEVERITY.LOW,
                        category: CATEGORY.CSS,
                        message: `Animation duration too long (${duration}s)`,
                        description: `Animation duration of ${duration}s is excessive. Very long animations can be annoying and hurt user experience.`,
                        location: {
                            file: file.path,
                            line: decl.source?.start?.line || 0,
                            column: decl.source?.start?.column || 0
                        },
                        codeSnippet: `animation: ${decl.value};`,
                        suggestion: `Consider reducing duration to 3s or less for most UI animations. Use 'animation-iteration-count: infinite' if you need continuous animation.`
                    }));
                }
            }
        });

        file.parsed.ast.walkDecls('animation-duration', (decl) => {
            fileHasAnimationOrTransition = true;

            const durationMatch = decl.value.match(/(\d+(?:\.\d+)?)s/);
            if (durationMatch) {
                const duration = parseFloat(durationMatch[1]);
                if (duration > 10) {
                    console.log(`[AnimationAnalyzer] [${file.path}] animation-duration excessiva`, {
                        duracao: duration,
                        linha: decl.source?.start?.line
                    });

                    issues.push(new Issue({
                        type: 'animation-duration-too-long',
                        severity: SEVERITY.LOW,
                        category: CATEGORY.CSS,
                        message: `animation-duration too long (${duration}s)`,
                        description: `Duration of ${duration}s is excessive and may annoy users.`,
                        location: {
                            file: file.path,
                            line: decl.source?.start?.line || 0,
                            column: decl.source?.start?.column || 0
                        },
                        codeSnippet: `animation-duration: ${decl.value};`,
                        suggestion: `Reduce to 3s or less for better UX.`
                    }));
                }
            }
        });

        // REGRA 6: missing-reduced-motion
        // Verificar se existe @media (prefers-reduced-motion)
        file.parsed.ast.walkAtRules('media', (atRule) => {
            if (atRule.params.includes('prefers-reduced-motion')) {
                hasReducedMotionQuery = true;
                console.log(`[AnimationAnalyzer] [${file.path}] @media prefers-reduced-motion encontrado`);
            }
        });

        // Se o arquivo tem animações mas não tem prefers-reduced-motion
        if (fileHasAnimationOrTransition && !hasReducedMotionQuery) {
            console.log(`[AnimationAnalyzer] [${file.path}] Animações sem prefers-reduced-motion`, {
                temAnimations: totalAnimations > 0,
                temTransitions: totalTransitions > 0
            });

            issues.push(new Issue({
                type: 'missing-reduced-motion',
                severity: SEVERITY.MEDIUM,
                category: CATEGORY.ACCESSIBILITY,
                message: `Animations/transitions without @media (prefers-reduced-motion)`,
                description: `This file uses animations or transitions but doesn't provide a reduced-motion alternative. Users with vestibular disorders or motion sensitivity (WCAG 2.3.3) won't have accommodation.`,
                location: {
                    file: file.path,
                    line: 1,
                    column: 1
                },
                codeSnippet: `/* Missing: */\n@media (prefers-reduced-motion: reduce) {\n  * {\n    animation: none !important;\n    transition: none !important;\n  }\n}`,
                suggestion: `Add @media (prefers-reduced-motion: reduce) query to disable or reduce animations for users who prefer less motion. This is a WCAG 2.3.3 requirement.`
            }));
        }
    });

    // REGRA 3: will-change-excessive (global check)
    console.log(`[AnimationAnalyzer] Verificação global de will-change`, {
        totalWillChange
    });

    if (totalWillChange > 5) {
        console.log(`[AnimationAnalyzer] Uso excessivo de will-change detectado`, {
            total: totalWillChange,
            limite: 5
        });

        issues.push(new Issue({
            type: 'will-change-excessive',
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.PERFORMANCE,
            message: `Excessive will-change usage (${totalWillChange} occurrences)`,
            description: `Found ${totalWillChange} will-change declarations across the project. Too many will-change properties waste memory and can degrade performance. Each one tells the browser to allocate resources for optimization.`,
            location: {
                file: 'Global',
                line: 0,
                column: 0
            },
            codeSnippet: `/* ${totalWillChange} will-change declarations found across all CSS files */`,
            suggestion: `Reduce will-change usage to 5 or fewer. Apply it sparingly and only on elements that will definitely animate. Remove it after animation completes.`
        }));
    }

    console.log('[AnimationAnalyzer] FIM', {
        totalIssues: issues.length,
        totalKeyframes,
        totalWillChange,
        totalAnimations,
        totalTransitions,
        timestamp: new Date().toISOString()
    });

    return issues;
}
