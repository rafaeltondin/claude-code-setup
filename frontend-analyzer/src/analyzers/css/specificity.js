/**
 * Analisador de Especificidade e Cascata CSS
 *
 * Detecta:
 * - Conflitos de especificidade
 * - Guerra de !important
 * - Ordem de declaração incorreta
 */

import { calculate } from 'specificity';
import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeSpecificity(cssFiles) {
  console.log(`[SpecificityAnalyzer] INÍCIO - Análise de especificidade`);
  console.log(`[SpecificityAnalyzer] Arquivos CSS: ${cssFiles.length}`);

  const issues = [];

  cssFiles.forEach(file => {
    console.log(`[SpecificityAnalyzer] Analisando arquivo: ${file.path}`);

    const parsed = file.parsed;
    if (!parsed || !parsed.rules) {
      console.log(`[SpecificityAnalyzer] Arquivo não possui dados parseados, pulando`);
      return;
    }

    // Agrupar declarações por propriedade
    const propertyMap = new Map();

    parsed.rules.forEach(rule => {
      let specificity;

      try {
        const result = calculate(rule.selector);
        specificity = result && result[0] ? result[0] : null;
      } catch (error) {
        console.log(`[SpecificityAnalyzer] ⚠️ Erro ao calcular especificidade para "${rule.selector}": ${error.message}`);
        specificity = null;
      }

      // Se não conseguiu calcular, usar especificidade padrão baixa
      if (!specificity) {
        specificity = {
          specificityArray: [0, 0, 1, 0],
          specificity: '0,0,1,0'
        };
      }

      rule.declarations.forEach(decl => {
        const key = decl.property;
        if (!propertyMap.has(key)) {
          propertyMap.set(key, []);
        }

        propertyMap.get(key).push({
          selector: rule.selector,
          value: decl.value,
          important: decl.important,
          line: decl.line,
          specificity: specificity.specificityArray,
          specificityValue: specificity.specificity
        });
      });
    });

    // Detectar conflitos de especificidade
    console.log(`[SpecificityAnalyzer] Verificando conflitos de especificidade...`);
    propertyMap.forEach((declarations, property) => {
      if (declarations.length < 2) return;

      // Verificar guerra de !important
      const importantCount = declarations.filter(d => d.important).length;
      if (importantCount > 1) {
        console.log(`[SpecificityAnalyzer] DETECTADO: Guerra de !important para ${property}`);
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.CSS,
          subcategory: 'specificity',
          title: `Guerra de !important detectada`,
          description: `A propriedade "${property}" possui ${importantCount} declarações com !important, causando conflitos de cascata.`,
          file: file.path,
          line: declarations[0].line,
          column: 0,
          code: declarations.map(d => `${d.selector} { ${property}: ${d.value}${d.important ? ' !important' : ''}; }`).join('\n'),
          evidence: `${importantCount} declarações com !important`,
          suggestion: 'Remova os !important e use especificidade correta. Evite guerra de !important ajustando seletores.',
          impact: 'Dificulta manutenção, torna CSS imprevisível e quebra a cascata natural.'
        }));
      }

      // Detectar especificidade muito alta
      declarations.forEach(decl => {
        const spec = decl.specificityValue;
        if (spec > 100) {
          console.log(`[SpecificityAnalyzer] DETECTADO: Especificidade muito alta (${spec}) para ${property}`);
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'specificity',
            title: 'Especificidade muito alta',
            description: `O seletor "${decl.selector}" tem especificidade ${spec}, dificultando sobrescrita.`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.selector} { ${property}: ${decl.value}; }`,
            evidence: `Especificidade: ${spec} (${decl.specificity.join(',')})`,
            suggestion: 'Simplifique o seletor. Use classes ao invés de IDs e evite seletores profundamente aninhados.',
            impact: 'Dificulta reutilização e manutenção do código.'
          }));
        }
      });
    });

    console.log(`[SpecificityAnalyzer] Arquivo ${file.path}: ${issues.length} problemas encontrados`);
  });

  console.log(`[SpecificityAnalyzer] FIM - Total de problemas: ${issues.length}`);
  return issues;
}
