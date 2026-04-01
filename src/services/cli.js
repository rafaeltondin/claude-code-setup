#!/usr/bin/env node
/**
 * CLI MODULE - Interface de linha de comando para o Task Scheduler
 *
 * Permite gerenciar tarefas, ver status e controlar o scheduler
 * diretamente do terminal.
 */

const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');
const scheduler = require('./scheduler');
const executor = require('./executor');

const args = process.argv.slice(2);
const command = args[0];

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBox(title, content) {
  console.log('\n' + colors.cyan + '╔' + '═'.repeat(60) + '╗' + colors.reset);
  console.log(colors.cyan + '║' + colors.reset + colors.bright + ` ${title.padEnd(58)} ` + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '╠' + '═'.repeat(60) + '╣' + colors.reset);
  content.forEach(line => {
    const paddedLine = line.substring(0, 58).padEnd(58);
    console.log(colors.cyan + '║' + colors.reset + ` ${paddedLine} ` + colors.cyan + '║' + colors.reset);
  });
  console.log(colors.cyan + '╚' + '═'.repeat(60) + '╝' + colors.reset + '\n');
}

// ============ COMMANDS ============

async function showHelp() {
  logBox('CLAUDE TASK SCHEDULER - CLI', [
    '',
    'COMANDOS DISPONÍVEIS:',
    '',
    '  status              Mostra status do scheduler',
    '  list                Lista todas as tarefas',
    '  show <id>           Mostra detalhes de uma tarefa',
    '  add <json>          Adiciona uma nova tarefa',
    '  update <id> <json>  Atualiza uma tarefa',
    '  delete <id>         Remove uma tarefa',
    '  run <id>            Executa uma tarefa imediatamente',
    '  pause <id>          Pausa uma tarefa',
    '  resume <id>         Resume uma tarefa pausada',
    '  executions [limit]  Lista últimas execuções',
    '  stats               Mostra estatísticas',
    '  start               Inicia o scheduler',
    '  stop                Para o scheduler',
    '  export              Exporta dados para JSON',
    '  import <file>       Importa dados de JSON',
    '  help                Mostra esta ajuda',
    '',
    'EXEMPLOS:',
    '',
    '  node cli.js add \'{"name":"Backup","type":"command",',
    '                    "command":"echo Hello"}\'',
    '',
    '  node cli.js run abc123',
    ''
  ]);
}

function showStatus() {
  const status = scheduler.getStatus();

  logBox('STATUS DO SCHEDULER', [
    '',
    `  Estado: ${status.isRunning ? colors.green + 'RODANDO' : colors.red + 'PARADO'}${colors.reset}`,
    `  Intervalo de verificação: ${status.config.checkInterval}ms`,
    `  Máximo tarefas simultâneas: ${status.config.maxConcurrentTasks}`,
    '',
    '  TAREFAS:',
    `    Total: ${status.tasks.total}`,
    `    Agendadas: ${status.tasks.scheduled}`,
    `    Pendentes: ${status.tasks.pending}`,
    `    Em execução: ${status.tasks.running}`,
    `    Cron jobs: ${status.tasks.cronJobs}`,
    '',
    '  EXECUÇÕES:',
    `    Total: ${status.executions.total}`,
    `    Hoje: ${status.executions.today.total}`,
    `    Sucesso hoje: ${status.executions.today.success}`,
    `    Falhas hoje: ${status.executions.today.failed}`,
    `    Taxa de sucesso: ${status.executions.successRate}%`,
    `    Duração média: ${status.executions.avgDuration}ms`,
    ''
  ]);

  if (status.runningTasks.length > 0) {
    console.log(colors.yellow + '  TAREFAS EM EXECUÇÃO:' + colors.reset);
    status.runningTasks.forEach(t => {
      console.log(`    - ${t.taskName} (${t.duration}ms)`);
    });
    console.log('');
  }
}

function listTasks() {
  const tasks = storage.getTasks();

  if (tasks.length === 0) {
    log('\n  Nenhuma tarefa cadastrada.\n', 'yellow');
    return;
  }

  console.log('\n' + colors.cyan + '  TAREFAS CADASTRADAS' + colors.reset);
  console.log('  ' + '─'.repeat(70));
  console.log(colors.bright + '  ID'.padEnd(40) + 'Nome'.padEnd(20) + 'Status'.padEnd(12) + 'Tipo' + colors.reset);
  console.log('  ' + '─'.repeat(70));

  tasks.forEach(task => {
    const id = task.id.substring(0, 8);
    const name = task.name.substring(0, 18);
    const status = task.status.toUpperCase();
    const statusColor = {
      'SCHEDULED': 'green',
      'RUNNING': 'yellow',
      'COMPLETED': 'cyan',
      'FAILED': 'red',
      'PAUSED': 'magenta'
    }[status] || 'white';

    console.log(`  ${id.padEnd(40)}${name.padEnd(20)}${colors[statusColor]}${status.padEnd(12)}${colors.reset}${task.type}`);
  });

  console.log('  ' + '─'.repeat(70));
  console.log(`  Total: ${tasks.length} tarefas\n`);
}

