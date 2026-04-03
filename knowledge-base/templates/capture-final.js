#!/usr/bin/env node
/**
 * capture-final.js — Frame-by-frame SEM injetar __MOTION_T
 *
 * Usa virtual time engine para 30fps perfeito,
 * mas NÃO injeta __MOTION_T — HTML usa fallback (valores reais já hardcoded).
 * Isso evita o bug de frames pretos nos takes finais.
 */

const { createRequire } = require('module');
const req = createRequire(require('path').join(process.cwd(), 'package.json'));
const puppeteer = req('puppeteer');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function main() {
  const args = process.argv.slice(2);
  let htmlFile = null, duration = null, outputFile = null, fps = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration') duration = parseFloat(args[++i]);
    else if (args[i] === '--output') outputFile = args[++i];
    else if (args[i] === '--fps') fps = parseInt(args[++i]);
    else if (!args[i].startsWith('--')) htmlFile = args[i];
  }

  if (!htmlFile) { console.error('Uso: node capture-final.js <html> [--duration s] [--output mp4]'); process.exit(1); }

  htmlFile = path.resolve(htmlFile);
  const workDir = path.dirname(htmlFile);
  const baseName = path.basename(htmlFile, path.extname(htmlFile));
  const html = fs.readFileSync(htmlFile, 'utf8');

  if (!duration) { const m = html.match(/total:\s*([\d.]+)/); duration = m ? parseFloat(m[1]) : 60; }

  outputFile = outputFile ? path.resolve(outputFile) : path.join(workDir, `${baseName}_final.mp4`);
  const rawVideo = path.join(workDir, `${baseName}_raw_final.mp4`);
  const totalFrames = Math.ceil(duration * fps);
  const frameMs = 1000 / fps;
  const cores = os.cpus().length;

  console.log('='.repeat(60));
  console.log('  Frame-by-Frame Capture (sem __MOTION_T)');
  console.log(`  ${path.basename(htmlFile)} | ${duration}s @ ${fps}fps = ${totalFrames} frames`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  // ── FFmpeg ──────────────────────────────────────────────────────────
  const ff = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg',
    '-framerate', String(fps), '-i', 'pipe:0',
    '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-preset', 'fast', '-threads', String(Math.max(2, cores - 1)),
    '-movflags', '+faststart', rawVideo,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  ff.stderr.on('data', () => {});

  // ── Browser ─────────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-web-security', '--disable-gpu',
           '--disable-dev-shm-usage', '--disable-extensions'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  // Virtual time engine SEM __MOTION_T (HTML usa fallback)
  await page.evaluateOnNewDocument((fMs) => {
    // NÃO injeta window.__MOTION_T — HTML usará o fallback hardcoded

    let virtualTime = 0;
    performance.now = () => virtualTime;
    Date.now = () => virtualTime;

    const rafQueue = [];
    window.requestAnimationFrame = cb => { rafQueue.push(cb); return rafQueue.length; };
    window.cancelAnimationFrame = () => {};

    const _setTimeout = window.setTimeout;
    window.setTimeout = (cb, delay) => {
      if (typeof cb === 'function' && (!delay || delay < 100)) { cb(); return 0; }
      return _setTimeout(cb, delay || 0);
    };

    window.__advanceFrame = () => {
      virtualTime += fMs;
      const cbs = rafQueue.splice(0);
      for (let i = 0; i < cbs.length; i++) { try { cbs[i](virtualTime); } catch(e) {} }
    };
  }, frameMs);

  // ── HTML ─────────────────────────────────────────────────────────────
  console.log('\nCarregando HTML...');
  await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.M !== 'undefined', { timeout: 15000 });
  console.log('GSAP pronto. Capturando...\n');

  // Ler T values do HTML para saber quando forçar takes
  const tMatch = html.match(/total:\s*([\d.]+)/);
  const htmlTotal = tMatch ? parseFloat(tMatch[1]) : duration;

  // ── Captura multi-segmento (reinicia browser a cada ~10s para evitar degradação) ──
  const SEGMENT_FRAMES = 300; // ~10s por segmento — browser fresco a cada 10s
  const segments = [];
  for (let start = 0; start < totalFrames; start += SEGMENT_FRAMES) {
    segments.push({ start, end: Math.min(start + SEGMENT_FRAMES, totalFrames) });
  }

  console.log(`  ${segments.length} segmentos de ~${SEGMENT_FRAMES} frames\n`);

  const chromeArgs = ['--no-sandbox', '--disable-web-security', '--disable-gpu',
                      '--disable-dev-shm-usage', '--disable-extensions'];
  const vtCode = (fMs) => {
    let virtualTime = 0;
    performance.now = () => virtualTime;
    Date.now = () => virtualTime;
    const rafQueue = [];
    window.requestAnimationFrame = cb => { rafQueue.push(cb); return rafQueue.length; };
    window.cancelAnimationFrame = () => {};
    const _setTimeout = window.setTimeout;
    window.setTimeout = (cb, delay) => {
      if (typeof cb === 'function' && (!delay || delay < 100)) { cb(); return 0; }
      return _setTimeout(cb, delay || 0);
    };
    window.__advanceFrame = () => {
      virtualTime += fMs;
      const cbs = rafQueue.splice(0);
      for (let i = 0; i < cbs.length; i++) { try { cbs[i](virtualTime); } catch(e) {} }
    };
  };

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    const segBrowser = await puppeteer.launch({ headless: true, args: chromeArgs });
    const segPage = await segBrowser.newPage();
    await segPage.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await segPage.evaluateOnNewDocument(vtCode, frameMs);
    await segPage.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await segPage.evaluate(() => document.fonts.ready);
    await segPage.waitForFunction(() => typeof window.M !== 'undefined', { timeout: 15000 });

    // Seek rápido até o início do segmento
    if (seg.start > 0) {
      await segPage.evaluate((n) => { for (let i = 0; i < n; i++) window.__advanceFrame(); }, seg.start);
    }

    // Capturar frames do segmento
    for (let f = seg.start; f < seg.end; f++) {
      await segPage.evaluate(() => window.__advanceFrame());
      const buf = await segPage.screenshot({ type: 'jpeg', quality: 95 });
      const ok = ff.stdin.write(buf);
      if (!ok) await new Promise(r => ff.stdin.once('drain', r));

      if ((f + 1) % 30 === 0 || f + 1 === totalFrames) {
        const elapsed = (Date.now() - startTime) / 1000;
        const fpsReal = (f + 1) / elapsed;
        const eta = (totalFrames - f - 1) / fpsReal;
        process.stdout.write(`\r  ${f + 1}/${totalFrames} (${((f+1)/totalFrames*100).toFixed(0)}%) | seg ${si+1}/${segments.length} | ${fpsReal.toFixed(1)} fps | ETA ${eta.toFixed(0)}s   `);
      }
    }

    await segBrowser.close();
  }
  process.stdout.write('\n');
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error(`FFmpeg ${c}`))));

  // ── Merge áudio ────────────────────────────────────────────────────
  console.log('\nMerge com narrações...');
  const cfgMatch = html.match(/<script[^>]+id=["']motion-config["'][^>]*>([\s\S]*?)<\/script>/i);
  const takes = cfgMatch ? JSON.parse(cfgMatch[1].trim()).takes : null;

  if (takes) {
    try {
      const toolsDir = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'tools', 'motion-gen');
      const { buildFinal } = require(path.join(toolsDir, 'lib', 'build.js'));
      const { measureDuration } = require(path.join(toolsDir, 'lib', 'narrations.js'));

      const durations = {};
      const mp3Files = takes.map(t => {
        const norm = path.join(workDir, `${t.id}_norm.mp3`);
        const raw = path.join(workDir, `${t.id}.mp3`);
        const file = fs.existsSync(norm) ? norm : raw;
        durations[t.id] = measureDuration(file);
        return file;
      });

      const T = {};
      let cursor = 0;
      for (let i = 0; i < takes.length; i++) {
        const t = takes[i], dur = durations[t.id];
        const num = parseInt(t.id.replace(/\D/g, ''), 10);
        const isLast = i === takes.length - 1;
        T[`a${num}s`] = parseFloat(cursor.toFixed(4));
        T[`t${num}s`] = parseFloat(Math.max(0, cursor - (t.preRoll || 0.15)).toFixed(4));
        T[`t${num}e`] = parseFloat((cursor + dur + (t.postRoll || 0.25) + (isLast ? 2 : 0)).toFixed(4));
        cursor += dur + (t.gap !== undefined ? t.gap : 0.35);
      }
      const lastNum = parseInt(takes[takes.length - 1].id.replace(/\D/g, ''), 10);
      T.total = parseFloat(T[`t${lastNum}e`].toFixed(4));

      buildFinal(mp3Files, rawVideo, outputFile, 0, T, takes, durations);
    } catch (e) {
      console.log('Merge simples:', e.message);
      fs.renameSync(rawVideo, outputFile);
    }
  } else {
    fs.renameSync(rawVideo, outputFile);
  }

  try { fs.unlinkSync(rawVideo); } catch {}

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const stat = fs.statSync(outputFile);

  console.log('\n' + '='.repeat(60));
  console.log('  CONCLUÍDO!');
  console.log(`  Vídeo   : ${outputFile}`);
  console.log(`  Tamanho : ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Tempo   : ${elapsed}s`);
  console.log('='.repeat(60));
}

main().catch(err => { console.error('\n[FATAL]', err.message || err); process.exit(1); });
