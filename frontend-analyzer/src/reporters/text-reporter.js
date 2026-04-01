/**
 * Reporter de Texto Formatado (ASCII)
 */

import { categorizeIssues, SEVERITY_ICONS, SEVERITY_LABELS } from '../utils/severity.js';
import { calculateScore, calculateCategoryScores, getScoreGrade } from '../utils/scoring.js';

export function generateTextReport(issues, projectName, filesAnalyzed) {
  console.log(`[TextReporter] INÍCIO - Gerando relatório texto`);
  console.log(`[TextReporter] Issues: ${issues.length}, Arquivos: ${filesAnalyzed}`);

  const categorized = categorizeIssues(issues);
  const generalScore = calculateScore(issues);
  const categoryScores = calculateCategoryScores(issues);

  let report = '';

  // Header
  report += '╔══════════════════════════════════════════════════════════════════╗\n';
  report += '║              RELATÓRIO DE ANÁLISE FRONTEND                       ║\n';
  report += `║              Projeto: ${projectName.padEnd(43)} ║\n`;
  report += `║              Data: ${new Date().toLocaleString('pt-BR').padEnd(46)} ║\n`;
  report += `║              Arquivos analisados: ${String(filesAnalyzed).padEnd(31)} ║\n`;
  report += '╚══════════════════════════════════════════════════════════════════╝\n\n';

  // Sumário Executivo
  report += '┌──────────────────────────────────────────────────────────────────┐\n';
  report += '│ SUMÁRIO EXECUTIVO                                                │\n';
  report += '├──────────────────────────────────────────────────────────────────┤\n';
  report += '│                                                                  │\n';
  report += `│ Total de problemas encontrados: ${String(issues.length).padEnd(33)} │\n`;
  report += '│                                                                  │\n';
  report += '│ Por severidade:                                                  │\n';
  report += `│   🔴 Críticos (quebram funcionalidade):     ${String(categorized.critical.length).padStart(2)}                   │\n`;
  report += `│   🟠 Altos (afetam UX significativamente):  ${String(categorized.high.length).padStart(2)}                   │\n`;
  report += `│   🟡 Médios (melhorias recomendadas):       ${String(categorized.medium.length).padStart(2)}                   │\n`;
  report += `│   🔵 Baixos (boas práticas):                ${String(categorized.low.length).padStart(2)}                   │\n`;
  report += `│   ⚪ Info (sugestões):                      ${String(categorized.info.length).padStart(2)}                   │\n`;
  report += '│                                                                  │\n';

  // Contar por categoria
  const byCategory = {};
  issues.forEach(issue => {
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  });

  report += '│ Por categoria:                                                   │\n';
  Object.entries(byCategory).forEach(([cat, count]) => {
    report += `│   ${cat.padEnd(17)}: ${String(count).padStart(2)} problemas${' '.repeat(31)}│\n`;
  });
  report += '│                                                                  │\n';
  report += `│ Score geral: ${generalScore}/100 (${getScoreGrade(generalScore)})${' '.repeat(Math.max(0, 40 - getScoreGrade(generalScore).length))}│\n`;
  report += `│   - CSS:            ${categoryScores.css}/100${' '.repeat(33)}│\n`;
  report += `│   - HTML:           ${categoryScores.html}/100${' '.repeat(33)}│\n`;
  report += `│   - Acessibilidade: ${categoryScores.accessibility}/100${' '.repeat(33)}│\n`;
  report += `│   - Performance:    ${categoryScores.performance}/100${' '.repeat(33)}│\n`;
  report += '│                                                                  │\n';
  report += '└──────────────────────────────────────────────────────────────────┘\n\n';

  // Problemas detalhados
  if (issues.length > 0) {
    report += '══════════════════════════════════════════════════════════════════\n';
    report += '                    PROBLEMAS DETALHADOS\n';
    report += '══════════════════════════════════════════════════════════════════\n\n';

    // Ordenar por severidade
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    severityOrder.forEach(severity => {
      const issuesOfSeverity = categorized[severity];
      if (issuesOfSeverity.length === 0) return;

      report += `\n${SEVERITY_ICONS[severity]} ${SEVERITY_LABELS[severity]} (${issuesOfSeverity.length} problemas)\n`;
      report += '─'.repeat(66) + '\n\n';

      issuesOfSeverity.slice(0, 20).forEach((issue, index) => {
        report += `${index + 1}. ${issue.title}\n`;
        report += `   Categoria: ${issue.category} > ${issue.subcategory}\n`;
        report += `   Arquivo: ${issue.file}:${issue.line}\n`;
        report += `   Descrição: ${issue.description}\n`;
        if (issue.code) {
          report += `   Código:\n`;
          issue.code.split('\n').forEach(line => {
            report += `      ${line}\n`;
          });
        }
        if (issue.evidence) {
          report += `   Evidência: ${issue.evidence}\n`;
        }
        report += `   Sugestão: ${issue.suggestion}\n`;
        report += `   Impacto: ${issue.impact}\n`;
        if (issue.wcagLevel) {
          report += `   WCAG: Nível ${issue.wcagLevel}\n`;
        }
        if (issue.performanceImpact) {
          report += `   Impacto Performance: ${issue.performanceImpact}\n`;
        }
        report += '\n';
      });

      if (issuesOfSeverity.length > 20) {
        report += `   ... e mais ${issuesOfSeverity.length - 20} problemas ${SEVERITY_LABELS[severity]}\n\n`;
      }
    });
  }

  // Código para correção rápida
  report += '\n══════════════════════════════════════════════════════════════════\n';
  report += '                    CÓDIGO PARA CORREÇÃO RÁPIDA\n';
  report += '══════════════════════════════════════════════════════════════════\n\n';

  // Exemplos de correções rápidas
  const criticalIssues = categorized.critical.slice(0, 5);
  const highIssues = categorized.high.slice(0, 5);

  [...criticalIssues, ...highIssues].forEach((issue, index) => {
    report += `${index + 1}. ${issue.title} (${issue.file}:${issue.line})\n`;
    report += `   ${issue.suggestion}\n\n`;
  });

  console.log(`[TextReporter] FIM - Relatório gerado (${report.length} caracteres)`);
  return report;
}
