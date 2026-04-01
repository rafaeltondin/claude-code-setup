#!/usr/bin/env node
/**
 * Error Learner — Analisador e Documentador de Erros
 *
 * Le os erros acumulados pelo error-monitor-hook e:
 * 1. Agrupa por tipo e padrao
 * 2. Identifica solucoes (quando o erro foi seguido de sucesso)
 * 3. Gera licoes aprendidas no formato KB
 * 4. Salva no arquivo KB adequado
 *
 * Uso:
 *   node error-learner.js                    # Analisa e documenta
 *   node error-learner.js --status           # Mostra status atual
 *   node error-learner.js --clear            # Limpa erros processados
 *   node error-learner.js --export           # Exporta relatorio JSON
 */

const fs   = require('fs');
const path = require('path');

// === CONFIG ===
const MONITOR_DIR = path.join(__dirname, '..', '..', 'temp', 'error-monitor');
const ERRORS_FILE = path.join(MONITOR_DIR, 'errors-current.jsonl');
const SUMMARY_FILE = path.join(MONITOR_DIR, 'error-summary.json');
const LESSONS_FILE = path.join(MONITOR_DIR, 'lessons-generated.json');
const KB_DIR = path.join(__dirname, '..', '..', 'knowledge-base');

// Mapeamento tipo de erro -> arquivo KB de destino
const ERROR_KB_MAP = {
  'file_not_found':     { kb: 'WINDOWS-WORKAROUNDS.md', section: 'Caminhos e Arquivos' },
  'permission':         { kb: 'MEU-SERVIDOR-CYBERPANEL.md', section: 'Permissoes' },
  'syntax':             { kb: 'TEMPLATES-CODIGO-PADRAO.md', section: 'Erros de Sintaxe' },
  'runtime':            { kb: 'TEMPLATES-CODIGO-PADRAO.md', section: 'Erros de Runtime' },
  'connection':         { kb: 'MEU-SERVIDOR-CYBERPANEL.md', section: 'Conexao e Rede' },
  'server_error':       { kb: 'MEU-SERVIDOR-CYBERPANEL.md', section: 'Erros de Servidor' },
  'api_not_found':      { kb: null, section: 'Endpoints e APIs' }, // determinar pelo contexto
  'execution_failed':   { kb: null, section: 'Execucao' },
  'command_not_found':  { kb: 'WINDOWS-WORKAROUNDS.md', section: 'Comandos' },
  'crash':              { kb: null, section: 'Crashes' },
  'validation':         { kb: 'TEMPLATES-CODIGO-PADRAO.md', section: 'Validacao' },
  'unknown':            { kb: null, section: 'Diversos' }
};

// === HELPERS ===

