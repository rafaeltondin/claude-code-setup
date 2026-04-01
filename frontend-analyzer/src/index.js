#!/usr/bin/env node

/**
 * Frontend Analyzer - CLI Principal
 *
 * Ferramenta de análise completa de projetos HTML/CSS
 *
 * Uso:
 *   Modo interativo: node src/index.js
 *   Modo não-interativo: node src/index.js --path "/caminho/projeto" --format json,txt
 */

import inquirer from 'inquirer';
import { scanProject } from './utils/file-scanner.js';
import { fetchAndSave, isURL } from './utils/web-fetcher.js';
import { parseCSS } from './parsers/css-parser.js';
import { parseHTML } from './parsers/html-parser.js';
import { HTMLParser } from './parsers/html-parser.js';

// Analisadores CSS
import { analyzeSpecificity } from './analyzers/css/specificity.js';
import { analyzeSelectors } from './analyzers/css/selectors.js';
import { analyzeProperties } from './analyzers/css/properties.js';
import { analyzeValues } from './analyzers/css/values.js';
import { analyzeLayout } from './analyzers/css/layout.js';
import { analyzeResponsive } from './analyzers/css/responsive.js';
import { analyzePerformance as analyzeCSSPerformance } from './analyzers/css/performance.js';
import { analyzeMaintainability } from './analyzers/css/maintainability.js';
import { analyzeAnimation } from './analyzers/css/animation.js';
import { analyzeModernCSS } from './analyzers/css/modern.js';
import { analyzeArchitecture } from './analyzers/css/architecture.js';

// Analisadores HTML
import { analyzeStructure } from './analyzers/html/structure.js';
import { analyzeSemantics } from './analyzers/html/semantics.js';
import { analyzeAccessibility } from './analyzers/html/accessibility.js';
import { analyzeForms } from './analyzers/html/forms.js';
import { analyzeMeta } from './analyzers/html/meta.js';
import { analyzeMedia } from './analyzers/html/media.js';
import { analyzeSecurity } from './analyzers/html/security.js';

// Analisadores de Integração
import { analyzeCrossReferences } from './analyzers/integration/cross-references.js';
import { analyzeInheritance } from './analyzers/integration/inheritance.js';
import { analyzeStates } from './analyzers/integration/states.js';

// Analisadores de Performance e Compatibilidade
import { analyzePerformanceMetrics } from './analyzers/performance/metrics.js';
import { analyzeBrowserSupport } from './analyzers/compatibility/browser-support.js';

// Reporters
import { generateTextReport } from './reporters/text-reporter.js';
import { generateJSONReport } from './reporters/json-reporter.js';
import { generateHTMLReport } from './reporters/html-reporter.js';
import { generateAgentReport } from './reporters/agent-reporter.js';

// Report Manager (novo sistema de gerenciamento de relatórios)
import { saveReports } from './utils/report-manager.js';

import { readFileSync } from 'fs';
import path from 'path';

// Parse de argumentos CLI
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    path: null,
    format: null,
    name: null,
    help: false,
    fix: false,
    dryRun: false,
    dashboard: false,
    port: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      parsed.path = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      parsed.format = args[i + 1].split(',').map(f => f.trim());
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      parsed.name = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      parsed.help = true;
    } else if (args[i] === '--fix') {
      parsed.fix = true;
    } else if (args[i] === '--dry-run') {
      parsed.dryRun = true;
    } else if (args[i] === '--dashboard') {
      parsed.dashboard = true;
    } else if (args[i] === '--port' && args[i + 1]) {
      parsed.port = parseInt(args[i + 1]);
      i++;
    }
  }

  return parsed;
}

const cliArgs = parseArgs();

if (cliArgs.help) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              FRONTEND ANALYZER v2.1.0 - HELP                     ║
╚══════════════════════════════════════════════════════════════════╝

USO:
  Modo Interativo:
    node src/index.js

  Modo Não-Interativo (Projeto Local):
    node src/index.js --path "/caminho/projeto" --format json,txt

  Modo Não-Interativo (URL Remota):
    node src/index.js --path "https://exemplo.com" --format json

  Modo Dashboard (Chrome DevTools):
    node src/index.js --dashboard
    node src/index.js --dashboard --port 3850

OPÇÕES:
  --path <caminho|url>   Caminho do projeto OU URL do site a ser analisado
  --format <formatos>    Formatos de saída (txt, json, html) separados por vírgula
  --name <nome>          Nome do projeto (opcional, auto-detectado se URL)
  --fix                  Aplica correções automáticas nos problemas detectados
  --dry-run              Modo dry-run (mostra o que seria corrigido sem modificar arquivos)
  --dashboard            Inicia o dashboard web com seleção de perfil Chrome/Google
  --port <numero>        Porta do servidor dashboard (padrão: 3850)
  --help, -h             Mostra esta mensagem

EXEMPLOS:
  Projeto local:
    node src/index.js --path "./meu-projeto" --format json
    node src/index.js --path "C:\\projetos\\site" --format txt,json,html

  Site remoto (URL):
    node src/index.js --path "https://orbity.riwerlabs.com" --format json
    node src/index.js --path "https://exemplo.com.br" --format txt,html

  Com correções automáticas:
    node src/index.js --path "./projeto" --format json --fix
    node src/index.js --path "./projeto" --dry-run --fix

  Dashboard com Chrome DevTools:
    node src/index.js --dashboard
    node src/index.js --dashboard --port 4000
  `);
  process.exit(0);
}

// Modo Dashboard - iniciar servidor web
if (cliArgs.dashboard) {
  const { startServer } = await import('./server/server.js');
  const port = cliArgs.port || 3850;
  await startServer(port);
  // Servidor fica rodando, nao continuar para o modo CLI
  // Manter processo vivo
  process.on('SIGINT', () => {
    console.log('\n[Main] Encerrando dashboard...');
    process.exit(0);
  });
  // Impedir que o script continue para o modo CLI
  await new Promise(() => {}); // Bloqueia indefinidamente
}

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║              FRONTEND ANALYZER v2.0.1                            ║
║              Análise Completa de HTML/CSS                        ║
║              [HOTFIX] Action plan corrigido                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

async function main() {
  console.log(`[Main] INÍCIO - Frontend Analyzer`);

  try {
    let answers;

    // Modo não-interativo (se --path foi fornecido)
    if (cliArgs.path) {
      console.log(`[Main] Modo não-interativo ativado`);
      answers = {
        projectPath: cliArgs.path,
        projectName: cliArgs.name || path.basename(cliArgs.path),
        outputFormats: cliArgs.format || ['txt']
      };
      console.log(`[Main] Configuração via argumentos CLI`);
    } else {
      // Modo interativo (padrão)
      console.log(`[Main] Modo interativo ativado`);
      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectPath',
          message: 'Caminho do projeto para análise:',
          default: process.cwd(),
          validate: (input) => {
            if (!input || input.trim() === '') {
              return 'Por favor, forneça um caminho válido';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'projectName',
          message: 'Nome do projeto:',
          default: 'Meu Projeto'
        },
        {
          type: 'checkbox',
          name: 'outputFormats',
          message: 'Formatos de saída:',
          choices: [
            { name: 'TXT (Terminal)', value: 'txt', checked: true },
            { name: 'JSON (Arquivo)', value: 'json', checked: false },
            { name: 'HTML (Arquivo)', value: 'html', checked: false }
          ],
          validate: (input) => {
            if (input.length === 0) {
              return 'Selecione pelo menos um formato';
            }
            return true;
          }
        }
      ]);
    }

    console.log(`\n[Main] Configuração:`);
    console.log(`[Main]   Projeto: ${answers.projectName}`);
    console.log(`[Main]   Caminho: ${answers.projectPath}`);
    console.log(`[Main]   Formatos: ${answers.outputFormats.join(', ')}`);

    // Verificar se é URL e fazer fetch
    let projectPath = answers.projectPath;
    let originalURL = null;
    let originalHTMLContent = null;

    if (isURL(projectPath)) {
      console.log(`\n[Main] 🌐 URL detectada - fazendo download do HTML...`);
      try {
        originalURL = projectPath;
        const fetchResult = await fetchAndSave(projectPath);
        console.log(`[Main] ✅ HTML baixado: ${fetchResult.size} bytes`);
        console.log(`[Main] ✅ Salvo em: ${fetchResult.savedDir}`);
        projectPath = fetchResult.savedDir;

        // Ler o HTML original para salvar junto com os relatórios
        const htmlFile = fetchResult.savedPath;
        originalHTMLContent = readFileSync(htmlFile, 'utf-8');

        if (!answers.projectName || answers.projectName === path.basename(answers.projectPath)) {
          answers.projectName = new URL(answers.projectPath).hostname;
        }
      } catch (error) {
        console.error(`[Main] ❌ Erro ao baixar URL:`, error.message);
        throw error;
      }
    }

    // Scan do projeto
    console.log(`\n[Main] ⏳ Scanning arquivos do projeto...`);
    const files = await scanProject(projectPath);

    const totalFiles = files.css.length + files.html.length;
    console.log(`[Main] ✅ Encontrados ${totalFiles} arquivos (${files.css.length} CSS, ${files.html.length} HTML)`);

    if (totalFiles === 0) {
      console.log(`[Main] ❌ ERRO: Nenhum arquivo HTML ou CSS encontrado no diretório.`);
      return;
    }

    // Parse dos arquivos
    console.log(`\n[Main] ⏳ Fazendo parse dos arquivos...`);

    files.css.forEach(file => {
      console.log(`[Main]   Parsing CSS: ${file.path}`);
      file.parsed = parseCSS(file.content, file.path);
    });

    files.html.forEach(file => {
      console.log(`[Main]   Parsing HTML: ${file.path}`);
      file.parsed = parseHTML(file.content, file.path);
      file.parsedObj = new HTMLParser(file.content, file.path);
      file.parsedObj.parse();
    });

    console.log(`[Main] ✅ Parse concluído`);

    // Executar análises
    console.log(`\n[Main] ⏳ Executando análises...`);

    let allIssues = [];

    console.log(`[Main] 1/21 Análise de especificidade CSS...`);
    allIssues = allIssues.concat(analyzeSpecificity(files.css));

    console.log(`[Main] 2/21 Análise de seletores CSS...`);
    allIssues = allIssues.concat(analyzeSelectors(files.css));

    console.log(`[Main] 3/21 Análise de propriedades CSS...`);
    allIssues = allIssues.concat(analyzeProperties(files.css));

    console.log(`[Main] 4/21 Análise de valores CSS...`);
    allIssues = allIssues.concat(analyzeValues(files.css));

    console.log(`[Main] 5/21 Análise de layout CSS...`);
    allIssues = allIssues.concat(analyzeLayout(files.css));

    console.log(`[Main] 6/21 Análise de responsividade...`);
    allIssues = allIssues.concat(analyzeResponsive(files.css));

    console.log(`[Main] 7/21 Análise de performance CSS...`);
    allIssues = allIssues.concat(analyzeCSSPerformance(files.css));

    console.log(`[Main] 8/21 Análise de manutenibilidade...`);
    allIssues = allIssues.concat(analyzeMaintainability(files.css));

    console.log(`[Main] 9/21 Análise de estrutura HTML...`);
    allIssues = allIssues.concat(analyzeStructure(files.html));

    console.log(`[Main] 10/21 Análise de semântica HTML...`);
    allIssues = allIssues.concat(analyzeSemantics(files.html));

    console.log(`[Main] 11/21 Análise de acessibilidade...`);
    allIssues = allIssues.concat(analyzeAccessibility(files.html));

    console.log(`[Main] 12/21 Análise de formulários...`);
    allIssues = allIssues.concat(analyzeForms(files.html));

    console.log(`[Main] 13/21 Análise de meta tags...`);
    allIssues = allIssues.concat(analyzeMeta(files.html));

    console.log(`[Main] 14/21 Análise de mídia...`);
    allIssues = allIssues.concat(analyzeMedia(files.html));

    console.log(`[Main] 15/21 Análise de integração...`);
    allIssues = allIssues.concat(analyzeCrossReferences(files.html, files.css));
    allIssues = allIssues.concat(analyzeInheritance(files.css));
    allIssues = allIssues.concat(analyzeStates(files.css));

    console.log(`[Main] 16/21 Análise de performance...`);
    allIssues = allIssues.concat(analyzePerformanceMetrics(files.html, files.css));

    console.log(`[Main] 17/21 Análise de compatibilidade...`);
    allIssues = allIssues.concat(analyzeBrowserSupport(files.css));

    console.log(`[Main] 18/21 Análise de animações CSS...`);
    allIssues = allIssues.concat(analyzeAnimation(files.css));

    console.log(`[Main] 19/21 Análise de CSS moderno...`);
    allIssues = allIssues.concat(analyzeModernCSS(files.css));

    console.log(`[Main] 20/21 Análise de arquitetura CSS...`);
    allIssues = allIssues.concat(analyzeArchitecture(files.css));

    console.log(`[Main] 21/21 Análise de segurança HTML...`);
    allIssues = allIssues.concat(analyzeSecurity(files.html));

    console.log(`[Main] ✅ Análises concluídas - ${allIssues.length} problemas encontrados`);

    // Aplicar auto-fix se solicitado
    let autoFixResult = null;

    if (cliArgs.fix) {
      console.log(`\n[Main] 🔧 Aplicando correções automáticas...`);

      // Importar auto-fixer
      const { autoFix, getFixableIssues } = await import('./auto-fixer.js');

      // Verificar quantos issues são fixáveis
      const fixableIssues = getFixableIssues(allIssues);
      console.log(`[Main] Issues fixáveis: ${fixableIssues.length}/${allIssues.length}`);

      if (fixableIssues.length === 0) {
        console.log(`[Main] ⚠️ Nenhum issue fixável encontrado`);
      } else {
        // Aplicar correções
        const analysisResult = {
          success: true,
          issues: allIssues,
          projectPath
        };

        autoFixResult = await autoFix(analysisResult, {
          dryRun: cliArgs.dryRun || false,
          backupFiles: true,
          fixCategories: ['all']
        });

        if (autoFixResult.success) {
          console.log(`[Main] ✅ Correções aplicadas!`);
          console.log(`[Main]   Fixados: ${autoFixResult.summary.fixedIssues}`);
          console.log(`[Main]   Pulados: ${autoFixResult.summary.skippedIssues}`);
          console.log(`[Main]   Erros: ${autoFixResult.summary.errorCount}`);
          console.log(`[Main]   Tempo: ${autoFixResult.summary.executionTime}ms`);

          if (cliArgs.dryRun) {
            console.log(`[Main] ℹ️ Modo DRY-RUN: Nenhum arquivo foi modificado`);
          } else {
            console.log(`[Main] ℹ️ Backups criados com extensão .backup`);
          }

          // Mostrar detalhes dos fixes aplicados
          if (autoFixResult.fixed.length > 0) {
            console.log(`\n[Main] Detalhes das correções:`);
            autoFixResult.fixed.forEach(fix => {
              console.log(`[Main]   📄 ${fix.file}`);
              fix.appliedFixes.forEach(af => {
                const status = af.success ? '✅' : '❌';
                console.log(`[Main]     ${status} ${af.description}`);
              });
            });
          }

          // Mostrar erros se houver
          if (autoFixResult.errors.length > 0) {
            console.log(`\n[Main] ⚠️ Erros durante correções:`);
            autoFixResult.errors.forEach(err => {
              console.log(`[Main]   ❌ ${err.file}: ${err.error}`);
            });
          }
        } else {
          console.error(`[Main] ❌ ERRO ao aplicar correções:`, autoFixResult.error);
        }
      }
    }

    // Gerar relatórios
    console.log(`\n[Main] ⏳ Gerando relatórios...`);

    const reportsToGenerate = {};

    if (answers.outputFormats.includes('txt')) {
      console.log(`[Main] Gerando relatório TXT...`);
      const txtReport = generateTextReport(allIssues, answers.projectName, totalFiles);
      reportsToGenerate.txt = txtReport;

      // Exibir no console apenas se formato TXT foi solicitado
      console.log(`\n${txtReport}`);
    }

    if (answers.outputFormats.includes('json')) {
      console.log(`[Main] Gerando relatório JSON...`);
      const jsonReport = generateJSONReport(allIssues, answers.projectName, totalFiles);
      reportsToGenerate.json = jsonReport;
    }

    if (answers.outputFormats.includes('html')) {
      console.log(`[Main] Gerando relatório HTML...`);
      const htmlReport = generateHTMLReport(allIssues, answers.projectName, totalFiles);
      reportsToGenerate.html = htmlReport;
    }

    // SEMPRE gerar relatório para agentes (independente dos formatos solicitados)
    console.log(`[Main] Gerando relatório otimizado para agentes...`);
    const agentReport = generateAgentReport(allIssues, answers.projectName, totalFiles);
    reportsToGenerate.agent = agentReport;

    // Salvar relatórios usando novo sistema de gerenciamento
    const saveResult = saveReports({
      projectName: answers.projectName,
      reports: reportsToGenerate,
      originalHTML: originalHTMLContent,
      originalURL: originalURL
    });

    // Verificar resultado do salvamento
    if (!saveResult.success) {
      console.error(`[Main] ❌ ERRO: Falha ao salvar relatórios!`);
      if (saveResult.error) {
        console.error(`[Main] Detalhes: ${saveResult.error}`);
      }
      process.exit(1);
    }

    // Exibir sumário de salvamento
    console.log(`\n[Main] ═══════════════════════════════════════════════`);
    console.log(`[Main] ✅ ANÁLISE CONCLUÍDA COM SUCESSO!`);
    console.log(`[Main] ═══════════════════════════════════════════════`);
    console.log(`[Main] 📊 Problemas encontrados: ${allIssues.length}`);

    if (autoFixResult && autoFixResult.success) {
      console.log(`[Main] 🔧 Correções automáticas: ${autoFixResult.summary.fixedIssues} aplicadas`);
    }

    console.log(`[Main] 📁 Relatórios salvos: ${saveResult.summary.totalSaved}`);
    console.log(`[Main] 📦 Tamanho total: ${saveResult.summary.totalSizeFormatted}`);
    console.log(`[Main] 📂 Localização: ${saveResult.basePath}`);
    console.log(`[Main] ═══════════════════════════════════════════════`);

    if (saveResult.failed.length > 0) {
      console.warn(`\n[Main] ⚠️ Alguns relatórios falharam ao salvar:`);
      saveResult.failed.forEach(f => {
        console.warn(`[Main]   - ${f.format}: ${f.error}`);
      });
    }

    console.log(`\n[Main] FIM - Análise concluída com sucesso!`);

  } catch (error) {
    console.error(`[Main] ERRO FATAL:`, error.message);
    console.error(`[Main] Stack:`, error.stack);
    process.exit(1);
  }
}

main();
