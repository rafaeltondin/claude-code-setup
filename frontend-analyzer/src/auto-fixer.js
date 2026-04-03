/**
 * Auto-Fixer - Sistema Automático de Correção de Issues
 *
 * Aplica correções automáticas em problemas detectados pelo analyzer
 * de forma segura e não-destrutiva.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { basename } from 'path';
import { SEVERITY, CATEGORY } from './utils/severity.js';

// Importar helpers de manipulação
import {
  addMetaTag,
  ensureAttribute,
  ensureTitle,
  addImageAlts,
  addAriaLabelsToInputs,
  addAriaLabelsToLinks,
  addButtonTypes,
  addWarningComment,
  addNoopenerToBlankLinks,
  addDecodingAsync,
  addDeferToScripts,
  replaceDeprecatedTags,
  addPreconnectForCDNs,
  addFetchPriorityToHeroImage
} from './utils/html-fixer.js';

import {
  addBoxSizingReset,
  addFocusForHover,
  addVendorPrefixes,
  normalizeCSS,
  addFontDisplay,
  addReducedMotion,
  removeZeroUnits
} from './utils/css-fixer.js';

/**
 * Mapa de regras fixáveis
 * Cada regra tem: id, description, fixFunction, category, severity
 */
export const FIXABLE_RULES = {
  'html-missing-lang': {
    id: 'html-missing-lang',
    description: 'Adiciona atributo lang="pt-BR" na tag <html>',
    category: 'accessibility',
    severity: SEVERITY.HIGH,
    fixFunction: (html) => ensureAttribute(html, 'html', 'lang', 'pt-BR')
  },

  'html-missing-viewport': {
    id: 'html-missing-viewport',
    description: 'Adiciona meta viewport responsiva',
    category: 'meta',
    severity: SEVERITY.HIGH,
    fixFunction: (html) => addMetaTag(html, 'viewport', 'width=device-width, initial-scale=1.0')
  },

  'html-missing-charset': {
    id: 'html-missing-charset',
    description: 'Adiciona meta charset UTF-8',
    category: 'meta',
    severity: SEVERITY.HIGH,
    fixFunction: (html) => addMetaTag(html, 'charset="UTF-8"')
  },

  'html-missing-title': {
    id: 'html-missing-title',
    description: 'Adiciona tag <title> no documento',
    category: 'meta',
    severity: SEVERITY.HIGH,
    fixFunction: (html) => ensureTitle(html, 'Page Title')
  },

  'img-missing-alt': {
    id: 'img-missing-alt',
    description: 'Adiciona atributo alt em imagens',
    category: 'accessibility',
    severity: SEVERITY.CRITICAL,
    fixFunction: (html) => addImageAlts(html)
  },

  'input-missing-label': {
    id: 'input-missing-label',
    description: 'Adiciona aria-label em inputs sem label associado',
    category: 'forms',
    severity: SEVERITY.HIGH,
    fixFunction: (html) => addAriaLabelsToInputs(html)
  },

  'link-without-text': {
    id: 'link-without-text',
    description: 'Adiciona aria-label em links sem texto',
    category: 'accessibility',
    severity: SEVERITY.HIGH,
    fixFunction: (html) => addAriaLabelsToLinks(html)
  },

  'button-missing-type': {
    id: 'button-missing-type',
    description: 'Adiciona type="button" em botões sem type',
    category: 'forms',
    severity: SEVERITY.MEDIUM,
    fixFunction: (html) => addButtonTypes(html)
  },

  'css-missing-box-sizing': {
    id: 'css-missing-box-sizing',
    description: 'Adiciona reset universal de box-sizing',
    category: 'css-performance',
    severity: SEVERITY.MEDIUM,
    fixFunction: (css) => addBoxSizingReset(css)
  },

  'css-hover-without-focus': {
    id: 'css-hover-without-focus',
    description: 'Adiciona :focus para cada :hover sem par',
    category: 'accessibility',
    severity: SEVERITY.MEDIUM,
    fixFunction: (css) => addFocusForHover(css)
  },

  'css-missing-vendor-prefix': {
    id: 'css-missing-vendor-prefix',
    description: 'Adiciona prefixos vendor (-webkit-) necessários',
    category: 'compatibility',
    severity: SEVERITY.LOW,
    fixFunction: (css) => addVendorPrefixes(css)
  },

  'html-target-blank-noopener': {
    id: 'html-target-blank-noopener',
    description: 'Adiciona rel="noopener noreferrer" em links target="_blank"',
    category: 'security',
    severity: SEVERITY.MEDIUM,
    fixFunction: (html) => addNoopenerToBlankLinks(html)
  },

  'html-add-decoding-async': {
    id: 'html-add-decoding-async',
    description: 'Adiciona decoding="async" em imagens',
    category: 'performance',
    severity: SEVERITY.LOW,
    fixFunction: (html) => addDecodingAsync(html)
  },

  'html-add-defer-scripts': {
    id: 'html-add-defer-scripts',
    description: 'Adiciona defer em scripts bloqueantes',
    category: 'performance',
    severity: SEVERITY.MEDIUM,
    fixFunction: (html) => addDeferToScripts(html)
  },

  'html-replace-deprecated': {
    id: 'html-replace-deprecated',
    description: 'Substitui tags HTML deprecadas por equivalentes modernos',
    category: 'html',
    severity: SEVERITY.MEDIUM,
    fixFunction: (html) => replaceDeprecatedTags(html)
  },

  'html-add-preconnect': {
    id: 'html-add-preconnect',
    description: 'Adiciona preconnect para domínios CDN externos',
    category: 'performance',
    severity: SEVERITY.MEDIUM,
    fixFunction: (html) => addPreconnectForCDNs(html)
  },

  'html-fetchpriority-hero': {
    id: 'html-fetchpriority-hero',
    description: 'Adiciona fetchpriority="high" na primeira imagem (LCP)',
    category: 'performance',
    severity: SEVERITY.MEDIUM,
    fixFunction: (html) => addFetchPriorityToHeroImage(html)
  },

  'css-add-font-display': {
    id: 'css-add-font-display',
    description: 'Adiciona font-display: swap em @font-face',
    category: 'performance',
    severity: SEVERITY.HIGH,
    fixFunction: (css) => addFontDisplay(css)
  },

  'css-add-reduced-motion': {
    id: 'css-add-reduced-motion',
    description: 'Adiciona @media (prefers-reduced-motion) para animações',
    category: 'accessibility',
    severity: SEVERITY.MEDIUM,
    fixFunction: (css) => addReducedMotion(css)
  },

  'css-remove-zero-units': {
    id: 'css-remove-zero-units',
    description: 'Remove unidades desnecessárias de valores zero (0px → 0)',
    category: 'css',
    severity: SEVERITY.INFO,
    fixFunction: (css) => removeZeroUnits(css)
  }
};

