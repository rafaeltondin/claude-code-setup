#!/usr/bin/env node
/**
 * @file nano-banana-cli.js
 * @description CLI Node.js para geração e edição de imagens com a API Nano Banana Pro
 *              (Google Gemini Image Generation). Orquestra o script Python generate_image.py
 *              via `uv run`, adicionando: credential vault, batch processing, presets Meta Ads,
 *              retry com exponential backoff, progress tracking e output organizado.
 *
 * @usage
 *   node nano-banana-cli.js generate -p "foto de produto" -o "output.png" -r 2K -a 4:5
 *   node nano-banana-cli.js edit -i "original.png" -p "mude o fundo para verde" -o "editado.png"
 *   node nano-banana-cli.js batch -f "jobs.json" -o "./output/" -j 5
 *   node nano-banana-cli.js ads --preset product-hero --brand "Marca" --colors "#FF0000,#000" -o ./out/
 *   node nano-banana-cli.js presets
 *   node nano-banana-cli.js help [comando]
 */

'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ---------------------------------------------------------------------------
// CONSTANTES E CAMINHOS
// ---------------------------------------------------------------------------

const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const SCRIPT_PATH = path.join(CLAUDE_HOME, 'skills', 'nano-banana-pro', 'scripts', 'generate_image.py');
const CREDENTIAL_CLI = path.join(CLAUDE_HOME, 'task-scheduler', 'credential-cli.js');

const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

let verboseMode = false;

const log = {
  info:    (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`[OK]   ${msg}`),
  warn:    (msg) => console.warn(`[WARN] ${msg}`),
  error:   (msg) => console.error(`[ERR]  ${msg}`),
  debug:   (msg) => { if (verboseMode) console.log(`[DBG]  ${msg}`); },
  step:    (current, total, msg) => console.log(`[${current}/${total}] ${msg}`),
  progress:(msg) => process.stdout.write(`\r       ${msg}                    `),
  blank:   () => console.log(''),
};

// ---------------------------------------------------------------------------
// PRESETS DE ADS — TEMPLATES DE PROMPTS PARA META ADS
// ---------------------------------------------------------------------------

const AD_PRESETS = {
  'product-hero': {
    name: 'Product Hero',
    description: 'Produto em destaque com headline impactante',
    aspectRatios: ['4:5', '1:1', '1.91:1'],
    promptTemplate: (opts) => `
Criativo publicitario profissional para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
${opts.productImage ? 'Imagem do produto fornecida — usar como elemento principal.' : ''}
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores da marca: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Headline na imagem: "${opts.text}"` : ''}
Estilo: Fundo limpo ou gradiente, iluminacao dramatica de estudio com sombras suaves,
produto centralizado e nitido, visual premium. Tipografia bold e moderna.
Estetica de fotografia comercial de alto padrao. Formato: ${opts.aspect || '4:5'}.
Fotorrealista, ultra-nitido, qualidade 8k.
    `.trim(),
  },

  'lifestyle': {
    name: 'Lifestyle',
    description: 'Produto em uso no dia a dia, estilo de vida aspiracional',
    aspectRatios: ['4:5', '9:16', '1:1'],
    promptTemplate: (opts) => `
Foto de anuncio lifestyle para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
${opts.productImage ? 'Incorporar o produto fornecido naturalmente na cena.' : ''}
Cores da marca: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Texto sobreposto: "${opts.text}"` : ''}
Estilo: Cenario aspiracional da vida real, iluminacao natural, jovens adultos ativos usando o produto,
ambiente vibrante (academia, ao ar livre, estilo urbano). Sensacao autentica e espontanea.
Cor quente, sujeito nitido com fundo levemente desfocado (bokeh).
Formato: ${opts.aspect || '4:5'}. Fotorrealista 8k.
    `.trim(),
  },

  'before-after': {
    name: 'Antes/Depois',
    description: 'Comparacao antes e depois mostrando transformacao',
    aspectRatios: ['1:1', '4:5'],
    promptTemplate: (opts) => `
Anuncio comparativo antes e depois para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Mensagem: "${opts.text}"` : ''}
Layout: Lado esquerdo com label "ANTES" em tons dessaturados, cinza, estado do problema.
Lado direito com label "DEPOIS" vibrante, colorido, estado da solucao.
${opts.productImage ? 'Produto mostrado no lado DEPOIS.' : ''}
Linha divisoria bold na cor da marca, labels em fonte sem-serifa, contraste visual dramatico.
Formato: ${opts.aspect || '1:1'}.
    `.trim(),
  },

  'testimonial': {
    name: 'Depoimento',
    description: 'Criativo com citacao de cliente real (prova social)',
    aspectRatios: ['4:5', '1:1'],
    promptTemplate: (opts) => `
