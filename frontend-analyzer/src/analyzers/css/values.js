/**
 * Analisador de Valores CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeValues(cssFiles) {
  console.log(`[ValuesAnalyzer] INÍCIO`);
  const issues = [];
  const colorFormats = new Map();

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    parsed.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        // Detectar formatos de cores inconsistentes
        if (decl.property.includes('color') || decl.property.includes('background')) {
          const value = decl.value.toLowerCase();
          let format = null;

          if (value.startsWith('#')) format = 'hex';
          else if (value.startsWith('rgb(')) format = 'rgb';
          else if (value.startsWith('rgba(')) format = 'rgba';
          else if (value.startsWith('hsl(')) format = 'hsl';
          else if (value.match(/^[a-z]+$/)) format = 'named';

          if (format) {
            if (!colorFormats.has(format)) colorFormats.set(format, 0);
            colorFormats.set(format, colorFormats.get(format) + 1);
          }
        }

        // Valores mágicos (números específicos sem contexto)
        const magicNumbers = decl.value.match(/\b\d{3,}\b/g);
        if (magicNumbers) {
          issues.push(new Issue({
            severity: SEVERITY.INFO,
            category: CATEGORY.CSS,
            subcategory: 'values',
            title: 'Possível valor mágico',
            description: `Valor numérico específico sem contexto: ${magicNumbers.join(', ')}`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: `Números: ${magicNumbers.join(', ')}`,
            suggestion: 'Use variáveis CSS (--custom-property) para valores reutilizáveis.',
            impact: 'Dificulta manutenção e entendimento do código.'
          }));
        }

        // font-size em px
        if (decl.property === 'font-size' && decl.value.match(/\d+px$/)) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'values',
            title: 'font-size em pixels',
            description: `font-size: ${decl.value} não respeita zoom do usuário.`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: 'Unidade px não escalável',
            suggestion: 'Use rem ou em para acessibilidade: 1rem = 16px, 1.5rem = 24px.',
            impact: 'Usuários com necessidades de acessibilidade não conseguem aumentar texto.'
          }));
        }

        // Zero com unidade
        if (decl.value.match(/\b0(px|em|rem|%|vh|vw)\b/)) {
          issues.push(new Issue({
            severity: SEVERITY.INFO,
            category: CATEGORY.CSS,
            subcategory: 'values',
            title: 'Zero com unidade desnecessária',
            description: `Valor zero com unidade: ${decl.value}`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: 'Unidade desnecessária em zero',
            suggestion: 'Use apenas 0 sem unidade: margin: 0;',
            impact: 'Código verboso desnecessariamente.'
          }));
        }

        // line-height com unidade
        if (decl.property === 'line-height' && decl.value.match(/\d+(px|em|rem)$/)) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.CSS,
            subcategory: 'values',
            title: 'line-height com unidade',
            description: `line-height: ${decl.value} não herda corretamente.`,
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: 'Unidade pode causar problemas de herança',
            suggestion: 'Use valor unitless: line-height: 1.5; ao invés de line-height: 24px;',
            impact: 'Herança incorreta em elementos filhos.'
          }));
        }

        // 100vw
        if (decl.property.match(/^(width|min-width|max-width)$/) && decl.value.includes('100vw')) {
          issues.push(new Issue({
            severity: SEVERITY.HIGH,
            category: CATEGORY.CSS,
            subcategory: 'values',
            title: '100vw causa scroll horizontal',
            description: 'width: 100vw inclui largura do scrollbar, causando overflow horizontal.',
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: '100vw = viewport width + scrollbar width',
            suggestion: 'Use width: 100%; ao invés de width: 100vw;',
            impact: 'Scroll horizontal indesejado em todas as páginas.'
          }));
        }

        // 100vh mobile
        if (decl.property.match(/^(height|min-height|max-height)$/) && decl.value === '100vh') {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.CSS,
            subcategory: 'values',
            title: '100vh problemático em mobile',
            description: 'height: 100vh não considera barra de endereço mobile.',
            file: file.path,
            line: decl.line,
            column: 0,
            code: `${decl.property}: ${decl.value};`,
            evidence: 'Barra de endereço mobile cobre conteúdo',
            suggestion: 'Use height: 100dvh; com fallback: height: 100vh; height: 100dvh;',
            impact: 'Conteúdo cortado em mobile Safari/Chrome.'
          }));
        }

        // var() sem fallback
        const varWithoutFallback = decl.value.match(/var\(--[^,)]+\)/g);
        if (varWithoutFallback) {
          varWithoutFallback.forEach(varUsage => {
            issues.push(new Issue({
              severity: SEVERITY.MEDIUM,
              category: CATEGORY.CSS,
              subcategory: 'values',
              title: 'var() sem fallback',
              description: `${varUsage} usado sem valor fallback.`,
              file: file.path,
              line: decl.line,
              column: 0,
              code: `${decl.property}: ${decl.value};`,
              evidence: 'Falta fallback em var()',
              suggestion: `Use var(--variable, fallbackvalue): ${varUsage.replace(')', ', #000)')};`,
              impact: 'Se variável não existir, propriedade não terá valor.'
            }));
          });
        }
      });
    });
  });

  // Reportar inconsistência de formatos de cores
  if (colorFormats.size > 2) {
    const formats = Array.from(colorFormats.entries()).map(([f, c]) => `${f}(${c}x)`).join(', ');
    issues.push(new Issue({
      severity: SEVERITY.LOW,
      category: CATEGORY.CSS,
      subcategory: 'values',
      title: 'Formatos de cores inconsistentes',
      description: `Projeto usa ${colorFormats.size} formatos diferentes de cores.`,
      file: 'global',
      line: 0,
      column: 0,
      code: formats,
      evidence: formats,
      suggestion: 'Padronize usando preferencialmente hex (#rrggbb) ou rgb/rgba para transparência.',
      impact: 'Inconsistência no código.'
    }));
  }

  console.log(`[ValuesAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