function showTask(taskId) {
  const task = storage.getTask(taskId);

  if (!task) {
    log(`\n  Tarefa não encontrada: ${taskId}\n`, 'red');
    return;
  }

  const executions = storage.getTaskExecutions(taskId, 5);

  console.log('\n' + colors.cyan + '  DETALHES DA TAREFA' + colors.reset);
  console.log('  ' + '─'.repeat(50));
  console.log(`  ID: ${task.id}`);
  console.log(`  Nome: ${task.name}`);
  console.log(`  Tipo: ${task.type}`);
  console.log(`  Status: ${task.status}`);
  console.log(`  Habilitada: ${task.enabled ? 'Sim' : 'Não'}`);
  console.log(`  Prioridade: ${task.priority}`);
  console.log(`  Criada em: ${task.createdAt}`);
  console.log(`  Atualizada em: ${task.updatedAt}`);
  console.log(`  Agendada para: ${task.scheduledAt}`);

  if (task.command) console.log(`  Comando: ${task.command}`);
  if (task.scriptPath) console.log(`  Script: ${task.scriptPath}`);
  if (task.url) console.log(`  URL: ${task.url}`);

  console.log(`  Execuções: ${task.successCount} sucesso, ${task.failCount} falhas`);

  if (task.recurring) {
    console.log(`  Recorrente: Sim (${task.cronExpression || task.recurringType})`);
  }

  if (executions.length > 0) {
    console.log('\n  ÚLTIMAS EXECUÇÕES:');
    executions.forEach(e => {
      const statusColor = e.status === 'success' ? 'green' : (e.status === 'failed' ? 'red' : 'yellow');
      console.log(`    ${e.startedAt.substring(0, 19)} - ${colors[statusColor]}${e.status.toUpperCase()}${colors.reset} (${e.duration}ms)`);
    });
  }

  console.log('');
}

function addTask(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);

    const task = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'scheduled',
      enabled: true,
      priority: 2,
      successCount: 0,
      failCount: 0,
      scheduledAt: new Date().toISOString(),
      ...data
    };

    if (!task.name) {
      log('\n  Erro: Nome da tarefa é obrigatório\n', 'red');
      return;
    }

    if (!task.type) {
      log('\n  Erro: Tipo da tarefa é obrigatório\n', 'red');
      return;
    }

    storage.addTask(task);

    log(`\n  Tarefa criada com sucesso!`, 'green');
    log(`  ID: ${task.id}\n`, 'cyan');

  } catch (error) {
    log(`\n  Erro ao criar tarefa: ${error.message}\n`, 'red');
  }
}

function updateTask(taskId, jsonStr) {
  try {
    const updates = JSON.parse(jsonStr);
    const updated = storage.updateTask(taskId, updates);

    if (!updated) {
      log(`\n  Tarefa não encontrada: ${taskId}\n`, 'red');
      return;
    }

    log(`\n  Tarefa atualizada com sucesso!\n`, 'green');

  } catch (error) {
    log(`\n  Erro ao atualizar tarefa: ${error.message}\n`, 'red');
  }
}

function deleteTask(taskId) {
  const deleted = storage.deleteTask(taskId);

  if (!deleted) {
    log(`\n  Tarefa não encontrada: ${taskId}\n`, 'red');
    return;
  }

  log(`\n  Tarefa removida com sucesso!\n`, 'green');
}

async function runTask(taskId) {
  try {
    log(`\n  Iniciando execução da tarefa ${taskId}...`, 'yellow');

    const result = await scheduler.runNow(taskId);

    if (result.success) {
      log(`  Execução concluída com sucesso! (${result.duration}ms)`, 'green');
      if (result.output) {
        console.log('\n  OUTPUT:');
        console.log('  ' + '─'.repeat(50));
        console.log(result.output.split('\n').map(l => '  ' + l).join('\n'));
      }
    } else {
      log(`  Execução falhou: ${result.error}`, 'red');
    }

    console.log('');

  } catch (error) {
    log(`\n  Erro ao executar tarefa: ${error.message}\n`, 'red');
  }
}

function pauseTask(taskId) {
  try {
    scheduler.pauseTask(taskId);
    log(`\n  Tarefa pausada com sucesso!\n`, 'green');
  } catch (error) {
    log(`\n  Erro: ${error.message}\n`, 'red');
  }
}