Anuncio com depoimento de cliente para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Citacao do cliente: "${opts.text}"` : 'Incluir avaliacao 5 estrelas com depoimento positivo em portugues.'}
Design: Foto ou avatar do cliente (sorridente, autenticidade), aspas grandes na cor da marca,
avaliacao de estrelas (5 estrelas), nome do cliente abaixo da citacao.
Fundo limpo com gradiente sutil da cor da marca. Estetica calorosa e confiavel.
${opts.productImage ? 'Pequena imagem do produto no canto.' : ''}
Formato: ${opts.aspect || '4:5'}.
    `.trim(),
  },

  'flash-sale': {
    name: 'Oferta Relampago',
    description: 'Criativo de urgencia com desconto/oferta por tempo limitado',
    aspectRatios: ['1:1', '4:5', '9:16'],
    promptTemplate: (opts) => `
Anuncio de oferta relampago urgente para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#FF0000, #000000'}.
${opts.text ? `Texto da oferta: "${opts.text}"` : 'Mostrar "OFERTA POR TEMPO LIMITADO — 50% OFF" em destaque.'}
Design: Alta energia, tipografia bold, sensacao de urgencia com countdown.
${opts.productImage ? 'Produto em destaque com etiqueta de preco ou badge de desconto.' : ''}
Fundo: Gradiente dinamico ou cor solida bold da paleta da marca.
Numero grande de desconto percentual, mensagem "acaba em breve", botao CTA forte "COMPRE AGORA".
Vibrante, chamativo, para parar o scroll. Formato: ${opts.aspect || '1:1'}.
    `.trim(),
  },

  'features': {
    name: 'Caracteristicas',
    description: 'Destaque visual das principais caracteristicas do produto',
    aspectRatios: ['4:5', '1:1', '9:16'],
    promptTemplate: (opts) => `
Anuncio showcase de caracteristicas para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Caracteristicas a destacar: "${opts.text}"` : ''}
Design: Layout estilo infografico limpo.
${opts.productImage ? 'Imagem do produto centralizada ou em um lado.' : ''}
3-4 callouts de caracteristicas com icones e texto curto em portugues, conectados por linhas sutis ao produto.
Visual minimalista premium, fundo branco ou claro, cores da marca para icones e texto.
Cada caracteristica tem icone pequeno, label bold e descricao de uma linha.
Formato: ${opts.aspect || '4:5'}. Tecnico mas bonito, estetica inspirada na Apple.
    `.trim(),
  },

  'comparison': {
    name: 'Comparacao',
    description: 'Comparacao com concorrentes mostrando superioridade',
    aspectRatios: ['1:1', '4:5'],
    promptTemplate: (opts) => `
Anuncio de comparacao com concorrentes para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Diferenciais: "${opts.text}"` : ''}
Design: Tabela comparativa ou layout dividido.
Coluna esquerda: "Outros" com X vermelhos e pontos negativos.
Coluna direita: "${opts.brand || 'Nos'}" com checkmarks verdes e pontos positivos, destacados nas cores da marca.
${opts.productImage ? 'Imagem do produto mostrada orgulhosamente no lado direito.' : ''}
Design limpo de tabela, tom confiante, 4-5 pontos de comparacao.
Formato: ${opts.aspect || '1:1'}.
    `.trim(),
  },

  'social-proof': {
    name: 'Prova Social',
    description: 'Reviews, avaliacoes e numeros de clientes satisfeitos',
    aspectRatios: ['1:1', '4:5'],
    promptTemplate: (opts) => `
Anuncio de prova social para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Estatisticas/mensagem: "${opts.text}"` : 'Mostrar "+10.000 Clientes Satisfeitos" e avaliacao 4.9 estrelas.'}
Design: Multiplos cards de avaliacao em mosaico ou grid.
${opts.productImage ? 'Imagem do produto ou logo da marca em destaque.' : ''}
Avaliacoes de estrelas (4.5-5), trechos curtos de reviews em portugues, avatares, badges verificados.
Numero impressionante grande (clientes/avaliacoes) como estatistica principal.
Paleta de cores calorosa e confiavel. Formato: ${opts.aspect || '1:1'}.
    `.trim(),
  },

  'retargeting': {
    name: 'Retargeting',
    description: 'Criativo para retargeting — re-engajar visitantes que nao compraram',
    aspectRatios: ['4:5', '1:1', '9:16'],
    promptTemplate: (opts) => `
Anuncio de retargeting para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Mensagem: "${opts.text}"` : 'Mensagem: "Ainda pensando? Guardamos seu carrinho."'}
Design: Sensacao personalizada e conversacional. Produto mostrado claramente.
${opts.productImage ? 'Imagem do produto em destaque — o produto que estavam visualizando.' : ''}
Urgencia sutil (estoque limitado, preco pode mudar), tom de lembrete amigavel.
CTA "FINALIZAR COMPRA", possivelmente com desconto exclusivo pequeno.
Layout limpo, cores da marca. Formato: ${opts.aspect || '4:5'}.
    `.trim(),
  },

  'gift': {
    name: 'Presente',
    description: 'Criativo com apelo de presente — datas comemorativas',
    aspectRatios: ['1:1', '4:5', '9:16'],
    promptTemplate: (opts) => `
Anuncio de ideia de presente para Meta Ads. TODOS OS TEXTOS EM PORTUGUES BRASILEIRO.
Marca: ${opts.brand || 'Marca'}. ${opts.logoDesc ? `Logo: ${opts.logoDesc}` : ''}
Cores: ${opts.colors || '#000000, #FFFFFF'}.
${opts.text ? `Mensagem de presente: "${opts.text}"` : 'Mensagem: "O presente perfeito para quem voce ama."'}
Design: Clima caloroso e festivo. Elementos de caixa de presente, fita, laco.
${opts.productImage ? 'Produto mostrado dentro ou ao lado de uma caixa de presente bonita.' : ''}
Fundo festivo mas elegante (dourado, branco, cores da marca).
Copy emocional sobre presentear, elementos de coracao ou brilho.
Formato: ${opts.aspect || '1:1'}. Alegre, premium, aspiracional.
    `.trim(),
  },
};

// ---------------------------------------------------------------------------
// UTIL: SEMAFORO DE CONCORRENCIA
// ---------------------------------------------------------------------------

