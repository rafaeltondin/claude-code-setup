/**
 * Agent Reporter - Relatórios otimizados para consumo por agentes Claude Code
 *
 * Gera JSON estruturado com:
 * - Código de correção pronto
 * - Instruções passo-a-passo
 * - Contexto completo para edição
 * - Ações executáveis
 */

/**
 * Gera código de correção baseado no tipo de problema
 * @param {Object} issue Problema detectado
 * @returns {Object} Código original e corrigido
 */
function generateFixCode(issue) {
  const fixes = {
    // CRÍTICOS - Performance
    'Imagem sem dimensões (CLS)': (issue) => ({
      original: issue.code,
      fixed: issue.code.replace(
        /(<img\s+[^>]*?)(\/>|>)/,
        '$1 width="auto" height="auto" $2'
      ),
      instruction: 'Adicione atributos width e height na tag <img>. Descubra as dimensões reais da imagem e substitua "auto".',
      manualSteps: [
        '1. Abra a imagem no navegador',
        '2. Inspecione para ver dimensões reais',
        '3. Substitua width="auto" height="auto" pelos valores reais',
        '4. Exemplo: width="200" height="200"'
      ]
    }),

    // ALTOS - Acessibilidade
    'Link quebrado (href="#")': (issue) => {
      const hasAriaLabel = issue.code.includes('aria-label');
      const label = hasAriaLabel ? issue.code.match(/aria-label="([^"]+)"/)?.[1] : 'Link';

      return {
        original: issue.code,
        fixed: issue.code.replace('href="#"', `href="https://exemplo.com/${label.toLowerCase()}"`),
        instruction: 'Substitua href="#" por URL real OU converta para <button> se for ação JavaScript.',
        alternatives: [
          {
            type: 'link',
            code: issue.code.replace('href="#"', 'href="https://destino-real.com"'),
            when: 'Use quando houver uma página de destino'
          },
          {
            type: 'button',
            code: issue.code
              .replace(/<a\s+/, '<button type="button" ')
              .replace('href="#"', 'onclick="suaFuncao()"')
              .replace('</a>', '</button>'),
            when: 'Use quando for uma ação JavaScript (abrir modal, etc)'
          },
          {
            type: 'javascript-void',
            code: issue.code.replace('href="#"', 'href="javascript:void(0)"'),
            when: 'Use temporariamente enquanto implementa a funcionalidade'
          }
        ]
      };
    },

    // MÉDIOS - CSS
    'z-index sem efeito': (issue) => ({
      original: issue.code,
      fixed: issue.code.replace(/{/, '{ position: relative;'),
      instruction: 'Adicione position: relative; (ou absolute/fixed/sticky) antes do z-index.',
      explanation: 'z-index só funciona em elementos posicionados'
    }),

    '!important excessivo': (issue) => {
      const selector = issue.code.match(/^([^{]+)/)?.[1]?.trim();
      return {
        original: issue.code,
        fixed: issue.code.replace(/\s*!important/g, ''),
        instruction: 'Remova !important e aumente a especificidade do seletor.',
        suggestion: `Use seletor mais específico como: .parent ${selector} ou body ${selector}`
      };
    },

    'justify-content sem display:flex': (issue) => ({
      original: issue.code,
      fixed: issue.code.replace(/{/, '{ display: flex;'),
      instruction: 'Adicione display: flex; antes de justify-content.',
      explanation: 'Propriedades flexbox só funcionam com display: flex'
    }),

    // BAIXOS - Semântica
    'Usar <header> ao invés de <div>': (issue) => ({
      original: issue.code,
      fixed: issue.code
        .replace(/<div\s+class="[^"]*header[^"]*"/, match => match.replace('div', 'header'))
        .replace('</div>', '</header>'),
      instruction: 'Substitua <div class="*header*"> por <header class="...">',
      explanation: 'Melhora semântica, acessibilidade e SEO'
    }),

    'Usar <footer> ao invés de <div>': (issue) => ({
      original: issue.code,
      fixed: issue.code
        .replace(/<div\s+class="[^"]*footer[^"]*"/, match => match.replace('div', 'footer'))
        .replace('</div>', '</footer>'),
      instruction: 'Substitua <div class="*footer*"> por <footer class="...">',
      explanation: 'Melhora semântica, acessibilidade e SEO'
    }),

    'Usar <nav> ao invés de <div>': (issue) => ({
      original: issue.code,
      fixed: issue.code
        .replace(/<div\s+class="[^"]*nav[^"]*"/, match => match.replace('div', 'nav'))
        .replace('</div>', '</nav>'),
      instruction: 'Substitua <div class="*nav*"> por <nav class="...">',
      explanation: 'Melhora semântica e navegação por screen readers'
    }),

    'Usar <section> ao invés de <div>': (issue) => ({
      original: issue.code,
      fixed: issue.code
        .replace(/<div\s+class="[^"]*section[^"]*"/, match => match.replace('div', 'section'))
        .replace('</div>', '</section>'),
      instruction: 'Substitua <div class="*section*"> por <section class="...">',
      explanation: 'Melhora estrutura semântica do documento'
    })
  };

  // Buscar fix específico
  const fixFn = fixes[issue.title];

  if (fixFn) {
    return fixFn(issue);
  }

  // Fix genérico
  return {
    original: issue.code,
    fixed: issue.code, // Sem mudança automática
    instruction: issue.suggestion || 'Veja a sugestão no relatório principal',
    requiresManualFix: true
  };
}

/**
 * Determina o tipo de ação necessária
 * @param {Object} issue Problema
 * @returns {string} Tipo de ação
 */
function getActionType(issue) {
  const title = issue.title?.toLowerCase() || '';
  const suggestion = issue.suggestion?.toLowerCase() || '';

  if (title.includes('adicione') || suggestion.includes('adicione')) {
    return 'add';
  }
  if (title.includes('remova') || suggestion.includes('remova')) {
    return 'remove';
  }
  if (title.includes('substitua') || suggestion.includes('substitua') || suggestion.includes('troque')) {
    return 'replace';
  }
  if (title.includes('refatore') || title.includes('reorganize')) {
    return 'refactor';
  }

  return 'modify';
}

/**
 * Agrupa problemas por arquivo para facilitar edição
 * @param {Array} issues Lista de problemas
 * @returns {Object} Problemas agrupados por arquivo
 */
function groupByFile(issues) {
  const grouped = {};

  issues.forEach(issue => {
    const file = issue.file || 'unknown';

    if (!grouped[file]) {
      grouped[file] = {
        file,
        totalIssues: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        issues: []
      };
    }

    grouped[file].totalIssues++;
    grouped[file][issue.severity]++;
    grouped[file].issues.push(issue);
  });

  // Ordenar issues dentro de cada arquivo por prioridade
  Object.values(grouped).forEach(fileGroup => {
    fileGroup.issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  });

  return grouped;
}

/**
 * Gera plano de ação executável para agentes
 * @param {Array} issues Lista de problemas
 * @returns {Object} Plano de ação
 */
function generateActionPlan(issues) {
  const plan = {
    summary: {
      totalActions: 0,
      criticalActions: 0,
      highActions: 0,
      mediumActions: 0,
      estimatedTime: '0 min',
      readyToAutoFix: 0,
      requiresManualFix: 0
    },
    phases: [
      {
        phase: 1,
        name: 'CRÍTICO - Corrigir Imediatamente',
        priority: 'CRITICAL',
        actions: []
      },
      {
        phase: 2,
        name: 'ALTO - Corrigir Hoje',
        priority: 'HIGH',
        actions: []
      },
      {
        phase: 3,
        name: 'MÉDIO - Corrigir Esta Semana',
        priority: 'MEDIUM',
        actions: []
      },
      {
        phase: 4,
        name: 'BAIXO - Melhorias Incrementais',
        priority: 'LOW',
        actions: []
      }
    ]
  };

  // Processar cada issue
  issues.forEach((issue, index) => {
    const fix = generateFixCode(issue);
    const actionType = getActionType(issue);

    const action = {
      id: `action-${index + 1}`,
      issueId: issue.id,
      file: issue.file,
      line: issue.line,
      title: issue.title,
      severity: issue.severity,
      category: issue.category,
      actionType,

      // Código de correção
      fix: {
        original: fix.original,
        fixed: fix.fixed,
        instruction: fix.instruction,
        alternatives: fix.alternatives || null,
        manualSteps: fix.manualSteps || null,
        requiresManualFix: fix.requiresManualFix || false
      },

      // Contexto para edição
      context: {
        lineNumber: issue.line,
        file: issue.file,
        codeSnippet: issue.code
      },

      // Estimativa
      estimatedTime: fix.requiresManualFix ? '5 min' : '30 sec',
      autoFixable: !fix.requiresManualFix
    };

    // Adicionar à fase apropriada
    const phaseMap = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 3
    };

    const phaseIndex = phaseMap[issue.severity] ?? 3;
    plan.phases[phaseIndex].actions.push(action);

    // Atualizar sumário
    plan.summary.totalActions++;
    if (issue.severity === 'critical') plan.summary.criticalActions++;
    if (issue.severity === 'high') plan.summary.highActions++;
    if (issue.severity === 'medium') plan.summary.mediumActions++;
    if (action.autoFixable) {
      plan.summary.readyToAutoFix++;
    } else {
      plan.summary.requiresManualFix++;
    }
  });

  // Calcular tempo estimado total
  const totalMinutes = plan.summary.readyToAutoFix * 0.5 + plan.summary.requiresManualFix * 5;
  plan.summary.estimatedTime = totalMinutes < 60
    ? `${Math.ceil(totalMinutes)} min`
    : `${Math.floor(totalMinutes / 60)}h ${Math.ceil(totalMinutes % 60)}min`;

  return plan;
}

/**
 * Gera relatório otimizado para agentes
 * @param {Array} issues Lista de problemas
 * @param {string} projectName Nome do projeto
 * @param {number} totalFiles Total de arquivos analisados
 * @returns {string} JSON formatado
 */
export function generateAgentReport(issues, projectName, totalFiles) {
  console.log(`[AgentReporter] Gerando relatório para agentes...`);
  console.log(`[AgentReporter] Total de issues: ${issues.length}`);

  // Filtrar apenas problemas acionáveis (não INFO)
  const actionableIssues = issues.filter(i =>
    i.severity === 'critical' ||
    i.severity === 'high' ||
    i.severity === 'medium'
  );

  console.log(`[AgentReporter] Issues acionáveis: ${actionableIssues.length}`);

  // Ordenar por severidade (CRITICAL → HIGH → MEDIUM → LOW → INFO)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  actionableIssues.sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  console.log(`[AgentReporter] Issues ordenadas por severidade`);

  const report = {
    meta: {
      projectName,
      analysisDate: new Date().toISOString(),
      totalFiles,
      totalIssues: issues.length,
      actionableIssues: actionableIssues.length,
      version: '2.0.1',
      reportType: 'agent-optimized'
    },

    summary: {
      bySeverity: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        info: issues.filter(i => i.severity === 'info').length
      },
      byCategory: issues.reduce((acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {})
    },

    // Agrupado por arquivo (facilita edição sequencial)
    byFile: groupByFile(actionableIssues),

    // Plano de ação executável
    actionPlan: generateActionPlan(actionableIssues),

    // Instruções para agentes
    agentInstructions: {
      workflow: [
        '1. Leia o actionPlan.summary para entender o escopo',
        '2. Execute as ações por fase (1 → 2 → 3 → 4)',
        '3. Para cada ação:',
        '   a. Leia action.file e action.line',
        '   b. Use action.fix.original para localizar o código',
        '   c. Substitua por action.fix.fixed',
        '   d. Se requiresManualFix=true, siga action.fix.manualSteps',
        '4. Após corrigir cada arquivo, valide a sintaxe',
        '5. Execute o Frontend Analyzer novamente para verificar'
      ],
      tips: [
        'Corrija um arquivo de cada vez',
        'Faça backup antes de modificar',
        'Valide cada mudança antes de prosseguir',
        'Priorize sempre CRITICAL > HIGH > MEDIUM',
        'Use action.fix.alternatives quando houver múltiplas soluções'
      ],
      toolsRecommended: [
        'Edit tool - Para substituir código',
        'Read tool - Para ler contexto ao redor',
        'Bash tool - Para validar sintaxe (ex: node --check arquivo.js)'
      ]
    },

    // Issues completas (referência)
    allIssues: issues
  };

  console.log(`[AgentReporter] Relatório gerado com sucesso`);
  console.log(`[AgentReporter] Ações no plano: ${report.actionPlan.summary.totalActions}`);
  console.log(`[AgentReporter] Auto-fixáveis: ${report.actionPlan.summary.readyToAutoFix}`);
  console.log(`[AgentReporter] Manuais: ${report.actionPlan.summary.requiresManualFix}`);

  return JSON.stringify(report, null, 2);
}