function resumeTask(taskId) {
  try {
    scheduler.resumeTask(taskId);
    log(`\n  Tarefa resumida com sucesso!\n`, 'green');
  } catch (error) {
    log(`\n  Erro: ${error.message}\n`, 'red');
  }
}

function listExecutions(limit = 20) {
  const executions = storage.getExecutions(parseInt(limit));

  if (executions.length === 0) {
    log('\n  Nenhuma execução registrada.\n', 'yellow');
    return;
  }

  console.log('\n' + colors.cyan + '  ÚLTIMAS EXECUÇÕES' + colors.reset);
  console.log('  ' + '─'.repeat(80));
  console.log(colors.bright + '  Data/Hora'.padEnd(22) + 'Tarefa'.padEnd(25) + 'Status'.padEnd(12) + 'Duração' + colors.reset);
  console.log('  ' + '─'.repeat(80));

  executions.forEach(e => {
    const date = e.startedAt.substring(0, 19).replace('T', ' ');
    const name = (e.taskName || e.taskId.substring(0, 8)).substring(0, 23);
    const status = e.status.toUpperCase();
    const statusColor = {
      'SUCCESS': 'green',
      'RUNNING': 'yellow',
      'FAILED': 'red',
      'CANCELLED': 'magenta'
    }[status] || 'white';

    console.log(`  ${date.padEnd(22)}${name.padEnd(25)}${colors[statusColor]}${status.padEnd(12)}${colors.reset}${e.duration}ms`);
  });

  console.log('  ' + '─'.repeat(80) + '\n');
}

function showStats() {
  const stats = storage.getExecutionStats();

  logBox('ESTATÍSTICAS DE EXECUÇÃO', [
    '',
    `  Total de execuções: ${stats.total}`,
    '',
    '  HOJE:',
    `    Total: ${stats.today.total}`,
    `    Sucesso: ${stats.today.success}`,
    `    Falhas: ${stats.today.failed}`,
    `    Em execução: ${stats.today.running}`,
    '',
    '  ÚLTIMA SEMANA:',
    `    Total: ${stats.week.total}`,
    `    Sucesso: ${stats.week.success}`,
    `    Falhas: ${stats.week.failed}`,
    '',
    '  GERAL:',
    `    Taxa de sucesso: ${stats.successRate}%`,
    `    Duração média: ${stats.avgDuration}ms`,
    ''
  ]);
}

function startScheduler() {
  scheduler.start();
  log('\n  Scheduler iniciado!\n', 'green');
}

function stopScheduler() {
  scheduler.stop();
  log('\n  Scheduler parado!\n', 'yellow');
}

function exportData() {
  const data = storage.exportData();
  const filename = `task-scheduler-backup-${new Date().toISOString().split('T')[0]}.json`;
  const fs = require('fs');
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  log(`\n  Dados exportados para: ${filename}\n`, 'green');
}

function importData(filename) {
  try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    storage.importData(data);
    log(`\n  Dados importados de: ${filename}\n`, 'green');
  } catch (error) {
    log(`\n  Erro ao importar: ${error.message}\n`, 'red');
  }
}

// ============ MAIN ============

async function main() {
  if (!command) {
    showHelp();
    return;
  }

  switch (command.toLowerCase()) {
    case 'help':
    case '-h':
    case '--help':
      showHelp();
      break;

    case 'status':
      showStatus();
      break;

    case 'list':
    case 'ls':
      listTasks();
      break;

    case 'show':
    case 'get':
      showTask(args[1]);
      break;

    case 'add':
    case 'create':
      addTask(args[1]);
      break;

    case 'update':
    case 'edit':
      updateTask(args[1], args[2]);
      break;

    case 'delete':
    case 'remove':
    case 'rm':
      deleteTask(args[1]);
      break;

    case 'run':
    case 'exec':
      await runTask(args[1]);
      break;

    case 'pause':
      pauseTask(args[1]);
      break;

    case 'resume':
      resumeTask(args[1]);
      break;

    case 'executions':
    case 'history':
      listExecutions(args[1]);
      break;

    case 'stats':
    case 'statistics':
      showStats();
      break;

    case 'start':
      startScheduler();
      break;

    case 'stop':
      stopScheduler();
      break;

    case 'export':
      exportData();
      break;

    case 'import':
      importData(args[1]);
      break;

    default:
      log(`\n  Comando desconhecido: ${command}\n`, 'red');
      log('  Use "node cli.js help" para ver os comandos disponíveis.\n', 'yellow');
  }
}

main().catch(error => {
  log(`\n  Erro: ${error.message}\n`, 'red');
  process.exit(1);
});
