/**
 * Frontend Analyzer - API Programática
 *
 * API para uso por agentes e scripts automatizados
 *
 * Uso:
 *   import { analyzeProject, analyzeURL } from './src/api.js';
 *
 *   const result = await analyzeProject('/caminho/projeto');
 *   const result = await analyzeURL('https://exemplo.com');
 */

import { scanProject } from './utils/file-scanner.js';
import { fetchAndSave, isURL } from './utils/web-fetcher.js';
import { parseCSS } from './parsers/css-parser.js';
import { parseHTML } from './parsers/html-parser.js';
import { HTMLParser } from './parsers/html-parser.js';

// Analisadores
import { analyzeSpecificity } from './analyzers/css/specificity.js';
import { analyzeSelectors } from './analyzers/css/selectors.js';
import { analyzeProperties } from './analyzers/css/properties.js';
import { analyzeValues } from './analyzers/css/values.js';
import { analyzeLayout } from './analyzers/css/layout.js';
import { analyzeResponsive } from './analyzers/css/responsive.js';
import { analyzePerformance as analyzeCSSPerformance } from './analyzers/css/performance.js';
import { analyzeMaintainability } from './analyzers/css/maintainability.js';
import { analyzeStructure } from './analyzers/html/structure.js';
import { analyzeSemantics } from './analyzers/html/semantics.js';
import { analyzeAccessibility } from './analyzers/html/accessibility.js';
import { analyzeForms } from './analyzers/html/forms.js';
import { analyzeMeta } from './analyzers/html/meta.js';
import { analyzeMedia } from './analyzers/html/media.js';
import { analyzeCrossReferences } from './analyzers/integration/cross-references.js';
import { analyzeInheritance } from './analyzers/integration/inheritance.js';
import { analyzeStates } from './analyzers/integration/states.js';
import { analyzePerformanceMetrics } from './analyzers/performance/metrics.js';
import { analyzeBrowserSupport } from './analyzers/compatibility/browser-support.js';

// Utilitários
import { calculateScore, calculateCategoryScores, getScoreGrade } from './utils/scoring.js';
import { SEVERITY } from './utils/severity.js';

/**
 * Analisa um projeto local
 *
 * @param {string} projectPath - Caminho do projeto
 * @param {object} options - Opções de análise
 * @param {boolean} options.silent - Modo silencioso (sem logs)
 * @returns {Promise<object>} Resultado da análise
 */
