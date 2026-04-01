const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PAGE_ID = '3745CEDB449876598A590E2ECC9722B9';
const WS_URL = 'ws://localhost:9333/devtools/page/' + PAGE_ID;
const OUTPUT_DIR = 'D:\\crm-audit';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const ws = new WebSocket(WS_URL);
let msgId = 1;
const pendingCallbacks = {};
const allConsoleMessages = [];
const networkErrors = [];
const networkRequests = {};

// Report por aba
const tabReports = {};

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
    const args = (msg.params.args || []).map(function(a) {
      if (a.type === 'object' && a.preview) {
        return JSON.stringify(a.preview.properties ? a.preview.properties.map(function(p) { return p.name + ':' + p.value; }) : a.preview.description);
      }
      return a.value !== undefined ? String(a.value) : (a.description || a.type || '');
    }).join(' ');
    const frame = msg.params.stackTrace && msg.params.stackTrace.callFrames && msg.params.stackTrace.callFrames[0];
    allConsoleMessages.push({
      type: msg.params.type,
      text: args,
      url: frame ? frame.url : '',
      line: frame ? frame.lineNumber : 0,
      ts: new Date().toISOString()
    });
    if (msg.params.type === 'error' || msg.params.type === 'warning') {
      console.log('[CONSOLE ' + msg.params.type.toUpperCase() + ']', args.substring(0, 200));
    }
  }

  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    allConsoleMessages.push({
      type: e.level,
      text: e.text,
      url: e.url || '',
      line: e.lineNumber || 0,
      ts: new Date().toISOString()
    });
    if (e.level === 'error' || e.level === 'warning') {
      console.log('[LOG ' + e.level.toUpperCase() + ']', e.text.substring(0, 200));
    }
  }

  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (!networkRequests[msg.params.requestId]) networkRequests[msg.params.requestId] = {};
    networkRequests[msg.params.requestId].url = r.url;
    networkRequests[msg.params.requestId].status = r.status;
    if (r.status >= 400) {
      networkErrors.push({ url: r.url, status: r.status, ts: new Date().toISOString() });
      console.log('[NET ERR]', r.status, r.url.substring(0, 100));
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
    const result = await send('Page.captureScreenshot', { format: 'png', quality: 80 });
    const filePath = path.join(OUTPUT_DIR, name + '.png');
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
    console.log('  [SS] ' + name + '.png');
    return filePath;
  } catch(e) {
    console.error('  [SS ERR] ' + name + ': ' + e.message);
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
    return null;
  }
}

async function getPageText() {
  return await evalJS('document.body ? document.body.innerText.replace(/\\s+/g, " ").substring(0, 5000) : ""');
}

async function getCurrentURL() {
  return await evalJS('window.location.href');
}

