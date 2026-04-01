#!/usr/bin/env node
'use strict';
/**
 * motion-gen v2 — Resource-Limited Pipeline
 *
 * Pipeline automático HTML → MP4 com narração e controle de recursos.
 *
 * Uso:
 *   node motion-gen.js <html-file> [opções]
 *
 * Opções:
 *   --output <file>         Saída MP4 (default: <nome-html>_v1.mp4 na mesma pasta)
 *   --workers <n>           Workers Puppeteer paralelos (default: 1)
 *   --crf <n>               Qualidade de vídeo, menor = melhor (default: 18)
 *   --fps <n>               Frames por segundo (default: 30)
 *   --padding <s>           Silêncio extra entre takes em segundos (default: 0)
 *   --skip-audio            Reutilizar MP3s existentes (não chamar ElevenLabs)
 *   --skip-capture          Reutilizar vídeo raw existente (pular Puppeteer)
 *   --cpu-limit <percent>   Limite de CPU em % (default: 15) — calcula throttle automaticamente
 *   --memory-limit <mb>     Limite de heap Node.js em MB (default: 3072)
 *   --throttle <ms>         Delay entre frames em ms (default: auto via cpu-limit)
 *   --quality <preset>      Preset de qualidade: low | medium | high | turbo
 *                             low    → crf=23, throttle=15ms
 *                             medium → crf=20, throttle=5ms
 *                             high   → crf=18, throttle=0ms
 *                             turbo  → crf=18, throttle=0ms (velocidade máxima)
 *
 * Contrato do HTML:
 *   1. Ter <script id="motion-config" type="application/json"> com:
 *      { "voice": "voice-id", "fps": 30, "width": 1080, "height": 1920,
 *        "crf": 18, "workers": 1,
 *        "takes": [{"id":"n01","text":"Texto da narração"},...]  }
 *
 *   2. Usar: const T = window.__MOTION_T || { t1s:0, t1e:5, ... fallback ... };
 *      motion-gen injeta window.__MOTION_T com os timings calculados.
 *      O fallback garante preview normal no browser sem a ferramenta.
 */

const fs   = require('fs');
const path = require('path');

// ── Quality presets ───────────────────────────────────────────────────────────
const QUALITY_PRESETS = {
  low:    { crf: 23, workers: 1, throttle: 15 },
  medium: { crf: 20, workers: 1, throttle: 5  },
  high:   { crf: 18, workers: 1, throttle: 0  },
  turbo:  { crf: 18, workers: 1, throttle: 0  },
};

// ── Parse de argumentos ───────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    workers:     1,
    crf:         18,
    fps:         30,
    padding:     0,
    skipAudio:   false,
    skipCapture: false,
    cpuLimit:    100,
    memoryLimit: 4096,
    throttle:    null,   // null = 0 (velocidade máxima)
    quality:     null,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args.htmlFile = a; continue; }
    const key = a.slice(2);
    const val = argv[i + 1];
    switch (key) {
      case 'output':        args.output       = val;                i++; break;
      case 'workers':       args.workers       = parseInt(val, 10); i++; break;
      case 'crf':           args.crf           = parseInt(val, 10); i++; break;
      case 'fps':           args.fps           = parseInt(val, 10); i++; break;
      case 'padding':       args.padding       = parseFloat(val);   i++; break;
      case 'skip-audio':    args.skipAudio     = true;                   break;
      case 'skip-capture':  args.skipCapture   = true;                   break;
      case 'cpu-limit':     args.cpuLimit      = parseFloat(val);   i++; break;
      case 'memory-limit':  args.memoryLimit   = parseInt(val, 10); i++; break;
      case 'throttle':      args.throttle      = parseInt(val, 10); i++; break;
      case 'quality':       args.quality       = val;               i++; break;
      default: console.warn(`[WARN] Opção desconhecida: ${a}`);
    }
  }

  return args;
}

// ── Aplicar quality preset (antes de usar os valores) ────────────────────────
function applyQualityPreset(args) {
  if (!args.quality) return args;

  const preset = QUALITY_PRESETS[args.quality];
  if (!preset) {
    console.warn(`[WARN] Quality preset desconhecido: "${args.quality}". Usando valores padrão.`);
    return args;
  }

  // Preset tem menor precedência que flags explícitos
  // Se o usuário não sobrescreveu, aplica o preset
  const orig = parseArgs(process.argv); // re-parse para saber o que foi explícito
  const explicitCrf     = process.argv.includes('--crf');
  const explicitWorkers = process.argv.includes('--workers');
  const explicitThrottle = process.argv.includes('--throttle');

  if (!explicitCrf)      args.crf     = preset.crf;
  if (!explicitWorkers)  args.workers  = preset.workers;
  if (!explicitThrottle) args.throttle = preset.throttle;

  return args;
}

