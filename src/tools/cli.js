#!/usr/bin/env node
/**
 * Tools CLI — Interface de linha de comando para as ferramentas.
 *
 * Uso:
 *   node cli.js --list                    # Lista todas as ferramentas
 *   node cli.js --help <ferramenta>       # Help de uma ferramenta
 *   node cli.js <ferramenta> key=value    # Executa uma ferramenta
 */

const path = require('path');
const { TOOLS_DEF, executeTool } = require('./registry');

// Lazy load do vault (só quando necessário)
let vault = null;
function getVault() {
  if (!vault) vault = require('../shared/credential-vault');
  return vault;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' && args.length === 1) {
    console.log('Claude Ecosystem Tools CLI v2.0');
    console.log('Uso: node cli.js [--list | --help <tool> | <tool> key=value ...]');
    return;
  }

  if (args[0] === '--list') {
    console.log(`\n${TOOLS_DEF.length} ferramentas disponíveis:\n`);
    const byModule = {};
    for (const t of TOOLS_DEF) {
      const cat = t._module || 'geral';
      if (!byModule[cat]) byModule[cat] = [];
      byModule[cat].push(t.name);
    }
    for (const [cat, tools] of Object.entries(byModule).sort()) {
      console.log(`  [${cat}] ${tools.join(', ')}`);
    }
    console.log('');
    return;
  }

  if (args[0] === '--help' && args[1]) {
    const tool = TOOLS_DEF.find(t => t.name === args[1]);
    if (!tool) { console.error(`Ferramenta "${args[1]}" não encontrada`); process.exit(1); }
    console.log(`\n${tool.name}`);
    console.log(`  ${tool.description || 'Sem descrição'}\n`);
    if (tool.parameters?.properties) {
      console.log('Parâmetros:');
      for (const [k, v] of Object.entries(tool.parameters.properties)) {
        const req = tool.parameters.required?.includes(k) ? ' (obrigatório)' : '';
        console.log(`  ${k}: ${v.description || v.type}${req}`);
      }
    }
    console.log('');
    return;
  }

  // Executar ferramenta
  const toolName = args[0];
  const toolArgs = {};
  for (let i = 1; i < args.length; i++) {
    const eq = args[i].indexOf('=');
    if (eq > 0) {
      const key = args[i].substring(0, eq);
      let val = args[i].substring(eq + 1);
      // Auto-parse booleans e numbers
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (/^\d+$/.test(val)) val = parseInt(val, 10);
      toolArgs[key] = val;
    }
  }

  const result = await executeTool(toolName, toolArgs, getVault());
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });
