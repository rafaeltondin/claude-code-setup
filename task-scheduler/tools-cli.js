#!/usr/bin/env node
/**
 * TOOLS CLI — Interface de linha de comando para as ferramentas do chat-tools.js
 *
 * Permite que o Claude Code CLI (ou qualquer terminal) execute as mesmas
 * ferramentas disponíveis no Chat IA, sem precisar do OpenRouter.
 *
 * USO:
 *   node tools-cli.js <ferramenta> [args como JSON ou key=value]
 *   node tools-cli.js --list                    # lista todas as ferramentas
 *   node tools-cli.js --help <ferramenta>       # mostra ajuda de uma ferramenta
 *
 * EXEMPLOS:
 *   node tools-cli.js search_kb query="Meta Ads API"
 *   node tools-cli.js call_crm endpoint=/leads method=GET
 *   node tools-cli.js scrape_website url=https://example.com
 *   node tools-cli.js seo_check url=https://example.com
 *   node tools-cli.js pagespeed url=https://example.com strategy=mobile
 *   node tools-cli.js google_search query="dentistas Garopaba SC"
 *   node tools-cli.js maps_search query=dentistas location="Garopaba SC"
 *   node tools-cli.js meta_ads action=campaigns
 *   node tools-cli.js csv_processor file_path=data.csv action=stats
 *   node tools-cli.js get_credential name=SHOPIFY_ACCESS_TOKEN
 *   node tools-cli.js fetch_api url=https://api.example.com/data
 *   node tools-cli.js execute_node code="console.log(2+2)"
 *   node tools-cli.js scheduler action=list
 *   node tools-cli.js '{"tool":"search_kb","args":{"query":"Shopify"}}'
 */

const path = require('path');
const { TOOLS_DEF, executeTool } = require('./chat-tools');
const credentialVault = require('./credential-vault');

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--list') {
  console.log('\n  Ferramentas disponíveis:\n');
  const maxLen = Math.max(...TOOLS_DEF.map(t => t.function.name.length));
  for (const tool of TOOLS_DEF) {
    const name = tool.function.name.padEnd(maxLen + 2);
    const desc = tool.function.description.split('\n')[0].substring(0, 80);
    console.log(`  ${name} ${desc}`);
  }
  console.log(`\n  Total: ${TOOLS_DEF.length} ferramentas`);
  console.log('  Uso: node tools-cli.js <ferramenta> [key=value ...]\n');
  process.exit(0);
}

if (args[0] === '--help') {
  const toolName = args[1];
  if (!toolName) {
    console.error('Uso: node tools-cli.js --help <nome_da_ferramenta>');
    process.exit(1);
  }
  const tool = TOOLS_DEF.find(t => t.function.name === toolName);
  if (!tool) {
    console.error(`Ferramenta "${toolName}" não encontrada.`);
    process.exit(1);
  }
  console.log(`\n  ${tool.function.name}`);
  console.log(`  ${'─'.repeat(tool.function.name.length)}`);
  console.log(`  ${tool.function.description}\n`);
  const params = tool.function.parameters;
  if (params && params.properties) {
    console.log('  Parâmetros:');
    const required = params.required || [];
    for (const [key, val] of Object.entries(params.properties)) {
      const req = required.includes(key) ? ' (obrigatório)' : '';
      const type = val.type || 'any';
      const desc = val.description || '';
      console.log(`    ${key} [${type}]${req}: ${desc}`);
    }
  }
  console.log('');
  process.exit(0);
}

// Parsear argumentos
let toolName, toolArgs;

// Modo JSON: node tools-cli.js '{"tool":"search_kb","args":{"query":"test"}}'
if (args[0].startsWith('{')) {
  try {
    const parsed = JSON.parse(args.join(' '));
    toolName = parsed.tool || parsed.name;
    toolArgs = parsed.args || parsed.arguments || {};
  } catch (e) {
    console.error('JSON inválido:', e.message);
    process.exit(1);
  }
} else {
  // Modo key=value: node tools-cli.js search_kb query="Meta Ads"
  toolName = args[0];
  toolArgs = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const eqIdx = arg.indexOf('=');
    if (eqIdx > 0) {
      const key = arg.substring(0, eqIdx);
      let value = arg.substring(eqIdx + 1);

      // Tentar parsear JSON (para objetos/arrays)
      if ((value.startsWith('{') || value.startsWith('[')) && (value.endsWith('}') || value.endsWith(']'))) {
        try { value = JSON.parse(value); } catch (_) {}
      }
      // Tentar parsear números
      else if (/^\d+(\.\d+)?$/.test(value)) {
        value = Number(value);
      }
      // Booleans
      else if (value === 'true') value = true;
      else if (value === 'false') value = false;

      toolArgs[key] = value;
    }
  }
}

// Validar ferramenta
const toolDef = TOOLS_DEF.find(t => t.function.name === toolName);
if (!toolDef) {
  console.error(`Ferramenta "${toolName}" não encontrada.`);
  console.error('Use --list para ver as ferramentas disponíveis.');
  process.exit(1);
}

// Executar
(async () => {
  try {
    const result = await executeTool(toolName, toolArgs, credentialVault);
    // Tentar formatar JSON bonito
    try {
      const parsed = JSON.parse(result);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (_) {
      console.log(result);
    }
  } catch (err) {
    console.error(`Erro ao executar ${toolName}:`, err.message);
    process.exit(1);
  }
})();
