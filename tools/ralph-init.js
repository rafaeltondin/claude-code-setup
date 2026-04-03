#!/usr/bin/env node
/**
 * ralph-init.js — Inicializa e lança projetos Ralph
 *
 * Uso:
 *   node ~/.claude/tools/ralph-init.js <nome-projeto> [--from <path>]
 *   node ~/.claude/tools/ralph-init.js <nome-projeto> --from ~/repo-existente
 *   node ~/.claude/tools/ralph-init.js <nome-projeto> --clone https://github.com/user/repo
 *   node ~/.claude/tools/ralph-init.js --list
 *   node ~/.claude/tools/ralph-init.js --resume <nome-projeto>
 *
 * Faz:
 *   1. Cria ~/projects/<nome>/ (ou copia de --from)
 *   2. Inicializa git se necessário
 *   3. Roda ralph-enable para criar .ralph/ e .ralphrc
 *   4. Corrige .ralphrc com ALLOWED_TOOLS full
 *   5. Abre Git Bash e lança ralph --live
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE;
const PROJECTS_DIR = path.join(HOME, 'projects');
const RALPH_ENABLE = path.join(HOME, '.local', 'bin', 'ralph-enable-ci');

// ALLOWED_TOOLS padrão — full Claude Code access
const FULL_ALLOWED_TOOLS = 'Write,Read,Edit,Grep,Glob,Bash,WebFetch,WebSearch,Agent,Task,Skill,MCP,NotebookEdit';

function printUsage() {
  console.log(`
  ralph-init — Inicializa e lança projetos Ralph

  Uso:
    node ralph-init.js <nome>                    Criar projeto vazio
    node ralph-init.js <nome> --from <path>      Copiar de diretório existente
    node ralph-init.js <nome> --clone <url>      Clonar repositório git
    node ralph-init.js --list                    Listar projetos Ralph existentes
    node ralph-init.js --resume <nome>           Retomar projeto existente

  Exemplos:
    node ralph-init.js fitcoach-pro --from ~/Desktop/fitness-app
    node ralph-init.js meu-site --clone https://github.com/user/repo
    node ralph-init.js --resume fitcoach-pro
  `);
}

function listProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.log('  Nenhum projeto em ~/projects/');
    return;
  }
  const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  console.log('\n  Projetos Ralph em ~/projects/:\n');
  for (const d of dirs) {
    const projPath = path.join(PROJECTS_DIR, d.name);
    const hasRalph = fs.existsSync(path.join(projPath, '.ralph'));
    const hasRalphrc = fs.existsSync(path.join(projPath, '.ralphrc'));
    let status = '  (sem Ralph)';
    if (hasRalph && hasRalphrc) {
      try {
        const statusJson = JSON.parse(fs.readFileSync(path.join(projPath, '.ralph', 'status.json'), 'utf8'));
        status = `  loop:${statusJson.loop_count || '?'} status:${statusJson.status || '?'}`;
      } catch {
        status = '  (Ralph configurado)';
      }
    }
    const icon = hasRalph ? '🟢' : '⚪';
    console.log(`  ${icon} ${d.name}${status}`);
  }
  console.log('');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fixRalphrc(projPath) {
  const rcPath = path.join(projPath, '.ralphrc');
  if (!fs.existsSync(rcPath)) return;

  let content = fs.readFileSync(rcPath, 'utf8');

  // Substituir ALLOWED_TOOLS restrito por full access
  content = content.replace(
    /^ALLOWED_TOOLS=.*/m,
    `ALLOWED_TOOLS="${FULL_ALLOWED_TOOLS}"`
  );

  fs.writeFileSync(rcPath, content);
  console.log('  ✅ .ralphrc atualizado com ALLOWED_TOOLS full');
}

