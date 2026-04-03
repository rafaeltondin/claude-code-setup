/**
 * Reporter HTML Interativo
 */

import { calculateScore, calculateCategoryScores, getScoreGrade } from '../utils/scoring.js';
import { categorizeIssues, SEVERITY_ICONS, SEVERITY_LABELS } from '../utils/severity.js';

export function generateHTMLReport(issues, projectName, filesAnalyzed) {
  console.log(`[HTMLReporter] INÍCIO - Gerando relatório HTML`);

  const categorized = categorizeIssues(issues);
  const generalScore = calculateScore(issues);
  const categoryScores = calculateCategoryScores(issues);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Análise Frontend - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .meta { color: #666; margin: 10px 0; }
    .summary { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .score { font-size: 48px; font-weight: bold; color: #4CAF50; }
    .severity-critical { background: #ffebee; border-left: 4px solid #f44336; }
    .severity-high { background: #fff3e0; border-left: 4px solid #ff9800; }
    .severity-medium { background: #fffde7; border-left: 4px solid #ffeb3b; }
    .severity-low { background: #e3f2fd; border-left: 4px solid #2196f3; }
    .severity-info { background: #f5f5f5; border-left: 4px solid #9e9e9e; }
    .issue { margin: 15px 0; padding: 15px; border-radius: 4px; }
    .issue-title { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
    .issue-meta { font-size: 12px; color: #666; margin-bottom: 8px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Relatório de Análise Frontend</h1>
    <div class="meta">
      <p><strong>Projeto:</strong> ${projectName}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      <p><strong>Arquivos analisados:</strong> ${filesAnalyzed}</p>
    </div>

    <div class="summary">
      <h2>Sumário Executivo</h2>
      <p><strong>Total de problemas:</strong> ${issues.length}</p>
      <p><strong>Score geral:</strong> <span class="score">${generalScore}/100</span> (${getScoreGrade(generalScore)})</p>
      <ul>
        <li>🔴 Críticos: ${categorized.critical.length}</li>
        <li>🟠 Altos: ${categorized.high.length}</li>
        <li>🟡 Médios: ${categorized.medium.length}</li>
        <li>🔵 Baixos: ${categorized.low.length}</li>
        <li>⚪ Info: ${categorized.info.length}</li>
      </ul>
    </div>

    <h2>Problemas Detalhados</h2>
    ${Object.entries(categorized).map(([severity, issueList]) => `
      <h3>${SEVERITY_ICONS[severity]} ${SEVERITY_LABELS[severity]} (${issueList.length})</h3>
      ${issueList.slice(0, 20).map(issue => `
        <div class="issue severity-${severity}">
          <div class="issue-title">${issue.title}</div>
          <div class="issue-meta">
            📁 ${issue.file}:${issue.line} | 📂 ${issue.category} > ${issue.subcategory}
          </div>
          <p>${issue.description}</p>
          ${issue.code ? `<pre><code>${escapeHtml(issue.code)}</code></pre>` : ''}
          <p><strong>💡 Sugestão:</strong> ${issue.suggestion}</p>
          <p><strong>⚠️ Impacto:</strong> ${issue.impact}</p>
        </div>
      `).join('')}
    `).join('')}
  </div>
</body>
</html>`;

  console.log(`[HTMLReporter] FIM - Relatório HTML gerado`);
  return html;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
