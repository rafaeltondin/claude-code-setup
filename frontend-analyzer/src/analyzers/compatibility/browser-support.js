/**
 * Analisador de Compatibilidade de Navegadores
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

const DEPRECATED_PROPERTIES = {
  'zoom': 'Use transform: scale() ao invés',
  'clip': 'Use clip-path ao invés',
  '-webkit-box': 'Use display: flex com prefixos corretos',
  'text-decoration-skip': 'Use text-decoration-skip-ink ao invés',
  '-ms-filter': 'Use filter padrão ao invés (IE deprecated)',
  'box-orient': 'Use flex-direction ao invés'
};

const PROPERTIES_NEEDING_PREFIX = {
  'user-select': ['-webkit-user-select', '-moz-user-select', '-ms-user-select'],
  'appearance': ['-webkit-appearance', '-moz-appearance'],
  'backdrop-filter': ['-webkit-backdrop-filter'],
  'text-size-adjust': ['-webkit-text-size-adjust', '-moz-text-size-adjust'],
  'hyphens': ['-webkit-hyphens', '-ms-hyphens'],
  'writing-mode': ['-webkit-writing-mode', '-ms-writing-mode']
};

export function analyzeBrowserSupport(cssFiles) {
  console.log(`[BrowserSupportAnalyzer] INÍCIO`);
  const issues = [];

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    parsed.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        // Propriedades deprecated
        if (DEPRECATED_PROPERTIES[decl.property]) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.COMPATIBILITY,
            subcategory: 'deprecated',
            title: 'Propriedade deprecated',
            description: `Propriedade "${decl.property}" está obsoleta.`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: 'Propriedade obsoleta',
            suggestion: DEPRECATED_PROPERTIES[decl.property],
            impact: 'Pode não funcionar em navegadores modernos.'
          }));
        }

        // Propriedades que precisam de prefixo
        if (PROPERTIES_NEEDING_PREFIX[decl.property]) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.COMPATIBILITY,
            subcategory: 'vendor-prefix',
            title: 'Faltam prefixos vendor',
            description: `Propriedade "${decl.property}" pode precisar de prefixos.`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: 'Sem prefixos vendor',
            suggestion: `Adicione: ${PROPERTIES_NEEDING_PREFIX[decl.property].join(', ')}`,
            impact: 'Pode não funcionar em todos os navegadores.'
          }));
        }
      });
    });

    // 1. gap in flexbox (Safari < 14.1)
    parsed.rules.forEach(rule => {
      const declMap = {};
      rule.declarations.forEach(decl => {
        declMap[decl.property] = decl.value;
      });

      if (declMap['gap'] && declMap['display'] === 'flex') {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.COMPATIBILITY,
          subcategory: 'gap-in-flexbox',
          title: 'gap com display: flex',
          description: 'gap em flexbox não é suportado no Safari < 14.1.',
          file: file.path,
          line: rule.line || 0,
          column: 0,
          code: 'display: flex;\ngap: ...;',
          evidence: 'gap + flex',
          suggestion: 'Use margin como fallback ou verifique compatibilidade.',
          impact: 'Não funciona em Safari antigo.'
        }));
      }
    });
  });

  // 2. Modern CSS without @supports fallback
  const modernFeatures = ['aspect-ratio', 'container-type', 'color-mix('];

  cssFiles.forEach(file => {
    modernFeatures.forEach(feature => {
      if (file.content.includes(feature)) {
        const hasSupportsCheck = file.content.includes('@supports');

        if (!hasSupportsCheck) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.COMPATIBILITY,
            subcategory: 'modern-css-no-fallback',
            title: `CSS moderno sem @supports: ${feature}`,
            description: `Propriedade/função "${feature}" usada sem @supports.`,
            file: file.path,
            line: 0,
            column: 0,
            code: feature,
            evidence: 'Sem @supports',
            suggestion: `Use @supports (${feature.replace('(', '').trim()}: ...) { ... } para fallback.`,
            impact: 'Pode não funcionar em navegadores antigos.'
          }));
        }
      }
    });
  });

  // 3. dvh/svh/lvh without vh fallback
  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    parsed.rules.forEach(rule => {
      const viewportUnits = [];
      const hasVhFallback = rule.declarations.some(decl => decl.value.includes('vh'));

      rule.declarations.forEach(decl => {
        if (decl.value.match(/\b\d+(dvh|svh|lvh)\b/)) {
          viewportUnits.push(decl.property);
        }
      });

      if (viewportUnits.length > 0 && !hasVhFallback) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.COMPATIBILITY,
          subcategory: 'dvh-without-vh-fallback',
          title: 'dvh/svh/lvh sem fallback vh',
          description: 'Unidades de viewport dinâmicas sem fallback vh.',
          file: file.path,
          line: rule.line || 0,
          column: 0,
          code: viewportUnits.join(', '),
          evidence: 'dvh/svh/lvh sem vh',
          suggestion: 'Adicione declaração com vh antes de dvh/svh/lvh como fallback.',
          impact: 'Não funciona em navegadores que não suportam viewport units dinâmicas.'
        }));
      }
    });
  });

  console.log(`[BrowserSupportAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
