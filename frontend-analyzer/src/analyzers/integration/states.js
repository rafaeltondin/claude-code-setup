/**
 * Analisador de Estados Dinâmicos CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeStates(cssFiles) {
  console.log(`[StatesAnalyzer] INÍCIO`);
  const issues = [];
  const selectorsWithHover = new Set();
  const selectorsWithFocus = new Set();
  const selectorsWithActive = new Set();
  const selectorsWithVisited = new Set();
  const selectorsWithFocusVisible = new Set();
  const selectorsWithDisabled = new Set();
  let hasLinkSelectors = false;

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.selectors) return;

    parsed.selectors.forEach(sel => {
      const selector = sel.full;

      if (selector.includes(':hover')) {
        const base = selector.replace(':hover', '');
        selectorsWithHover.add(base);
      }

      if (selector.includes(':focus')) {
        const base = selector.replace(':focus', '');
        selectorsWithFocus.add(base);
      }

      if (selector.includes(':active')) {
        const base = selector.replace(':active', '');
        selectorsWithActive.add(base);
      }

      if (selector.includes(':visited')) {
        hasLinkSelectors = true;
        const base = selector.replace(':visited', '');
        selectorsWithVisited.add(base);
      }

      if (selector.includes(':focus-visible')) {
        const base = selector.replace(':focus-visible', '');
        selectorsWithFocusVisible.add(base);
      }

      if (selector.includes(':disabled')) {
        selectorsWithDisabled.add(selector);
      }

      // Check for link selectors
      if (selector.match(/^a\b/) || selector.includes(' a:') || selector.includes(',a:')) {
        hasLinkSelectors = true;
      }
    });
  });

  // :hover sem :focus (acessibilidade)
  selectorsWithHover.forEach(selector => {
    if (!selectorsWithFocus.has(selector)) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'states',
        title: ':hover sem :focus',
        description: `Seletor "${selector}" tem :hover mas não tem :focus.`,
        file: 'CSS',
        line: 0,
        column: 0,
        code: `${selector}:hover { ... }\n/* Falta: ${selector}:focus { ... } */`,
        evidence: 'Falta estado :focus',
        suggestion: `Adicione ${selector}:focus com mesmos estilos de :hover para navegação por teclado.`,
        impact: 'ACESSIBILIDADE: Usuários de teclado não veem feedback visual.',
        wcagLevel: 'AA'
      }));
    }
  });

  // 1. :hover without :active
  selectorsWithHover.forEach(selector => {
    if (!selectorsWithActive.has(selector)) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'active-state-missing',
        title: ':hover sem :active',
        description: `Seletor "${selector}" tem :hover mas não tem :active.`,
        file: 'CSS',
        line: 0,
        column: 0,
        code: `${selector}:hover { ... }\n/* Falta: ${selector}:active { ... } */`,
        evidence: 'Falta estado :active',
        suggestion: `Adicione ${selector}:active para feedback visual ao clicar.`,
        impact: 'Usuários não veem feedback ao clicar no elemento.'
      }));
    }
  });

  // 2. Link states without :visited
  if (hasLinkSelectors) {
    const linkHoverSelectors = Array.from(selectorsWithHover).filter(sel =>
      sel.match(/^a\b/) || sel === 'a'
    );

    const linkFocusSelectors = Array.from(selectorsWithFocus).filter(sel =>
      sel.match(/^a\b/) || sel === 'a'
    );

    if ((linkHoverSelectors.length > 0 || linkFocusSelectors.length > 0) && selectorsWithVisited.size === 0) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.CSS,
        subcategory: 'visited-missing-on-links',
        title: 'Links sem estado :visited',
        description: 'Links têm :hover ou :focus mas não têm :visited.',
        file: 'CSS',
        line: 0,
        column: 0,
        code: 'a:hover, a:focus { ... }\n/* Falta: a:visited { ... } */',
        evidence: 'Sem diferenciação de links visitados',
        suggestion: 'Adicione a:visited para mostrar histórico de navegação.',
        impact: 'Usuários não conseguem distinguir links já visitados.'
      }));
    }
  }

  // 3. :focus without :focus-visible
  if (selectorsWithFocus.size > 0 && selectorsWithFocusVisible.size === 0) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ACCESSIBILITY,
      subcategory: 'focus-visible-missing',
      title: ':focus sem :focus-visible',
      description: 'CSS usa :focus mas não usa :focus-visible (abordagem moderna).',
      file: 'CSS',
      line: 0,
      column: 0,
      code: ':focus { ... }\n/* Recomendado: :focus-visible { ... } */',
      evidence: 'Falta :focus-visible',
      suggestion: 'Use :focus-visible para mostrar focus ring apenas na navegação por teclado.',
      impact: 'WCAG 2.4.7: Focus ring sempre visível, mesmo ao clicar com mouse.',
      wcagLevel: 'AA'
    }));
  }

  // 4. No :disabled styling (check globally if any form elements might exist)
  // This is a soft check - we warn if NO :disabled found at all
  if (selectorsWithDisabled.size === 0) {
    issues.push(new Issue({
      severity: SEVERITY.LOW,
      category: CATEGORY.CSS,
      subcategory: 'disabled-not-styled',
      title: 'Estado :disabled não estilizado',
      description: 'Nenhum seletor com :disabled encontrado.',
      file: 'CSS',
      line: 0,
      column: 0,
      code: '/* Adicione: button:disabled, input:disabled { ... } */',
      evidence: 'Sem estilos para elementos desabilitados',
      suggestion: 'Adicione estilos para elementos :disabled em formulários.',
      impact: 'Elementos desabilitados podem não ter indicação visual clara.'
    }));
  }

  console.log(`[StatesAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
