/**
 * Analisador de Layout CSS (Flexbox, Grid, Posicionamento)
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeLayout(cssFiles) {
  console.log(`[LayoutAnalyzer] INÍCIO`);
  const issues = [];

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    parsed.rules.forEach(rule => {
      const declMap = {};
      rule.declarations.forEach(d => declMap[d.property] = d);

      // Flexbox: justify-content sem display:flex
      if (declMap['justify-content'] && declMap['display']?.value !== 'flex' && declMap['display']?.value !== 'inline-flex') {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'layout',
          title: 'justify-content sem display:flex',
          description: 'justify-content não funciona sem display:flex.',
          file: file.path,
          line: declMap['justify-content'].line,
          column: 0,
          code: `${rule.selector} { justify-content: ${declMap['justify-content'].value}; }`,
          evidence: `display: ${declMap['display']?.value || 'não definido'}`,
          suggestion: 'Adicione display: flex; ao elemento.',
          impact: 'Propriedade não terá efeito.'
        }));
      }

      // Position absolute sem relative no contexto (avisar)
      if (declMap['position']?.value === 'absolute') {
        issues.push(new Issue({
          severity: SEVERITY.INFO,
          category: CATEGORY.CSS,
          subcategory: 'layout',
          title: 'Position absolute detectado',
          description: 'Verifique se o elemento pai tem position:relative.',
          file: file.path,
          line: declMap['position'].line,
          column: 0,
          code: `${rule.selector} { position: absolute; }`,
          evidence: 'position:absolute',
          suggestion: 'Garanta que o elemento pai tenha position:relative para contexto correto.',
          impact: 'Elemento pode se posicionar relativo ao viewport ao invés do pai desejado.'
        }));
      }

      // align-items sem flex/grid
      if (declMap['align-items']) {
        const displayValue = declMap['display']?.value;
        if (displayValue !== 'flex' && displayValue !== 'inline-flex' && displayValue !== 'grid' && displayValue !== 'inline-grid') {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'layout',
            title: 'align-items sem display:flex/grid',
            description: 'align-items não funciona sem display:flex ou display:grid.',
            file: file.path,
            line: declMap['align-items'].line,
            column: 0,
            code: `${rule.selector} { align-items: ${declMap['align-items'].value}; }`,
            evidence: `display: ${displayValue || 'não definido'}`,
            suggestion: 'Adicione display: flex; ou display: grid; ao elemento.',
            impact: 'Propriedade não terá efeito.'
          }));
        }
      }

      // flex-direction sem flex
      if (declMap['flex-direction']) {
        const displayValue = declMap['display']?.value;
        if (displayValue !== 'flex' && displayValue !== 'inline-flex') {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'layout',
            title: 'flex-direction sem display:flex',
            description: 'flex-direction não funciona sem display:flex.',
            file: file.path,
            line: declMap['flex-direction'].line,
            column: 0,
            code: `${rule.selector} { flex-direction: ${declMap['flex-direction'].value}; }`,
            evidence: `display: ${displayValue || 'não definido'}`,
            suggestion: 'Adicione display: flex; ao elemento.',
            impact: 'Propriedade não terá efeito.'
          }));
        }
      }

      // Grid properties sem display:grid
      const gridProps = ['grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-columns', 'grid-auto-rows'];
      gridProps.forEach(prop => {
        if (declMap[prop]) {
          const displayValue = declMap['display']?.value;
          if (displayValue !== 'grid' && displayValue !== 'inline-grid') {
            issues.push(new Issue({
              severity: SEVERITY.MEDIUM,
              category: CATEGORY.CSS,
              subcategory: 'layout',
              title: `${prop} sem display:grid`,
              description: `${prop} não funciona sem display:grid.`,
              file: file.path,
              line: declMap[prop].line,
              column: 0,
              code: `${rule.selector} { ${prop}: ${declMap[prop].value}; }`,
              evidence: `display: ${displayValue || 'não definido'}`,
              suggestion: 'Adicione display: grid; ao elemento.',
              impact: 'Propriedade não terá efeito.'
            }));
          }
        }
      });

      // gap/grid-gap sem flex ou grid
      if (declMap['gap'] || declMap['grid-gap']) {
        const gapProp = declMap['gap'] || declMap['grid-gap'];
        const displayValue = declMap['display']?.value;
        if (displayValue !== 'flex' && displayValue !== 'inline-flex' && displayValue !== 'grid' && displayValue !== 'inline-grid') {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'layout',
            title: 'gap sem display:flex/grid',
            description: 'gap não funciona sem display:flex ou display:grid.',
            file: file.path,
            line: gapProp.line,
            column: 0,
            code: `${rule.selector} { gap: ${gapProp.value}; }`,
            evidence: `display: ${displayValue || 'não definido'}`,
            suggestion: 'Adicione display: flex; ou display: grid; ao elemento.',
            impact: 'Propriedade não terá efeito.'
          }));
        }
      }

      // float para layout
      if (declMap['float']) {
        const floatValue = declMap['float'].value;
        if (floatValue === 'left' || floatValue === 'right') {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.CSS,
            subcategory: 'layout',
            title: 'float para layout detectado',
            description: 'float: left/right usado para layout. Técnica ultrapassada.',
            file: file.path,
            line: declMap['float'].line,
            column: 0,
            code: `${rule.selector} { float: ${floatValue}; }`,
            evidence: 'float é técnica antiga',
            suggestion: 'Use Flexbox ou Grid para layouts modernos e mais flexíveis.',
            impact: 'Código difícil de manter, problemas de responsividade.'
          }));
        }
      }
    });
  });

  console.log(`[LayoutAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
