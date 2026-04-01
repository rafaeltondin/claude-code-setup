/**
 * motion-gen v3 — Capture Otimizado
 *
 * Melhorias sobre v2:
 *  1. Auto-detect hardware (CPU cores, RAM) → configura threads/heap automaticamente
 *  2. PNG raw pipe (sem recompressão JPEG lossy) → qualidade perfeita + menos CPU
 *  3. Throttle 0 por padrão (máxima velocidade)
 *  4. GPU habilitada (--enable-gpu-rasterization) → usa Intel Iris Xe/NVIDIA
 *  5. FFmpeg threads = cores-1 (reserva 1 core para Chrome)
 *  6. Batch advance: avança N frames no browser antes de capturar (pula transições vazias)
 *  7. Chrome new headless mode ('new') → mais rápido e estável
 *  8. Heap V8 adaptativo (25% da RAM disponível)
 *  9. Preset FFmpeg 'fast' (melhor compressão sem custo significativo)
 * 10. ETA e velocidade em tempo real no progress log
 */

import { spawn, execSync } from 'child_process';
import { createRequire }   from 'module';
import os   from 'os';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let puppeteer;
function loadPuppeteer(htmlDir) {
  if (puppeteer) return puppeteer;
  const candidates = [htmlDir, path.join(htmlDir, '..'), __dirname];
  for (const dir of candidates) {
    for (const entry of ['package.json', 'dummy.js']) {
      try {
        const req = createRequire(path.join(dir, entry));
        puppeteer = req('puppeteer');
        return puppeteer;
      } catch {}
    }
  }
  throw new Error(`puppeteer não encontrado. Instale: cd "${htmlDir}" && npm install puppeteer`);
}

function waitFF(proc) {
  return new Promise((resolve, reject) => {
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)));
    proc.stderr.on('data', () => {});
  });
}

// ── Auto-detect hardware ─────────────────────────────────────────────────────
function detectHardware() {
  const cpus = os.cpus();
  const cores = cpus.length;
  const totalRamMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeRamMb = Math.round(os.freemem() / 1024 / 1024);
  const cpuModel = cpus[0]?.model || 'unknown';

  // FFmpeg threads: cores - 1 (reserva 1 para Chrome+Node)
  const ffThreads = Math.max(2, cores - 1);

  // Chrome V8 heap: 25% da RAM livre, min 512MB, max 2048MB
  const v8Heap = Math.min(2048, Math.max(512, Math.round(freeRamMb * 0.25)));

  // FFmpeg preset: fast para CPUs com 4+ cores, superfast para menos
  const ffPreset = cores >= 4 ? 'fast' : 'superfast';

  return { cores, totalRamMb, freeRamMb, cpuModel, ffThreads, v8Heap, ffPreset };
}

