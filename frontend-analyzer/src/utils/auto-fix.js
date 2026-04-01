/**
 * Auto-Fix - Sistema de Correção Automática
 *
 * Gera patches para problemas que podem ser corrigidos automaticamente
 */

import { SEVERITY } from './severity.js';

/**
 * Gera correção automática para uma issue
 *
 * @param {object} issue - Issue a ser corrigida
 * @param {string} fileContent - Conteúdo completo do arquivo
 * @returns {object|null} Patch de correção ou null se não aplicável
 */
export function generateFix(issue, fileContent) {
  // Imagens sem dimensões
  if (issue.title.includes('Imagem sem dimensões') || issue.title.includes('CLS')) {
    return fixImageDimensions(issue, fileContent);
  }

  // Links quebrados (href="#")
  if (issue.title.includes('Link quebrado') && issue.evidence.includes('href="#"')) {
    return fixBrokenLinks(issue, fileContent);
  }

  // Lazy loading em imagens
  if (issue.title.includes('Lazy loading não aplicado')) {
    return fixLazyLoading(issue, fileContent);
  }

  // Alt em imagens
  if (issue.title.includes('Imagem sem atributo alt')) {
    return fixImageAlt(issue, fileContent);
  }

  // !important excessivo (sugestão, não aplicação automática)
  if (issue.title.includes('!important')) {
    return suggestImportantRemoval(issue, fileContent);
  }

  return null;
}

/**
 * Corrige imagens sem dimensões (adiciona width/height placeholders)
 */
function fixImageDimensions(issue, fileContent) {
  const lines = fileContent.split('\n');
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return null;
  }

  const line = lines[lineIndex];
  const imgMatch = line.match(/<img([^>]*)>/);

  if (!imgMatch) {
    return null;
  }

  const attrs = imgMatch[1];

  // Extrair src para tentar adivinhar dimensões (ou usar placeholders)
  const srcMatch = attrs.match(/src=["']([^"']+)["']/);
  const src = srcMatch ? srcMatch[1] : '';

  // Se já tem width e height, não fazer nada
  if (attrs.includes('width=') && attrs.includes('height=')) {
    return null;
  }

  // Adicionar width/height placeholders (usuário deve ajustar para dimensões reais)
  let newAttrs = attrs;
  if (!attrs.includes('width=')) {
    newAttrs += ' width="auto"';
  }
  if (!attrs.includes('height=')) {
    newAttrs += ' height="auto"';
  }

  const newLine = line.replace(/<img([^>]*)>/, `<img${newAttrs}>`);

  return {
    type: 'line-replacement',
    file: issue.file,
    line: issue.line,
    original: line,
    fixed: newLine,
    description: 'Adiciona width/height placeholders (AJUSTE para dimensões reais da imagem)',
    manual: true, // Requer ajuste manual
    comment: `<!-- TODO: Ajustar width/height para dimensões reais da imagem ${src} -->`
  };
}

/**
 * Corrige links quebrados href="#"
 */
function fixBrokenLinks(issue, fileContent) {
  const lines = fileContent.split('\n');
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return null;
  }

  const line = lines[lineIndex];

  // Substituir href="#" por href="javascript:void(0)" ou comentar
  const newLine = line.replace(/href=["']#["']/g, 'href="javascript:void(0)"');

  return {
    type: 'line-replacement',
    file: issue.file,
    line: issue.line,
    original: line,
    fixed: newLine,
    description: 'Substitui href="#" por href="javascript:void(0)"',
    manual: true, // Usuário deve implementar ação real
    comment: `<!-- TODO: Implementar navegação/ação real para este link -->`
  };
}

/**
 * Adiciona lazy loading em imagens
 */
function fixLazyLoading(issue, fileContent) {
  const lines = fileContent.split('\n');
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return null;
  }

  const line = lines[lineIndex];

  // Adicionar loading="lazy"
  const newLine = line.replace(/<img([^>]*?)>/, '<img$1 loading="lazy">');

  return {
    type: 'line-replacement',
    file: issue.file,
    line: issue.line,
    original: line,
    fixed: newLine,
    description: 'Adiciona loading="lazy" para lazy loading nativo',
    manual: false // Pode ser aplicado automaticamente
  };
}