function addKBInstructions(projPath) {
  const promptPath = path.join(projPath, '.ralph', 'PROMPT.md');
  if (!fs.existsSync(promptPath)) return;

  let content = fs.readFileSync(promptPath, 'utf8');

  // Verificar se já tem instruções de KB
  if (content.includes('search_kb') || content.includes('tools-cli')) return;

  const kbBlock = `

## Ferramentas Disponíveis — USE-AS

### Base de Conhecimentos (consultar antes de implementar)
\`\`\`bash
node ~/.claude/task-scheduler/tools-cli.js search_kb query="[palavras-chave]"
\`\`\`

### Validação de Frontend (antes de commitar)
\`\`\`bash
node ~/.claude/task-scheduler/tools-cli.js html_validator input="[arquivo]" check_seo=true
\`\`\`

### Busca eficiente
- **Grep** para buscar conteúdo (NÃO cat | grep)
- **Glob** para encontrar arquivos (NÃO find)

## Economia de Tokens
1. Grep > Read para buscas. Read só com offset/limit
2. Se build passou → funciona. NÃO testar server manualmente
3. Git sem ruído: \`git diff --stat 2>/dev/null | head -20\`
4. 1 commit por prioridade completada
`;

  content += kbBlock;
  fs.writeFileSync(promptPath, content);
  console.log('  ✅ PROMPT.md atualizado com instruções de KB e economia de tokens');
}

function launchRalph(projPath) {
  const projName = path.basename(projPath);
  const winPath = projPath.replace(/\\/g, '/');
  // Converter caminho Windows para WSL: C:\Users\sabola\... -> /mnt/c/Users/sabola/...
  const wslPath = winPath.replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);

  console.log(`\n  Lançando Ralph em ~/projects/${projName}/`);

  // Preferir WSL Ubuntu (evita bug de DLL do Git Bash)
  const wslCmd = [
    'wsl', '-d', 'Ubuntu', 'bash', '-c',
    `export PATH=/mnt/c/Users/sabola/.local/bin:$PATH && cd "${wslPath}" && HOME=/mnt/c/Users/sabola ralph --reset-session && HOME=/mnt/c/Users/sabola ralph --live`
  ];

  // Verificar se WSL Ubuntu está disponível
  let wslAvailable = false;
  try {
    execSync('wsl -d Ubuntu -- bash -c "echo ok"', { stdio: 'pipe' });
    wslAvailable = true;
  } catch { /* WSL não disponível */ }

  if (wslAvailable) {
    // Usar PowerShell para abrir nova janela CMD com WSL (evita conflito de PATH do Git Bash)
    const wslRalphCmd = `export PATH=/mnt/c/Users/sabola/.local/bin:/usr/local/bin:/usr/bin:/bin && cd "${wslPath}" && HOME=/mnt/c/Users/sabola ralph --reset-session && HOME=/mnt/c/Users/sabola ralph --live`;
    const psCmd = `Start-Process cmd -ArgumentList '/k','wsl -d Ubuntu -e /bin/bash -c \\"${wslRalphCmd.replace(/"/g, '\\"')}\\"'`;
    spawn('powershell', ['-Command', psCmd], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    }).unref();
    console.log('  WSL Ubuntu aberto com Ralph --live');
    console.log(`  (Sem bug de DLL do Git Bash)`);
  } else {
    // Fallback: Git Bash
    const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
    const cmd = `cd "${projPath}" && ralph --reset-session && ralph --live`;
    if (fs.existsSync(gitBash)) {
      spawn(gitBash, ['--login', '-c', cmd], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      }).unref();
      console.log('  Git Bash aberto com Ralph --live');
    } else {
      console.log('  WSL e Git Bash não encontrados. Execute manualmente:');
      console.log(`  wsl -d Ubuntu bash -c "cd ${wslPath} && HOME=/mnt/c/Users/sabola ralph --live"`);
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printUsage();
  process.exit(0);
}

if (args[0] === '--list') {
  listProjects();
  process.exit(0);
}

if (args[0] === '--resume') {
  const name = args[1];
  if (!name) { console.log('Erro: nome do projeto necessário'); process.exit(1); }
  const projPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projPath)) { console.log(`Erro: ~/projects/${name}/ não existe`); process.exit(1); }
  fixRalphrc(projPath);
  launchRalph(projPath);
  process.exit(0);
}

// Nome do projeto
const name = args[0];
const projPath = path.join(PROJECTS_DIR, name);

// Flags
const fromIdx = args.indexOf('--from');
const cloneIdx = args.indexOf('--clone');