function loadErrors() {
  try {
    if (!fs.existsSync(ERRORS_FILE)) return [];
    const content = fs.readFileSync(ERRORS_FILE, 'utf8').trim();
    if (!content) return [];
    return content.split('\n').map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

function loadSummary() {
  try {
    if (fs.existsSync(SUMMARY_FILE)) {
      return JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
    }
  } catch {}
  return { totalErrors: 0, errorsByType: {}, errorsByTool: {}, needsAnalysis: false };
}

function loadLessons() {
  try {
    if (fs.existsSync(LESSONS_FILE)) {
      return JSON.parse(fs.readFileSync(LESSONS_FILE, 'utf8'));
    }
  } catch {}
  return { lessons: [], lastProcessed: null };
}

function saveLessons(data) {
  try {
    fs.writeFileSync(LESSONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function today() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Agrupa erros por padrao similar (mesmo tool + mesmo tipo + contexto similar)
 */
function groupErrors(errors) {
  const groups = {};

  for (const err of errors) {
    // Chave de agrupamento: tool + tipo + contexto resumido
    const contextKey = err.context?.command?.substring(0, 50)
      || err.context?.file?.substring(0, 80)
      || err.context?.pattern
      || err.context?.url
      || 'generic';

    const key = `${err.tool}::${err.type}::${contextKey}`;

    if (!groups[key]) {
      groups[key] = {
        tool: err.tool,
        type: err.type,
        context: err.context,
        count: 0,
        errors: [],
        firstSeen: err.timestamp,
        lastSeen: err.timestamp
      };
    }

    groups[key].count++;
    groups[key].lastSeen = err.timestamp;
    groups[key].errors.push(err);
  }

  return Object.values(groups).sort((a, b) => b.count - a.count);
}

/**
 * Gera uma licao a partir de um grupo de erros
 */
function generateLesson(group) {
  const { tool, type, context, count, errors } = group;

  // Extrair o erro mais representativo
  const sampleError = errors[0];
  const response = sampleError.response || '';

  // Extrair mensagem de erro principal
  const errorLines = response.split('\n').filter(l => /error|fail|not found|denied|invalid/i.test(l));
  const errorMsg = errorLines[0] || response.substring(0, 200);

  // Determinar contexto legivel
  let contextDesc = '';
  if (context?.command) contextDesc = `Executando: \`${context.command.substring(0, 100)}\``;
  else if (context?.file) contextDesc = `Acessando: \`${context.file}\``;
  else if (context?.pattern) contextDesc = `Buscando: \`${context.pattern}\``;
  else if (context?.url) contextDesc = `Requisitando: ${context.url}`;
  else contextDesc = `Usando tool: ${tool}`;

  // Gerar titulo descritivo
  const titles = {
    'file_not_found': `Arquivo/caminho nao encontrado com ${tool}`,
    'permission': `Permissao negada ao usar ${tool}`,
    'syntax': `Erro de sintaxe em ${tool}`,
    'runtime': `Erro de runtime com ${tool}`,
    'connection': `Falha de conexao em ${tool}`,
    'server_error': `Erro de servidor ao usar ${tool}`,
    'api_not_found': `Endpoint nao encontrado com ${tool}`,
    'execution_failed': `Falha na execucao de ${tool}`,
    'command_not_found': `Comando nao encontrado em ${tool}`,
    'crash': `Crash ao usar ${tool}`,
    'validation': `Erro de validacao com ${tool}`,
    'unknown': `Erro desconhecido com ${tool}`
  };

  return {
    date: today(),
    title: titles[type] || `Erro com ${tool}`,
    type,
    tool,
    occurrences: count,
    context: contextDesc,
    error: errorMsg.substring(0, 300),
    solution: null, // sera preenchido pelo agente de aprendizado
    rule: null,     // sera preenchido pelo agente de aprendizado
    kbTarget: ERROR_KB_MAP[type]?.kb || null,
    kbSection: ERROR_KB_MAP[type]?.section || 'Diversos',
    needsHumanReview: count >= 3, // 3+ ocorrencias = provavelmente precisa de regra no CLAUDE.md
    raw: errors.slice(0, 3) // primeiros 3 erros como referencia
  };
}

/**
 * Formata licao para markdown KB
 */
function lessonToMarkdown(lesson) {
  const lines = [
    `### ${lesson.date} - ${lesson.title}${lesson.occurrences > 1 ? ` (${lesson.occurrences}x)` : ''}`,
    `**Contexto:** ${lesson.context}`,
    `**Erro:** ${lesson.error}`,
  ];

  if (lesson.solution) {
    lines.push(`**Solucao:** ${lesson.solution}`);
  } else {
    lines.push(`**Solucao:** _Pendente — erro detectado automaticamente, solucao precisa ser preenchida pelo agente de aprendizado_`);
  }

  if (lesson.rule) {
    lines.push(`**Regra:** ${lesson.rule}`);
  }

  lines.push('');
  return lines.join('\n');
}

// === COMMANDS ===

function showStatus() {
  const summary = loadSummary();
  const errors = loadErrors();
  const lessons = loadLessons();

  console.log('=== ERROR MONITOR STATUS ===');
  console.log(`Total de erros acumulados: ${errors.length}`);
  console.log(`Total historico: ${summary.totalErrors || 0}`);
  console.log(`Erros consecutivos: ${summary.consecutiveErrors || 0}`);
  console.log(`Precisa analise: ${summary.needsAnalysis ? 'SIM' : 'Nao'}`);
  console.log(`Analise urgente: ${summary.urgentAnalysis ? 'SIM' : 'Nao'}`);
  console.log(`Ultimo erro: ${summary.lastErrorTime || 'N/A'}`);
  console.log('');
  console.log('Por tipo:');
  for (const [type, count] of Object.entries(summary.errorsByType || {})) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');
  console.log('Por tool:');
  for (const [tool, count] of Object.entries(summary.errorsByTool || {})) {
    console.log(`  ${tool}: ${count}`);
  }
  console.log('');
  console.log(`Licoes geradas: ${lessons.lessons?.length || 0}`);
  console.log(`Ultimo processamento: ${lessons.lastProcessed || 'nunca'}`);
}

function analyzeAndGenerate() {
  const errors = loadErrors();

  if (errors.length === 0) {
    console.log(JSON.stringify({
      status: 'clean',
      message: 'Nenhum erro acumulado para analisar.',
      lessons: []
    }));
    return;
  }

  // Agrupar erros
  const groups = groupErrors(errors);

  // Gerar licoes
  const lessons = groups
    .filter(g => g.count >= 1) // qualquer erro vale documentar
    .map(generateLesson);

  // Salvar licoes geradas
  const lessonsData = loadLessons();
  lessonsData.lessons = [...(lessonsData.lessons || []), ...lessons];
  lessonsData.lastProcessed = new Date().toISOString();
  saveLessons(lessonsData);

  // Output para o agente consumir
  const result = {
    status: 'analyzed',
    totalErrors: errors.length,
    groupsFound: groups.length,
    lessonsGenerated: lessons.length,
    urgentLessons: lessons.filter(l => l.needsHumanReview).length,
    lessons: lessons.map(l => ({
      date: l.date,
      title: l.title,
      type: l.type,
      tool: l.tool,
      occurrences: l.occurrences,
      context: l.context,
      error: l.error,
      kbTarget: l.kbTarget,
      kbSection: l.kbSection,
      needsHumanReview: l.needsHumanReview,
      markdown: lessonToMarkdown(l)
    }))
  };

  console.log(JSON.stringify(result, null, 2));
}

function exportReport() {
  const summary = loadSummary();
  const errors = loadErrors();
  const lessons = loadLessons();
  const groups = groupErrors(errors);

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    errorCount: errors.length,
    groups: groups.map(g => ({
      tool: g.tool,
      type: g.type,
      count: g.count,
      firstSeen: g.firstSeen,
      lastSeen: g.lastSeen,
      sampleError: g.errors[0]?.response?.substring(0, 200)
    })),
    lessons: lessons.lessons || [],
    recommendations: generateRecommendations(groups)
  };

  console.log(JSON.stringify(report, null, 2));
}

function generateRecommendations(groups) {
  const recs = [];

  for (const group of groups) {
    if (group.count >= 3) {
      recs.push({
        priority: 'ALTA',
        message: `${group.tool} com erro "${group.type}" ocorreu ${group.count}x — ADICIONAR REGRA ao CLAUDE.md`,
        group: `${group.tool}::${group.type}`
      });
    } else if (group.count >= 2) {
      recs.push({
        priority: 'MEDIA',
        message: `${group.tool} com erro "${group.type}" ocorreu ${group.count}x — documentar na KB`,
        group: `${group.tool}::${group.type}`
      });
    }
  }

  return recs;
}

function clearProcessed() {
  try {
    if (fs.existsSync(ERRORS_FILE)) {
      const archive = path.join(MONITOR_DIR, `errors-processed-${Date.now()}.jsonl`);
      fs.renameSync(ERRORS_FILE, archive);
      console.log(`Erros movidos para: ${archive}`);
    }
    // Reset summary
    const summary = loadSummary();
    summary.totalErrors = 0;
    summary.errorsByType = {};
    summary.errorsByTool = {};
    summary.consecutiveErrors = 0;
    summary.needsAnalysis = false;
    summary.urgentAnalysis = false;
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');
    console.log('Summary resetado.');
  } catch (e) {
    console.error('Erro ao limpar:', e.message);
  }
}

// === MAIN ===

const args = process.argv.slice(2);

if (args.includes('--status')) {
  showStatus();
} else if (args.includes('--clear')) {
  clearProcessed();
} else if (args.includes('--export')) {
  exportReport();
} else {
  analyzeAndGenerate();
}
