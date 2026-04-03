/**
 * Analisador de Seletores CSS Problemáticos
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeSelectors(cssFiles) {
  console.log(`[SelectorsAnalyzer] INÍCIO - Análise de seletores`);
  const issues = [];

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.selectors) return;

    parsed.selectors.forEach(sel => {
      const selector = sel.full;
      const parts = selector.split(/\s+/);

      // Seletores muito específicos (>3 níveis)
      if (parts.length > 3) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'selectors',
          title: 'Seletor muito específico',
          description: `Seletor com ${parts.length} níveis de profundidade.`,
          file: file.path,
          line: sel.line,
          column: 0,
          code: selector,
          evidence: `${parts.length} níveis: ${parts.join(' > ')}`,
          suggestion: 'Reduza para máximo 3 níveis. Use classes específicas.',
          impact: 'Dificulta reutilização e aumenta acoplamento com HTML.'
        }));
      }

      // Seletores universais ineficientes
      if (selector.includes('*') && !selector.startsWith('*')) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.CSS,
          subcategory: 'selectors',
          title: 'Seletor universal ineficiente',
          description: 'Uso de seletor universal (*) em contexto amplo.',
          file: file.path,
          line: sel.line,
          column: 0,
          code: selector,
          evidence: 'Contém * não no início',
          suggestion: 'Evite * ou use apenas como seletor raiz. Seja mais específico.',
          impact: 'Performance: navegador precisa verificar todos os elementos.'
        }));
      }

      // Classes encadeadas (4+)
      const chainedClasses = selector.match(/(\.[a-zA-Z0-9_-]+){4,}/);
      if (chainedClasses) {
        const classCount = (chainedClasses[0].match(/\./g) || []).length;
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'selectors',
          title: 'Classes excessivamente encadeadas',
          description: `Seletor com ${classCount} classes encadeadas.`,
          file: file.path,
          line: sel.line,
          column: 0,
          code: selector,
          evidence: `${classCount} classes: ${chainedClasses[0]}`,
          suggestion: 'Reduza encadeamento. Use classes mais específicas ao invés de .a.b.c.d',
          impact: 'Alta especificidade, dificulta sobrescrita e manutenção.'
        }));
      }

      // Seletor qualificado (tag + class/id)
      const qualifiedSelector = selector.match(/^[a-z]+[.#]/);
      if (qualifiedSelector) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.CSS,
          subcategory: 'selectors',
          title: 'Seletor qualificado desnecessário',
          description: 'Tag seguida de classe/ID (ex: div.class, a#id).',
          file: file.path,
          line: sel.line,
          column: 0,
          code: selector,
          evidence: 'Qualificação desnecessária',
          suggestion: 'Remova tag: use .class ao invés de div.class',
          impact: 'Especificidade aumentada desnecessariamente, performance levemente afetada.'
        }));
      }

      // Profundidade de combinador > (child combinator)
      const childCombinators = selector.match(/>/g);
      if (childCombinators && childCombinators.length > 4) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'selectors',
          title: 'Combinador > excessivo',
          description: `Seletor com ${childCombinators.length} níveis de combinador >.`,
          file: file.path,
          line: sel.line,
          column: 0,
          code: selector,
          evidence: `${childCombinators.length} níveis de >`,
          suggestion: 'Reduza profundidade. Use classes específicas.',
          impact: 'Acoplamento excessivo com estrutura HTML.'
        }));
      }

      // Seletores de atributo
      if (selector.match(/\[data-[^\]]+\]/)) {
        issues.push(new Issue({
          severity: SEVERITY.INFO,
          category: CATEGORY.CSS,
          subcategory: 'selectors',
          title: 'Seletor de atributo detectado',
          description: 'Seletor [data-*] pode ter performance inferior.',
          file: file.path,
          line: sel.line,
          column: 0,
          code: selector,
          evidence: 'Seletor de atributo',
          suggestion: 'Em DOM muito grande, prefira classes para melhor performance.',
          impact: 'Leve impacto em performance em grandes árvores DOM.'
        }));
      }

      // :not() com seletores complexos
      const notSelector = selector.match(/:not\([^)]+\)/g);
      if (notSelector) {
        notSelector.forEach(notPart => {
          if (notPart.match(/[, >~+]/)) {
            issues.push(new Issue({
              severity: SEVERITY.LOW,
              category: CATEGORY.CSS,
              subcategory: 'selectors',
              title: ':not() com seletor complexo',
              description: ':not() contém seletor complexo.',
              file: file.path,
              line: sel.line,
              column: 0,
              code: selector,
              evidence: notPart,
              suggestion: 'Simplifique :not(). Evite combinadores dentro de :not().',
              impact: 'Dificulta leitura e pode afetar performance.'
            }));
          }
        });
      }
    });
  });

  console.log(`[SelectorsAnalyzer] FIM - Total: ${issues.length} problemas`);
  return issues;
}
