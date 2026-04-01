/**
 * Analisador de Herança e Contexto CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeInheritance(cssFiles) {
  console.log(`[InheritanceAnalyzer] INÍCIO`);
  const issues = [];

  // Detectar problemas básicos de herança
  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    parsed.rules.forEach(rule => {
      const declMap = {};
      rule.declarations.forEach(d => declMap[d.property] = d);

      // Font-size: 0 que pode esconder texto herdado
      if (declMap['font-size']?.value === '0' || declMap['font-size']?.value === '0px') {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'inheritance',
          title: 'font-size: 0 pode esconder texto',
          description: 'font-size: 0 esconde texto. Filhos podem herdar e ficar invisíveis.',
          file: file.path,
          line: declMap['font-size'].line,
          column: 0,
          code: `${rule.selector} { font-size: 0; }`,
          evidence: 'font-size: 0',
          suggestion: 'Use apenas quando intencional. Garanta que filhos tenham font-size definido.',
          impact: 'Texto pode desaparecer inesperadamente.'
        }));
      }
    });
  });

  console.log(`[InheritanceAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