/**
 * Cria um semaforo simples para limitar tarefas paralelas.
 * @param {number} max - Numero maximo de execucoes simultaneas
 * @returns {{ acquire: Function, release: Function }}
 */
function createSemaphore(max) {
  let running = 0;
  const queue = [];

  const acquire = () => new Promise((resolve) => {
    const tryAcquire = () => {
      if (running < max) {
        running++;
        resolve();
      } else {
        queue.push(tryAcquire);
      }
    };
    tryAcquire();
  });

  const release = () => {
    running--;
    if (queue.length > 0) {
      const next = queue.shift();
      next();
    }
  };

  return { acquire, release };
}

// ---------------------------------------------------------------------------
// UTIL: RETRY COM EXPONENTIAL BACKOFF
// ---------------------------------------------------------------------------

/**
 * Executa uma funcao com retry automatico e exponential backoff.
 * @param {Function} fn - Funcao async que pode lancar erro
 * @param {number} maxRetries - Numero de tentativas alem da primeira
 * @param {string} label - Label para logs
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxRetries, label) {
  const delays = [1000, 3000, 9000, 27000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      log.debug(`[withRetry] ${label} — tentativa ${attempt + 1}/${maxRetries + 1}`);
      return await fn();
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = delays[Math.min(attempt, delays.length - 1)];
        log.warn(`[withRetry] ${label} falhou (tentativa ${attempt + 1}): ${err.message}`);
        log.warn(`[withRetry] Aguardando ${delay / 1000}s antes de tentar novamente...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        log.error(`[withRetry] ${label} falhou apos ${maxRetries + 1} tentativas: ${err.message}`);
        throw err;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// UTIL: BUSCAR API KEY NO CREDENTIAL VAULT
// ---------------------------------------------------------------------------

/**
 * Busca GEMINI_API_KEY no credential vault.
 * @returns {string|null} API key ou null se nao encontrada
 */
function getApiKey() {
  log.debug('[getApiKey] Buscando GEMINI_API_KEY no credential vault...');

  try {
    const result = execSync(
      `node "${CREDENTIAL_CLI}" get GEMINI_API_KEY`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (result && result.length > 10) {
      log.debug('[getApiKey] API key obtida com sucesso do credential vault');
      return result;
    }
  } catch (err) {
    log.debug(`[getApiKey] Credential vault falhou: ${err.message}`);
  }

  // Fallback: variavel de ambiente
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey.length > 10) {
    log.debug('[getApiKey] API key obtida da variavel de ambiente GEMINI_API_KEY');
    return envKey;
  }

  return null;
}

// ---------------------------------------------------------------------------
// UTIL: VALIDACOES
// ---------------------------------------------------------------------------

/**
 * Verifica se `uv` esta instalado e acessivel.
 * @returns {boolean}
 */
