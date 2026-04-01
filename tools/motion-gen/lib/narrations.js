'use strict';
/**
 * motion-gen — Narrations
 * Gera MP3s via ElevenLabs em paralelo, normaliza (EBU R128) e mede durações
 */

const { spawnSync, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const http = require('https');

// ── Limite de concorrência ────────────────────────────────────────────────────
async function pMap(arr, fn, concurrency = 5) {
  const results = new Array(arr.length);
  let idx = 0;
  async function worker() {
    while (idx < arr.length) {
      const i = idx++;
      results[i] = await fn(arr[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Chamar ElevenLabs API ─────────────────────────────────────────────────────
function elevenLabsRequest(apiKey, voiceId, text, settings) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability:        settings.stability        ?? 0.75,
        similarity_boost: settings.similarity_boost ?? 0.85,
        style:            settings.style            ?? 0.10,
        use_speaker_boost: true,
      },
    });

    const opts = {
      hostname: 'api.elevenlabs.io',
      path:     `/v1/text-to-speech/${voiceId}`,
      method:   'POST',
      headers: {
        'xi-api-key':    apiKey,
        'Content-Type':  'application/json',
        'Accept':        'audio/mpeg',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
      },
    };

    const req = http.request(opts, (res) => {
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', (c) => err += c);
        res.on('end',  () => reject(new Error(`ElevenLabs ${res.statusCode}: ${err}`)));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.write(body, 'utf8');
    req.end();
  });
}

// ── Medir duração com ffprobe ─────────────────────────────────────────────────
function measureDuration(filePath) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe falhou: ${r.stderr}`);
  return parseFloat(r.stdout.trim());
}

// ── Normalizar um MP3 (EBU R128 + compressor + EQ) ───────────────────────────
/**
 * Pipeline robusto de normalização por arquivo:
 *  1. highpass 80Hz    — remove rumble/variação de graves entre takes
 *  2. lowpass 12kHz    — corta agudos inconsistentes
 *  3. acompressor      — comprime range dinâmico (threshold -18dB, ratio 4:1)
 *  4. loudnorm EBU R128 — normaliza para -16 LUFS (padrão voz broadcast)
 *  5. aresample 44100  — garante sample rate consistente
 */
function normalizeFile(inputFile, outputFile) {
  const filter = [
    'highpass=f=80:poles=2',
    'lowpass=f=12000:poles=2',
    'acompressor=threshold=-18dB:ratio=4:attack=5:release=100:makeup=2',
    'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=none',
    'aresample=44100',
  ].join(',');

  const r = spawnSync('ffmpeg', [
    '-y', '-i', inputFile,
    '-af', filter,
    '-ar', '44100', '-ac', '1',
    '-b:a', '192k',
    outputFile,
  ], { stdio: 'pipe' });

  return r.status === 0 && fs.existsSync(outputFile);
}

// ── Normalizar todas as narrações ─────────────────────────────────────────────
function normalizeNarrations(takes, outputDir) {
  console.log(`\n[normalize] Normalizando ${takes.length} narrações (EBU R128 + compressor + EQ)...`);

  let normalized = 0;
  for (const take of takes) {
    const raw  = path.join(outputDir, `${take.id}.mp3`);
    const norm = path.join(outputDir, `${take.id}_norm.mp3`);

    if (fs.existsSync(norm)) {
      console.log(`  [SKIP] ${take.id}_norm — já existe`);
      normalized++;
      continue;
    }

    if (normalizeFile(raw, norm)) {
      normalized++;
      console.log(`  [OK]   ${take.id} → normalizado`);
    } else {
      console.log(`  [WARN] ${take.id} — falha na normalização, copiando original`);
      fs.copyFileSync(raw, norm);
      normalized++;
    }
  }

  console.log(`[normalize] ${normalized}/${takes.length} concluídas`);
}

// ── Exportar ──────────────────────────────────────────────────────────────────
/**
 * Gera narrações via ElevenLabs, normaliza e retorna durações.
 *
 * @param {Array<{id: string, text: string, voice?: string}>} takes
 * @param {string} outputDir
 * @param {string} defaultVoice
 * @param {string} apiKey
 * @param {object} [settings]
 * @returns {Promise<{[id: string]: number}>}  id → duration (seconds)
 */
async function generateNarrations(takes, outputDir, defaultVoice, apiKey, settings = {}) {
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n[narrations] Gerando ${takes.length} narrações em paralelo...`);

  await pMap(takes, async (take) => {
    const outFile = path.join(outputDir, `${take.id}.mp3`);

    if (fs.existsSync(outFile)) {
      console.log(`  [SKIP] ${take.id} — já existe`);
      return;
    }

    const voice = take.voice || defaultVoice;
    process.stdout.write(`  [GEN]  ${take.id}: "${take.text.slice(0, 50)}..."\n`);

    const mp3 = await elevenLabsRequest(apiKey, voice, take.text, settings);
    fs.writeFileSync(outFile, mp3);
    console.log(`  [OK]   ${take.id} → ${(mp3.length / 1024).toFixed(0)} KB`);
  }, 5);

  // Normalizar todas as narrações (EBU R128 + compressor + EQ)
  normalizeNarrations(takes, outputDir);

  // Medir durações dos arquivos normalizados
  console.log('\n[narrations] Medindo durações (normalizadas)...');
  const durations = {};

  await pMap(takes, async (take) => {
    const normFile = path.join(outputDir, `${take.id}_norm.mp3`);
    durations[take.id] = measureDuration(normFile);
    console.log(`  ${take.id}: ${durations[take.id].toFixed(2)}s`);
  }, 8);

  const total = Object.values(durations).reduce((a, b) => a + b, 0);
  console.log(`\n[narrations] Total: ${total.toFixed(2)}s\n`);

  return durations;
}

module.exports = { generateNarrations, normalizeNarrations, normalizeFile, measureDuration };