/**
 * Identifica qual regra fixável corresponde a um issue
 *
 * @param {object} issue - Issue do analyzer
 * @returns {string|null} ID da regra fixável ou null
 */
function identifyFixableRule(issue) {
  const title = issue.title || '';
  const description = issue.description || '';
  const text = `${title} ${description}`.toLowerCase();
  const file = issue.file || '';
  const isHTML = file.endsWith('.html');
  const isCSS = file.endsWith('.css');

  // Mapear mensagens de issues para regras fixáveis
  if (isHTML) {
    if (text.includes('lang') && text.includes('html')) return 'html-missing-lang';
    if (text.includes('viewport') || text.includes('meta viewport')) return 'html-missing-viewport';
    if (text.includes('charset') || text.includes('utf-8')) return 'html-missing-charset';
    if (text.includes('title') && text.includes('missing')) return 'html-missing-title';
    if (text.includes('alt') && text.includes('image')) return 'img-missing-alt';
    if (text.includes('label') && text.includes('input')) return 'input-missing-label';
    if (text.includes('link') && text.includes('text')) return 'link-without-text';
    if (text.includes('button') && text.includes('type')) return 'button-missing-type';
    if (text.includes('target="_blank"') && text.includes('noopener')) return 'html-target-blank-noopener';
    if (text.includes('decoding') && text.includes('async')) return 'html-add-decoding-async';
    if (text.includes('script') && text.includes('defer')) return 'html-add-defer-scripts';
    if (text.includes('deprecated')) return 'html-replace-deprecated';
    if (text.includes('preconnect')) return 'html-add-preconnect';
    if (text.includes('fetchpriority')) return 'html-fetchpriority-hero';
  }

  if (isCSS) {
    if (text.includes('box-sizing')) return 'css-missing-box-sizing';
    if (text.includes(':hover') && text.includes(':focus')) return 'css-hover-without-focus';
    if (text.includes('vendor prefix') || text.includes('-webkit-')) return 'css-missing-vendor-prefix';
    if (text.includes('font-display')) return 'css-add-font-display';
    if (text.includes('reduced-motion') || text.includes('prefers-reduced-motion')) return 'css-add-reduced-motion';
    if (text.includes('0px') || text.includes('0em') || text.includes('zero')) return 'css-remove-zero-units';
  }

  return null;
}

