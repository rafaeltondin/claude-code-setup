/**
 * Analisador de Performance CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

const EXPENSIVE_PROPERTIES = ['box-shadow', 'border-radius', 'filter', 'transform'];
const REFLOW_PROPERTIES = ['width', 'height', 'padding', 'margin', 'border', 'top', 'left', 'right', 'bottom'];

export function analyzePerformance(cssFiles) {
  console.log(`[PerformanceAnalyzer] INÍCIO`);
  const issues = [];
  let willChangeCount = 0;
  let hasAnimations = false;
  let hasReducedMotionQuery = false;

  cssFiles.forEach(file => {
    // Arquivo muito grande
    const sizeKB = Buffer.byteLength(file.content, 'utf8') / 1024;
    if (sizeKB > 100) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.PERFORMANCE,
        subcategory: 'css-size',
        title: 'Arquivo CSS muito grande',
        description: `Arquivo com ${sizeKB.toFixed(2)}KB pode impactar performance.`,
        file: file.path,
        line: 0,
        column: 0,
        code: `Tamanho: ${sizeKB.toFixed(2)}KB`,
        evidence: `${sizeKB.toFixed(2)}KB (>100KB)`,
        suggestion: 'Divida em múltiplos arquivos, remova código não usado, ou use code splitting.',
        impact: 'Tempo de carregamento aumentado, especialmente em conexões lentas.',
        performanceImpact: 'HIGH'
      }));
    }

    const parsed = file.parsed;
    if (!parsed) return;

    // Detectar @import
    if (parsed.atRules) {
      parsed.atRules.forEach(atRule => {
        if (atRule.name === 'import') {
          issues.push(new Issue({
            severity: SEVERITY.HIGH,
            category: CATEGORY.PERFORMANCE,
            subcategory: 'css-loading',
            title: '@import detectado',
            description: '@import cria cadeia de requisições sequenciais, bloqueando renderização.',
            file: file.path,
            line: atRule.line,
            column: 0,
            code: `@import ${atRule.params};`,
            evidence: '@import bloqueia parsing',
            suggestion: 'Use múltiplas tags <link> no HTML ao invés de @import.',
            impact: 'Performance: carregamento sequencial ao invés de paralelo.',
            performanceImpact: 'HIGH'
          }));
        }

        // prefers-reduced-motion
        if (atRule.name === 'media' && atRule.params.includes('prefers-reduced-motion')) {
          hasReducedMotionQuery = true;
        }

        // Keyframes com propriedades caras
        if (atRule.name === 'keyframes') {
          // Analisar o AST para encontrar propriedades dentro de @keyframes
          if (file.parsed.ast) {
            file.parsed.ast.walkAtRules('keyframes', keyframeRule => {
              if (keyframeRule.params === atRule.params) {
                const expensiveProps = [];
                keyframeRule.walkDecls(decl => {
                  if (REFLOW_PROPERTIES.some(prop => decl.prop.includes(prop))) {
                    expensiveProps.push(decl.prop);
                  }
                });

                if (expensiveProps.length > 0) {
                  issues.push(new Issue({
                    severity: SEVERITY.HIGH,
                    category: CATEGORY.PERFORMANCE,
                    subcategory: 'animations',
                    title: 'Animação com propriedades caras',
                    description: `@keyframes ${atRule.params} anima propriedades que causam reflow.`,
                    file: file.path,
                    line: atRule.line,
                    column: 0,
                    code: `@keyframes ${atRule.params} { /* ${expensiveProps.join(', ')} */ }`,
                    evidence: `Propriedades: ${expensiveProps.join(', ')}`,
                    suggestion: 'Anime apenas transform e opacity. Evite width, height, margin, padding, top, left.',
                    impact: 'Animações de layout causam reflow a cada frame, degradando performance.',
                    performanceImpact: 'HIGH'
                  }));
                }
              }
            });
          }
        }
      });
    }

    if (!parsed.rules) return;

    // Contar will-change e detectar animações/transições
    parsed.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        if (decl.property === 'will-change') {
          willChangeCount++;

          // will-change permanente (não em :hover/:active)
          if (!rule.selector.includes(':hover') && !rule.selector.includes(':active') && !rule.selector.includes(':focus')) {
            issues.push(new Issue({
              severity: SEVERITY.LOW,
              category: CATEGORY.PERFORMANCE,
              subcategory: 'will-change',
              title: 'will-change permanente',
              description: 'will-change como propriedade estática consome memória GPU.',
              file: file.path,
              line: decl.line,
              column: 0,
              code: `${rule.selector} { will-change: ${decl.value}; }`,
              evidence: 'will-change estático (não em :hover)',
              suggestion: 'Adicione will-change dinamicamente via JavaScript antes da animação, remova depois.',
              impact: 'Memória GPU desperdiçada.',
              performanceImpact: 'LOW'
            }));
          }
        }

        if (decl.property === 'animation' || decl.property === 'transition') {
          hasAnimations = true;
        }
      });
    });
  });

  // will-change excessivo
  if (willChangeCount > 5) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      subcategory: 'will-change',
      title: 'Uso excessivo de will-change',
      description: `${willChangeCount} regras com will-change detectadas no projeto.`,
      file: 'global',
      line: 0,
      column: 0,
      code: `${willChangeCount} usos de will-change`,
      evidence: `${willChangeCount} regras (>5)`,
      suggestion: 'Reduza uso de will-change. Consuma memória GPU apenas quando necessário.',
      impact: 'Consumo excessivo de memória GPU, pode degradar performance.',
      performanceImpact: 'MEDIUM'
    }));
  }

  // Animações sem reduced-motion
  if (hasAnimations && !hasReducedMotionQuery) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ACCESSIBILITY,
      subcategory: 'animations',
      title: 'Animações sem prefers-reduced-motion',
      description: 'Projeto tem animações/transições mas não respeita prefers-reduced-motion.',
      file: 'global',
      line: 0,
      column: 0,
      code: 'animation/transition detectados',
      evidence: 'Falta @media (prefers-reduced-motion: reduce)',
      suggestion: 'Adicione: @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }',
      impact: 'Acessibilidade: usuários com sensibilidade a movimento podem ter desconforto.',
      performanceImpact: 'NONE'
    }));
  }

  console.log(`[PerformanceAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
