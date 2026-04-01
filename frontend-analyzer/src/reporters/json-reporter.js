/**
 * Reporter JSON
 */

import { calculateScore, calculateCategoryScores, getScoreGrade } from '../utils/scoring.js';
import { categorizeIssues } from '../utils/severity.js';

export function generateJSONReport(issues, projectName, filesAnalyzed) {
  console.log(`[JSONReporter] INÍCIO - Gerando relatório JSON`);

  const categorized = categorizeIssues(issues);
  const generalScore = calculateScore(issues);
  const categoryScores = calculateCategoryScores(issues);

  const report = {
    project: projectName,
    date: new Date().toISOString(),
    filesAnalyzed: filesAnalyzed,
    summary: {
      total: issues.length,
      bySeverity: {
        critical: categorized.critical.length,
        high: categorized.high.length,
        medium: categorized.medium.length,
        low: categorized.low.length,
        info: categorized.info.length
      },
      byCategory: {},
      scores: {
        general: generalScore,
        grade: getScoreGrade(generalScore),
        ...categoryScores
      }
    },
    issues: issues.map(i => i.toJSON())
  };

  // Calcular por categoria
  issues.forEach(issue => {
    report.summary.byCategory[issue.category] = (report.summary.byCategory[issue.category] || 0) + 1;
  });

  console.log(`[JSONReporter] FIM - Relatório JSON gerado`);
  return JSON.stringify(report, null, 2);
}
