/**
 * Analisador de Propriedades CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

const INEFFECTIVE_COMBINATIONS = {
  'z-index': ['position'],
  'width': ['display'],
  'height': ['display']
};

const DISPLAY_INLINE_IGNORED = ['width', 'height', 'margin-top', 'margin-bottom'];

export function analyzeProperties(cssFiles) {
  console.log(`[PropertiesAnalyzer] INÍCIO - Análise de propriedades`);
  const issues = [];

  // Contador global de !important para detectar uso excessivo
  let totalImportant = 0;
  let totalDeclarations = 0;

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    parsed.rules.forEach(rule => {
      const declMap = {};
      const duplicates = {};
      const importantDecls = [];

      rule.declarations.forEach(decl => {
        totalDeclarations++;

        // Detectar !important
        if (decl.important) {
          totalImportant++;
          importantDecls.push(decl);
        }

        // Detectar propriedades duplicadas
        if (declMap[decl.property]) {
          if (!duplicates[decl.property]) {
            duplicates[decl.property] = [declMap[decl.property]];
          }
          duplicates[decl.property].push(decl);
        }
        declMap[decl.property] = decl;
      });

      // Reportar !important (CRITICAL se múltiplos no mesmo seletor)
      if (importantDecls.length > 0) {
        const severity = importantDecls.length >= 3 ? SEVERITY.CRITICAL :
                        importantDecls.length === 2 ? SEVERITY.HIGH :
                        SEVERITY.MEDIUM;

        issues.push(new Issue({
          severity: severity,
          category: CATEGORY.CSS,
          subcategory: 'properties',
          title: `!important excessivo (${importantDecls.length}x)`,
          description: `Seletor usa !important ${importantDecls.length} vez(es), indicando problemas de especificidade.`,
          file: file.path,
          line: importantDecls[0].line,
          column: 0,
          code: `${rule.selector} {\n  ${importantDecls.map(d => `${d.property}: ${d.value} !important;`).join('\n  ')}\n}`,
          evidence: `${importantDecls.length} propriedades com !important`,
          suggestion: 'Refatore especificidade dos seletores ao invés de usar !important. Use !important apenas para utility classes.',
          impact: 'Dificulta manutenção, cria guerra de especificidade, impossibilita sobrescrita.'
        }));
      }

      // Reportar duplicatas
      Object.keys(duplicates).forEach(prop => {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.CSS,
          subcategory: 'properties',
          title: 'Propriedade redundante',
          description: `Propriedade "${prop}" declarada ${duplicates[prop].length} vezes no mesmo seletor.`,
          file: file.path,
          line: duplicates[prop][0].line,
          column: 0,
          code: `${rule.selector} {\n  ${duplicates[prop].map(d => `${d.property}: ${d.value};`).join('\n  ')}\n}`,
          evidence: `${duplicates[prop].length} declarações`,
          suggestion: 'Mantenha apenas a última declaração ou use fallback intencional.',
          impact: 'Confusão na leitura e possível bug.'
        }));
      });

      // z-index sem position
      if (declMap['z-index'] && !declMap['position']) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'properties',
          title: 'z-index sem efeito',
          description: 'z-index usado sem propriedade position.',
          file: file.path,
          line: declMap['z-index'].line,
          column: 0,
          code: `${rule.selector} { z-index: ${declMap['z-index'].value}; }`,
          evidence: 'Falta position: relative|absolute|fixed|sticky',
          suggestion: 'Adicione position: relative; (ou absolute/fixed/sticky) para z-index funcionar.',
          impact: 'z-index não terá efeito algum.'
        }));
      }

      // width/height em display:inline
      if (declMap['display']?.value === 'inline') {
        DISPLAY_INLINE_IGNORED.forEach(prop => {
          if (declMap[prop]) {
            issues.push(new Issue({
              severity: SEVERITY.MEDIUM,
              category: CATEGORY.CSS,
              subcategory: 'properties',
              title: `${prop} ignorado em display:inline`,
              description: `Propriedade ${prop} não funciona com display:inline.`,
              file: file.path,
              line: declMap[prop].line,
              column: 0,
              code: `${rule.selector} { display: inline; ${prop}: ${declMap[prop].value}; }`,
              evidence: 'display:inline ignora width, height, margin-top, margin-bottom',
              suggestion: 'Use display:inline-block ou display:block.',
              impact: 'Propriedade não terá efeito.'
            }));
          }
        });
      }

      // display:none com outras props
      if (declMap['display']?.value === 'none' && rule.declarations.length > 1) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.CSS,
          subcategory: 'properties',
          title: 'Propriedades inúteis com display:none',
          description: 'Elemento com display:none possui outras propriedades que não terão efeito.',
          file: file.path,
          line: declMap['display'].line,
          column: 0,
          code: `${rule.selector} { display: none; /* + ${rule.declarations.length - 1} outras props */ }`,
          evidence: `${rule.declarations.length - 1} propriedades ignoradas`,
          suggestion: 'Remova outras propriedades ou use visibility:hidden se precisar manter layout.',
          impact: 'Código desnecessário.'
        }));
      }

      // overflow sem dimensões
      const overflowProps = ['overflow', 'overflow-x', 'overflow-y'];
      overflowProps.forEach(prop => {
        if (declMap[prop]) {
          const value = declMap[prop].value;
          if (value === 'hidden' || value === 'auto' || value === 'scroll') {
            const hasDimensions = declMap['width'] || declMap['height'] || declMap['max-width'] || declMap['max-height'];
            if (!hasDimensions) {
              issues.push(new Issue({
                severity: SEVERITY.MEDIUM,
                category: CATEGORY.CSS,
                subcategory: 'properties',
                title: `${prop} sem dimensões definidas`,
                description: `${prop}: ${value} usado sem width/height/max-width/max-height.`,
                file: file.path,
                line: declMap[prop].line,
                column: 0,
                code: `${rule.selector} { ${prop}: ${value}; }`,
                evidence: 'Falta width, height, max-width ou max-height',
                suggestion: 'Adicione dimensões (width/height/max-width/max-height) para overflow funcionar corretamente.',
                impact: 'Overflow pode não funcionar como esperado.'
              }));
            }
          }
        }
      });

      // position:fixed sem coordenadas
      if (declMap['position']?.value === 'fixed') {
        const hasCoords = declMap['top'] || declMap['bottom'] || declMap['left'] || declMap['right'];
        if (!hasCoords) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'properties',
            title: 'position:fixed sem coordenadas',
            description: 'position:fixed usado sem top/bottom/left/right.',
            file: file.path,
            line: declMap['position'].line,
            column: 0,
            code: `${rule.selector} { position: fixed; }`,
            evidence: 'Falta top, bottom, left ou right',
            suggestion: 'Adicione pelo menos uma coordenada (top/bottom/left/right) para posicionar o elemento.',
            impact: 'Elemento pode ficar em posição inesperada.'
          }));
        }
      }

      // float com flex
      if (declMap['float'] && declMap['display']) {
        const displayValue = declMap['display'].value;
        if (displayValue === 'flex' || displayValue === 'inline-flex') {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'properties',
            title: 'float ignorado em contexto flex',
            description: 'float usado junto com display:flex. Float é ignorado em contextos flexbox.',
            file: file.path,
            line: declMap['float'].line,
            column: 0,
            code: `${rule.selector} { display: ${displayValue}; float: ${declMap['float'].value}; }`,
            evidence: 'float não funciona com display:flex',
            suggestion: 'Remova float e use propriedades flexbox (justify-content, align-items).',
            impact: 'float será ignorado, causando confusão.'
          }));
        }
      }

      // Shorthand seguido de longhand
      const shorthands = {
        'margin': ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
        'padding': ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
        'border': ['border-top', 'border-right', 'border-bottom', 'border-left', 'border-width', 'border-style', 'border-color'],
        'background': ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat'],
        'font': ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height']
      };

      Object.keys(shorthands).forEach(shorthand => {
        if (declMap[shorthand]) {
          const longhands = shorthands[shorthand];
          const foundLonghands = longhands.filter(lh => declMap[lh]);
          if (foundLonghands.length > 0) {
            issues.push(new Issue({
              severity: SEVERITY.LOW,
              category: CATEGORY.CSS,
              subcategory: 'properties',
              title: 'Shorthand sobrescrito por longhand',
              description: `${shorthand} declarado e depois sobrescrito por ${foundLonghands.join(', ')}.`,
              file: file.path,
              line: declMap[shorthand].line,
              column: 0,
              code: `${rule.selector} {\n  ${shorthand}: ${declMap[shorthand].value};\n  ${foundLonghands.map(lh => `${lh}: ${declMap[lh].value};`).join('\n  ')}\n}`,
              evidence: `Longhand: ${foundLonghands.join(', ')}`,
              suggestion: 'Use apenas longhand ou apenas shorthand para clareza.',
              impact: 'Confusão sobre qual valor está ativo.'
            }));
          }
        }
      });

      // z-index negativo
      if (declMap['z-index']) {
        const zValue = parseInt(declMap['z-index'].value);
        if (!isNaN(zValue) && zValue < 0) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.CSS,
            subcategory: 'properties',
            title: 'z-index negativo',
            description: `z-index negativo (${zValue}) pode causar problemas de stacking.`,
            file: file.path,
            line: declMap['z-index'].line,
            column: 0,
            code: `${rule.selector} { z-index: ${zValue}; }`,
            evidence: `z-index: ${zValue}`,
            suggestion: 'Evite z-index negativo. Revise a hierarquia de stacking context.',
            impact: 'Elemento pode ficar atrás de outros de forma inesperada.'
          }));
        }
      }

      // transition: all
      if (declMap['transition']) {
        const transitionValue = declMap['transition'].value.toLowerCase();
        if (transitionValue.includes('all')) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'properties',
            title: 'transition: all detectado',
            description: 'transition: all anima todas as propriedades, incluindo não intencionais.',
            file: file.path,
            line: declMap['transition'].line,
            column: 0,
            code: `${rule.selector} { transition: ${declMap['transition'].value}; }`,
            evidence: 'transition: all',
            suggestion: 'Especifique propriedades exatas: transition: opacity 0.3s, transform 0.3s;',
            impact: 'Performance: anima propriedades desnecessárias.'
          }));
        }
      }

      if (declMap['transition-property']?.value.toLowerCase() === 'all') {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'properties',
          title: 'transition-property: all detectado',
          description: 'transition-property: all anima todas as propriedades.',
          file: file.path,
          line: declMap['transition-property'].line,
          column: 0,
          code: `${rule.selector} { transition-property: all; }`,
          evidence: 'transition-property: all',
          suggestion: 'Especifique propriedades: transition-property: opacity, transform;',
          impact: 'Performance degradada.'
        }));
      }

      // opacity com transition/animation mas sem will-change
      if (declMap['opacity']) {
        const hasTransition = declMap['transition'] || declMap['transition-property'];
        const hasAnimation = declMap['animation'] || declMap['animation-name'];
        const hasWillChange = declMap['will-change'];

        if ((hasTransition || hasAnimation) && !hasWillChange) {
          issues.push(new Issue({
            severity: SEVERITY.INFO,
            category: CATEGORY.CSS,
            subcategory: 'properties',
            title: 'opacity animado sem will-change',
            description: 'opacity usado em transição/animação sem will-change para GPU acceleration.',
            file: file.path,
            line: declMap['opacity'].line,
            column: 0,
            code: `${rule.selector} { opacity: ${declMap['opacity'].value}; }`,
            evidence: hasTransition ? 'transition detectado' : 'animation detectado',
            suggestion: 'Adicione will-change: opacity; para melhor performance.',
            impact: 'Performance pode ser melhorada com GPU acceleration.'
          }));
        }
      }
    });
  });

  console.log(`[PropertiesAnalyzer] FIM - Total: ${issues.length} problemas`);
  return issues;
}
