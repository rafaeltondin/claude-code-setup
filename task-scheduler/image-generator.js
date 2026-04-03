/**
 * IMAGE GENERATOR - Gera imagens estáticas via Chrome CDP
 *
 * Fluxo: HTML/CSS design → Chrome renderiza → screenshot PNG 1080x1080
 * Não requer API externa — usa o Chrome já aberto com debug.
 *
 * Salva imagens em: ~/.claude/temp/images/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUTPUT_DIR = path.join(os.homedir(), '.claude', 'temp', 'images');
const CHROME_PORTS = [9222, 9333, 9334, 9335, 9336, 9337, 9338, 9339, 9340];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function checkPort(port) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port, path: '/json/version', timeout: 1500 }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
  });
}

async function detectPort() {
  for (const port of CHROME_PORTS) {
    if (await checkPort(port)) return port;
  }
  return null;
}

async function listTabs(port) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port, path: '/json', timeout: 2000 }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

// ─── HTML Templates ──────────────────────────────────────────────────────────

/**
 * Gera HTML para a imagem de feed.
 * @param {object} opts
 * @param {string} opts.headline - Texto principal grande
 * @param {string} opts.subtext - Texto secundário / legenda
 * @param {string} opts.emoji - Emoji decorativo (opcional)
 * @param {string} opts.hashtags - Hashtags (opcional)
 * @param {string} opts.theme - 'ocean'|'sunset'|'dark'|'nature'|'minimal'|'shapebrutobr'
 * @param {string} opts.brand - Nome da marca/conta (rodapé)
 */
