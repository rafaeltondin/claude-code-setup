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
const networkRequests = {};
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
    }, 20000);
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
    const args = (msg.params.args || []).map(function(a) { return a.value || a.description || a.type || ''; }).join(' ');
    const frame = msg.params.stackTrace && msg.params.stackTrace.callFrames && msg.params.stackTrace.callFrames[0];
    consoleMessages.push({
      type: msg.params.type,
      text: args,
      url: frame ? frame.url : '',
      line: frame ? frame.lineNumber : 0
    });
  }

  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    consoleMessages.push({
      type: e.level,
      text: e.text,
      url: e.url || '',
      line: e.lineNumber || 0
    });
  }

  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (!networkRequests[msg.params.requestId]) networkRequests[msg.params.requestId] = {};
    networkRequests[msg.params.requestId].url = r.url;
    networkRequests[msg.params.requestId].status = r.status;
    if (r.status >= 400) {
      networkErrors.push({ url: r.url, status: r.status, time: new Date().toISOString() });
    }
  }

  if (msg.method === 'Network.requestWillBeSent') {
    networkRequests[msg.params.requestId] = {
      url: msg.params.request.url,
      method: msg.params.request.method
    };
  }
});

ws.on('error', function(err) {
  console.error('WS Error:', err.message);
  process.exit(1);
});

async function screenshot(name) {
  try {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(OUTPUT_DIR, name + '.png');
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
    console.log('[SS] ' + filePath);
    return filePath;
  } catch(e) {
    console.error('[SS ERR] ' + name + ': ' + e.message);
    return null;
  }
}

async function evalJS(expression) {
  try {
    const result = await send('Runtime.evaluate', {
      expression: expression,
      returnByValue: true,
      awaitPromise: false
    });
    if (result && result.result) return result.result.value;
    return null;
  } catch(e) {
    console.error('[EVAL ERR]', e.message);
    return null;
  }
}

async function getCurrentURL() {
  return await evalJS('window.location.href');
}

async function getPageText() {
  return await evalJS('document.body ? document.body.innerText.substring(0, 4000) : ""');
}

async function main() {
  console.log('\n=== CRM AUDIT ===\n');

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');

  console.log('[1] Navegando para CRM...');
  await send('Page.navigate', { url: 'http://localhost:3847/crm/' });
  await sleep(5000);

  let url = await getCurrentURL();
  console.log('[URL]', url);

  await screenshot('00-initial');

  const bodyText = await getPageText();
  console.log('[PAGE]:', bodyText.substring(0, 600));

  const lowerText = (bodyText || '').toLowerCase();
  const isLogin = lowerText.includes('login') || lowerText.includes('senha') || lowerText.includes('entrar') || lowerText.includes('e-mail');
  console.log('[LOGIN?]', isLogin);

  if (isLogin) {
    console.log('[AUTH] Fazendo login...');

    // Preencher email via React - usar nativeInputValueSetter
    await evalJS(`
      (function() {
        var inputs = document.querySelectorAll('input[type="email"], input[name="email"]');
        if (!inputs.length) inputs = document.querySelectorAll('input');
        if (!inputs.length) return;
        var el = inputs[0];
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, 'user@riwerlabs.com');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);

    await sleep(300);

    await evalJS(`
      (function() {
        var inputs = document.querySelectorAll('input[type="password"]');
        if (!inputs.length) return;
        var el = inputs[0];
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, 'user123');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);

    await sleep(300);

    const btnClicked = await evalJS(`
      (function() {
        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          var t = btns[i].textContent.trim().toLowerCase();
          if (t.includes('entrar') || t.includes('login') || t.includes('acessar') || t === 'ok') {
            btns[i].click();
            return 'OK:' + btns[i].textContent.trim();
          }
        }
        var s = document.querySelector('button[type="submit"]');
        if (s) { s.click(); return 'SUBMIT'; }
        return 'NONE';
      })()
    `);
    console.log('[BTN]', btnClicked);

    await sleep(5000);
    await screenshot('01-after-login-user123');

    url = await getCurrentURL();
    console.log('[URL after login]', url);

    const textAfter = await getPageText();
    const isStillLogin = (textAfter || '').toLowerCase().includes('login') || (textAfter || '').toLowerCase().includes('senha');

    if (isStillLogin) {
      console.log('[AUTH] user123 falhou, tentando admin123...');

      await evalJS(`
        (function() {
          var inputs = document.querySelectorAll('input[type="password"]');
          if (!inputs.length) return;
          var el = inputs[0];
          var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, 'admin123');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        })()
      `);
      await sleep(200);
      await evalJS(`
        (function() {
          var s = document.querySelector('button[type="submit"]');
          if (s) s.click();
          else {
            var btns = document.querySelectorAll('button');
            if (btns.length) btns[btns.length-1].click();
          }
        })()
      `);
      await sleep(4000);
      await screenshot('02-after-login-admin123');
    }
  }

  url = await getCurrentURL();
  console.log('[FINAL URL]', url);

  // Capturar DOM
  const dom = await evalJS('document.documentElement.outerHTML.substring(0, 15000)');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'dom-after-login.html'), dom || '');

  // Capturar todos os elementos interativos para mapeamento
  const elements = await evalJS(`
    JSON.stringify((function() {
      var result = [];
      var all = document.querySelectorAll('a, button, [role="menuitem"], [role="tab"], li a');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var text = el.textContent.trim().replace(/\s+/g, ' ').substring(0, 80);
        if (text) {
          result.push({
            tag: el.tagName,
            text: text,
            href: el.href || null,
            classes: el.className ? el.className.toString().substring(0, 100) : ''
          });
        }
      }
      return result;
    })())
  `);

  let parsedElements = [];
  try { parsedElements = JSON.parse(elements || '[]'); } catch(e) {}

  console.log('\n[ELEMENTS] Total:', parsedElements.length);
  parsedElements.slice(0, 30).forEach(function(el) {
    console.log('  ', el.tag, '|', el.text.substring(0,50));
  });

  // Salvar estado atual
  const report = {
    timestamp: new Date().toISOString(),
    finalURL: url,
    elements: parsedElements.slice(0, 100),
    consoleMsgs: consoleMessages,
    networkErrors: networkErrors
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'report-phase1.json'), JSON.stringify(report, null, 2));
  console.log('\n[DONE] Report salvo');

  ws.close();
  process.exit(0);
}

ws.on('open', function() {
  main().catch(function(err) {
    console.error('FATAL:', err.message, err.stack);
    ws.close();
    process.exit(1);
  });
});