// ── Calcular throttle automático via cpu-limit ────────────────────────────────
//
// Heurística: cpu-limit 15% → ~67ms por frame (1000/15)
// Escala linearmente: throttle = 1000 / cpuLimit (ms)
//
function calcThrottle(cpuLimit) {
  if (cpuLimit <= 0) return 0;
  if (cpuLimit >= 100) return 0;
  return Math.round(1000 / cpuLimit);
}

// ── Verificar e aplicar memory limit ─────────────────────────────────────────
function checkMemoryLimit(memoryLimitMb) {
  const v8 = require('v8');
  const heapStats = v8.getHeapStatistics();
  const heapLimitMb = Math.round(heapStats.heap_size_limit / 1024 / 1024);

  if (heapLimitMb < memoryLimitMb * 0.9) {
    // Heap atual menor que o desejado — precisaria reiniciar com --max-old-space-size
    console.warn(`[WARN] Heap atual: ${heapLimitMb} MB. Desejado: ${memoryLimitMb} MB.`);
    console.warn(`[WARN] Para aplicar o limite, reinicie com:`);
    console.warn(`[WARN]   node --max-old-space-size=${memoryLimitMb} motion-gen.js ...`);
  } else {
    console.log(`[memory] Heap disponível: ${heapLimitMb} MB (limite configurado: ${memoryLimitMb} MB)`);
  }
}

// ── Setar prioridade de processo para below normal (Windows) ──────────────────
function setLowPriority() {
  try {
    const { execSync } = require('child_process');
    execSync(
      `wmic process where processid="${process.pid}" CALL setpriority "below normal"`,
      { stdio: 'ignore' }
    );
    console.log(`[priority] Processo ${process.pid} → below normal (Windows)`);
  } catch (e) {
    // Silencioso: não crítico se falhar (Linux/Mac ou permissão insuficiente)
  }
}

// ── Ler config do HTML ────────────────────────────────────────────────────────
function readMotionConfig(htmlFile) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const m    = html.match(/<script[^>]+id=["']motion-config["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) {
    throw new Error(
      'HTML não possui <script id="motion-config" type="application/json">.\n' +
      'Adicione um bloco com { voice, takes: [{id, text}] }.'
    );
  }
  try {
    return JSON.parse(m[1].trim());
  } catch(e) {
    throw new Error(`motion-config JSON inválido: ${e.message}`);
  }
}

// ── Calcular T constants a partir das durações ────────────────────────────────
//
// ARQUITETURA v3: Áudio dirige a timeline. Visual tem overlap independente.
//
//   Áudio:  |==NAR1==|..gap..|==NAR2==|..gap..|==NAR3==|
//   Visual: |====TAKE1====|                              ← postRoll após áudio
//                    |====TAKE2====|                      ← preRoll antes do áudio
//                             |====TAKE3====|
//
// Propriedades por take no motion-config:
//   gap      — silêncio APÓS esta narração (default: 0.35s)
//   preRoll  — visual aparece N seg ANTES do áudio (default: 0.15s)
//   postRoll — visual permanece N seg APÓS o áudio (default: 0.25s)
//
// T constants gerados:
//   tNs  — início VISUAL (para GSAP)
//   tNe  — fim VISUAL (para GSAP)
//   aNs  — início ÁUDIO (para build.js posicionar a narração)
//
function calcTiming(takes, durations, padding = 0) {
  const T = {};
  let audioCursor = 0;

  for (let i = 0; i < takes.length; i++) {
    const take = takes[i];
    const dur = durations[take.id];
    if (dur === undefined) throw new Error(`Duração não encontrada para take ${take.id}`);

    const num = parseInt(take.id.replace(/\D/g, ''), 10);
    const isLast = (i === takes.length - 1);

    // Gap APÓS esta narração (pausa antes da próxima fala)
    const gap = take.gap !== undefined ? take.gap : 0.35;

    // preRoll: visual aparece antes do áudio começar
    const preRoll = take.preRoll !== undefined ? take.preRoll : 0.15;

    // postRoll: visual permanece após o áudio acabar
    const postRoll = take.postRoll !== undefined ? take.postRoll : 0.25;

    // Último take: padding extra para CTA respirar
    const lastPad = isLast ? 2.0 : 0;

    // ÁUDIO: posição sequencial, NUNCA sobrepõe
    T[`a${num}s`] = parseFloat(audioCursor.toFixed(4));

    // VISUAL: pode sobrepor com takes adjacentes
    T[`t${num}s`] = parseFloat(Math.max(0, audioCursor - preRoll).toFixed(4));
    T[`t${num}e`] = parseFloat((audioCursor + dur + postRoll + lastPad).toFixed(4));

    // Avançar cursor de áudio: duração da narração + gap
    audioCursor += dur + gap + padding;
  }

  // Total: último áudio + postRoll + lastPad
  const lastNum = parseInt(takes[takes.length - 1].id.replace(/\D/g, ''), 10);
  T.total = parseFloat(T[`t${lastNum}e`].toFixed(4));

  return T;
}

