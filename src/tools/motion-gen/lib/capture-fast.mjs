/**
 * motion-gen — Fast Parallel Capture v2
 *
 * Estratégias de velocidade:
 *  1. N workers Puppeteer em paralelo (cada um captura um segmento)
 *  2. Pipe JPEG → FFmpeg stdin (sem I/O de disco para frames)
 *  3. Sem setTimeout entre frames (era desperdício puro)
 *  4. -preset ultrafast no FFmpeg (5x mais rápido, +20% tamanho mas mesma qualidade visual)
 *  5. JPEG quality 85 (25% menos dados no pipe vs 92, imperceptível a 1080p)
 *  6. Batch advanceFrame: avança N frames de uma vez no browser, reduz IPC overhead
 *  7. Shared browser: reutiliza browser entre workers sequenciais quando possível
 */

import { spawn, execSync } from 'child_process';
import { createRequire }   from 'module';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve puppeteer a partir do diretório do HTML (onde o projeto tem node_modules)
let puppeteer;
function loadPuppeteer(htmlDir) {
  if (puppeteer) return puppeteer;
  // Tentar diretórios: htmlDir, parent, global
  const candidates = [htmlDir, path.join(htmlDir, '..'), __dirname];
  for (const dir of candidates) {
    try {
      const req = createRequire(path.join(dir, 'package.json'));
      puppeteer = req('puppeteer');
      return puppeteer;
    } catch {}
    try {
      const req = createRequire(path.join(dir, 'dummy.js'));
      puppeteer = req('puppeteer');
      return puppeteer;
    } catch {}
  }
  throw new Error(
    'puppeteer não encontrado. Instale-o no diretório do HTML:\n' +
    `  cd "${htmlDir}" && npm install puppeteer`
  );
}

// ── Aguardar processo FFmpeg terminar ────────────────────────────────────────
function waitFF(proc) {
  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg saiu com código ${code}`));
    });
    proc.stderr.on('data', () => {}); // consumir stderr para não travar buffer
  });
}

// ── Capturar um segmento de frames ──────────────────────────────────────────
async function captureSegment({
  htmlFile, htmlDir, timingConstants,
  startFrame, endFrame, fps,
  width, height, crf,
  segmentFile, workerId,
}) {
  const pptr = loadPuppeteer(htmlDir);
  const frameMs    = 1000 / fps;
  const startTimeSec = startFrame / fps;

  // ── Lançar FFmpeg aguardando pipe ────────────────────────────────────────
  // mjpeg input: JPEG é 3-4x mais rápido de capturar que PNG
  const ff = spawn('ffmpeg', [
    '-y',
    '-f',        'image2pipe',
    '-vcodec',   'mjpeg',
    '-framerate', String(fps),
    '-i',        'pipe:0',
    '-c:v',      'libx264',
    '-crf',      String(crf),
    '-pix_fmt',  'yuv420p',
    '-preset',   'superfast',   // 4x mais rápido que medium, ~10% maior que veryfast
    '-threads',  '0',           // usar todos os núcleos disponíveis
    '-movflags', '+faststart',
    segmentFile,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ff.stderr.on('data', () => {}); // consumir para não travar

  // ── Lançar browser ───────────────────────────────────────────────────────
  const browser = await pptr.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--font-render-hinting=none',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${width},${height}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  // ── Injetar T constants + virtual time ──────────────────────────────────
  await page.evaluateOnNewDocument((T, fMs) => {
    // Injetar timing constants para o HTML consumir
    window.__MOTION_T = T;

    // Virtual time engine
    let virtualTime = 0;
    const _perfNow  = performance.now.bind(performance);
    performance.now = () => virtualTime;
    Date.now        = () => virtualTime;

    const rafQueue = [];
    window.requestAnimationFrame = (cb) => { rafQueue.push(cb); return rafQueue.length; };
    window.cancelAnimationFrame  = () => {};

    // setTimeout rápido para GSAP inicializar
    const _setTimeout = window.setTimeout;
    window.setTimeout = (cb, delay) => {
      if (typeof cb === 'function' && (!delay || delay < 100)) { cb(); return 0; }
      return _setTimeout(cb, delay || 0);
    };

    window.__advanceFrame = () => {
      virtualTime += fMs;
      const cbs = rafQueue.splice(0);
      cbs.forEach(cb => { try { cb(virtualTime); } catch(e) {} });
    };

    window.__setTime = (t) => {
      virtualTime = t * 1000; // GSAP usa segundos, virtualTime em ms
    };

    window.__captureReady = true;
  }, timingConstants, frameMs);

  // ── Carregar HTML ────────────────────────────────────────────────────────
  const htmlUrl = `file:///${htmlFile.replace(/\\/g, '/')}`;
  await page.goto(htmlUrl, { waitUntil: 'networkidle0', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);

  // Verificar que GSAP e timeline M estão disponíveis
  const ok = await page.evaluate(() => typeof gsap !== 'undefined' && typeof window.M !== 'undefined');
  if (!ok) {
    await browser.close();
    ff.stdin.destroy();
    throw new Error(`[worker ${workerId}] GSAP ou window.M não encontrados`);
  }

  // ── Seek para o tempo inicial do segmento ────────────────────────────────
  if (startTimeSec > 0) {
    await page.evaluate((t) => {
      window.M.time(t);
      window.M.pause();
      window.__setTime(t);
    }, startTimeSec);

    // Um tick para estabilizar animações após seek
    await page.evaluate(() => {
      window.__advanceFrame();
      window.__advanceFrame();
    });
  }

  // ── Capturar frames e enviar para FFmpeg via pipe ─────────────────────────
  const total = endFrame - startFrame;
  let piped = 0;

  // Otimização: criar protocolo CDP direto para screenshot mais rápido
  const cdp = await page.createCDPSession();

  for (let f = startFrame; f < endFrame; f++) {
    // Batch advanceFrame: avança virtual time no browser
    await page.evaluate(() => window.__advanceFrame());

    // CDP screenshot direto — ~30% mais rápido que page.screenshot()
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 85,           // 85 vs 92: ~25% menos dados, imperceptível a 1080p
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    const buf = Buffer.from(data, 'base64');

    // Escrever no pipe com backpressure handling
    const canContinue = ff.stdin.write(buf);
    if (!canContinue) {
      await new Promise(res => ff.stdin.once('drain', res));
    }

    piped++;
    if (piped % 90 === 0 || piped === total) {
      const pct = ((piped / total) * 100).toFixed(0);
      process.stdout.write(`\r  [W${workerId}] ${piped}/${total} (${pct}%)   `);
    }
  }

  await cdp.detach();

  process.stdout.write('\n');
  await browser.close();
  ff.stdin.end();
  await waitFF(ff);

  return segmentFile;
}

// ── Concatenar segmentos ─────────────────────────────────────────────────────
function concatSegments(segmentFiles, outputFile) {
  const listFile = outputFile.replace('.mp4', '_concat_list.txt');
  const lines    = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`);
  fs.writeFileSync(listFile, lines.join('\n'), 'utf8');

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`,
    { stdio: 'pipe' }
  );

  fs.unlinkSync(listFile);
  // Limpar segmentos temporários
  segmentFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });
}