export async function analyzeProject(projectPath, options = {}) {
  const { silent = false } = options;

  if (!silent) console.log(`[API] Analisando projeto: ${projectPath}`);

  try {
    // Scan
    const files = await scanProject(projectPath);

    // Parse
    files.css.forEach(file => {
      file.parsed = parseCSS(file.content, file.path);
    });

    files.html.forEach(file => {
      file.parsed = parseHTML(file.content, file.path);
      file.parsedObj = new HTMLParser(file.content, file.path);
      file.parsedObj.parse();
    });

    // Análise
    const allIssues = [];

    allIssues.push(...analyzeSpecificity(files.css));
    allIssues.push(...analyzeSelectors(files.css));
    allIssues.push(...analyzeProperties(files.css));
    allIssues.push(...analyzeValues(files.css));
    allIssues.push(...analyzeLayout(files.css));
    allIssues.push(...analyzeResponsive(files.css));
    allIssues.push(...analyzeCSSPerformance(files.css));
    allIssues.push(...analyzeMaintainability(files.css));
    allIssues.push(...analyzeStructure(files.html));
    allIssues.push(...analyzeSemantics(files.html));
    allIssues.push(...analyzeAccessibility(files.html));
    allIssues.push(...analyzeForms(files.html));
    allIssues.push(...analyzeMeta(files.html));
    allIssues.push(...analyzeMedia(files.html));
    allIssues.push(...analyzeCrossReferences(files.html, files.css));
    allIssues.push(...analyzeInheritance(files.css));
    allIssues.push(...analyzeStates(files.css));
    allIssues.push(...analyzePerformanceMetrics(files.html, files.css));
    allIssues.push(...analyzeBrowserSupport(files.css));

    // Calcular scores
    const categoryScores = calculateCategoryScores(allIssues);
    const generalScore = calculateScore(allIssues);

    // Agrupar issues por severidade
    const bySeverity = {
      critical: allIssues.filter(i => i.severity === SEVERITY.CRITICAL).length,
      high: allIssues.filter(i => i.severity === SEVERITY.HIGH).length,
      medium: allIssues.filter(i => i.severity === SEVERITY.MEDIUM).length,
      low: allIssues.filter(i => i.severity === SEVERITY.LOW).length,
      info: allIssues.filter(i => i.severity === SEVERITY.INFO).length
    };

    if (!silent) {
      console.log(`[API] Análise concluída:`);
      console.log(`[API]   Total de problemas: ${allIssues.length}`);
      console.log(`[API]   Score geral: ${generalScore}/100`);
      console.log(`[API]   Críticos: ${bySeverity.critical}, High: ${bySeverity.high}, Medium: ${bySeverity.medium}, Low: ${bySeverity.low}`);
    }

    return {
      success: true,
      projectPath,
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: allIssues.length,
        bySeverity,
        scores: {
          general: generalScore,
          grade: getScoreGrade(generalScore),
          ...categoryScores
        }
      },
      issues: allIssues,
      files: {
        cssCount: files.css.length,
        htmlCount: files.html.length,
        inlineStylesCount: files.inlineStyles?.length || 0,
        styleAttributesCount: files.styleAttributes?.length || 0
      }
    };

  } catch (error) {
    if (!silent) console.error(`[API] Erro na análise:`, error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Analisa uma URL remota
 *
 * @param {string} url - URL do site
 * @param {object} options - Opções de análise
 * @param {boolean} options.silent - Modo silencioso
 * @returns {Promise<object>} Resultado da análise
 */
export async function analyzeURL(url, options = {}) {
  const { silent = false } = options;

  if (!silent) console.log(`[API] Analisando URL: ${url}`);

  try {
    // Fetch HTML
    const fetchResult = await fetchAndSave(url);

    if (!silent) {
      console.log(`[API] HTML baixado: ${fetchResult.size} bytes`);
      console.log(`[API] Salvo em: ${fetchResult.savedDir}`);
    }

    // Analisar projeto baixado
    const result = await analyzeProject(fetchResult.savedDir, options);

    return {
      ...result,
      url,
      downloadedSize: fetchResult.size,
      downloadedPath: fetchResult.savedPath
    };

  } catch (error) {
    if (!silent) console.error(`[API] Erro ao analisar URL:`, error.message);
    return {
      success: false,
      url,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Filtra issues por severidade
 *
 * @param {Array} issues - Array de issues
 * @param {string|Array} severity - Severidade(s) para filtrar
 * @returns {Array} Issues filtradas
 */
export function filterBySeverity(issues, severity) {
  const severities = Array.isArray(severity) ? severity : [severity];
  return issues.filter(i => severities.includes(i.severity));
}

/**
 * Filtra issues por categoria
 *
 * @param {Array} issues - Array de issues
 * @param {string|Array} category - Categoria(s) para filtrar
 * @returns {Array} Issues filtradas
 */
export function filterByCategory(issues, category) {
  const categories = Array.isArray(category) ? category : [category];
  return issues.filter(i => categories.includes(i.category));
}

/**
 * Obtém issues críticas (CRITICAL e HIGH)
 *
 * @param {Array} issues - Array de issues
 * @returns {Array} Issues críticas
 */
export function getCriticalIssues(issues) {
  return filterBySeverity(issues, [SEVERITY.CRITICAL, SEVERITY.HIGH]);
}

/**
 * Verifica se o projeto passa em critérios mínimos
 *
 * @param {object} result - Resultado da análise
 * @param {object} criteria - Critérios mínimos
 * @param {number} criteria.minScore - Score mínimo geral (padrão: 70)
 * @param {number} criteria.maxCritical - Máximo de issues críticas (padrão: 0)
 * @param {number} criteria.maxHigh - Máximo de issues high (padrão: 5)
 * @returns {object} Resultado da validação
 */
export function validateCriteria(result, criteria = {}) {
  const {
    minScore = 70,
    maxCritical = 0,
    maxHigh = 5
  } = criteria;

  const passed = {
    score: result.summary.scores.general >= minScore,
    critical: result.summary.bySeverity.critical <= maxCritical,
    high: result.summary.bySeverity.high <= maxHigh
  };

  return {
    passed: passed.score && passed.critical && passed.high,
    checks: passed,
    scores: result.summary.scores,
    issues: result.summary.bySeverity
  };
}

/**
 * Analisa um projeto e aplica correções automáticas
 *
 * @param {string} projectPath - Caminho do projeto
 * @param {object} options - Opções de análise e fix
 * @param {boolean} options.silent - Modo silencioso
 * @param {boolean} options.dryRun - Modo dry-run (não salva correções)
 * @param {boolean} options.backupFiles - Criar backups antes de modificar
 * @param {array} options.fixCategories - Categorias a corrigir
 * @returns {Promise<object>} Resultado da análise + fix
 */
export async function analyzeAndFix(projectPath, options = {}) {
  const { silent = false, dryRun = false, backupFiles = true, fixCategories = ['all'] } = options;

  if (!silent) {
    console.log(`[API] analyzeAndFix: ${projectPath}`);
    console.log(`[API] DryRun: ${dryRun}, Backup: ${backupFiles}`);
  }

  try {
    // Primeiro, analisar o projeto
    const analysisResult = await analyzeProject(projectPath, { silent });

    if (!analysisResult.success) {
      return analysisResult;
    }

    // Importar auto-fixer dinamicamente
    const { autoFix } = await import('./auto-fixer.js');

    // Aplicar correções
    if (!silent) console.log(`[API] Aplicando correções automáticas...`);

    const fixResult = await autoFix(analysisResult, {
      dryRun,
      backupFiles,
      fixCategories
    });

    if (!silent) {
      console.log(`[API] Correções aplicadas:`);
      console.log(`[API]   Fixados: ${fixResult.summary.fixedIssues}`);
      console.log(`[API]   Pulados: ${fixResult.summary.skippedIssues}`);
      console.log(`[API]   Erros: ${fixResult.summary.errorCount}`);
    }

    return {
      ...analysisResult,
      autoFix: fixResult
    };

  } catch (error) {
    if (!silent) console.error(`[API] Erro em analyzeAndFix:`, error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Exportar constantes úteis
export { SEVERITY } from './utils/severity.js';
export { CATEGORY } from './utils/severity.js';
export { autoFix, getFixableIssues, FIXABLE_RULES } from './auto-fixer.js';