function checkUvInstalled() {
  log.debug('[checkUvInstalled] Verificando instalacao do uv...');
  try {
    execSync('uv --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica se o script Python existe.
 * @returns {boolean}
 */
function checkScriptExists() {
  const exists = fs.existsSync(SCRIPT_PATH);
  log.debug(`[checkScriptExists] Script ${SCRIPT_PATH}: ${exists ? 'encontrado' : 'NAO encontrado'}`);
  return exists;
}

/**
 * Verifica se um arquivo de imagem existe.
 * @param {string} imagePath
 * @returns {boolean}
 */
function checkImageExists(imagePath) {
  if (!imagePath) return true;
  const resolved = path.resolve(imagePath);
  const exists = fs.existsSync(resolved);
  if (!exists) log.error(`[checkImageExists] Arquivo de imagem nao encontrado: ${resolved}`);
  return exists;
}

/**
 * Garante que o diretorio de saida existe, criando se necessario.
 * @param {string} outputPath
 */
function ensureOutputDir(outputPath) {
  const dir = path.extname(outputPath) ? path.dirname(outputPath) : outputPath;
  if (dir && !fs.existsSync(dir)) {
    log.debug(`[ensureOutputDir] Criando diretorio: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Valida aspect ratio fornecido.
 * @param {string} aspect
 * @returns {boolean}
 */
function validateAspect(aspect) {
  const valid = /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(aspect);
  if (!valid) log.error(`[validateAspect] Aspect ratio invalido: "${aspect}". Use formato como 4:5, 9:16, 1:1`);
  return valid;
}

/**
 * Valida resolucao fornecida.
 * @param {string} res
 * @returns {boolean}
 */
function validateResolution(res) {
  const valid = ['1K', '2K', '4K'].includes(res);
  if (!valid) log.error(`[validateResolution] Resolucao invalida: "${res}". Use: 1K, 2K, 4K`);
  return valid;
}

// ---------------------------------------------------------------------------
// CORE: EXECUCAO DO SCRIPT PYTHON
// ---------------------------------------------------------------------------

/**
 * Executa o script Python generate_image.py via `uv run`.
 * @param {Object} opts
 * @param {string}  opts.prompt       - Prompt ou instrucao
 * @param {string}  opts.output       - Caminho de saida do arquivo
 * @param {string}  opts.resolution   - 1K | 2K | 4K
 * @param {string}  [opts.inputImage] - Caminho da imagem de entrada (edicao)
 * @param {string}  opts.apiKey       - Gemini API key
 * @param {boolean} [opts.verbose]    - Mostrar stdout do Python
 * @returns {Promise<{ success: boolean, output: string, error?: string }>}
 */
function runGenerateScript(opts) {
  return new Promise((resolve, reject) => {
    const { prompt, output, resolution, inputImage, apiKey, verbose } = opts;

    log.debug(`[runGenerateScript] INICIO — output: ${output}, resolution: ${resolution}`);
    log.debug(`[runGenerateScript] Prompt: ${prompt.slice(0, 80)}...`);

    const args = [
      'run',
      SCRIPT_PATH,
      '--prompt', prompt,
      '--filename', path.resolve(output),
      '--resolution', resolution || '1K',
      '--api-key', apiKey,
    ];

    if (inputImage) {
      args.push('--input-image', path.resolve(inputImage));
      log.debug(`[runGenerateScript] Modo edicao — input: ${inputImage}`);
    }

    log.debug(`[runGenerateScript] Executando: uv ${args.slice(0, 3).join(' ')} [script] ...`);

    const proc = spawn('uv', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GEMINI_API_KEY: apiKey },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      if (verbose) process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      if (verbose) process.stderr.write(data);
    });

    proc.on('close', (code) => {
      log.debug(`[runGenerateScript] Processo encerrado com codigo: ${code}`);
      if (code === 0) {
        resolve({ success: true, output: stdout + stderr });
      } else {
        const errMsg = stderr || stdout || `Processo encerrou com codigo ${code}`;
        reject(new Error(errMsg.trim()));
      }
    });

    proc.on('error', (err) => {
      log.error(`[runGenerateScript] Falha ao iniciar processo: ${err.message}`);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// PARSERS DE ARGUMENTOS
// ---------------------------------------------------------------------------

/**
 * Parser minimalista de argumentos CLI sem dependencias externas.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Object} flags e positionals
 */
function parseArgs(argv) {
  const result = {
    command: null,
    flags: {},
    positionals: [],
  };

  // Primeiro token nao-flag e o comando
  let i = 0;
  if (argv[0] && !argv[0].startsWith('-')) {
    result.command = argv[0];
    i = 1;
  }

  const aliasMap = {
    '-p': '--prompt',
    '-o': '--output',
    '-r': '--resolution',
    '-a': '--aspect',
    '-i': '--input',
    '-m': '--model',
    '-j': '--parallel',
    '-f': '--file',
    '-v': '--verbose',
  };

  while (i < argv.length) {
    let token = argv[i];

    // Expandir alias
    if (aliasMap[token]) token = aliasMap[token];

    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];

      if (!next || next.startsWith('-')) {
        // Flag booleana
        result.flags[key] = true;
      } else {
        result.flags[key] = next;
        i++;
      }
    } else if (!token.startsWith('-')) {
      result.positionals.push(token);
    }

    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// VALIDACAO DE PRE-REQUISITOS
// ---------------------------------------------------------------------------

/**
 * Valida todos os pre-requisitos antes de executar.
 * @returns {{ ok: boolean, apiKey: string|null }}
 */
function validatePrerequisites() {
  log.debug('[validatePrerequisites] INICIO');

  if (!checkUvInstalled()) {
    log.error('`uv` nao esta instalado ou nao esta no PATH.');
    log.error('Instale em: https://docs.astral.sh/uv/getting-started/installation/');
    return { ok: false, apiKey: null };
  }
  log.debug('[validatePrerequisites] uv: OK');

  if (!checkScriptExists()) {
    log.error(`Script Python nao encontrado em: ${SCRIPT_PATH}`);
    log.error('Certifique-se de que o skill nano-banana-pro esta instalado.');
    return { ok: false, apiKey: null };
  }
  log.debug('[validatePrerequisites] Script Python: OK');

  const apiKey = getApiKey();
  if (!apiKey) {
    log.error('GEMINI_API_KEY nao encontrada.');
    log.error('Configure via:');
    log.error('  1. Credential vault: node credential-cli.js set GEMINI_API_KEY <key>');
    log.error('  2. Variavel de ambiente: export GEMINI_API_KEY=<key>');
    return { ok: false, apiKey: null };
  }
  log.debug('[validatePrerequisites] API key: OK');

  return { ok: true, apiKey };
}

// ---------------------------------------------------------------------------
// COMANDO: generate
// ---------------------------------------------------------------------------

/**
 * Gera uma unica imagem a partir de um prompt texto.
 * @param {Object} flags
 * @param {string} apiKey
 */
async function cmdGenerate(flags, apiKey) {
  log.info('[cmdGenerate] INICIO');
  log.debug(`[cmdGenerate] Flags: ${JSON.stringify({ ...flags, apiKey: '[REDACTED]' })}`);

  const prompt = flags.prompt;
  const output = flags.output || `output-${Date.now()}.png`;
  const resolution = (flags.resolution || '1K').toUpperCase();
  const retry = parseInt(flags.retry ?? 2, 10);
  const dryRun = flags['dry-run'] === true;

  if (!prompt) {
    log.error('--prompt (-p) e obrigatorio para o comando generate');
    process.exit(1);
  }

  if (!validateResolution(resolution)) process.exit(1);

  ensureOutputDir(output);

  log.info(`Gerando imagem...`);
  log.info(`  Prompt:     ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}`);
  log.info(`  Saida:      ${path.resolve(output)}`);
  log.info(`  Resolucao:  ${resolution}`);
  log.info(`  Tentativas: ${retry + 1}`);

  if (dryRun) {
    log.warn('[DRY-RUN] Nenhuma imagem sera gerada.');
    return;
  }

  await withRetry(
    () => runGenerateScript({ prompt, output, resolution, apiKey, verbose: verboseMode }),
    retry,
    'generate'
  );

  log.success(`Imagem gerada com sucesso: ${path.resolve(output)}`);
  log.info('[cmdGenerate] FIM');
}

// ---------------------------------------------------------------------------
// COMANDO: edit
// ---------------------------------------------------------------------------

/**
 * Edita uma imagem existente com base em instrucao de texto.
 * @param {Object} flags
 * @param {string} apiKey
 */
async function cmdEdit(flags, apiKey) {
  log.info('[cmdEdit] INICIO');

  const prompt = flags.prompt;
  const inputImage = flags.input;
  const output = flags.output || `editado-${Date.now()}.png`;
  const resolution = (flags.resolution || '1K').toUpperCase();
  const retry = parseInt(flags.retry ?? 2, 10);
  const dryRun = flags['dry-run'] === true;

  if (!prompt) {
    log.error('--prompt (-p) e obrigatorio para o comando edit');
    process.exit(1);
  }
  if (!inputImage) {
    log.error('--input (-i) e obrigatorio para o comando edit (caminho da imagem original)');
    process.exit(1);
  }

  if (!validateResolution(resolution)) process.exit(1);
  if (!checkImageExists(inputImage)) process.exit(1);

  ensureOutputDir(output);

  log.info(`Editando imagem...`);
  log.info(`  Entrada:    ${path.resolve(inputImage)}`);
  log.info(`  Instrucao:  ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}`);
  log.info(`  Saida:      ${path.resolve(output)}`);
  log.info(`  Resolucao:  ${resolution}`);

  if (dryRun) {
    log.warn('[DRY-RUN] Nenhuma imagem sera editada.');
    return;
  }

  await withRetry(
    () => runGenerateScript({ prompt, output, resolution, inputImage, apiKey, verbose: verboseMode }),
    retry,
    'edit'
  );

  log.success(`Imagem editada com sucesso: ${path.resolve(output)}`);
  log.info('[cmdEdit] FIM');
}

// ---------------------------------------------------------------------------
// COMANDO: batch
// ---------------------------------------------------------------------------

/**
 * Processa multiplos jobs de geracao em paralelo.
 * @param {Object} flags
 * @param {string} apiKey
 */
async function cmdBatch(flags, apiKey) {
  log.info('[cmdBatch] INICIO');
  log.debug(`[cmdBatch] Flags: ${JSON.stringify({ ...flags, apiKey: '[REDACTED]' })}`);

  const outputDir = flags.output || './batch-output/';
  const parallel = parseInt(flags.parallel ?? 3, 10);
  const resolution = (flags.resolution || '1K').toUpperCase();
  const retry = parseInt(flags.retry ?? 2, 10);
  const dryRun = flags['dry-run'] === true;

  if (!validateResolution(resolution)) process.exit(1);

  // Coletar jobs: de arquivo JSON ou de --prompts inline
  let jobs = [];

  if (flags.file) {
    // Carregar de arquivo JSON
    const filePath = path.resolve(flags.file);
    if (!fs.existsSync(filePath)) {
      log.error(`Arquivo de jobs nao encontrado: ${filePath}`);
      process.exit(1);
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      jobs = JSON.parse(raw);
      log.info(`[cmdBatch] Carregados ${jobs.length} jobs de: ${filePath}`);
    } catch (err) {
      log.error(`[cmdBatch] Erro ao parsear JSON: ${err.message}`);
      process.exit(1);
    }
  } else if (flags.prompts) {
    // Prompts inline separados por |
    const prompts = flags.prompts.split('|').map((p) => p.trim()).filter(Boolean);
    jobs = prompts.map((prompt, idx) => ({
      prompt,
      filename: `batch-${String(idx + 1).padStart(3, '0')}.png`,
      resolution,
    }));
    log.info(`[cmdBatch] ${jobs.length} jobs criados de --prompts inline`);
  } else {
    log.error('Batch requer --file <jobs.json> ou --prompts "p1|p2|p3"');
    process.exit(1);
  }

  if (jobs.length === 0) {
    log.warn('[cmdBatch] Nenhum job para processar.');
    return;
  }

  ensureOutputDir(outputDir);

  log.info(`Iniciando batch processing...`);
  log.info(`  Total jobs:  ${jobs.length}`);
  log.info(`  Paralelo:    ${parallel}`);
  log.info(`  Resolucao:   ${resolution}`);
  log.info(`  Output:      ${path.resolve(outputDir)}`);
  log.blank();

  if (dryRun) {
    log.warn('[DRY-RUN] Jobs que seriam executados:');
    jobs.forEach((j, i) => log.info(`  [${i + 1}] ${j.filename}: ${(j.prompt || '').slice(0, 50)}...`));
    return;
  }

  const semaphore = createSemaphore(parallel);
  let completed = 0;
  let failed = 0;
  const errors = [];
  const startTime = Date.now();

  const tasks = jobs.map((job, idx) => async () => {
    await semaphore.acquire();
    const label = job.filename || `job-${idx + 1}`;
    const outputPath = path.join(path.resolve(outputDir), job.filename || `batch-${String(idx + 1).padStart(3, '0')}.png`);

    log.step(idx + 1, jobs.length, `Iniciando: ${label}`);

    try {
      await withRetry(
        () => runGenerateScript({
          prompt: job.prompt,
          output: outputPath,
          resolution: (job.resolution || resolution).toUpperCase(),
          inputImage: job.input_image,
          apiKey,
          verbose: verboseMode,
        }),
        retry,
        label
      );
      completed++;
      log.success(`[${completed + failed}/${jobs.length}] Concluido: ${label}`);
    } catch (err) {
      failed++;
      errors.push({ job: label, error: err.message });
      log.error(`[${completed + failed}/${jobs.length}] Falhou: ${label} — ${err.message}`);
    } finally {
      semaphore.release();
    }
  });

  await Promise.allSettled(tasks.map((t) => t()));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  log.blank();
  log.info('=== BATCH CONCLUIDO ===');
  log.info(`  Sucesso:   ${completed}/${jobs.length}`);
  log.info(`  Falhas:    ${failed}/${jobs.length}`);
  log.info(`  Tempo:     ${elapsed}s`);
  log.info(`  Output:    ${path.resolve(outputDir)}`);

  if (errors.length > 0) {
    log.blank();
    log.warn('Jobs que falharam:');
    errors.forEach((e) => log.warn(`  - ${e.job}: ${e.error}`));
  }

  log.info('[cmdBatch] FIM');
}

// ---------------------------------------------------------------------------
// COMANDO: ads
// ---------------------------------------------------------------------------

/**
 * Gera criativos para Meta Ads usando presets otimizados.
 * @param {Object} flags
 * @param {string} apiKey
 */
async function cmdAds(flags, apiKey) {
  log.info('[cmdAds] INICIO');
  log.debug(`[cmdAds] Flags: ${JSON.stringify({ ...flags, apiKey: '[REDACTED]' })}`);

  const presetName = flags.preset;
  const outputDir = flags.output || './criativos-ads/';
  const brand = flags.brand || 'Brand';
  const colors = flags.colors || '#000000, #FFFFFF';
  const text = flags.text;
  const productImage = flags['product-image'];
  const parallel = parseInt(flags.parallel ?? 3, 10);
  const retry = parseInt(flags.retry ?? 2, 10);
  const dryRun = flags['dry-run'] === true;
  const count = parseInt(flags.count ?? 1, 10);

  // Formatos solicitados (separados por virgula)
  const formatsRaw = flags.formats
    ? flags.formats.split(',').map((f) => f.trim())
    : null;

  if (!presetName) {
    log.error('--preset e obrigatorio para o comando ads');
    log.error('Execute `node nano-banana-cli.js presets` para ver opcoes disponíveis');
    process.exit(1);
  }

  // Verificar se o preset existe
  const isFullCampaign = presetName === 'full-campaign';
  const presetsToRun = isFullCampaign
    ? Object.keys(AD_PRESETS)
    : [presetName];

  for (const p of presetsToRun) {
    if (!AD_PRESETS[p]) {
      log.error(`Preset desconhecido: "${p}"`);
      log.error('Presets disponíveis: ' + Object.keys(AD_PRESETS).join(', '));
      process.exit(1);
    }
  }

  if (productImage && !checkImageExists(productImage)) process.exit(1);

  ensureOutputDir(outputDir);

  // Construir lista de jobs
  const jobs = [];

  for (const pName of presetsToRun) {
    const preset = AD_PRESETS[pName];
    const aspects = formatsRaw || preset.aspectRatios;
    const jobCount = isFullCampaign ? Math.max(1, Math.floor(count / presetsToRun.length)) : count;

    for (const aspect of aspects) {
      for (let i = 0; i < jobCount; i++) {
        const promptOpts = { brand, colors, text, aspect, productImage };
        const prompt = preset.promptTemplate(promptOpts);
        const suffix = jobCount > 1 ? `-v${i + 1}` : '';
        const aspectSlug = aspect.replace(':', 'x').replace('.', '_');
        const filename = `${pName}-${aspectSlug}${suffix}.png`;

        jobs.push({
          preset: pName,
          aspect,
          filename,
          prompt,
          outputPath: path.join(path.resolve(outputDir), filename),
          inputImage: productImage,
        });
      }
    }
  }

  log.info(`Gerando criativos Meta Ads...`);
  log.info(`  Preset:     ${isFullCampaign ? 'full-campaign (todos os 10 presets)' : presetName}`);
  log.info(`  Brand:      ${brand}`);
  log.info(`  Cores:      ${colors}`);
  log.info(`  Formatos:   ${formatsRaw ? formatsRaw.join(', ') : 'padrao do preset'}`);
  log.info(`  Total:      ${jobs.length} criativos`);
  log.info(`  Paralelo:   ${parallel}`);
  log.info(`  Output:     ${path.resolve(outputDir)}`);
  log.blank();

  if (dryRun) {
    log.warn('[DRY-RUN] Criativos que seriam gerados:');
    jobs.forEach((j, i) => {
      log.info(`  [${i + 1}] ${j.filename}`);
      log.debug(`       Prompt: ${j.prompt.slice(0, 80)}...`);
    });
    return;
  }

  const semaphore = createSemaphore(parallel);
  let completed = 0;
  let failed = 0;
  const errors = [];
  const startTime = Date.now();

  const tasks = jobs.map((job, idx) => async () => {
    await semaphore.acquire();

    log.step(idx + 1, jobs.length, `[${job.preset}] ${job.filename}`);

    try {
      await withRetry(
        () => runGenerateScript({
          prompt: job.prompt,
          output: job.outputPath,
          resolution: (flags.resolution || '1K').toUpperCase(),
          inputImage: job.inputImage,
          apiKey,
          verbose: verboseMode,
        }),
        retry,
        job.filename
      );
      completed++;
      log.success(`[${completed + failed}/${jobs.length}] ${job.filename}`);
    } catch (err) {
      failed++;
      errors.push({ job: job.filename, error: err.message });
      log.error(`[${completed + failed}/${jobs.length}] FALHOU: ${job.filename} — ${err.message}`);
    } finally {
      semaphore.release();
    }
  });

  await Promise.allSettled(tasks.map((t) => t()));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  log.blank();
  log.info('=== ADS CAMPAIGN CONCLUIDA ===');
  log.info(`  Sucesso:  ${completed}/${jobs.length} criativos`);
  log.info(`  Falhas:   ${failed}/${jobs.length}`);
  log.info(`  Tempo:    ${elapsed}s`);
  log.info(`  Output:   ${path.resolve(outputDir)}`);

  if (errors.length > 0) {
    log.blank();
    log.warn('Criativos que falharam:');
    errors.forEach((e) => log.warn(`  - ${e.job}: ${e.error}`));
  }

  // Gerar sumario de arquivos gerados
  const generated = jobs
    .filter((j) => fs.existsSync(j.outputPath))
    .map((j) => j.outputPath);

  if (generated.length > 0) {
    log.blank();
    log.info('Arquivos gerados:');
    generated.forEach((f) => log.info(`  ${f}`));
  }

  log.info('[cmdAds] FIM');
}

// ---------------------------------------------------------------------------
// COMANDO: presets
// ---------------------------------------------------------------------------

/**
 * Lista todos os presets de ads disponíveis com detalhes.
 */
function cmdPresets() {
  console.log('');
  console.log('PRESETS DISPONIVEIS — Meta Ads');
  console.log('=' .repeat(60));
  console.log('');

  Object.entries(AD_PRESETS).forEach(([key, preset]) => {
    console.log(`  ${key.padEnd(20)} ${preset.name}`);
    console.log(`  ${''.padEnd(20)} ${preset.description}`);
    console.log(`  ${''.padEnd(20)} Formatos padrao: ${preset.aspectRatios.join(', ')}`);
    console.log('');
  });

  console.log('  full-campaign        Gera criativos para TODOS os 10 presets acima');
  console.log('                       Usa --count para dividir entre presets');
  console.log('');
  console.log('Uso:');
  console.log('  node nano-banana-cli.js ads --preset product-hero \\');
  console.log('    --brand "MinhaLoja" --colors "#FF6B35,#000000" \\');
  console.log('    --product-image produto.png --text "COMPRE AGORA" \\');
  console.log('    --formats "4:5,1:1" -o ./criativos/');
  console.log('');
  console.log('  node nano-banana-cli.js ads --preset full-campaign \\');
  console.log('    --brand "MinhaLoja" --colors "#FF6B35,#000000" \\');
  console.log('    --product-image produto.png --count 20 -o ./campaign/');
  console.log('');
}

// ---------------------------------------------------------------------------
// COMANDO: help
// ---------------------------------------------------------------------------

/**
 * Exibe ajuda geral ou de um comando especifico.
 * @param {string|null} subcommand
 */
function cmdHelp(subcommand) {
  const helps = {
    generate: `
COMANDO: generate
  Gera uma imagem a partir de um prompt de texto.

OPCOES:
  --prompt, -p    (obrigatorio) Descricao da imagem a gerar
  --output, -o    Arquivo de saida (default: output-<timestamp>.png)
  --resolution,-r Resolucao: 1K (default), 2K, 4K
  --retry         Tentativas em caso de erro (default: 2)
  --verbose, -v   Logs detalhados
  --dry-run       Simula sem gerar

EXEMPLOS:
  node nano-banana-cli.js generate -p "foto de produto em fundo branco" -o "produto.png"
  node nano-banana-cli.js generate -p "paisagem futurista" -o "cidade.png" -r 4K
  node nano-banana-cli.js generate -p "logo minimalista" -o "logo.png" -r 2K --retry 3
`,
    edit: `
COMANDO: edit
  Edita uma imagem existente com base em instrucao de texto.

OPCOES:
  --prompt, -p    (obrigatorio) Instrucao de edicao
  --input, -i     (obrigatorio) Imagem de entrada
  --output, -o    Arquivo de saida (default: editado-<timestamp>.png)
  --resolution,-r Resolucao: 1K (auto-detecta da entrada), 2K, 4K
  --retry         Tentativas (default: 2)
  --verbose, -v   Logs detalhados
  --dry-run       Simula sem editar

EXEMPLOS:
  node nano-banana-cli.js edit -i original.png -p "mude o fundo para branco" -o resultado.png
  node nano-banana-cli.js edit -i foto.png -p "converta para estilo aquarela" -o aquarela.png -r 2K
`,
    batch: `
COMANDO: batch
  Processa multiplas geracoes/edicoes em paralelo.

OPCOES:
  --file, -f      Arquivo JSON com lista de jobs
  --prompts       Prompts separados por | (alternativa ao --file)
  --output, -o    Pasta de saida (default: ./batch-output/)
  --resolution,-r Resolucao padrao para todos os jobs (default: 1K)
  --parallel, -j  Maximo de jobs simultaneos (default: 3)
  --retry         Tentativas por job (default: 2)
  --verbose, -v   Logs detalhados
  --dry-run       Lista jobs sem executar

FORMATO jobs.json:
  [
    { "prompt": "...", "filename": "img1.png", "resolution": "2K" },
    { "prompt": "...", "filename": "img2.png", "input_image": "base.png" }
  ]

EXEMPLOS:
  node nano-banana-cli.js batch -f jobs.json -o ./output/ -j 5
  node nano-banana-cli.js batch --prompts "cachorro|gato|passaro" -o ./animais/ -r 2K
  node nano-banana-cli.js batch -f jobs.json --dry-run
`,
    ads: `
COMANDO: ads
  Gera criativos otimizados para Meta Ads usando presets.

OPCOES:
  --preset        (obrigatorio) Nome do preset (ver: node nano-banana-cli.js presets)
  --brand         Nome da marca (default: Brand)
  --colors        Cores da marca em hex (default: #000000, #FFFFFF)
  --product-image Imagem do produto para incorporar no criativo
  --text          Texto customizado (headline, CTA, citacao, etc.)
  --formats       Aspect ratios separados por virgula: "4:5,9:16,1:1"
  --count         Quantidade de variacoes por formato (default: 1)
  --output, -o    Pasta de saida (default: ./criativos-ads/)
  --resolution,-r Resolucao (default: 1K)
  --parallel, -j  Jobs simultaneos (default: 3)
  --retry         Tentativas por job (default: 2)
  --verbose, -v   Logs detalhados
  --dry-run       Lista criativos sem gerar

PRESETS DISPONIVEIS:
  product-hero, lifestyle, before-after, testimonial, flash-sale,
  features, comparison, social-proof, retargeting, gift, full-campaign

EXEMPLOS:
  node nano-banana-cli.js ads --preset product-hero \\
    --brand "ThermaFlex" --colors "#1B6B4A,#D4A853" \\
    --product-image produto.png --text "MOVE WITHOUT LIMITS" \\
    --formats "4:5,1:1" -o ./criativos/

  node nano-banana-cli.js ads --preset full-campaign \\
    --brand "MinhaLoja" --colors "#FF0000,#000000" \\
    --product-image produto.png --count 20 -o ./campaign/
`,
  };

  if (subcommand && helps[subcommand]) {
    console.log(helps[subcommand]);
    return;
  }

  console.log(`
nano-banana-cli v${VERSION}
CLI para geracao e edicao de imagens com Nano Banana Pro (Google Gemini Image Generation)

USO:
  node nano-banana-cli.js <comando> [opcoes]

COMANDOS:
  generate    Gerar imagem a partir de texto
  edit        Editar imagem existente com instrucao
  batch       Processar multiplas imagens em paralelo
  ads         Gerar criativos para Meta Ads com presets
  presets     Listar presets de ads disponíveis
  help        Mostrar esta ajuda (help <comando> para detalhes)

OPCOES GLOBAIS:
  --verbose, -v   Ativar logs detalhados
  --dry-run       Simular sem executar

EXEMPLOS RAPIDOS:
  # Gerar imagem simples
  node nano-banana-cli.js generate -p "produto em fundo branco" -o out.png

  # Editar imagem
  node nano-banana-cli.js edit -i foto.png -p "remova o fundo" -o sem-fundo.png

  # Batch com arquivo
  node nano-banana-cli.js batch -f jobs.json -o ./output/ -j 5

  # Criativos ads (preset unico)
  node nano-banana-cli.js ads --preset product-hero --brand "Marca" \\
    --product-image produto.png -o ./criativos/

  # Campanha completa (todos os presets)
  node nano-banana-cli.js ads --preset full-campaign --brand "Marca" \\
    --colors "#FF0000,#000" --product-image produto.png --count 20 -o ./campaign/

  # Ver presets disponíveis
  node nano-banana-cli.js presets

  # Ajuda de comando especifico
  node nano-banana-cli.js help ads

PRE-REQUISITOS:
  1. uv instalado: https://docs.astral.sh/uv/getting-started/installation/
  2. GEMINI_API_KEY no credential vault ou variavel de ambiente
  3. Script Python em: ${SCRIPT_PATH}
`);
}

// ---------------------------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    cmdHelp(null);
    process.exit(0);
  }

  const parsed = parseArgs(argv);

  // Ativar modo verbose global
  if (parsed.flags.verbose === true) {
    verboseMode = true;
    log.debug('[main] Modo verbose ativado');
  }

  const command = parsed.command || parsed.positionals[0];

  log.debug(`[main] Comando: ${command}`);
  log.debug(`[main] Flags: ${JSON.stringify({ ...parsed.flags, apiKey: '[REDACTED]' })}`);

  // Comandos que nao precisam de API key
  if (command === 'help') {
    const sub = parsed.positionals[0] !== 'help' ? parsed.positionals[0] : parsed.positionals[1];
    cmdHelp(sub || parsed.flags.command || null);
    return;
  }

  if (command === 'presets') {
    cmdPresets();
    return;
  }

  if (!command) {
    cmdHelp(null);
    process.exit(1);
  }

  // Validar pre-requisitos para comandos que usam a API
  const { ok, apiKey } = validatePrerequisites();
  if (!ok) {
    process.exit(1);
  }

  try {
    switch (command) {
      case 'generate':
        await cmdGenerate(parsed.flags, apiKey);
        break;
      case 'edit':
        await cmdEdit(parsed.flags, apiKey);
        break;
      case 'batch':
        await cmdBatch(parsed.flags, apiKey);
        break;
      case 'ads':
        await cmdAds(parsed.flags, apiKey);
        break;
      default:
        log.error(`Comando desconhecido: "${command}"`);
        log.error('Comandos validos: generate, edit, batch, ads, presets, help');
        process.exit(1);
    }
  } catch (err) {
    log.error(`[main] Erro fatal: ${err.message}`);
    log.debug(`[main] Stack: ${err.stack}`);
    process.exit(1);
  }
}

main();
