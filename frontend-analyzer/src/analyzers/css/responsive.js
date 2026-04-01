/**
 * Analisador de Responsividade CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeResponsive(cssFiles) {
  console.log(`[ResponsiveAnalyzer] INÍCIO`);
  const issues = [];
  const breakpoints = new Set();
  const minWidthBreakpoints = [];
  const maxWidthBreakpoints = [];
  let hasFixedPosition = false;
  let hasMediaQueryForFixed = false;

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    // Extrair breakpoints e tipos (min-width vs max-width)
    if (parsed.atRules) {
      parsed.atRules.forEach(atRule => {
        if (atRule.name === 'media') {
          const match = atRule.params.match(/(\d+)px/);
          if (match) {
            const value = parseInt(match[1]);
            breakpoints.add(value);

            // Detectar min-width vs max-width
            if (atRule.params.includes('min-width')) {
              minWidthBreakpoints.push(value);
            }
            if (atRule.params.includes('max-width')) {
              maxWidthBreakpoints.push(value);
            }
          }

          // Verificar se há ajuste de position:fixed em media queries
          if (atRule.params.match(/(max-width|min-width).*?768px/)) {
            hasMediaQueryForFixed = true;
          }
        }
      });
    }

    // Detectar larguras fixas, position:fixed, overflow-x, container sem max-width
    if (parsed.rules) {
      parsed.rules.forEach(rule => {
        const declMap = {};
        rule.declarations.forEach(d => declMap[d.property] = d);

        rule.declarations.forEach(decl => {
          // Largura fixa
          if (decl.property === 'width' && decl.value.match(/^\d+px$/)) {
            const px = parseInt(decl.value);
            if (px > 600) {
              issues.push(new Issue({
                severity: SEVERITY.MEDIUM,
                category: CATEGORY.CSS,
                subcategory: 'responsive',
                title: 'Largura fixa muito grande',
                description: `Largura fixa de ${px}px pode causar scroll horizontal em mobile.`,
                file: file.path,
                line: decl.line,
                column: 0,
                code: `${rule.selector} { width: ${decl.value}; }`,
                evidence: `width: ${px}px (>600px)`,
                suggestion: 'Use max-width ou porcentagens para responsividade.',
                impact: 'Quebra layout em dispositivos menores.'
              }));
            }
          }

          // 100vw causa overflow
          if (decl.property.match(/^(width|min-width|max-width)$/) && decl.value.includes('100vw')) {
            issues.push(new Issue({
              severity: SEVERITY.HIGH,
              category: CATEGORY.CSS,
              subcategory: 'responsive',
              title: '100vw causa scroll horizontal',
              description: 'width: 100vw inclui scrollbar, causando overflow-x.',
              file: file.path,
              line: decl.line,
              column: 0,
              code: `${rule.selector} { ${decl.property}: ${decl.value}; }`,
              evidence: '100vw = viewport + scrollbar',
              suggestion: 'Use width: 100%; ou max-width: 100%;',
              impact: 'Scroll horizontal em todas as páginas.'
            }));
          }
        });

        // position:fixed detectado
        if (declMap['position']?.value === 'fixed') {
          hasFixedPosition = true;
        }

        // overflow-x:hidden em body/html
        if (rule.selector.match(/^(body|html)$/)) {
          if (declMap['overflow-x']?.value === 'hidden' || declMap['overflow']?.value === 'hidden') {
            issues.push(new Issue({
              severity: SEVERITY.MEDIUM,
              category: CATEGORY.CSS,
              subcategory: 'responsive',
              title: 'overflow-x:hidden em body/html',
              description: 'overflow-x:hidden no body/html esconde problemas ao invés de resolver.',
              file: file.path,
              line: (declMap['overflow-x'] || declMap['overflow']).line,
              column: 0,
              code: `${rule.selector} { overflow-x: hidden; }`,
              evidence: 'Esconde overflow ao invés de corrigir causa',
              suggestion: 'Identifique e corrija elementos causando overflow (width: 100vw, larguras fixas).',
              impact: 'Esconde problemas, causa scroll vertical em iOS.'
            }));
          }
        }

        // Container sem max-width
        if (declMap['width']) {
          const widthValue = declMap['width'].value;
          if ((widthValue === '100%' || widthValue === 'auto') && !declMap['max-width']) {
            // Verificar se é container típico (não inline, não flex item)
            const displayValue = declMap['display']?.value;
            if (!displayValue || displayValue === 'block') {
              issues.push(new Issue({
                severity: SEVERITY.LOW,
                category: CATEGORY.CSS,
                subcategory: 'responsive',
                title: 'Container sem max-width',
                description: 'width: 100% sem max-width causa texto ilegível em telas ultra-wide.',
                file: file.path,
                line: declMap['width'].line,
                column: 0,
                code: `${rule.selector} { width: ${widthValue}; }`,
                evidence: 'Falta max-width para limitar largura',
                suggestion: 'Adicione max-width: 1200px; (ou outro valor apropriado).',
                impact: 'Linhas de texto muito longas em monitores wide.'
              }));
            }
          }
        }
      });
    }
  });

  // Verificar inconsistência de breakpoints
  if (breakpoints.size > 5) {
    issues.push(new Issue({
      severity: SEVERITY.LOW,
      category: CATEGORY.CSS,
      subcategory: 'responsive',
      title: 'Breakpoints inconsistentes',
      description: `Projeto usa ${breakpoints.size} breakpoints diferentes.`,
      file: 'global',
      line: 0,
      column: 0,
      code: Array.from(breakpoints).sort((a, b) => a - b).join('px, ') + 'px',
      evidence: `${breakpoints.size} breakpoints`,
      suggestion: 'Padronize usando sistema consistente (ex: 576, 768, 992, 1200px).',
      impact: 'Dificulta manutenção e consistência responsiva.'
    }));
  }

  // Verificar falta de breakpoint mobile
  const hasMobileBreakpoint = Array.from(breakpoints).some(bp => bp <= 768);
  if (breakpoints.size > 0 && !hasMobileBreakpoint) {
    issues.push(new Issue({
      severity: SEVERITY.HIGH,
      category: CATEGORY.CSS,
      subcategory: 'responsive',
      title: 'Sem breakpoint para mobile',
      description: 'Projeto não tem media queries para dispositivos mobile (≤768px).',
      file: 'global',
      line: 0,
      column: 0,
      code: `Breakpoints: ${Array.from(breakpoints).sort((a, b) => a - b).join('px, ')}px`,
      evidence: 'Nenhum breakpoint ≤768px',
      suggestion: 'Adicione media queries para mobile: @media (max-width: 768px) { ... }',
      impact: 'Layout não se adapta a smartphones e tablets.'
    }));
  }

  // Verificar abordagem mista (min-width vs max-width)
  if (minWidthBreakpoints.length > 0 && maxWidthBreakpoints.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.CSS,
      subcategory: 'responsive',
      title: 'Abordagem de breakpoints inconsistente',
      description: 'Projeto mistura min-width (mobile-first) e max-width (desktop-first).',
      file: 'global',
      line: 0,
      column: 0,
      code: `min-width: ${minWidthBreakpoints.length} | max-width: ${maxWidthBreakpoints.length}`,
      evidence: 'min-width e max-width misturados',
      suggestion: 'Padronize: use apenas min-width (mobile-first) ou apenas max-width (desktop-first).',
      impact: 'Dificulta manutenção, código confuso.'
    }));
  }

  // position:fixed sem ajuste mobile
  if (hasFixedPosition && !hasMediaQueryForFixed) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.CSS,
      subcategory: 'responsive',
      title: 'position:fixed sem ajuste mobile',
      description: 'position:fixed usado mas sem media query ajustando para mobile.',
      file: 'global',
      line: 0,
      column: 0,
      code: 'position: fixed',
      evidence: 'Nenhuma @media ajusta fixed para telas pequenas',
      suggestion: 'Adicione @media (max-width: 768px) para ajustar/esconder elementos fixos em mobile.',
      impact: 'Elementos fixos podem cobrir conteúdo em telas pequenas.'
    }));
  }

  console.log(`[ResponsiveAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