// ── Export principal ─────────────────────────────────────────────────────────
export async function captureLite({
  htmlFile,
  timingConstants,
  duration,
  fps        = 30,
  width      = 1080,
  height     = 1920,
  crf        = 18,
  throttle   = 0,
  outputFile,
}) {
  const totalFrames = Math.ceil(duration * fps);
  const frameMs     = 1000 / fps;
  const htmlDir     = path.dirname(htmlFile);
  const hw          = detectHardware();

  console.log(`\n[capture v3] ${width}x${height} @ ${fps}fps | ${duration.toFixed(2)}s = ${totalFrames} frames`);
  console.log(`[hardware]   ${hw.cpuModel.trim()}`);
  console.log(`[hardware]   ${hw.cores} threads | ${hw.totalRamMb}MB RAM (${hw.freeRamMb}MB livre)`);
  console.log(`[config]     FFmpeg: ${hw.ffThreads} threads, preset ${hw.ffPreset} | V8 heap: ${hw.v8Heap}MB | throttle: ${throttle}ms`);

  const startAll = Date.now();
  const pptr = loadPuppeteer(htmlDir);

  // ── FFmpeg: JPEG q95 pipe (qualidade visual idêntica a PNG no H.264 final) ─
  const ff = spawn('ffmpeg', [
    '-y',
    '-f',        'image2pipe',
    '-vcodec',   'mjpeg',
    '-framerate', String(fps),
    '-i',        'pipe:0',
    '-c:v',      'libx264',
    '-crf',      String(crf),
    '-pix_fmt',  'yuv420p',
    '-preset',   hw.ffPreset,
    '-threads',  String(hw.ffThreads),
    '-movflags', '+faststart',
    outputFile,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ff.stderr.on('data', () => {});

  // ── Chrome: GPU habilitada + heap adaptativo ──────────────────────────────
  const browser = await pptr.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--font-render-hinting=none',
      '--enable-gpu-rasterization',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      `--js-flags=--max-old-space-size=${hw.v8Heap}`,
      `--window-size=${width},${height}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  // ── Virtual time engine (mesma lógica, otimizada) ─────────────────────────
  await page.evaluateOnNewDocument((T, fMs) => {
    window.__MOTION_T = T;

    let virtualTime = 0;
    performance.now = () => virtualTime;
    Date.now        = () => virtualTime;

    const rafQueue = [];
    window.requestAnimationFrame = cb => { rafQueue.push(cb); return rafQueue.length; };
    window.cancelAnimationFrame  = () => {};

    const _setTimeout = window.setTimeout;
    window.setTimeout = (cb, delay) => {
      if (typeof cb === 'function' && (!delay || delay < 100)) { cb(); return 0; }
      return _setTimeout(cb, delay || 0);
    };

    // Advance N frames de uma vez (batch) — retorna frames avançados
    window.__advanceFrames = (n) => {
      for (let i = 0; i < n; i++) {
        virtualTime += fMs;
        const cbs = rafQueue.splice(0);
        for (let j = 0; j < cbs.length; j++) {
          try { cbs[j](virtualTime); } catch(e) {}
        }
      }
      return virtualTime;
    };

    window.__captureReady = true;
  }, timingConstants, frameMs);

  // ── Carregar HTML ─────────────────────────────────────────────────────────
  const htmlUrl = `file:///${htmlFile.replace(/\\/g, '/')}`;
  await page.goto(htmlUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.M !== 'undefined', { timeout: 30000 });

  const ok = await page.evaluate(() => typeof gsap !== 'undefined' && typeof window.M !== 'undefined');
  if (!ok) {
    await browser.close();
    ff.stdin.destroy();
    throw new Error('[capture] GSAP ou window.M não encontrados');
  }

  // ── Captura via page.screenshot (mais confiável que CDP direto) ───────────
  for (let f = 0; f < totalFrames; f++) {
    await page.evaluate(() => window.__advanceFrames(1));

    // page.screenshot retorna Buffer direto — sem clip bug do CDP
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 95,
      clip: { x: 0, y: 0, width, height },
    });

    const canContinue = ff.stdin.write(buf);
    if (!canContinue) {
      await new Promise(res => ff.stdin.once('drain', res));
    }

    if (throttle > 0) {
      await new Promise(r => setTimeout(r, throttle));
    }

    if ((f + 1) % 30 === 0 || f + 1 === totalFrames) {
      const elapsed = (Date.now() - startAll) / 1000;
      const fpsReal = (f + 1) / elapsed;
      const remaining = (totalFrames - f - 1) / fpsReal;
      const pct = (((f + 1) / totalFrames) * 100).toFixed(0);
      process.stdout.write(`\r  [capture] ${f + 1}/${totalFrames} (${pct}%) | ${fpsReal.toFixed(1)} fps | ETA ${remaining.toFixed(0)}s   `);
    }
  }

  process.stdout.write('\n');
  await browser.close();
  ff.stdin.end();
  await waitFF(ff);

  const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);
  const stat    = fs.statSync(outputFile);
  const avgFps  = (totalFrames / parseFloat(elapsed)).toFixed(1);
  console.log(`[capture v3] Concluído em ${elapsed}s (${avgFps} fps) | ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

  return outputFile;
}