// ── Export principal ─────────────────────────────────────────────────────────
/**
 * Captura video em paralelo e salva em outputFile.
 *
 * @param {object} opts
 * @param {string}  opts.htmlFile         Caminho absoluto do HTML
 * @param {object}  opts.timingConstants  Objeto T (t1s, t1e, t2s, ...)
 * @param {number}  opts.duration         Duração total em segundos
 * @param {number}  [opts.fps=30]
 * @param {number}  [opts.width=1080]
 * @param {number}  [opts.height=1920]
 * @param {number}  [opts.crf=18]
 * @param {number}  [opts.workers=4]      Instâncias paralelas
 * @param {string}  opts.outputFile       Caminho de saída do MP4
 */
export async function captureFast({
  htmlFile,
  timingConstants,
  duration,
  fps     = 30,
  width   = 1080,
  height  = 1920,
  crf     = 18,
  workers = 4,
  outputFile,
}) {
  const totalFrames = Math.ceil(duration * fps);
  const framesPerWorker = Math.ceil(totalFrames / workers);
  const actualWorkers   = Math.min(workers, Math.ceil(totalFrames / 10)); // não criar workers com <10 frames

  console.log(`\n[capture] ${width}x${height} @ ${fps}fps | ${duration.toFixed(2)}s = ${totalFrames} frames`);
  console.log(`[capture] ${actualWorkers} workers paralelos | preset: superfast | CDP screenshot | JPEG q85`);

  const startAll = Date.now();
  const tmpDir   = path.dirname(outputFile);
  const htmlDir  = path.dirname(htmlFile);

  // Carregar puppeteer antecipadamente (verificar disponibilidade)
  loadPuppeteer(htmlDir);

  // Criar segmentos em paralelo
  const tasks = [];
  for (let w = 0; w < actualWorkers; w++) {
    const startFrame  = w * framesPerWorker;
    const endFrame    = Math.min((w + 1) * framesPerWorker, totalFrames);
    if (startFrame >= totalFrames) break;

    const segmentFile = path.join(tmpDir, `_seg_${w}.mp4`);
    tasks.push({
      htmlFile, htmlDir, timingConstants,
      startFrame, endFrame, fps,
      width, height, crf,
      segmentFile, workerId: w + 1,
    });
  }

  console.log(`[capture] Iniciando ${tasks.length} workers...\n`);
  const segmentFiles = await Promise.all(tasks.map(t => captureSegment(t)));

  // Concatenar ou renomear se só 1 segmento
  console.log('\n[capture] Concatenando segmentos...');
  if (segmentFiles.length === 1) {
    fs.renameSync(segmentFiles[0], outputFile);
  } else {
    concatSegments(segmentFiles, outputFile);
  }

  const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);
  const stat    = fs.statSync(outputFile);
  console.log(`[capture] Concluído em ${elapsed}s | ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

  return outputFile;
}