/**
 * Retorna apenas issues que podem ser corrigidos automaticamente
 *
 * @param {array} issues - Array de issues
 * @returns {array} Issues fixáveis com metadata de fix
 */
export function getFixableIssues(issues) {
  console.log(`[AutoFixer] getFixableIssues: Analisando ${issues.length} issues`);

  const fixable = issues
    .map(issue => {
      const ruleId = identifyFixableRule(issue);

      if (ruleId && FIXABLE_RULES[ruleId]) {
        return {
          ...issue,
          fixable: true,
          fixRuleId: ruleId,
          fixDescription: FIXABLE_RULES[ruleId].description
        };
      }

      return null;
    })
    .filter(Boolean);

  console.log(`[AutoFixer] Encontrados ${fixable.length} issues fixáveis`);
  return fixable;
}

/**
 * Cria backup de um arquivo
 *
 * @param {string} filePath - Caminho do arquivo
 * @returns {string} Caminho do backup
 */
function createBackup(filePath) {
  console.log(`[AutoFixer] Criando backup de ${filePath}`);

  if (!existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const backupPath = `${filePath}.backup`;
  copyFileSync(filePath, backupPath);

  console.log(`[AutoFixer] Backup criado: ${backupPath}`);
  return backupPath;
}

/**
 * Aplica fixes em um arquivo HTML
 *
 * @param {string} filePath - Caminho do arquivo
 * @param {array} fixes - Array de IDs de regras a aplicar
 * @param {boolean} dryRun - Modo dry-run (não salva)
 * @returns {object} Resultado do fix
 */
function fixHTMLFile(filePath, fixes, dryRun = false) {
  console.log(`[AutoFixer] fixHTMLFile: ${filePath}`);
  console.log(`[AutoFixer] Fixes a aplicar: ${fixes.length}`);

  if (!existsSync(filePath)) {
    return {
      success: false,
      error: `Arquivo não encontrado: ${filePath}`
    };
  }

  try {
    let html = readFileSync(filePath, 'utf-8');
    const originalHTML = html;
    const appliedFixes = [];

    // Aplicar cada fix
    fixes.forEach(ruleId => {
      const rule = FIXABLE_RULES[ruleId];

      if (!rule) {
        console.warn(`[AutoFixer] Regra não encontrada: ${ruleId}`);
        return;
      }

      console.log(`[AutoFixer] Aplicando fix: ${rule.description}`);

      try {
        const fixedHTML = rule.fixFunction(html);

        if (fixedHTML !== html) {
          html = fixedHTML;
          appliedFixes.push({
            ruleId,
            description: rule.description,
            success: true
          });
          console.log(`[AutoFixer] ✅ Fix aplicado: ${ruleId}`);
        } else {
          console.log(`[AutoFixer] ⚠️ Fix não alterou o HTML: ${ruleId}`);
        }
      } catch (error) {
        console.error(`[AutoFixer] ❌ Erro ao aplicar fix ${ruleId}:`, error.message);
        appliedFixes.push({
          ruleId,
          description: rule.description,
          success: false,
          error: error.message
        });
      }
    });

    // Verificar se houve mudanças
    const hasChanges = html !== originalHTML;

    if (!dryRun && hasChanges) {
      // Criar backup
      createBackup(filePath);

      // Salvar arquivo modificado
      writeFileSync(filePath, html, 'utf-8');
      console.log(`[AutoFixer] ✅ Arquivo salvo: ${filePath}`);
    }

    return {
      success: true,
      file: filePath,
      appliedFixes,
      hasChanges,
      dryRun
    };

  } catch (error) {
    console.error(`[AutoFixer] ERRO ao corrigir arquivo:`, error.message);
    return {
      success: false,
      file: filePath,
      error: error.message
    };
  }
}

/**
 * Aplica fixes em um arquivo CSS
 *
 * @param {string} filePath - Caminho do arquivo
 * @param {array} fixes - Array de IDs de regras a aplicar
 * @param {boolean} dryRun - Modo dry-run (não salva)
 * @returns {object} Resultado do fix
 */
function fixCSSFile(filePath, fixes, dryRun = false) {
  console.log(`[AutoFixer] fixCSSFile: ${filePath}`);
  console.log(`[AutoFixer] Fixes a aplicar: ${fixes.length}`);

  if (!existsSync(filePath)) {
    return {
      success: false,
      error: `Arquivo não encontrado: ${filePath}`
    };
  }

  try {
    let css = readFileSync(filePath, 'utf-8');
    const originalCSS = css;
    const appliedFixes = [];

    // Aplicar cada fix
    fixes.forEach(ruleId => {
      const rule = FIXABLE_RULES[ruleId];

      if (!rule) {
        console.warn(`[AutoFixer] Regra não encontrada: ${ruleId}`);
        return;
      }

      console.log(`[AutoFixer] Aplicando fix: ${rule.description}`);

      try {
        const fixedCSS = rule.fixFunction(css);

        if (fixedCSS !== css) {
          css = fixedCSS;
          appliedFixes.push({
            ruleId,
            description: rule.description,
            success: true
          });
          console.log(`[AutoFixer] ✅ Fix aplicado: ${ruleId}`);
        } else {
          console.log(`[AutoFixer] ⚠️ Fix não alterou o CSS: ${ruleId}`);
        }
      } catch (error) {
        console.error(`[AutoFixer] ❌ Erro ao aplicar fix ${ruleId}:`, error.message);
        appliedFixes.push({
          ruleId,
          description: rule.description,
          success: false,
          error: error.message
        });
      }
    });

    // Normalizar CSS
    css = normalizeCSS(css);

    // Verificar se houve mudanças
    const hasChanges = css !== originalCSS;

    if (!dryRun && hasChanges) {
      // Criar backup
      createBackup(filePath);

      // Salvar arquivo modificado
      writeFileSync(filePath, css, 'utf-8');
      console.log(`[AutoFixer] ✅ Arquivo salvo: ${filePath}`);
    }

    return {
      success: true,
      file: filePath,
      appliedFixes,
      hasChanges,
      dryRun
    };

  } catch (error) {
    console.error(`[AutoFixer] ERRO ao corrigir arquivo:`, error.message);
    return {
      success: false,
      file: filePath,
      error: error.message
    };
  }
}

/**
 * Aplica correções automáticas em um resultado de análise
 *
 * @param {object} analysisResult - Resultado do analyzeProject()
 * @param {object} options - Opções de fix
 * @param {boolean} options.dryRun - Modo dry-run (padrão: false)
 * @param {boolean} options.backupFiles - Criar backups (padrão: true)
 * @param {array} options.fixCategories - Categorias a corrigir (padrão: ['all'])
 * @returns {Promise<object>} Resultado das correções
 */
export async function autoFix(analysisResult, options = {}) {
  const {
    dryRun = false,
    backupFiles = true,
    fixCategories = ['all']
  } = options;

  console.log(`[AutoFixer] INÍCIO - autoFix`);
  console.log(`[AutoFixer] Opções:`, { dryRun, backupFiles, fixCategories });

  if (!analysisResult.success) {
    console.error(`[AutoFixer] Análise falhou, não é possível aplicar fixes`);
    return {
      success: false,
      error: 'Analysis result is not successful'
    };
  }

  const startTime = Date.now();

  try {
    // Filtrar issues fixáveis
    const fixableIssues = getFixableIssues(analysisResult.issues);

    if (fixableIssues.length === 0) {
      console.log(`[AutoFixer] Nenhum issue fixável encontrado`);
      return {
        success: true,
        fixed: [],
        skipped: analysisResult.issues,
        errors: [],
        summary: {
          totalIssues: analysisResult.issues.length,
          fixableIssues: 0,
          fixedIssues: 0,
          skippedIssues: analysisResult.issues.length,
          errorCount: 0,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Agrupar fixes por arquivo
    const fixesByFile = {};

    fixableIssues.forEach(issue => {
      const { file, fixRuleId } = issue;

      if (!fixesByFile[file]) {
        fixesByFile[file] = new Set();
      }

      fixesByFile[file].add(fixRuleId);
    });

    console.log(`[AutoFixer] Arquivos a corrigir: ${Object.keys(fixesByFile).length}`);

    // Aplicar fixes em cada arquivo
    const fixed = [];
    const errors = [];

    for (const [filePath, ruleIds] of Object.entries(fixesByFile)) {
      const isHTML = filePath.endsWith('.html');
      const isCSS = filePath.endsWith('.css');

      console.log(`[AutoFixer] Processando arquivo: ${filePath}`);
      console.log(`[AutoFixer] Regras a aplicar: ${[...ruleIds].join(', ')}`);

      let result;

      if (isHTML) {
        result = fixHTMLFile(filePath, [...ruleIds], dryRun);
      } else if (isCSS) {
        result = fixCSSFile(filePath, [...ruleIds], dryRun);
      } else {
        console.warn(`[AutoFixer] Tipo de arquivo não suportado: ${filePath}`);
        continue;
      }

      if (result.success) {
        fixed.push(result);
      } else {
        errors.push(result);
      }
    }

    // Calcular issues não fixados
    const fixedIssueIds = new Set(
      fixed.flatMap(f => f.appliedFixes.filter(af => af.success).map(af => af.ruleId))
    );

    const skipped = analysisResult.issues.filter(issue => {
      const ruleId = identifyFixableRule(issue);
      return !ruleId || !fixedIssueIds.has(ruleId);
    });

    const executionTime = Date.now() - startTime;

    console.log(`[AutoFixer] FIM - autoFix`);
    console.log(`[AutoFixer] Tempo de execução: ${executionTime}ms`);
    console.log(`[AutoFixer] Issues fixados: ${fixed.length}`);
    console.log(`[AutoFixer] Erros: ${errors.length}`);

    return {
      success: true,
      fixed,
      skipped,
      errors,
      summary: {
        totalIssues: analysisResult.issues.length,
        fixableIssues: fixableIssues.length,
        fixedIssues: fixed.reduce((sum, f) => sum + f.appliedFixes.filter(af => af.success).length, 0),
        skippedIssues: skipped.length,
        errorCount: errors.length,
        executionTime,
        dryRun
      }
    };

  } catch (error) {
    console.error(`[AutoFixer] ERRO CRÍTICO:`, error.message);
    console.error(`[AutoFixer] Stack:`, error.stack);

    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}
