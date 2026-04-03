/**
 * Sistema de Severidade e Categorização de Problemas
 *
 * Logs:
 * - Criação de problemas
 * - Classificação de severidade
 */

export const SEVERITY = {
  CRITICAL: 'critical',    // 🔴 Quebra funcionalidade
  HIGH: 'high',           // 🟠 Afeta UX significativamente
  MEDIUM: 'medium',       // 🟡 Melhorias recomendadas
  LOW: 'low',            // 🔵 Boas práticas
  INFO: 'info'           // ⚪ Sugestões
};

export const CATEGORY = {
  CSS: 'css',
  HTML: 'html',
  ACCESSIBILITY: 'accessibility',
  PERFORMANCE: 'performance',
  COMPATIBILITY: 'compatibility',
  INTEGRATION: 'integration',
  SECURITY: 'security',
  SEO: 'seo'
};

export const SEVERITY_ICONS = {
  [SEVERITY.CRITICAL]: '🔴',
  [SEVERITY.HIGH]: '🟠',
  [SEVERITY.MEDIUM]: '🟡',
  [SEVERITY.LOW]: '🔵',
  [SEVERITY.INFO]: '⚪'
};

export const SEVERITY_LABELS = {
  [SEVERITY.CRITICAL]: 'CRÍTICO',
  [SEVERITY.HIGH]: 'ALTO',
  [SEVERITY.MEDIUM]: 'MÉDIO',
  [SEVERITY.LOW]: 'BAIXO',
  [SEVERITY.INFO]: 'INFO'
};

export class Issue {
  constructor({
    severity,
    category,
    subcategory,
    title,
    description,
    file,
    line,
    column,
    code,
    evidence,
    suggestion,
    impact,
    wcagLevel = null,
    performanceImpact = null
  }) {
    console.log(`[Issue] CRIANDO NOVO PROBLEMA: ${severity} - ${title}`);
    console.log(`[Issue] Categoria: ${category}, Subcategoria: ${subcategory}`);
    console.log(`[Issue] Arquivo: ${file}:${line}:${column}`);

    this.severity = severity;
    this.category = category;
    this.subcategory = subcategory;
    this.title = title;
    this.description = description;
    this.file = file;
    this.line = line;
    this.column = column;
    this.code = code;
    this.evidence = evidence;
    this.suggestion = suggestion;
    this.impact = impact;
    this.wcagLevel = wcagLevel;
    this.performanceImpact = performanceImpact;

    console.log(`[Issue] Problema criado com sucesso ID: ${this.getId()}`);
  }

  getId() {
    return `${this.file}:${this.line}:${this.column}:${this.subcategory}`;
  }

  getIcon() {
    return SEVERITY_ICONS[this.severity];
  }

  getLabel() {
    return SEVERITY_LABELS[this.severity];
  }

  toJSON() {
    return {
      id: this.getId(),
      severity: this.severity,
      category: this.category,
      subcategory: this.subcategory,
      title: this.title,
      description: this.description,
      file: this.file,
      line: this.line,
      column: this.column,
      code: this.code,
      evidence: this.evidence,
      suggestion: this.suggestion,
      impact: this.impact,
      wcagLevel: this.wcagLevel,
      performanceImpact: this.performanceImpact
    };
  }
}

export function getSeverityWeight(severity) {
  const weights = {
    [SEVERITY.CRITICAL]: 100,
    [SEVERITY.HIGH]: 50,
    [SEVERITY.MEDIUM]: 25,
    [SEVERITY.LOW]: 10,
    [SEVERITY.INFO]: 5
  };
  console.log(`[Severity] Calculando peso para severidade: ${severity} = ${weights[severity]}`);
  return weights[severity] || 0;
}

export function categorizeIssues(issues) {
  console.log(`[Severity] INÍCIO - Categorização de ${issues.length} problemas`);

  const categorized = {
    [SEVERITY.CRITICAL]: [],
    [SEVERITY.HIGH]: [],
    [SEVERITY.MEDIUM]: [],
    [SEVERITY.LOW]: [],
    [SEVERITY.INFO]: []
  };

  issues.forEach(issue => {
    if (categorized[issue.severity]) {
      categorized[issue.severity].push(issue);
    }
  });

  console.log(`[Severity] Resultado da categorização:`);
  Object.keys(categorized).forEach(sev => {
    console.log(`[Severity]   ${sev}: ${categorized[sev].length} problemas`);
  });
  console.log(`[Severity] FIM - Categorização concluída`);

  return categorized;
}