// ── Obter API key via credential vault ───────────────────────────────────────
function getElevenLabsKey() {
  try {
    const credCli = path.join(
      process.env.USERPROFILE || process.env.HOME,
      '.claude', 'task-scheduler', 'credential-cli.js'
    );
    const { execSync } = require('child_process');
    const out = execSync(`node "${credCli}" get ELEVENLABS_API_KEY`, { encoding: 'utf8' }).trim();
    // credential-cli retorna objeto JSON ou string direta
    try {
      const obj = JSON.parse(out);
      return obj.value || obj;
    } catch {
      return out;
    }
  } catch(e) {
    // Fallback: variável de ambiente
    if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
    throw new Error('ELEVENLABS_API_KEY não encontrada no vault nem em env vars.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let args = parseArgs(process.argv);

  if (!args.htmlFile) {
    console.error(
      'Uso: node motion-gen.js <html-file> [--output file] [--workers n]\n' +
      '       [--crf n] [--fps n] [--padding s] [--skip-audio] [--skip-capture]\n' +
      '       [--cpu-limit percent] [--memory-limit mb] [--throttle ms]\n' +
      '       [--quality low|medium|high]'
    );
    process.exit(1);
  }

  // Aplicar quality preset (menor precedência que flags explícitos)
  args = applyQualityPreset(args);

  // Throttle: 0 por padrão (velocidade máxima)
  if (args.throttle === null) {
    args.throttle = args.cpuLimit >= 100 ? 0 : calcThrottle(args.cpuLimit);
  }

  // Verificar memory limit
  checkMemoryLimit(args.memoryLimit);

  const htmlFile = path.resolve(args.htmlFile);
  if (!fs.existsSync(htmlFile)) {
    console.error(`[ERRO] Arquivo não encontrado: ${htmlFile}`);
    process.exit(1);
  }

  const startAll = Date.now();
  const workDir  = path.dirname(htmlFile);
  const baseName = path.basename(htmlFile, path.extname(htmlFile));
  const outputFile = args.output
    ? path.resolve(args.output)
    : path.join(workDir, `${baseName}_v1.mp4`);
  const rawVideo   = path.join(workDir, `${baseName}_raw.mp4`);

  console.log('='.repeat(64));
  console.log('  motion-gen v3 — Optimized Pipeline');
  console.log(`  HTML        : ${htmlFile}`);
  console.log(`  Saída       : ${outputFile}`);
  console.log(`  CPU limit   : ${args.cpuLimit}%`);
  console.log(`  Throttle    : ${args.throttle}ms entre frames`);
  console.log(`  Memory limit: ${args.memoryLimit} MB`);
  console.log(`  Quality     : ${args.quality || 'custom'}`);
  console.log('='.repeat(64));

  // ── [1] Ler config ──────────────────────────────────────────────────────
  const config = readMotionConfig(htmlFile);

  const voice   = config.voice   || 'vr6MVhO51WHYH7ev2Qn9'; // Onildo F R
  const fps     = args.fps    || config.fps     || 30;
  const width   = config.width  || 1080;
  const height  = config.height || 1920;
  const crf     = args.crf    || config.crf     || 18;
  const workers = args.workers || config.workers || 1;
  const takes   = config.takes;

  if (!takes || takes.length === 0) {
    throw new Error('motion-config.takes está vazio. Adicione os takes com {id, text}.');
  }

  console.log(`\n  Takes   : ${takes.length}`);
  console.log(`  Voz     : ${voice}`);
  console.log(`  FPS     : ${fps} | ${width}x${height} | CRF ${crf} | Workers: ${workers}`);

  // ── [2] Gerar narrações ─────────────────────────────────────────────────
  let durations = {};

  if (!args.skipAudio) {
    const apiKey = getElevenLabsKey();
    const { generateNarrations } = require('./lib/narrations.js');
    durations = await generateNarrations(takes, workDir, voice, apiKey, {
      stability:        config.voice_settings?.stability        ?? 0.75,
      similarity_boost: config.voice_settings?.similarity_boost ?? 0.85,
      style:            config.voice_settings?.style            ?? 0.10,
    });
  } else {
    console.log('\n[skip-audio] Reutilizando MP3s existentes');
    const { measureDuration, normalizeNarrations: normAll } = require('./lib/narrations.js');

    // Verificar se MP3s existem
    for (const take of takes) {
      const mp3 = path.join(workDir, `${take.id}.mp3`);
      if (!fs.existsSync(mp3)) {
        throw new Error(`MP3 não encontrado: ${mp3}. Remova --skip-audio para gerar.`);
      }
    }

    // Normalizar se _norm.mp3 não existem
    const needsNorm = takes.some(t => !fs.existsSync(path.join(workDir, `${t.id}_norm.mp3`)));
    if (needsNorm) normAll(takes, workDir);

    // Medir durações dos normalizados
    for (const take of takes) {
      const normFile = path.join(workDir, `${take.id}_norm.mp3`);
      durations[take.id] = measureDuration(normFile);
      console.log(`  ${take.id}: ${durations[take.id].toFixed(2)}s`);
    }
  }

  // ── [3] Calcular timings ────────────────────────────────────────────────
  const T = calcTiming(takes, durations, args.padding);
  const duration = T.total;

  console.log('\n[timing] T constants calculados (áudio → visual):');
  takes.forEach(t => {
    const num = parseInt(t.id.replace(/\D/g, ''), 10);
    const as = T[`a${num}s`] !== undefined ? T[`a${num}s`].toFixed(2) : '?';
    console.log(`  t${num}: visual ${T[`t${num}s`].toFixed(2)}s→${T[`t${num}e`].toFixed(2)}s | áudio ${as}s (${durations[t.id].toFixed(2)}s)`);
  });
  console.log(`  Total: ${duration.toFixed(2)}s`);

  // ── [4] Capturar vídeo ──────────────────────────────────────────────────
  if (!args.skipCapture) {
    const { captureLite } = await import('./lib/capture-lite.mjs');
    await captureLite({
      htmlFile,
      timingConstants: T,
      duration,
      fps, width, height, crf,
      workers,
      throttle: args.throttle,
      outputFile: rawVideo,
    });
  } else {
    console.log('\n[3/4] --skip-capture: reutilizando vídeo raw existente');
    if (!fs.existsSync(rawVideo)) {
      throw new Error(`Vídeo raw não encontrado: ${rawVideo}`);
    }
  }

  // ── [5] Build final (usar MP3s normalizados, com timing preciso) ────────
  const mp3Files = takes.map(t => {
    const norm = path.join(workDir, `${t.id}_norm.mp3`);
    const raw  = path.join(workDir, `${t.id}.mp3`);
    return fs.existsSync(norm) ? norm : raw;
  });
  const { buildFinal } = require('./lib/build.js');
  buildFinal(mp3Files, rawVideo, outputFile, args.padding, T, takes, durations);

  // Limpar raw após merge
  try { fs.unlinkSync(rawVideo); } catch(e) {}

  // ── Relatório ────────────────────────────────────────────────────────────
  const elapsed  = ((Date.now() - startAll) / 1000).toFixed(1);
  const fileStat = fs.statSync(outputFile);

  console.log('\n' + '='.repeat(64));
  console.log('  CONCLUÍDO!');
  console.log(`  Vídeo  : ${outputFile}`);
  console.log(`  Tamanho: ${(fileStat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Duração: ${duration.toFixed(2)}s`);
  console.log(`  Tempo  : ${elapsed}s total`);
  console.log('='.repeat(64));
}

main().catch(err => {
  console.error('\n[FATAL]', err.message || err);
  process.exit(1);
});