function buildFeedHTML({ headline, subtext, emoji = '', hashtags = '', theme = 'ocean', brand = '', aspect = '4:5' }) {
  // Dimensoes baseadas no aspect ratio
  const dimensions = {
    '1:1': { w: 1080, h: 1080 },
    '4:5': { w: 1080, h: 1350 },
    '16:9': { w: 1080, h: 608 },
    '9:16': { w: 1080, h: 1920 },
  };
  const dim = dimensions[aspect] || dimensions['4:5'];
  const W = dim.w;
  const H = dim.h;
  const themes = {
    ocean: {
      bg: 'linear-gradient(135deg, #0a1628 0%, #0d3b6e 40%, #1a6b8a 70%, #20b2aa 100%)',
      accent: '#00d4ff',
      accentGlow: 'rgba(0,212,255,0.4)',
      textMain: '#ffffff',
      textSub: '#b0e8f0',
      textHash: '#5cc8d8',
      border: 'rgba(0,212,255,0.3)',
      pattern: `<circle cx="900" cy="100" r="300" fill="rgba(0,180,220,0.07)"/>
        <circle cx="100" cy="900" r="250" fill="rgba(0,120,180,0.08)"/>
        <circle cx="540" cy="540" r="400" fill="rgba(0,100,160,0.05)"/>`,
    },
    sunset: {
      bg: 'linear-gradient(135deg, #1a0a2e 0%, #6b1a3b 35%, #c2431d 70%, #f4a623 100%)',
      accent: '#f4a623',
      accentGlow: 'rgba(244,166,35,0.4)',
      textMain: '#fff8f0',
      textSub: '#ffd09b',
      textHash: '#f4c06f',
      border: 'rgba(244,166,35,0.3)',
      pattern: `<circle cx="900" cy="150" r="350" fill="rgba(244,120,40,0.08)"/>
        <circle cx="150" cy="850" r="300" fill="rgba(180,50,50,0.08)"/>`,
    },
    dark: {
      bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      accent: '#7b2fff',
      accentGlow: 'rgba(123,47,255,0.4)',
      textMain: '#f0f0ff',
      textSub: '#c0b8e8',
      textHash: '#8b7bd8',
      border: 'rgba(123,47,255,0.3)',
      pattern: `<circle cx="900" cy="100" r="300" fill="rgba(100,50,200,0.08)"/>
        <circle cx="100" cy="900" r="280" fill="rgba(80,30,180,0.07)"/>`,
    },
    nature: {
      bg: 'linear-gradient(135deg, #0d2b0d 0%, #1a5c1a 40%, #2d8a2d 70%, #52c752 100%)',
      accent: '#7fff00',
      accentGlow: 'rgba(127,255,0,0.35)',
      textMain: '#f0fff0',
      textSub: '#c8f0c8',
      textHash: '#90d890',
      border: 'rgba(127,255,0,0.25)',
      pattern: `<circle cx="900" cy="100" r="300" fill="rgba(80,200,80,0.07)"/>
        <circle cx="100" cy="900" r="280" fill="rgba(40,140,40,0.08)"/>`,
    },
    minimal: {
      bg: '#f8f9fa',
      accent: '#1a1a2e',
      accentGlow: 'rgba(26,26,46,0.15)',
      textMain: '#1a1a2e',
      textSub: '#555577',
      textHash: '#8888aa',
      border: 'rgba(26,26,46,0.15)',
      pattern: `<circle cx="900" cy="100" r="300" fill="rgba(0,0,50,0.03)"/>
        <circle cx="100" cy="900" r="280" fill="rgba(0,0,50,0.025)"/>`,
    },
    shapebrutobr: {
      bg: '#000000',
      accent: '#C9A84C',
      accentGlow: 'rgba(201,168,76,0.4)',
      textMain: '#FFFFFF',
      textSub: 'rgba(255,255,255,0.75)',
      textHash: '#C9A84C',
      border: 'rgba(201,168,76,0.25)',
      pattern: `<circle cx="850" cy="150" r="300" fill="rgba(201,168,76,0.04)"/>
        <circle cx="150" cy="850" r="280" fill="rgba(201,168,76,0.03)"/>`,
    },
    zeropeixes: {
      bg: '#1A1F2E',
      accent: '#4AABCF',
      accentGlow: 'rgba(74,171,207,0.4)',
      textMain: '#FFFFFF',
      textSub: 'rgba(255,255,255,0.75)',
      textHash: '#4AABCF',
      border: 'rgba(74,171,207,0.2)',
      pattern: `<circle cx="900" cy="120" r="320" fill="rgba(74,171,207,0.05)"/>
        <circle cx="120" cy="880" r="280" fill="rgba(74,171,207,0.04)"/>`,
    }
  };

  const t = themes[theme] || themes.ocean;
  const emojiSize = emoji.length > 2 ? '160px' : '200px';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    width: ${W}px; height: ${H}px;
    background: ${t.bg};
    font-family: 'Segoe UI', Arial, sans-serif;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative;
  }
  .bg-svg {
    position: absolute; top: 0; left: 0;
    width: ${W}px; height: ${H}px; z-index: 0;
  }
  .border-frame {
    position: absolute;
    top: 32px; left: 32px; right: 32px; bottom: 32px;
    border: 2px solid ${t.border};
    border-radius: 24px; z-index: 1;
    pointer-events: none;
  }
  .content {
    position: relative; z-index: 2;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 60px 60px 50px;
    text-align: center; width: 100%;
  }
  .emoji {
    font-size: ${emojiSize};
    line-height: 1;
    margin-bottom: 40px;
    filter: drop-shadow(0 0 40px ${t.accentGlow});
    animation: none;
  }
  .accent-line {
    width: 100px; height: 5px;
    background: ${t.accent};
    border-radius: 3px;
    margin: 0 auto 40px;
    box-shadow: 0 0 30px ${t.accentGlow};
  }
  .headline {
    font-size: ${headline.length > 60 ? '72px' : headline.length > 40 ? '84px' : '96px'};
    font-weight: 900;
    color: ${t.textMain};
    line-height: 1.1;
    letter-spacing: -2px;
    margin-bottom: 36px;
    text-shadow: 0 4px 30px rgba(0,0,0,0.3);
  }
  .headline em {
    color: ${t.accent};
    font-style: normal;
    text-shadow: 0 0 50px ${t.accentGlow};
  }
  .subtext {
    font-size: ${subtext.length > 100 ? '36px' : '42px'};
    color: ${t.textSub};
    line-height: 1.4;
    font-weight: 400;
    margin-bottom: ${hashtags ? '36px' : '0px'};
    max-width: 920px;
  }
  .hashtags {
    font-size: 30px;
    color: ${t.textHash};
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .brand {
    position: absolute;
    bottom: 54px; right: 70px;
    font-size: 28px;
    color: ${t.textHash};
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    z-index: 2;
  }
  .corner-accent {
    position: absolute;
    width: 80px; height: 80px;
    z-index: 2;
  }
  .corner-accent.tl { top: 48px; left: 48px;
    border-top: 4px solid ${t.accent}; border-left: 4px solid ${t.accent}; }
  .corner-accent.br { bottom: 48px; right: 48px;
    border-bottom: 4px solid ${t.accent}; border-right: 4px solid ${t.accent}; }
</style>
</head>
<body>
<svg class="bg-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  ${t.pattern}
</svg>
<div class="border-frame"></div>
<div class="corner-accent tl"></div>
<div class="corner-accent br"></div>
<div class="content">
  ${emoji ? `<div class="emoji">${emoji}</div>` : ''}
  <div class="accent-line"></div>
  <h1 class="headline">${headline}</h1>
  ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
  ${hashtags ? `<p class="hashtags">${hashtags}</p>` : ''}
</div>
${brand ? `<div class="brand">${brand}</div>` : ''}
</body>
</html>`;
}

// ─── Gerador Principal ────────────────────────────────────────────────────────

/**
 * Gera imagem de feed via Chrome CDP.
 * Default: 1080x1350 (4:5 — formato ideal para Instagram feed 2025+)
 *
 * @param {object} opts
 * @param {string} opts.headline - Texto principal
 * @param {string} [opts.subtext] - Legenda/subtítulo
 * @param {string} [opts.emoji] - Emoji decorativo
 * @param {string} [opts.hashtags] - Hashtags (ex: "#pesca #pescaesportiva")
 * @param {string} [opts.theme] - 'ocean'|'sunset'|'dark'|'nature'|'minimal'|'shapebrutobr'
 * @param {string} [opts.brand] - Nome da conta/marca
 * @param {string} [opts.filename] - Nome do arquivo (sem extensão)
 * @param {string} [opts.aspect] - '4:5'|'1:1'|'16:9'|'9:16' (default: '4:5')
 * @returns {Promise<{path: string, url: string, filename: string}>}
 */
async function generateFeedImage(opts) {
  ensureOutputDir();

  // Calcular dimensoes
  const aspectMap = { '1:1': [1080, 1080], '4:5': [1080, 1350], '16:9': [1080, 608], '9:16': [1080, 1920] };
  const [imgW, imgH] = aspectMap[opts.aspect] || aspectMap['4:5'];

  const port = await detectPort();
  if (!port) {
    throw new Error(
      'Chrome não encontrado com debug ativo.\n' +
      'Abra com: node ~/.claude/chrome-manager.js open --port 9333'
    );
  }

  const CDP = require('chrome-remote-interface');

  // Criar arquivo HTML temporário
  const htmlContent = buildFeedHTML(opts);
  const htmlFile = path.join(OUTPUT_DIR, `feed-tmp-${Date.now()}.html`);
  fs.writeFileSync(htmlFile, htmlContent, 'utf8');

  // Caminho de saída
  const filename = opts.filename
    ? opts.filename.replace(/[^a-z0-9\-_]/gi, '_') + '.png'
    : `feed-${Date.now()}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  // Abrir nova aba para renderizar (sem interferir nas abas do usuário)
  const newTabData = await new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port, path: '/json/new', method: 'PUT', timeout: 3000 },
      (res) => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('Resposta inválida: ' + d.substring(0,100))); } });
      }
    );
    req.on('error', reject);
    req.end();
  });

  let client;
  try {
    client = await CDP({ host: 'localhost', port, target: newTabData.id });
    const { Page, Emulation } = client;

    await Page.enable();

    // Configurar viewport dinamico
    await Emulation.setDeviceMetricsOverride({
      width: imgW, height: imgH,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Navegar para o HTML
    const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
    await Page.navigate({ url: fileUrl });
    await Page.loadEventFired();
    await new Promise(r => setTimeout(r, 500)); // aguardar render

    // Screenshot
    const { data } = await Page.captureScreenshot({
      format: 'png',
      clip: { x: 0, y: 0, width: imgW, height: imgH, scale: 1 },
      fromSurface: true
    });

    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));

    // Fechar a aba temporária
    await Page.close();

  } finally {
    try { await client.close(); } catch (_) {}
    try { fs.unlinkSync(htmlFile); } catch (_) {} // limpar HTML temp
  }

  // Retornar resultado
  const fileUrl = `file:///${outputPath.replace(/\\/g, '/')}`;
  return { path: outputPath, url: fileUrl, filename };
}

module.exports = { generateFeedImage, buildFeedHTML };
