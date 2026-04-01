const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PAGE_ID = '3745CEDB449876598A590E2ECC9722B9';
const WS_URL = 'ws://localhost:9333/devtools/page/' + PAGE_ID;
const OUTPUT_DIR = 'D:\\crm-audit';

const ws = new WebSocket(WS_URL);
let msgId = 1;
const pendingCallbacks = {};
const consoleMessages = [];
const networkErrors = [];

function send(method, params) {
  params = params || {};
  return new Promise(function(resolve, reject) {
    const id = msgId++;
    pendingCallbacks[id] = { resolve: resolve, reject: reject };
    ws.send(JSON.stringify({ id: id, method: method, params: params }));
    setTimeout(function() {
      if (pendingCallbacks[id]) {
        delete pendingCallbacks[id];
        reject(new Error('Timeout: ' + method));
      }
    }, 30000);
  });
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

ws.on('message', function(data) {
  const msg = JSON.parse(data.toString());
  if (msg.id && pendingCallbacks[msg.id]) {
    const cb = pendingCallbacks[msg.id];
    delete pendingCallbacks[msg.id];
    if (msg.error) cb.reject(new Error(JSON.stringify(msg.error)));
    else cb.resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = (msg.params.args || []).map(function(a) { return a.value !== undefined ? String(a.value) : (a.description || a.type || ''); }).join(' ');
    consoleMessages.push({ type: msg.params.type, text: args });
    console.log('[CONSOLE ' + msg.params.type + ']', args.substring(0, 300));
  }
  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    consoleMessages.push({ type: e.level, text: e.text, url: e.url });
    if (e.level !== 'verbose') console.log('[LOG ' + e.level + ']', e.text.substring(0, 200), e.url ? '| ' + e.url.substring(0, 80) : '');
  }
  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.status >= 400) {
      networkErrors.push({ url: r.url, status: r.status });
      console.log('[NET ' + r.status + ']', r.url.substring(0, 120));
    }
  }
});

ws.on('error', function(err) { console.error('WS Error:', err.message); process.exit(1); });

async function evalJS(expression) {
  try {
    const result = await send('Runtime.evaluate', { expression: expression, returnByValue: true });
    if (result && result.result) return result.result.value;
    return null;
  } catch(e) { return 'EVAL_ERROR: ' + e.message; }
}

async function screenshot(name) {
  try {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(OUTPUT_DIR, name + '.png');
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
    console.log('[SS]', filePath);
    return filePath;
  } catch(e) {
    console.error('[SS ERR]', name, e.message);
    return null;
  }
}

async function main() {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');

  console.log('\n=== INVESTIGACAO INICIAL ===');
  await sleep(1000);

  // Checar URL e estado
  const url = await evalJS('window.location.href');
  console.log('[URL]', url);

  // Checar DOM completo
  const domFull = await evalJS('document.documentElement.outerHTML');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'dom-full.html'), domFull || '');
  console.log('[DOM] Salvo dom-full.html, tamanho:', (domFull || '').length);

  // Checar texto da pagina
  const text = await evalJS('document.body ? document.body.innerText : "no body"');
  console.log('[TEXT]', (text || '').substring(0, 500));

  // Checar se existe sidebar/nav
  const sidebar = await evalJS(`
    JSON.stringify((function() {
      var selectors = ['nav', 'aside', '[class*="sidebar"]', '[class*="Sidebar"]', '[class*="nav"]', '[class*="Nav"]', '[class*="menu"]', '[class*="Menu"]'];
      var found = [];
      for (var s = 0; s < selectors.length; s++) {
        var els = document.querySelectorAll(selectors[s]);
        if (els.length) {
          for (var i = 0; i < els.length; i++) {
            found.push({
              selector: selectors[s],
              classes: els[i].className ? els[i].className.toString().substring(0, 100) : '',
              text: els[i].innerText ? els[i].innerText.replace(/\\s+/g, ' ').substring(0, 100) : '',
              visible: els[i].offsetParent !== null
            });
          }
        }
      }
      return found;
    })())
  `);
  console.log('[SIDEBAR/NAV]', sidebar);

  // Tentar navegar para CRM dashboard via hash e path
  console.log('\n[TEST 1] Navegando para /crm ...');
  await send('Page.navigate', { url: 'http://localhost:3847/crm' });
  await sleep(4000);
  const url2 = await evalJS('window.location.href');
  console.log('[URL after /crm]', url2);
  const text2 = await evalJS('document.body ? document.body.innerText.substring(0, 300) : ""');
  console.log('[TEXT after /crm]', text2);
  await screenshot('navigate-to-crm');

  // Checar todos os links na pagina
  const allLinks = await evalJS(`
    JSON.stringify((function() {
      var all = document.querySelectorAll('a');
      var result = [];
      for (var i = 0; i < all.length; i++) {
        result.push({
          text: all[i].textContent.trim().substring(0, 50),
          href: all[i].href,
          pathname: all[i].pathname
        });
      }
      return result;
    })())
  `);
  console.log('[ALL LINKS]', allLinks);

  // Checar todos os botoes
  const allBtns = await evalJS(`
    JSON.stringify((function() {
      var all = document.querySelectorAll('button, [role="button"]');
      var result = [];
      for (var i = 0; i < all.length; i++) {
        result.push({
          text: all[i].textContent.trim().substring(0, 50),
          disabled: all[i].disabled,
          classes: all[i].className ? all[i].className.toString().substring(0, 60) : ''
        });
      }
      return result;
    })())
  `);
  console.log('[ALL BUTTONS]', allBtns);

  // Verificar erros do React
  const reactErrors = await evalJS(`
    (function() {
      // Checar se existe React error boundary
      var errorEls = document.querySelectorAll('[data-reactroot] ~ div, .react-error, [class*="error-boundary"]');
      var texts = [];
      for (var i = 0; i < errorEls.length; i++) {
        texts.push(errorEls[i].innerText ? errorEls[i].innerText.substring(0, 200) : '');
      }
      // Checar texto de erro especifico
      var allText = document.body ? document.body.innerText : '';
      var hasSliceError = allText.includes('N.slice is not a function');
      return JSON.stringify({ hasSliceError: hasSliceError, errorTexts: texts });
    })()
  `);
  console.log('[REACT ERRORS]', reactErrors);

  // Checar o estado do React router
  const routerState = await evalJS(`
    (function() {
      try {
        // Tentar acessar history/router
        return JSON.stringify({
          pathname: window.location.pathname,
          hash: window.location.hash,
          search: window.location.search,
          href: window.location.href
        });
      } catch(e) {
        return 'ERROR: ' + e.message;
      }
    })()
  `);
  console.log('[ROUTER STATE]', routerState);

  // Salvar relatorio
  fs.writeFileSync(path.join(OUTPUT_DIR, 'investigate-report.json'), JSON.stringify({
    url: url2,
    consoleMessages: consoleMessages,
    networkErrors: networkErrors
  }, null, 2));

  ws.close();
  process.exit(0);
}

ws.on('open', function() {
  main().catch(function(err) {
    console.error('FATAL:', err.message);
    ws.close();
    process.exit(1);
  });
});