console.log(`\n  📁 Inicializando projeto Ralph: ${name}`);
console.log(`  📍 Diretório: ~/projects/${name}/\n`);

ensureDir(PROJECTS_DIR);

// Criar/copiar/clonar projeto
if (cloneIdx !== -1) {
  const url = args[cloneIdx + 1];
  if (!url) { console.log('Erro: URL necessária após --clone'); process.exit(1); }
  console.log(`  Clonando ${url}...`);
  execSync(`git clone "${url}" "${projPath}"`, { stdio: 'inherit' });
} else if (fromIdx !== -1) {
  const src = args[fromIdx + 1];
  if (!src) { console.log('Erro: path necessário após --from'); process.exit(1); }
  const srcResolved = src.replace(/^~/, HOME);
  if (!fs.existsSync(srcResolved)) { console.log(`Erro: ${src} não existe`); process.exit(1); }
  console.log(`  Copiando de ${src}...`);
  ensureDir(projPath);
  execSync(`cp -r "${srcResolved}"/* "${projPath}/"`, { stdio: 'inherit' });
  // Copiar dotfiles também (exceto .git para evitar conflitos)
  try {
    execSync(`cp -r "${srcResolved}"/.[!.]* "${projPath}/" 2>/dev/null`, { stdio: 'pipe' });
  } catch { /* ok se não houver dotfiles */ }
} else if (fs.existsSync(projPath)) {
  console.log('  Diretório já existe — usando existente');
} else {
  ensureDir(projPath);
  console.log('  Diretório criado');
}

// Inicializar git se necessário
if (!fs.existsSync(path.join(projPath, '.git'))) {
  execSync('git init', { cwd: projPath, stdio: 'pipe' });
  console.log('  ✅ Git inicializado');
}

// Rodar ralph-enable-ci se .ralph/ não existe
if (!fs.existsSync(path.join(projPath, '.ralph'))) {
  console.log('  Configurando Ralph...');
  try {
    execSync(`bash "${RALPH_ENABLE}"`, { cwd: projPath, stdio: 'inherit' });
    console.log('  ✅ Ralph configurado');
  } catch {
    console.log('  ⚠️  ralph-enable-ci falhou. Criando estrutura mínima...');
    ensureDir(path.join(projPath, '.ralph'));
    // Criar .ralphrc mínimo
    const defaultRc = `PROJECT_NAME="${name}"
PROJECT_TYPE="javascript"
CLAUDE_CODE_CMD="claude"
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=30
CLAUDE_OUTPUT_FORMAT="json"
ALLOWED_TOOLS="${FULL_ALLOWED_TOOLS}"
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=24
TASK_SOURCES="local"
CB_NO_PROGRESS_THRESHOLD=5
CB_SAME_ERROR_THRESHOLD=7
CB_OUTPUT_DECLINE_THRESHOLD=70
CB_COOLDOWN_MINUTES=15
CB_AUTO_RESET=true
CLAUDE_AUTO_UPDATE=true
`;
    fs.writeFileSync(path.join(projPath, '.ralphrc'), defaultRc);
    // Criar PROMPT.md e fix_plan.md vazios
    fs.writeFileSync(path.join(projPath, '.ralph', 'PROMPT.md'), `# ${name}\n\n## Context\n\nDescreva o projeto aqui.\n`);
    fs.writeFileSync(path.join(projPath, '.ralph', 'fix_plan.md'), `# Fix Plan - ${name}\n\n## Priority 1\n- [ ] Tarefa 1\n`);
  }
}

// Corrigir .ralphrc com ALLOWED_TOOLS full
fixRalphrc(projPath);

// Adicionar instruções de KB ao PROMPT.md
addKBInstructions(projPath);

// Commit inicial se necessário
try {
  const status = execSync('git status --short', { cwd: projPath, encoding: 'utf8' });
  if (status.includes('??')) {
    execSync('git add -A && git commit -m "Initial: Ralph project setup"', { cwd: projPath, stdio: 'pipe' });
    console.log('  ✅ Commit inicial criado');
  }
} catch { /* git pode ter problemas em repo vazio, ok */ }

console.log('\n  ✅ Projeto pronto!\n');

// Perguntar se quer lançar
launchRalph(projPath);
