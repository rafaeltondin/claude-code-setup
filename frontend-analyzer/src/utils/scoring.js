/**
 * Sistema de Scoring e Cálculo de Notas
 *
 * Logs:
 * - Cálculo de scores por categoria
 * - Cálculo de score geral
 */

import { SEVERITY, CATEGORY, getSeverityWeight } from './severity.js';

export function calculateScore(issues, category = null) {
  console.log(`[Scoring] INÍCIO - Cálculo de score`);
  console.log(`[Scoring] Categoria: ${category || 'GERAL'}`);
  console.log(`[Scoring] Total de issues: ${issues.length}`);

  // Filtrar por categoria se especificado
  const relevantIssues = category
    ? issues.filter(i => i.category === category)
    : issues;

  console.log(`[Scoring] Issues relevantes: ${relevantIssues.length}`);

  if (relevantIssues.length === 0) {
    console.log(`[Scoring] Nenhuma issue encontrada - Score: 100`);
    return 100;
  }

  // Calcular peso total dos problemas
  const totalWeight = relevantIssues.reduce((sum, issue) => {
    const weight = getSeverityWeight(issue.severity);
    console.log(`[Scoring]   Issue: ${issue.title} - Peso: ${weight}`);
    return sum + weight;
  }, 0);

  console.log(`[Scoring] Peso total dos problemas: ${totalWeight}`);

  // Score base é 100, deduz baseado no peso dos problemas
  // Quanto mais problemas graves, menor o score
  const deduction = Math.min(totalWeight / 10, 100);
  const score = Math.max(0, 100 - deduction);

  console.log(`[Scoring] Dedução aplicada: ${deduction.toFixed(2)}`);
  console.log(`[Scoring] Score final: ${score.toFixed(2)}`);
  console.log(`[Scoring] FIM - Cálculo concluído`);

  return Math.round(score);
}

export function calculateCategoryScores(issues) {
  console.log(`[Scoring] INÍCIO - Cálculo de scores por categoria`);
  console.log(`[Scoring] Total de issues: ${issues.length}`);

  const scores = {};

  Object.values(CATEGORY).forEach(cat => {
    console.log(`[Scoring] Calculando score para categoria: ${cat}`);
    scores[cat] = calculateScore(issues, cat);
  });

  console.log(`[Scoring] Scores por categoria:`, scores);
  console.log(`[Scoring] FIM - Cálculo de scores por categoria concluído`);

  return scores;
}

export function getScoreGrade(score) {
  console.log(`[Scoring] Classificando score: ${score}`);

  if (score >= 90) {
    console.log(`[Scoring] Grade: EXCELENTE`);
    return 'EXCELENTE';
  }
  if (score >= 75) {
    console.log(`[Scoring] Grade: BOM`);
    return 'BOM';
  }
  if (score >= 50) {
    console.log(`[Scoring] Grade: REGULAR`);
    return 'REGULAR';
  }
  if (score >= 25) {
    console.log(`[Scoring] Grade: RUIM`);
    return 'RUIM';
  }
  console.log(`[Scoring] Grade: CRÍTICO`);
  return 'CRÍTICO';
}
