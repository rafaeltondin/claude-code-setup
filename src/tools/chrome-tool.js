/**
 * CHROME TOOL - Integração Chrome DevTools Protocol (CDP)
 *
 * Equivalente ao MCP chrome-devtools do Claude Code CLI.
 * Conecta automaticamente ao Chrome aberto com --remote-debugging-port.
 *
 * COMO ABRIR O CHROME COM DEBUG:
 *   node ~/.claude/chrome-manager.js open --port 9333
 *   ou: chrome.exe --remote-debugging-port=9333
 *
 * PORTAS SUPORTADAS: 9222 (padrão), 9333-9399 (claude debug range)
 */

const http = require('http');
const CDP = require('chrome-remote-interface');

// Portas para tentar, em ordem de prioridade
const DEBUG_PORTS = [9222, 9333, 9334, 9335, 9336, 9337, 9338, 9339, 9340,
  9341, 9342, 9343, 9344, 9345, 9346, 9347, 9348, 9349, 9350];

/**
 * Verifica se uma porta tem Chrome rodando.
 */
function checkPort(port) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port, path: '/json/version', timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
  });
}

/**
 * Detecta automaticamente a porta do Chrome com debug ativo.
 * @returns {Promise<number|null>}
 */
async function detectDebugPort() {
  for (const port of DEBUG_PORTS) {
    const info = await checkPort(port);
    if (info) return port;
  }
  return null;
}

/**
 * Lista todas as abas abertas no Chrome.
 */
async function listTabs(port) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port, path: '/json', timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * Obtém a aba ativa (primeira que não seja devtools nem about:).
 */
async function getActiveTab(port) {
  const tabs = await listTabs(port);
  const tab = tabs.find(t =>
    t.type === 'page' &&
    !t.url.startsWith('devtools://') &&
    !t.url.startsWith('chrome://') &&
    !t.url.startsWith('chrome-extension://')
  ) || tabs.find(t => t.type === 'page');
  return tab || null;
}

/**
 * Executa uma ação CDP e retorna resultado como string.
 *
 * @param {string} action - screenshot|snapshot|navigate|click|type|evaluate|wait_for|get_url|list_tabs|scroll
 * @param {object} args
 * @returns {Promise<string>}
 */