// Clicar em link de navegacao pelo texto
async function clickNav(text) {
  const js = `
    (function() {
      var candidates = document.querySelectorAll('a, button, [role="menuitem"], [role="tab"]');
      var target = '` + text.toLowerCase().replace(/'/g, "\\'") + `';
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var elText = el.textContent.trim().replace(/\\s+/g, ' ').toLowerCase();
        if (elText === target || elText.startsWith(target)) {
          el.click();
          return 'CLICKED:' + el.textContent.trim().substring(0, 40);
        }
      }
      // Partial match fallback
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var elText = el.textContent.trim().replace(/\\s+/g, ' ').toLowerCase();
        if (elText.includes(target)) {
          el.click();
          return 'PARTIAL:' + el.textContent.trim().substring(0, 40);
        }
      }
      return 'NOT_FOUND:' + target;
    })()
  `;
  return await evalJS(js);
}

// Capturar erros de console desde o ultimo snapshot
function getNewConsoleErrors(since) {
  return allConsoleMessages.filter(function(m) {
    return m.ts >= since && (m.type === 'error' || m.type === 'warning');
  });
}

function getNewNetworkErrors(since) {
  return networkErrors.filter(function(e) { return e.ts >= since; });
}

// Encontrar botoes de acao na pagina atual
async function findActionButtons() {
  const js = `
    JSON.stringify((function() {
      var result = [];
      var btns = document.querySelectorAll('button, [role="button"]');
      var keywords = ['novo', 'adicionar', 'criar', 'importar', 'new', 'add', 'create', 'import', 'editar', 'configurar', 'salvar', 'enviar', 'executar', 'testar'];
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().replace(/\\s+/g, ' ').toLowerCase();
        for (var k = 0; k < keywords.length; k++) {
          if (text.includes(keywords[k])) {
            result.push({
              text: btns[i].textContent.trim().substring(0, 60),
              disabled: btns[i].disabled,
              visible: btns[i].offsetParent !== null
            });
            break;
          }
        }
      }
      return result;
    })())
  `;
  try {
    return JSON.parse(await evalJS(js) || '[]');
  } catch(e) { return []; }
}

// Tentar abrir modal e capturar screenshot
async function tryOpenModal(buttonText, tabName, modalIndex) {
  const since = new Date().toISOString();
  const clickResult = await clickNav(buttonText);
  console.log('    [MODAL] Click "' + buttonText + '":', clickResult);
  await sleep(2000);

  const ssName = tabName.replace(/\s/g, '-').toLowerCase() + '-modal-' + modalIndex;
  const ssPath = await screenshot(ssName);

  // Verificar se modal abriu
  const modalCheck = await evalJS(`
    (function() {
      var modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dialog"], [class*="popup"], [class*="overlay"]');
      var visible = [];
      for (var i = 0; i < modals.length; i++) {
        if (modals[i].offsetParent !== null || modals[i].style.display !== 'none') {
          visible.push({
            role: modals[i].getAttribute('role'),
            classes: modals[i].className ? modals[i].className.toString().substring(0, 80) : '',
            text: modals[i].innerText ? modals[i].innerText.substring(0, 100) : ''
          });
        }
      }
      return JSON.stringify(visible);
    })()
  `);

  let modals = [];
  try { modals = JSON.parse(modalCheck || '[]'); } catch(e) {}

  const consoleErrs = getNewConsoleErrors(since);
  const netErrs = getNewNetworkErrors(since);

  // Tentar fechar o modal
  await evalJS(`
    (function() {
      var closes = document.querySelectorAll('[aria-label="Close"], [aria-label="Fechar"], .close, button.close, [data-dismiss="modal"]');
      if (closes.length) { closes[0].click(); return; }
      // ESC key
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    })()
  `);
  await sleep(500);

  return {
    button: buttonText,
    clickResult: clickResult,
    modalOpened: modals.length > 0,
    modals: modals,
    screenshot: ssPath,
    consoleErrors: consoleErrs,
    networkErrors: netErrs
  };
}

async function auditTab(tabName) {
  console.log('\n' + '='.repeat(60));
  console.log('AUDITANDO ABA: ' + tabName);
  console.log('='.repeat(60));

  const since = new Date().toISOString();

  // Clicar na aba
  const clickResult = await clickNav(tabName);
  console.log('[CLICK]', clickResult);
  await sleep(3000);

  const url = await getCurrentURL();
  console.log('[URL]', url);

  const ssName = tabName.replace(/\s/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  const ssPath = await screenshot(ssName);

  const pageText = await getPageText();
  console.log('[TEXT]', pageText.substring(0, 300));

  const actionButtons = await findActionButtons();
  console.log('[BUTTONS]', actionButtons.map(function(b) { return b.text; }).join(' | '));

  const consoleErrs = getNewConsoleErrors(since);
  const netErrs = getNewNetworkErrors(since);

  console.log('[CONSOLE ERRORS]', consoleErrs.length);
  console.log('[NET ERRORS]', netErrs.length);

  // Testar modais
  const modalResults = [];
  for (var i = 0; i < actionButtons.length && i < 5; i++) {
    const btn = actionButtons[i];
    if (!btn.disabled && btn.visible) {
      const modalResult = await tryOpenModal(btn.text, ssName, i);
      modalResults.push(modalResult);
    } else {
      console.log('  [SKIP BTN]', btn.text, btn.disabled ? '(disabled)' : '(not visible)');
    }
  }

  // Verificar loading infinito
  const loadingCheck = await evalJS(`
    (function() {
      var spinners = document.querySelectorAll('[class*="spin"], [class*="loading"], [class*="loader"], .spinner, .loading');
      var visible = [];
      for (var i = 0; i < spinners.length; i++) {
        if (spinners[i].offsetParent !== null) {
          visible.push(spinners[i].className ? spinners[i].className.toString().substring(0, 80) : spinners[i].tagName);
        }
      }
      return JSON.stringify(visible);
    })()
  `);
  let loadingEls = [];
  try { loadingEls = JSON.parse(loadingCheck || '[]'); } catch(e) {}

  // Verificar erros visiveis no DOM
  const domErrors = await evalJS(`
    (function() {
      var errors = [];
      var redEls = document.querySelectorAll('[class*="error"], [class*="Error"], .alert-danger, .text-red, .text-danger');
      for (var i = 0; i < redEls.length; i++) {
        var text = redEls[i].textContent.trim().replace(/\\s+/g, ' ');
        if (text && text.length > 2 && text.length < 500) {
          errors.push(text.substring(0, 200));
        }
      }
      return JSON.stringify(errors.slice(0, 10));
    })()
  `);
  let domErrorsList = [];
  try { domErrorsList = JSON.parse(domErrors || '[]'); } catch(e) {}

  const report = {
    tab: tabName,
    url: url,
    screenshot: ssPath,
    pageTextPreview: pageText.substring(0, 500),
    actionButtons: actionButtons,
    consoleErrors: consoleErrs,
    networkErrors: netErrs,
    modalsTestResults: modalResults,
    loadingElements: loadingEls,
    domErrors: domErrorsList
  };

  tabReports[tabName] = report;

  if (consoleErrs.length > 0) {
    console.log('\n[CONSOLE ERRORS DETAIL]:');
    consoleErrs.forEach(function(e) { console.log('  [' + e.type.toUpperCase() + ']', e.text.substring(0, 150)); });
  }

  if (netErrs.length > 0) {
    console.log('\n[NETWORK ERRORS DETAIL]:');
    netErrs.forEach(function(e) { console.log('  [' + e.status + ']', e.url.substring(0, 120)); });
  }

  if (loadingEls.length > 0) {
    console.log('\n[LOADING ELEMENTS FOUND]:', loadingEls.join(', '));
  }

  if (domErrorsList.length > 0) {
    console.log('\n[DOM ERRORS]:', domErrorsList.join(' | '));
  }

  return report;
}

// Abas para auditar
const TABS_TO_AUDIT = [
  'Dashboard',
  'Leads',
  'Campanhas',
  'Conversas',
  'EcoTasks',
  'Prompts',
  'Templates',
  'Base Conhecimento',
  'Credenciais',
  'Memória',
  'Config CRM'
];

async function main() {
  console.log('\n=== CRM FULL AUDIT - INICIO ===\n');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Output:', OUTPUT_DIR);

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');

  console.log('\n[INIT] Verificando estado atual...');
  await sleep(2000);

  const url = await getCurrentURL();
  console.log('[URL ATUAL]', url);

  const text = await getPageText();
  console.log('[TEXTO ATUAL]', text.substring(0, 300));

  await screenshot('START-state');

  // Auditar cada aba
  for (var t = 0; t < TABS_TO_AUDIT.length; t++) {
    const tabName = TABS_TO_AUDIT[t];
    try {
      await auditTab(tabName);
    } catch(e) {
      console.error('[ABA ERROR] ' + tabName + ':', e.message);
      tabReports[tabName] = { tab: tabName, error: e.message };
    }
    await sleep(1000);
  }

  // Compilar relatorio final
  console.log('\n\n' + '='.repeat(70));
  console.log('RELATORIO FINAL');
  console.log('='.repeat(70));

  const finalReport = {
    timestamp: new Date().toISOString(),
    tabsAudited: Object.keys(tabReports).length,
    allConsoleErrors: allConsoleMessages.filter(function(m) { return m.type === 'error'; }),
    allConsoleWarnings: allConsoleMessages.filter(function(m) { return m.type === 'warning'; }),
    allNetworkErrors: networkErrors,
    tabReports: tabReports,
    summary: {
      totalConsoleErrors: allConsoleMessages.filter(function(m) { return m.type === 'error'; }).length,
      totalConsoleWarnings: allConsoleMessages.filter(function(m) { return m.type === 'warning'; }).length,
      totalNetworkErrors: networkErrors.length,
      tabsWithErrors: [],
      brokenModals: [],
      loadingIssues: []
    }
  };

  // Calcular summary
  Object.keys(tabReports).forEach(function(tabName) {
    const r = tabReports[tabName];
    if (r.consoleErrors && r.consoleErrors.length > 0) {
      finalReport.summary.tabsWithErrors.push({ tab: tabName, errors: r.consoleErrors.length });
    }
    if (r.modalsTestResults) {
      r.modalsTestResults.forEach(function(m) {
        if (!m.modalOpened) {
          finalReport.summary.brokenModals.push({ tab: tabName, button: m.button });
        }
      });
    }
    if (r.loadingElements && r.loadingElements.length > 0) {
      finalReport.summary.loadingIssues.push({ tab: tabName, elements: r.loadingElements });
    }
  });

  // Salvar relatorio
  fs.writeFileSync(path.join(OUTPUT_DIR, 'full-report.json'), JSON.stringify(finalReport, null, 2));
  console.log('\n[SAVED] Relatorio completo: D:\\crm-audit\\full-report.json');

  // Imprimir summary
  console.log('\n--- SUMMARY ---');
  console.log('Total Console Errors:', finalReport.summary.totalConsoleErrors);
  console.log('Total Console Warnings:', finalReport.summary.totalConsoleWarnings);
  console.log('Total Network Errors:', finalReport.summary.totalNetworkErrors);

  console.log('\nAbas com erros:');
  finalReport.summary.tabsWithErrors.forEach(function(t) {
    console.log('  -', t.tab, '(' + t.errors + ' erros)');
  });

  console.log('\nModais quebrados:');
  finalReport.summary.brokenModals.forEach(function(m) {
    console.log('  -', m.tab, ':', m.button);
  });

  console.log('\nLoading infinito detectado:');
  finalReport.summary.loadingIssues.forEach(function(l) {
    console.log('  -', l.tab, ':', l.elements.join(', '));
  });

  // Todos os erros de console
  if (finalReport.allConsoleErrors.length > 0) {
    console.log('\n--- TODOS OS ERROS DE CONSOLE ---');
    finalReport.allConsoleErrors.forEach(function(e) {
      console.log('[ERROR]', e.text.substring(0, 200), '|', e.url ? e.url.substring(0, 80) : '');
    });
  }

  if (finalReport.allNetworkErrors.length > 0) {
    console.log('\n--- TODOS OS ERROS DE REDE ---');
    finalReport.allNetworkErrors.forEach(function(e) {
      console.log('[' + e.status + ']', e.url.substring(0, 150));
    });
  }

  console.log('\n=== AUDIT CONCLUIDO ===');
  ws.close();
  process.exit(0);
}

ws.on('open', function() {
  main().catch(function(err) {
    console.error('FATAL:', err.message);
    try { fs.writeFileSync(path.join(OUTPUT_DIR, 'fatal-error.txt'), err.message + '\n' + err.stack); } catch(e) {}
    ws.close();
    process.exit(1);
  });
});
