/**
 * Analisador de Manutenibilidade CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeMaintainability(cssFiles) {
  console.log(`[MaintainabilityAnalyzer] INÍCIO`);
  const issues = [];
  const codeBlocks = new Map();
  const fontSizes = new Set();
  const colors = new Set();

  cssFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed?.rules) return;

    // Detectar código duplicado
    parsed.rules.forEach(rule => {
      const declarations = rule.declarations
        .map(d => `${d.property}:${d.value}`)
        .sort()
        .join(';');

      if (declarations.length > 50) {
        if (!codeBlocks.has(declarations)) {
          codeBlocks.set(declarations, []);
        }
        codeBlocks.get(declarations).push({
          selector: rule.selector,
          file: file.path,
          line: rule.line
        });
      }

      // Regras vazias
      if (rule.declarations.length === 0) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.CSS,
          subcategory: 'maintainability',
          title: 'Regra CSS vazia',
          description: 'Seletor sem declarações.',
          file: file.path,
          line: rule.line,
          column: 0,
          code: `${rule.selector} { }`,
          evidence: '0 declarações',
          suggestion: 'Remova regra vazia ou adicione declarações.',
          impact: 'Código desnecessário.'
        }));
      }

      // Coletar font-sizes e cores
      rule.declarations.forEach(decl => {
        if (decl.property === 'font-size') {
          fontSizes.add(decl.value);
        }

        // Coletar cores
        if (decl.property.includes('color') || decl.property.includes('background')) {
          const value = decl.value.toLowerCase();
          if (value.match(/^(#[0-9a-f]{3,8}|rgb|rgba|hsl|hsla)/)) {
            colors.add(value);
          }
        }
      });

      // Seletores com ID
      if (rule.selector.includes('#')) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.CSS,
          subcategory: 'maintainability',
          title: 'Seletor com ID',
          description: 'ID usado em seletor CSS. Alta especificidade dificulta sobrescrita.',
          file: file.path,
          line: rule.line,
          column: 0,
          code: rule.selector,
          evidence: 'Seletores ID têm especificidade muito alta',
          suggestion: 'Use classes ao invés de IDs para estilização.',
          impact: 'Dificulta reutilização e sobrescrita de estilos.'
        }));
      }
    });

    // Detectar blocos de código comentado
    const commentBlocks = file.content.match(/\/\*[\s\S]*?\*\//g);
    if (commentBlocks) {
      commentBlocks.forEach(block => {
        if (block.length > 200) {
          // Verificar se parece código CSS comentado (tem { } : ; )
          const hasCodePatterns = block.match(/[{};:]/g);
          if (hasCodePatterns && hasCodePatterns.length > 5) {
            issues.push(new Issue({
              severity: SEVERITY.LOW,
              category: CATEGORY.CSS,
              subcategory: 'maintainability',
              title: 'Código comentado detectado',
              description: 'Bloco grande de código CSS comentado encontrado.',
              file: file.path,
              line: 0,
              column: 0,
              code: block.substring(0, 100) + '...',
              evidence: `${block.length} caracteres comentados`,
              suggestion: 'Remova código comentado. Use controle de versão (Git) para histórico.',
              impact: 'Dificulta leitura e aumenta tamanho do arquivo.'
            }));
          }
        }
      });
    }
  });

  // Reportar duplicatas
  codeBlocks.forEach((instances, code) => {
    if (instances.length > 1) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.CSS,
        subcategory: 'maintainability',
        title: 'Código duplicado detectado',
        description: `Mesmo conjunto de propriedades usado em ${instances.length} seletores.`,
        file: instances[0].file,
        line: instances[0].line,
        column: 0,
        code: instances.map(i => i.selector).join(', '),
        evidence: `${instances.length} ocorrências`,
        suggestion: 'Crie uma classe reutilizável ou use @extend (SASS) para evitar duplicação.',
        impact: 'Aumento do tamanho do arquivo e dificuldade de manutenção.'
      }));
    }
  });

  // Muitos font-sizes
  if (fontSizes.size > 10) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.CSS,
      subcategory: 'maintainability',
      title: 'Sistema de tipografia inconsistente',
      description: `Projeto usa ${fontSizes.size} valores diferentes de font-size.`,
      file: 'global',
      line: 0,
      column: 0,
      code: Array.from(fontSizes).slice(0, 10).join(', ') + (fontSizes.size > 10 ? '...' : ''),
      evidence: `${fontSizes.size} font-sizes diferentes`,
      suggestion: 'Defina escala tipográfica: 12px, 14px, 16px, 18px, 24px, 32px (ou usar rem).',
      impact: 'Inconsistência visual, dificulta manutenção.'
    }));
  }

  // Muitas cores
  if (colors.size > 15) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.CSS,
      subcategory: 'maintainability',
      title: 'Sistema de cores inconsistente',
      description: `Projeto usa ${colors.size} cores diferentes.`,
      file: 'global',
      line: 0,
      column: 0,
      code: Array.from(colors).slice(0, 10).join(', ') + (colors.size > 10 ? '...' : ''),
      evidence: `${colors.size} cores diferentes`,
      suggestion: 'Defina paleta de cores limitada: primary, secondary, accent, neutral (com variações).',
      impact: 'Inconsistência visual, dificulta manutenção e branding.'
    }));
  }

  console.log(`[MaintainabilityAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