async function executeChromeAction(action, args = {}) {
  // Descobrir porta
  const port = args.port || await detectDebugPort();
  if (!port) {
    return [
      'Chrome não encontrado com debug ativo.',
      '',
      'Para abrir o Chrome com debug:',
      '  node ~/.claude/chrome-manager.js open --port 9333',
      'Ou manualmente:',
      '  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9333',
    ].join('\n');
  }

  if (action === 'list_tabs') {
    const tabs = await listTabs(port);
    if (!tabs.length) return 'Nenhuma aba encontrada.';
    return tabs.map((t, i) => `[${i + 1}] ${t.title || '(sem título)'}\n    URL: ${t.url}`).join('\n');
  }

  // Obter aba para as demais ações
  const tab = args.tabId
    ? (await listTabs(port)).find(t => t.id === args.tabId)
    : await getActiveTab(port);

  if (!tab) return 'Nenhuma aba de página encontrada no Chrome.';

  let client;
  try {
    client = await CDP({ host: 'localhost', port, target: tab.id });
  } catch (e) {
    return `Erro ao conectar ao Chrome (porta ${port}): ${e.message}`;
  }

  const { Page, DOM, Runtime, Input, Network } = client;

  try {
    await Promise.all([Page.enable(), DOM.enable(), Runtime.enable()]);

    switch (action) {

      case 'screenshot': {
        const { data } = await Page.captureScreenshot({ format: 'png', fromSurface: true });
        // Salvar em arquivo temp para facilitar visualização
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const filePath = path.join(os.tmpdir(), `chrome-screenshot-${Date.now()}.png`);
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        return `Screenshot salvo em: ${filePath}\nURL atual: ${tab.url}\nBase64 (primeiros 200 chars): ${data.substring(0, 200)}...`;
      }

      case 'snapshot': {
        // Retorna texto acessível da página (equivalente ao accessibility snapshot)
        const { result } = await Runtime.evaluate({
          expression: `
            (function() {
              const title = document.title;
              const url = location.href;
              const h1 = Array.from(document.querySelectorAll('h1,h2,h3')).map(e => e.innerText.trim()).filter(Boolean).slice(0, 10);
              const links = Array.from(document.querySelectorAll('a[href]')).map(e => ({text: e.innerText.trim(), href: e.href})).filter(l => l.text).slice(0, 20);
              const inputs = Array.from(document.querySelectorAll('input,textarea,select,button')).map(e => ({tag: e.tagName, type: e.type, name: e.name || e.id || e.placeholder || e.innerText?.trim(), value: e.value})).filter(e => e.name).slice(0, 20);
              const text = document.body?.innerText?.substring(0, 2000) || '';
              return JSON.stringify({title, url, headings: h1, links, inputs, bodyText: text});
            })()
          `,
          returnByValue: true
        });
        const snap = JSON.parse(result.value || '{}');
        const lines = [
          `=== SNAPSHOT: ${snap.title} ===`,
          `URL: ${snap.url}`,
          '',
          `TÍTULOS: ${(snap.headings || []).join(' | ')}`,
          '',
          'LINKS:',
          ...(snap.links || []).map(l => `  [${l.text}] → ${l.href}`),
          '',
          'INPUTS/BUTTONS:',
          ...(snap.inputs || []).map(i => `  <${i.tag}> name="${i.name}" type="${i.type}" value="${i.value}"`),
          '',
          'TEXTO DA PÁGINA:',
          snap.bodyText
        ];
        return lines.join('\n');
      }

      case 'navigate': {
        const url = args.url;
        if (!url) return 'Argumento "url" é obrigatório para navigate.';
        await Page.navigate({ url });
        await Page.loadEventFired().catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
        const { result } = await Runtime.evaluate({ expression: 'document.title', returnByValue: true });
        return `Navegado para: ${url}\nTítulo da página: ${result.value}`;
      }

      case 'click': {
        const selector = args.selector;
        if (!selector) return 'Argumento "selector" é obrigatório para click.';
        const { result } = await Runtime.evaluate({
          expression: `
            (function() {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) return 'Elemento não encontrado: ' + ${JSON.stringify(selector)};
              el.scrollIntoView({behavior: 'instant', block: 'center'});
              el.click();
              return 'Clicado: ' + el.tagName + ' ' + (el.innerText || el.value || '').trim().substring(0, 50);
            })()
          `,
          returnByValue: true
        });
        await new Promise(r => setTimeout(r, 500));
        return result.value || 'Clique executado';
      }

      case 'type': {
        const { selector, text } = args;
        if (!selector || text === undefined) return 'Argumentos "selector" e "text" são obrigatórios para type.';
        const focusResult = await Runtime.evaluate({
          expression: `
            (function() {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) return false;
              el.focus();
              el.value = '';
              return true;
            })()
          `,
          returnByValue: true
        });
        if (!focusResult.result.value) return `Elemento não encontrado: ${selector}`;
        for (const char of String(text)) {
          await Input.dispatchKeyEvent({ type: 'char', text: char });
          await new Promise(r => setTimeout(r, 30));
        }
        return `Digitado "${text}" em ${selector}`;
      }

      case 'evaluate': {
        const code = args.code || args.expression;
        if (!code) return 'Argumento "code" é obrigatório para evaluate.';
        const { result, exceptionDetails } = await Runtime.evaluate({
          expression: code,
          returnByValue: true,
          awaitPromise: true
        });
        if (exceptionDetails) return `Erro JS: ${exceptionDetails.text}\n${exceptionDetails.exception?.description || ''}`;
        const val = result.value;
        if (typeof val === 'object') return JSON.stringify(val, null, 2);
        return String(val ?? '(undefined)');
      }

      case 'wait_for': {
        const { selector, timeout = 10000 } = args;
        if (!selector) return 'Argumento "selector" é obrigatório para wait_for.';
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const { result } = await Runtime.evaluate({
            expression: `!!document.querySelector(${JSON.stringify(selector)})`,
            returnByValue: true
          });
          if (result.value) return `Elemento "${selector}" encontrado após ${Date.now() - start}ms`;
          await new Promise(r => setTimeout(r, 200));
        }
        return `Timeout: elemento "${selector}" não encontrado em ${timeout}ms`;
      }

      case 'scroll': {
        const { x = 0, y = 500, selector } = args;
        if (selector) {
          await Runtime.evaluate({
            expression: `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({behavior:'instant',block:'center'})`,
            returnByValue: true
          });
          return `Scrollado até elemento: ${selector}`;
        }
        await Runtime.evaluate({
          expression: `window.scrollBy(${x}, ${y})`,
          returnByValue: true
        });
        return `Scrollado: x=${x}, y=${y}`;
      }

      case 'get_url': {
        const { result } = await Runtime.evaluate({ expression: 'location.href', returnByValue: true });
        return `URL atual: ${result.value}\nTítulo: ${tab.title || ''}`;
      }

      default:
        return `Ação "${action}" não reconhecida. Disponíveis: screenshot, snapshot, navigate, click, type, evaluate, wait_for, scroll, get_url, list_tabs`;
    }

  } catch (e) {
    return `Erro CDP (${action}): ${e.message}`;
  } finally {
    try { await client.close(); } catch (_) {}
  }
}

module.exports = { executeChromeAction, detectDebugPort };