/**
 * Adiciona alt placeholder em imagens
 */
function fixImageAlt(issue, fileContent) {
  const lines = fileContent.split('\n');
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return null;
  }

  const line = lines[lineIndex];
  const imgMatch = line.match(/<img([^>]*)>/);

  if (!imgMatch) {
    return null;
  }

  const attrs = imgMatch[1];
  const srcMatch = attrs.match(/src=["']([^"']+)["']/);
  const src = srcMatch ? srcMatch[1] : '';
  const filename = src.split('/').pop().split('.')[0];

  // Gerar alt descritivo baseado no filename
  const altText = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const newLine = line.replace(/<img([^>]*)>/, `<img$1 alt="${altText}">`);

  return {
    type: 'line-replacement',
    file: issue.file,
    line: issue.line,
    original: line,
    fixed: newLine,
    description: `Adiciona alt="${altText}" (AJUSTE para descrição mais precisa)`,
    manual: true, // Requer ajuste manual para descrição adequada
    comment: `<!-- TODO: Ajustar descrição alt para ser mais precisa -->`
  };
}

/**
 * Sugere remoção de !important (não aplica automaticamente)
 */
function suggestImportantRemoval(issue, fileContent) {
  return {
    type: 'suggestion',
    file: issue.file,
    line: issue.line,
    description: 'Refatore especificidade ao invés de usar !important',
    steps: [
      '1. Identifique o seletor que está sendo sobrescrito',
      '2. Aumente especificidade do seletor original (ex: .parent .class ao invés de .class)',
      '3. Ou use classes utility específicas sem !important',
      '4. Remova !important após refatoração'
    ],
    manual: true,
    autoFixable: false
  };
}

/**
 * Aplica múltiplos fixes em um arquivo
 *
 * @param {string} fileContent - Conteúdo do arquivo
 * @param {Array} fixes - Array de fixes a aplicar
 * @returns {object} Resultado da aplicação
 */
export function applyFixes(fileContent, fixes) {
  let lines = fileContent.split('\n');
  let appliedCount = 0;
  let skippedCount = 0;
  const applied = [];
  const skipped = [];

  // Ordenar fixes por linha (de trás para frente para não afetar números de linha)
  const sortedFixes = [...fixes].sort((a, b) => b.line - a.line);

  sortedFixes.forEach(fix => {
    if (fix.type === 'line-replacement' && !fix.manual) {
      const lineIndex = fix.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = fix.fixed;
        appliedCount++;
        applied.push(fix);
      } else {
        skippedCount++;
        skipped.push({ fix, reason: 'Linha inválida' });
      }
    } else {
      skippedCount++;
      skipped.push({ fix, reason: fix.manual ? 'Requer ajuste manual' : 'Tipo não suportado' });
    }
  });

  return {
    success: true,
    original: fileContent,
    fixed: lines.join('\n'),
    appliedCount,
    skippedCount,
    applied,
    skipped
  };
}

/**
 * Gera relatório de fixes disponíveis
 *
 * @param {Array} issues - Array de issues
 * @param {object} files - Mapa de arquivos { path: content }
 * @returns {object} Relatório de fixes
 */
export function generateFixReport(issues, files) {
  const fixes = [];
  const notFixable = [];

  issues.forEach(issue => {
    const fileContent = files[issue.file];
    if (!fileContent) {
      notFixable.push({ issue, reason: 'Arquivo não encontrado' });
      return;
    }

    const fix = generateFix(issue, fileContent);
    if (fix) {
      fixes.push({ issue, fix });
    } else {
      notFixable.push({ issue, reason: 'Auto-fix não disponível' });
    }
  });

  const autoFixable = fixes.filter(f => !f.fix.manual).length;
  const manualFixes = fixes.filter(f => f.fix.manual).length;

  return {
    total: issues.length,
    fixable: fixes.length,
    autoFixable,
    manualFixes,
    notFixable: notFixable.length,
    fixes,
    notFixable
  };
}
