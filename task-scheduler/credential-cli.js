#!/usr/bin/env node
/**
 * CREDENTIAL CLI - Interface de linha de comando para o Credential Vault
 *
 * Uso:
 *   node credential-cli.js get <NAME>           - Obter valor de uma credencial
 *   node credential-cli.js list                  - Listar nomes de todas credenciais
 *   node credential-cli.js env                   - Mostrar todas como KEY=VALUE
 *   node credential-cli.js resolve "<text>"      - Resolver {{secret:NAME}} no texto
 *   node credential-cli.js run <script.js>       - Executar script com credenciais injetadas como env vars
 *   node credential-cli.js has <NAME>            - Verificar se credencial existe (exit code 0=sim, 1=nao)
 *   node credential-cli.js names-for <prefix>    - Listar credenciais que começam com prefixo
 *
 * IMPORTANTE: Este CLI e o metodo RECOMENDADO para o Claude Code acessar credenciais.
 *             Evita problemas de escaping em node -e e caminhos Windows.
 */

const path = require('path');
const { execSync, spawn } = require('child_process');

// Carregar vault com caminho relativo (evita problemas de escaping)
const vault = require(path.join(__dirname, 'credential-vault.js'));

const [,, command, ...args] = process.argv;

const USAGE = `
Credential Vault CLI
====================
Comandos:
  get <NAME>           Obter valor de uma credencial
  list                 Listar nomes de todas credenciais
  env                  Mostrar todas como KEY=VALUE (para export)
  resolve "<text>"     Resolver {{secret:NAME}} no texto
  run <script.js>      Executar script JS com credenciais como env vars
  has <NAME>           Verificar se credencial existe (exit 0=sim, 1=nao)
  names-for <prefix>   Listar credenciais com determinado prefixo
  help                 Mostrar esta ajuda
`;

function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  switch (command) {
    case 'get': {
      const name = args[0];
      if (!name) {
        console.error('ERRO: Informe o nome da credencial. Ex: node credential-cli.js get FB_ACCESS_TOKEN');
        process.exit(1);
      }
      const envVars = vault.getEnvVars();
      const value = envVars[name.toUpperCase()];
      if (value) {
        // Saida limpa, sem newline extra, para uso em subshell
        process.stdout.write(value);
      } else {
        console.error(`ERRO: Credencial "${name.toUpperCase()}" nao encontrada no vault.`);
        console.error('Use "list" para ver credenciais disponiveis.');
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const all = vault.getAll();
      all.forEach(c => {
        console.log(`${c.name}  [${c.category}]  ${c.description || ''}`);
      });
      console.log(`\nTotal: ${all.length} credenciais`);
      break;
    }

    case 'env': {
      const envVars = vault.getEnvVars();
      for (const [key, value] of Object.entries(envVars)) {
        console.log(`${key}=${value}`);
      }
      break;
    }

    case 'resolve': {
      const text = args.join(' ');
      if (!text) {
        console.error('ERRO: Informe o texto para resolver. Ex: node credential-cli.js resolve "Token: {{secret:FB_ACCESS_TOKEN}}"');
        process.exit(1);
      }
      const resolved = vault.resolve(text);
      process.stdout.write(resolved);
      break;
    }

    case 'run': {
      const scriptPath = args[0];
      if (!scriptPath) {
        console.error('ERRO: Informe o caminho do script. Ex: node credential-cli.js run D:\\meu-script.js');
        process.exit(1);
      }

      // Verificar se o script existe
      const fs = require('fs');
      const resolvedPath = path.resolve(scriptPath);
      if (!fs.existsSync(resolvedPath)) {
        console.error(`ERRO: Script nao encontrado: ${resolvedPath}`);
        process.exit(1);
      }

      // Injetar todas as credenciais como variaveis de ambiente
      const envVars = vault.getEnvVars();
      const childEnv = { ...process.env, ...envVars };

      // Executar o script como processo filho com as credenciais no env
      const child = spawn('node', [resolvedPath, ...args.slice(1)], {
        env: childEnv,
        stdio: 'inherit',
        shell: false
      });

      child.on('close', (code) => {
        process.exit(code || 0);
      });

      child.on('error', (err) => {
        console.error(`ERRO ao executar script: ${err.message}`);
        process.exit(1);
      });
      break;
    }

    case 'has': {
      const name = args[0];
      if (!name) {
        console.error('ERRO: Informe o nome da credencial.');
        process.exit(1);
      }
      const envVars = vault.getEnvVars();
      if (envVars[name.toUpperCase()]) {
        console.log(`OK: ${name.toUpperCase()} existe no vault`);
        process.exit(0);
      } else {
        console.log(`NAO ENCONTRADA: ${name.toUpperCase()}`);
        process.exit(1);
      }
      break;
    }

    case 'names-for': {
      const prefix = (args[0] || '').toUpperCase();
      if (!prefix) {
        console.error('ERRO: Informe o prefixo. Ex: node credential-cli.js names-for FB_');
        process.exit(1);
      }
      const all = vault.getAll();
      const filtered = all.filter(c => c.name.startsWith(prefix));
      filtered.forEach(c => console.log(c.name));
      if (filtered.length === 0) {
        console.error(`Nenhuma credencial com prefixo "${prefix}" encontrada.`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Comando desconhecido: "${command}"`);
      console.log(USAGE);
      process.exit(1);
  }
}

main();
