/**
 * Tools: EXECUÇÃO — run_command, execute_node, process_manager, open_url, git
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: `Executa um comando no terminal do sistema (bash no Linux/Mac, PowerShell no Windows).
Use para: npm install, pip install, docker, python, node scripts, compilar, testar, iniciar servidores, etc.
Prefer run_command sobre execute_node quando precisar de CLIs externas (git, npm, docker, python, etc.).
ATENÇÃO: comandos destrutivos (rm -rf, format, drop) serão executados — confirme com o usuário antes.`,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando a executar. Ex: "npm install", "python script.py", "docker ps", "pip install requests"' },
          cwd: { type: 'string', description: 'Diretório de trabalho. Ex: C:/Users/sabola/Desktop/meu-projeto. Padrão: diretório do servidor.' },
          timeout: { type: 'number', description: 'Timeout em segundos. Padrão: 30. Máximo: 300.' },
          shell: { type: 'string', enum: ['auto', 'bash', 'powershell', 'cmd'], description: 'Shell a usar. auto detecta automaticamente (bash no Linux, powershell no Windows). Padrão: auto' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_node',
      description: 'Executa código Node.js e retorna o stdout. Use APENAS para cálculos, formatação ou lógica que NAO tenha ferramenta dedicada. PROIBIDO usar para: medir velocidade de site (use pagespeed), analisar SEO (use seo_check), consultar Meta Ads (use meta_ads), processar CSV (use csv_processor).',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Código Node.js a executar. Pode usar require() para módulos nativos do Node (fs, path, crypto, http, https).' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'process_manager',
      description: 'Gerencia processos do sistema: listar processos, verificar portas, matar processo por PID ou porta. Use para diagnóstico e gerenciamento de servidores.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'kill', 'port_info', 'find_by_name'],
            description: 'list: lista todos os processos node/python/java ativos | kill: mata processo por PID | port_info: mostra processo ouvindo em uma porta | find_by_name: encontra PIDs pelo nome do processo'
          },
          pid: { type: 'number', description: 'PID do processo (para action: kill)' },
          port: { type: 'number', description: 'Porta a verificar (para action: port_info)' },
          name: { type: 'string', description: 'Nome do processo a buscar (para action: find_by_name). Ex: "node", "python", "nginx"' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_url',
      description: 'Abre uma URL ou arquivo no navegador padrão do sistema, ou abre um arquivo em seu programa padrão (PDF, imagem, etc.).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL ou caminho de arquivo a abrir. Ex: "http://localhost:3000", "C:/Users/sabola/Desktop/index.html", "C:/Users/sabola/relatorio.pdf"' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git',
      description: 'Executa operações Git em um repositório local. Suporta: status, log, diff, add, commit, push, pull, branch, checkout, clone, stash, reset.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['status', 'log', 'diff', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'clone', 'stash', 'reset', 'init', 'remote', 'tag', 'fetch', 'merge', 'rebase', 'show'],
            description: 'Ação Git a executar'
          },
          args: { type: 'string', description: 'Argumentos adicionais. Ex: para commit → "-m \\"mensagem\\"", para log → "--oneline -20", para clone → "https://... ./pasta"' },
          cwd: { type: 'string', description: 'Diretório do repositório Git. Padrão: diretório do servidor.' }
        },
        required: ['action']
      }
    }
  },
];

const handlers = {
  async run_command(args, ctx) {
    try {
      let cmd = args.command || '';
      if (!cmd) return 'Parâmetro "command" é obrigatório';

      // Expandir ~ para o home dir real (PowerShell/Node não expandem ~ automaticamente)
      const homeDir = os.homedir().replace(/\\/g, '/');
      cmd = cmd.replace(/^~\//, homeDir + '/').replace(/^~\\/, homeDir + '\\');

      const cwd = args.cwd || __dirname;
      const timeoutSec = Math.min(args.timeout || 30, 300);
      const isWindows = process.platform === 'win32';

      let shellCmd, shellArgs;
      const shellPref = args.shell || 'auto';
      if (shellPref === 'powershell' || (shellPref === 'auto' && isWindows)) {
        shellCmd = 'powershell';
        shellArgs = ['-NoProfile', '-NonInteractive', '-Command', cmd];
      } else if (shellPref === 'cmd') {
        // Remover prefixo 'cmd /c' redundante se já presente no comando
        const stripped = cmd.replace(/^cmd\s+\/c\s+/i, '');
        shellCmd = 'cmd';
        shellArgs = ['/c', stripped];
      } else {
        shellCmd = 'bash';
        shellArgs = ['-c', cmd];
      }

      const { execFileSync } = require('child_process');
      const result = execFileSync(shellCmd, shellArgs, {
        cwd,
        timeout: timeoutSec * 1000,
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024
      });
      const out = result || '(comando executado sem output)';
      return out.length > 8000 ? out.slice(0, 8000) + '\n...[truncado]' : out;
    } catch (e) {
      const stdout = e.stdout ? `\nSTDOUT: ${e.stdout.slice(0, 3000)}` : '';
      const stderr = e.stderr ? `\nSTDERR: ${e.stderr.slice(0, 3000)}` : '';
      return `Erro (exit ${e.status ?? '?'}): ${e.message}${stdout}${stderr}`;
    }
  },

  async execute_node(args, ctx) {
    try {
      const tmpFile = path.join(os.tmpdir(), `chat-tool-${Date.now()}.js`);
      fs.writeFileSync(tmpFile, args.code, 'utf8');
      let stdout = '', stderr = '';
      try {
        stdout = execSync(`node "${tmpFile}" 2>&1`, {
          cwd: path.join(__dirname, '..'),
          timeout: 30000,
          encoding: 'utf8',
          maxBuffer: 2 * 1024 * 1024,
          // Redirecionar stderr para stdout para capturar tudo
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (e) {
        stdout = e.stdout || '';
        stderr = e.stderr || '';
      }
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
      return combined.substring(0, 6000) || '(script executado sem output — verifique se há console.log no código)';
    } catch (e) {
      return `Erro ao executar Node.js: ${e.message}`;
    }
  },

  async process_manager(args, ctx) {
    try {
      const action = args.action || '';
      const isWindows = process.platform === 'win32';

      if (action === 'list') {
        // Listar processos dev relevantes
        const cmd = isWindows
          ? 'powershell -NoProfile -Command "Get-Process | Where-Object {$_.Name -match \'node|python|java|ruby|php|nginx|apache|docker\'} | Select-Object Id,Name,CPU,WorkingSet | Format-Table -AutoSize | Out-String -Width 200"'
          : 'ps aux | grep -E "node|python|java|ruby|php|nginx|apache|docker" | grep -v grep';
        const result = execSync(cmd, { timeout: 15000, encoding: 'utf8' });
        return result.trim() || 'Nenhum processo dev encontrado';
      }

      if (action === 'kill') {
        const pid = args.pid;
        if (!pid) return 'Parâmetro "pid" é obrigatório para action: kill';
        const cmd = isWindows
          ? `powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`
          : `kill -9 ${pid}`;
        execSync(cmd, { timeout: 10000, encoding: 'utf8' });
        return `Processo PID ${pid} encerrado com sucesso`;
      }

      if (action === 'port_info') {
        const port = args.port;
        if (!port) return 'Parâmetro "port" é obrigatório para action: port_info';
        const cmd = isWindows
          ? `netstat -ano | findstr ":${port}"`
          : `lsof -i :${port} -n -P 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":${port}"`;
        try {
          const result = execSync(cmd, { timeout: 10000, encoding: 'utf8' });
          return result.trim() || `Nenhum processo na porta ${port}`;
        } catch (_) {
          return `Nenhum processo encontrado na porta ${port}`;
        }
      }

      if (action === 'find_by_name') {
        const name = args.name || '';
        if (!name) return 'Parâmetro "name" é obrigatório para action: find_by_name';
        const cmd = isWindows
          ? `powershell -NoProfile -Command "Get-Process | Where-Object {$_.Name -like '*${name}*'} | Select-Object Id,Name,Path | Format-Table -AutoSize | Out-String -Width 200"`
          : `pgrep -la ${name} 2>/dev/null || ps aux | grep ${name} | grep -v grep`;
        try {
          const result = execSync(cmd, { timeout: 10000, encoding: 'utf8' });
          return result.trim() || `Nenhum processo encontrado com nome "${name}"`;
        } catch (_) {
          return `Nenhum processo encontrado com nome "${name}"`;
        }
      }

      return `Action "${action}" não reconhecida. Use: list, kill, port_info, find_by_name`;
    } catch (e) {
      return `Erro process_manager: ${e.message}`;
    }
  },

  async open_url(args, ctx) {
    try {
      const url = args.url || '';
      if (!url) return 'Parâmetro "url" é obrigatório';
      const isWindows = process.platform === 'win32';
      const isMac = process.platform === 'darwin';

      let cmd;
      if (isWindows) {
        // No Windows, Start-Process funciona com URLs e arquivos
        const escaped = url.replace(/'/g, "''");
        cmd = `powershell -NoProfile -Command "Start-Process '${escaped}'"`;
      } else if (isMac) {
        cmd = `open "${url}"`;
      } else {
        cmd = `xdg-open "${url}"`;
      }

      execSync(cmd, { timeout: 10000, encoding: 'utf8' });
      return `Aberto no navegador/programa padrão: ${url}`;
    } catch (e) {
      return `Erro ao abrir URL: ${e.message}`;
    }
  },

  async git(args, ctx) {
    try {
      const action = args.action || '';
      const gitArgs = args.args || '';
      const cwd = args.cwd || path.join(__dirname, '..');
      if (!action) return 'Parâmetro "action" é obrigatório';
      const gitCmd = `git ${action}${gitArgs ? ' ' + gitArgs : ''}`;
      const result = execSync(gitCmd, {
        cwd,
        timeout: 60000,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024
      });
      return result.trim() || `(git ${action} executado sem output)`;
    } catch (e) {
      return `Erro git: ${e.message}\n${e.stderr || ''}`.slice(0, 4000);
    }
  },
};

module.exports = { definitions, handlers };
