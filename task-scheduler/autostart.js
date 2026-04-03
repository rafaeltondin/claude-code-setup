#!/usr/bin/env node
/**
 * AUTOSTART MODULE - Gerencia inicialização automática do Task Scheduler
 *
 * Configura o sistema para iniciar automaticamente quando o Windows ligar.
 * Suporta múltiplos métodos: Task Scheduler do Windows, Startup folder, Registry.
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const APP_NAME = 'ClaudeCodeEcosystem';
const SCHEDULER_DIR = __dirname;
const BASE_DIR = path.dirname(SCHEDULER_DIR);
const SERVER_SCRIPT = path.join(SCHEDULER_DIR, 'server.js');
const START_ALL_BAT = path.join(BASE_DIR, 'start-all.bat');
const NODE_PATH = process.execPath;

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============ WINDOWS STARTUP FOLDER ============

/**
 * Obtém o caminho da pasta Startup do Windows
 */
function getStartupFolder() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

/**
 * Cria um atalho VBS na pasta Startup (método simples e confiável)
 */
async function createStartupShortcut() {
  const startupFolder = getStartupFolder();
  const vbsPath = path.join(startupFolder, `${APP_NAME}.vbs`);

  // Script VBS que inicia o ecossistema completo em background (sem janela)
  const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${BASE_DIR.replace(/\\/g, '\\\\')}"
WshShell.Run """${START_ALL_BAT.replace(/\\/g, '\\\\')}"" /silent --no-browser", 0, False
Set WshShell = Nothing
`.trim();

  try {
    fs.writeFileSync(vbsPath, vbsContent, 'utf8');
    log(`\n✅ Atalho criado na pasta Startup!`, 'green');
    log(`   Caminho: ${vbsPath}`, 'cyan');
    return true;
  } catch (error) {
    log(`\n❌ Erro ao criar atalho: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Remove o atalho da pasta Startup
 */
function removeStartupShortcut() {
  const vbsPath = path.join(getStartupFolder(), `${APP_NAME}.vbs`);

  try {
    if (fs.existsSync(vbsPath)) {
      fs.unlinkSync(vbsPath);
      log(`\n✅ Atalho removido da pasta Startup!`, 'green');
      return true;
    } else {
      log(`\nℹ️  Atalho não encontrado na pasta Startup.`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`\n❌ Erro ao remover atalho: ${error.message}`, 'red');
    return false;
  }
}

// ============ WINDOWS TASK SCHEDULER ============

/**
 * Cria uma tarefa no Agendador de Tarefas do Windows
 */
async function createScheduledTask() {
  return new Promise((resolve) => {
    // XML para a tarefa agendada
    const taskXml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Claude Code Ecosystem - Dashboard, MCPs e Agendador de Tarefas</Description>
    <Author>Claude Code</Author>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>"${START_ALL_BAT}"</Command>
      <Arguments>/silent --no-browser</Arguments>
      <WorkingDirectory>${BASE_DIR}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;

    const xmlPath = path.join(SCHEDULER_DIR, 'task-scheduler-task.xml');
    fs.writeFileSync(xmlPath, taskXml, 'utf16le');

    // Criar tarefa usando schtasks
    const cmd = `schtasks /create /tn "${APP_NAME}" /xml "${xmlPath}" /f`;

    exec(cmd, (error, stdout, stderr) => {
      // Limpar arquivo XML temporário
      try { fs.unlinkSync(xmlPath); } catch (e) { }

      if (error) {
        log(`\n⚠️  Não foi possível criar tarefa agendada (requer privilégios de admin)`, 'yellow');
        log(`   Usando método alternativo (pasta Startup)...`, 'yellow');
        resolve(false);
      } else {
        log(`\n✅ Tarefa criada no Agendador de Tarefas do Windows!`, 'green');
        log(`   Nome: ${APP_NAME}`, 'cyan');
        resolve(true);
      }
    });
  });
}

/**
 * Remove a tarefa do Agendador de Tarefas do Windows
 */
async function removeScheduledTask() {
  return new Promise((resolve) => {
    const cmd = `schtasks /delete /tn "${APP_NAME}" /f`;

    exec(cmd, (error) => {
      if (error) {
        log(`\nℹ️  Tarefa agendada não encontrada ou requer privilégios de admin.`, 'yellow');
        resolve(false);
      } else {
        log(`\n✅ Tarefa removida do Agendador de Tarefas!`, 'green');
        resolve(true);
      }
    });
  });
}

// ============ BATCH FILE METHOD ============

/**
 * Cria um arquivo .bat na pasta Startup
 */
function createStartupBatch() {
  const startupFolder = getStartupFolder();
  const batPath = path.join(startupFolder, `${APP_NAME}.bat`);

  const batContent = `@echo off
cd /d "${BASE_DIR}"
call "${START_ALL_BAT}" /silent --no-browser
exit
`;

  try {
    fs.writeFileSync(batPath, batContent, 'utf8');
    log(`\n✅ Arquivo .bat criado na pasta Startup!`, 'green');
    log(`   Caminho: ${batPath}`, 'cyan');
    return true;
  } catch (error) {
    log(`\n❌ Erro ao criar arquivo .bat: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Remove o arquivo .bat da pasta Startup
 */
function removeStartupBatch() {
  const batPath = path.join(getStartupFolder(), `${APP_NAME}.bat`);

  try {
    if (fs.existsSync(batPath)) {
      fs.unlinkSync(batPath);
      log(`\n✅ Arquivo .bat removido!`, 'green');
      return true;
    }
    return false;
  } catch (error) {
    log(`\n❌ Erro ao remover .bat: ${error.message}`, 'red');
    return false;
  }
}

// ============ STATUS CHECK ============

/**
 * Verifica se o auto-start está configurado
 */
function checkAutoStartStatus() {
  const results = {
    startupVbs: false,
    startupBat: false,
    scheduledTask: false
  };

  // Verificar VBS
  const vbsPath = path.join(getStartupFolder(), `${APP_NAME}.vbs`);
  results.startupVbs = fs.existsSync(vbsPath);

  // Verificar BAT
  const batPath = path.join(getStartupFolder(), `${APP_NAME}.bat`);
  results.startupBat = fs.existsSync(batPath);

  return results;
}

/**
 * Verifica tarefa agendada (assíncrono)
 */
async function checkScheduledTask() {
  return new Promise((resolve) => {
    exec(`schtasks /query /tn "${APP_NAME}" 2>nul`, (error) => {
      resolve(!error);
    });
  });
}

// ============ MAIN FUNCTIONS ============

/**
 * Habilita auto-start
 */
async function enableAutoStart(method = 'vbs') {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        HABILITANDO AUTO-START DO CLAUDE CODE ECOSYSTEM            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  let success = false;

  switch (method) {
    case 'task':
      // Tentar criar tarefa agendada (requer admin)
      success = await createScheduledTask();
      if (!success) {
        // Fallback para VBS
        success = await createStartupShortcut();
      }
      break;

    case 'bat':
      success = createStartupBatch();
      break;

    case 'vbs':
    default:
      success = await createStartupShortcut();
      break;
  }

  if (success) {
    log('\n📋 O ecossistema Claude Code sera iniciado automaticamente quando voce logar no Windows.', 'green');
    log('   Dashboard disponível em: http://localhost:3847', 'cyan');
  }

  return success;
}

/**
 * Desabilita auto-start
 */
async function disableAutoStart() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       DESABILITANDO AUTO-START DO CLAUDE CODE ECOSYSTEM           ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Remover todos os métodos
  removeStartupShortcut();
  removeStartupBatch();
  await removeScheduledTask();

  log('\n📋 Auto-start desabilitado. O ecossistema nao iniciara mais automaticamente.', 'yellow');
}

/**
 * Mostra status do auto-start
 */
async function showStatus() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║            STATUS DO AUTO-START                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const status = checkAutoStartStatus();
  const taskStatus = await checkScheduledTask();

  console.log('\n  MÉTODOS CONFIGURADOS:');
  console.log(`    VBS na Startup:     ${status.startupVbs ? colors.green + '✅ Ativo' : colors.red + '❌ Inativo'}${colors.reset}`);
  console.log(`    BAT na Startup:     ${status.startupBat ? colors.green + '✅ Ativo' : colors.red + '❌ Inativo'}${colors.reset}`);
  console.log(`    Tarefa Agendada:    ${taskStatus ? colors.green + '✅ Ativo' : colors.red + '❌ Inativo'}${colors.reset}`);

  const anyActive = status.startupVbs || status.startupBat || taskStatus;
  console.log(`\n  STATUS GERAL: ${anyActive ? colors.green + '✅ Auto-start ATIVADO' : colors.yellow + '⚠️  Auto-start DESATIVADO'}${colors.reset}`);

  if (anyActive) {
    console.log(`\n  O ecossistema Claude Code iniciara automaticamente ao logar no Windows.`);
    console.log(`  Dashboard: ${colors.cyan}http://localhost:3847${colors.reset}`);
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'enable':
    case 'on':
      await enableAutoStart(args[1] || 'vbs');
      break;

    case 'disable':
    case 'off':
      await disableAutoStart();
      break;

    case 'status':
      await showStatus();
      break;

    case 'help':
    case '-h':
    case '--help':
    default:
      console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║           AUTO-START MANAGER - Claude Code Ecosystem              ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}COMANDOS:${colors.reset}

  ${colors.green}enable [method]${colors.reset}   Habilita auto-start
                    Métodos: vbs (padrão), bat, task

  ${colors.red}disable${colors.reset}           Desabilita auto-start

  ${colors.cyan}status${colors.reset}            Mostra status atual

${colors.bright}EXEMPLOS:${colors.reset}

  node autostart.js enable        # Usa VBS (recomendado)
  node autostart.js enable bat    # Usa arquivo .bat
  node autostart.js enable task   # Usa Agendador de Tarefas (requer admin)
  node autostart.js disable       # Remove auto-start
  node autostart.js status        # Verifica status

${colors.bright}MÉTODOS:${colors.reset}

  ${colors.cyan}vbs${colors.reset}   Script VBScript na pasta Startup (silencioso, recomendado)
  ${colors.cyan}bat${colors.reset}   Arquivo .bat na pasta Startup (mostra janela brevemente)
  ${colors.cyan}task${colors.reset}  Tarefa no Agendador do Windows (requer privilégios admin)
`);
      break;
  }
}

main().catch(console.error);

module.exports = {
  enableAutoStart,
  disableAutoStart,
  showStatus,
  checkAutoStartStatus,
  checkScheduledTask
};
