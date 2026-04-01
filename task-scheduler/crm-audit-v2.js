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

// Colecao global de logs
const logs = {
  console: [],
  network: []
};

// Log por aba (reset a cada aba)
let currentTabLogs = { console: [], network: [] };

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

  // Console API
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = (msg.params.args || []).map(function(a) {
      if (a.type === 'string') return a.value;
      if (a.type === 'number') return String(a.value);
      if (a.description) return a.description;
      if (a.preview && a.preview.description) return a.preview.description;
      return a.type || '';
    }).join(' ');
    const frame = msg.params.stackTrace && msg.params.stackTrace.callFrames && msg.params.stackTrace.callFrames[0];
    const entry = {
      type: msg.params.type,
      text: args,
      url: frame ? (frame.url || '') : '',
      line: frame ? (frame.lineNumber || 0) : 0
    };
    logs.console.push(entry);
    currentTabLogs.console.push(entry);
    if (msg.params.type === 'error') {
      console.log('  [CONSOLE ERROR]', args.substring(0, 250));
    } else if (msg.params.type === 'warning') {
      console.log('  [CONSOLE WARN]', args.substring(0, 200));
    }
  }

  // Log API (inclui erros de rede)
  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    if (e.level === 'verbose') return;
    const entry = {
      type: e.level,
      text: e.text,
      url: e.url || '',
      line: e.lineNumber || 0
    };
    logs.console.push(entry);
    currentTabLogs.console.push(entry);
    if (e.level === 'error' || e.level === 'warning') {
      console.log('  [LOG ' + e.level.toUpperCase() + ']', e.text.substring(0, 200), e.url ? '| ' + e.url.substring(0, 80) : '');
    }
  }

  // Network
  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.status >= 400) {
      const entry = {
        url: r.url,
        status: r.status,
        type: msg.params.type || ''
      };
      logs.network.push(entry);
      currentTabLogs.network.push(entry);
      console.log('  [NET ' + r.status + ']', r.url.substring(0, 120));
    }
  }
});

ws.on('error', function(err) { console.error('WS Error:', err.message); process.exit(1); });

async function evalJS(expression) {
  try {
    const result = await send('Runtime.evaluate', { expression: expression, returnByValue: true });
    if (result && result.result && result.result.type !== 'undefined') return result.result.value;
    return null;
  } catch(e) {
    return null;
  }
}

async function screenshot(name) {
  try {
    const result = await send('Page.captureScreenshot', { format: 'png', quality: 85 });
    const filePath = path.join(OUTPUT_DIR, name + '.png');
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
    console.log('  [SS]', name + '.png (' + Math.round(result.data.length * 0.75 / 1024) + 'KB)');
    return name + '.png';
  } catch(e) {
    console.error('  [SS ERR]', name, e.message);
    return null;
  }
}

async function navigateTo(url) {
  await send('Page.navigate', { url: url });
  await sleep(3500);
  const currentUrl = await evalJS('window.location.href');
  return currentUrl;
}

async function getPageText() {
  return await evalJS('document.body ? document.body.innerText.replace(/\\s+/g, " ").substring(0, 5000) : ""') || '';
}

async function findActionButtons() {
  const result = await evalJS(`
    JSON.stringify((function() {
      var result = [];
      var btns = document.querySelectorAll('button, [role="button"]');
      var keywords = ['novo', 'adicionar', 'criar', 'importar', 'new', 'add', 'create', 'import',
                      'configurar', 'salvar', 'enviar', 'executar', 'testar', 'gerar', 'sync',
                      'atualizar', 'refresh', 'iniciar', 'start', 'run', 'exportar', 'export'];
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().replace(/\\s+/g, ' ');
        var ltext = text.toLowerCase();
        var visible = btns[i].offsetParent !== null || btns[i].offsetWidth > 0;
        if (visible && text.length > 0 && text.length < 80) {
          for (var k = 0; k < keywords.length; k++) {
            if (ltext.includes(keywords[k])) {
              result.push({
                text: text,
                disabled: btns[i].disabled,
                visible: visible,
                classes: btns[i].className ? btns[i].className.toString().substring(0, 60) : ''
              });
              break;
            }
          }
        }
      }
      return result;
    })())
  `);
  try { return JSON.parse(result || '[]'); } catch(e) { return []; }
}

async function findAllButtons() {
  const result = await evalJS(`
    JSON.stringify((function() {
      var result = [];
      var btns = document.querySelectorAll('button, [role="button"]');
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().replace(/\\s+/g, ' ');
        var visible = btns[i].offsetParent !== null;
        if (visible && text.length > 0 && text.length < 100) {
          result.push({
            text: text,
            disabled: btns[i].disabled
          });
        }
      }
      return result;
    })())
  `);
  try { return JSON.parse(result || '[]'); } catch(e) { return []; }
}

async function checkVisualIssues() {
  const result = await evalJS(`
    JSON.stringify((function() {
      var issues = [];

      // Loading spinners visiveis
      var spinners = document.querySelectorAll('[class*="spin"], [class*="loading"], [class*="loader"], .spinner, .loading, [class*="Spin"]');
      var spinnerCount = 0;
      for (var i = 0; i < spinners.length; i++) {
        if (spinners[i].offsetParent !== null) spinnerCount++;
      }
      if (spinnerCount > 0) issues.push('LOADING_SPINNER: ' + spinnerCount + ' spinner(s) visiveis');

      // Mensagens de erro visiveis
      var errorEls = document.querySelectorAll('[class*="error"], [class*="Error"], .alert-danger, [role="alert"]');
      for (var i = 0; i < errorEls.length; i++) {
        var text = errorEls[i].textContent.trim().replace(/\\s+/g, ' ');
        if (text && text.length > 2 && text.length < 500 && errorEls[i].offsetParent !== null) {
          issues.push('DOM_ERROR: ' + text.substring(0, 150));
        }
      }

      // Skeleton loaders
      var skeletons = document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"], [class*="shimmer"], [class*="placeholder"]');
      var skCount = 0;
      for (var i = 0; i < skeletons.length; i++) {
        if (skeletons[i].offsetParent !== null) skCount++;
      }
      if (skCount > 0) issues.push('SKELETON_LOADER: ' + skCount + ' skeleton(s) visiveis');

      // Elementos com overflow horizontal
      var hasHorizontalScroll = document.body && document.body.scrollWidth > window.innerWidth;
      if (hasHorizontalScroll) issues.push('HORIZONTAL_SCROLL: pagina tem scroll horizontal (' + document.body.scrollWidth + 'px > ' + window.innerWidth + 'px)');

      // Imagens quebradas
      var imgs = document.querySelectorAll('img');
      var brokenImgs = 0;
      for (var i = 0; i < imgs.length; i++) {
        if (!imgs[i].complete || imgs[i].naturalWidth === 0) brokenImgs++;
      }
      if (brokenImgs > 0) issues.push('BROKEN_IMAGES: ' + brokenImgs + ' imagem(ns) quebrada(s)');

      return issues;
    })())
  `);
  try { return JSON.parse(result || '[]'); } catch(e) { return []; }
}

async function tryClickButton(buttonText) {
  const escaped = buttonText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
  const result = await evalJS(`
    (function() {
      var btns = document.querySelectorAll('button, [role="button"], a');
      var target = '` + escaped.toLowerCase().substring(0, 50) + `';
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().replace(/\\s+/g, ' ').toLowerCase().substring(0, 50);
        if (text === target || text.startsWith(target.substring(0, Math.min(target.length, 20)))) {
          if (!btns[i].disabled) {
            btns[i].click();
            return 'CLICKED:' + btns[i].textContent.trim().substring(0, 40);
          }
          return 'DISABLED:' + btns[i].textContent.trim().substring(0, 40);
        }
      }
      return 'NOT_FOUND';
    })()
  `);
  return result;
}

async function checkModalOpen() {
  const result = await evalJS(`
    JSON.stringify((function() {
      var modals = [];
      // Buscar dialogs
      var dialogs = document.querySelectorAll('[role="dialog"], dialog, [aria-modal="true"]');
      for (var i = 0; i < dialogs.length; i++) {
        if (dialogs[i].offsetParent !== null || dialogs[i].open) {
          modals.push({
            type: 'dialog',
            role: dialogs[i].getAttribute('role'),
            title: (dialogs[i].querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"]') || {}).textContent || '',
            text: dialogs[i].innerText ? dialogs[i].innerText.replace(/\\s+/g, ' ').substring(0, 200) : ''
          });
        }
      }
      // Buscar overlays/modals por classe
      var overlays = document.querySelectorAll('[class*="modal" i], [class*="dialog" i], [class*="overlay" i], [class*="popup" i]');
      for (var i = 0; i < overlays.length; i++) {
        if (overlays[i].offsetParent !== null && overlays[i].offsetWidth > 100) {
          var titleEl = overlays[i].querySelector('h1, h2, h3, h4, [class*="title" i], [class*="header" i]');
          modals.push({
            type: 'overlay',
            classes: overlays[i].className ? overlays[i].className.toString().substring(0, 60) : '',
            title: titleEl ? titleEl.textContent.trim().substring(0, 80) : '',
            text: overlays[i].innerText ? overlays[i].innerText.replace(/\\s+/g, ' ').substring(0, 200) : ''
          });
        }
      }
      // Deduplicar
      var seen = {};
      return modals.filter(function(m) {
        var key = m.title + m.text.substring(0, 50);
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    })())
  `);
  try { return JSON.parse(result || '[]'); } catch(e) { return []; }
}

async function closeModal() {
  await evalJS(`
    (function() {
      // Tentar botao fechar
      var closes = document.querySelectorAll(
        '[aria-label="Close"], [aria-label="Fechar"], [aria-label="close"], .close, button.close, [data-dismiss="modal"], [class*="close" i][class*="btn" i]'
      );
      for (var i = 0; i < closes.length; i++) {
        if (closes[i].offsetParent !== null) {
          closes[i].click();
          return 'CLOSE_BTN';
        }
      }
      // Cancelar button
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().toLowerCase();
        if (text === 'cancelar' || text === 'cancel' || text === 'fechar' || text === 'close') {
          btns[i].click();
          return 'CANCEL_BTN';
        }
      }
      // ESC
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      return 'ESC';
    })()
  `);
  await sleep(800);
}

async function auditPage(tabName, routePath, ssPrefix) {
  console.log('\n' + '='.repeat(60));
  console.log('ABA: ' + tabName + ' (' + routePath + ')');
  console.log('='.repeat(60));

  // Reset tab logs
  currentTabLogs = { console: [], network: [] };

  // Navegar para a rota
  const url = 'http://localhost:3847' + routePath;
  const finalUrl = await navigateTo(url);
  console.log('[URL]', finalUrl);

  // Esperar conteudo carregar
  await sleep(2000);

  // Screenshot inicial
  const ss1 = await screenshot(ssPrefix + '-01-initial');

  // Texto da pagina
  const pageText = await getPageText();
  console.log('[CONTENT]', pageText.substring(0, 400));

  // Verificar issues visuais
  const visualIssues = await checkVisualIssues();
  if (visualIssues.length > 0) {
    console.log('[VISUAL ISSUES]');
    visualIssues.forEach(function(issue) { console.log('  -', issue); });
  }

  // Listar todos os botoes
  const allBtns = await findAllButtons();
  console.log('[BUTTONS VISIVEIS] (' + allBtns.length + '):', allBtns.map(function(b) { return '"' + b.text.substring(0,30) + '"' + (b.disabled ? '(DISABLED)' : ''); }).join(', '));

  // Encontrar botoes de acao
  const actionBtns = await findActionButtons();
  console.log('[ACTION BUTTONS]:', actionBtns.length);

  // Testar cada botao de acao
  const modalResults = [];
  for (var i = 0; i < actionBtns.length; i++) {
    const btn = actionBtns[i];
    if (btn.disabled) {
      console.log('  [SKIP DISABLED]', btn.text.substring(0, 40));
      continue;
    }

    console.log('\n  [TESTING BTN]', '"' + btn.text.substring(0, 40) + '"');

    const consoleBeforeModal = currentTabLogs.console.length;
    const netBeforeModal = currentTabLogs.network.length;

    const clickResult = await tryClickButton(btn.text);
    console.log('  [CLICK]', clickResult);
    await sleep(2000);

    const modalSS = await screenshot(ssPrefix + '-modal-' + (i + 1) + '-' + btn.text.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20).toLowerCase());
    const modalsOpen = await checkModalOpen();

    const newConsoleErrors = currentTabLogs.console.slice(consoleBeforeModal).filter(function(m) { return m.type === 'error' || m.type === 'warning'; });
    const newNetErrors = currentTabLogs.network.slice(netBeforeModal);

    if (newConsoleErrors.length > 0) {
      console.log('  [CONSOLE ERRORS APOS CLICK]');
      newConsoleErrors.forEach(function(e) { console.log('    [' + e.type.toUpperCase() + ']', e.text.substring(0, 150)); });
    }

    if (modalsOpen.length > 0) {
      console.log('  [MODAL ABRIU]:', modalsOpen[0].title || modalsOpen[0].text.substring(0, 60));
    } else {
      console.log('  [MODAL NAO ABRIU ou pagina mudou]');
    }

    modalResults.push({
      button: btn.text,
      clickResult: clickResult,
      modalOpened: modalsOpen.length > 0,
      modals: modalsOpen,
      screenshot: modalSS,
      newErrors: newConsoleErrors,
      newNetErrors: newNetErrors
    });

    // Fechar modal
    await closeModal();
    await sleep(1000);

    // Verificar se pagina voltou ao estado correto
    const urlAfterClose = await evalJS('window.location.href');
    if (urlAfterClose !== 'http://localhost:3847' + routePath && urlAfterClose !== 'http://localhost:3847' + routePath + '/') {
      console.log('  [URL CHANGED after close]', urlAfterClose, '- renavegando...');
      await navigateTo(url);
      await sleep(2000);
    }
  }

  // Screenshot final
  const ssFinal = await screenshot(ssPrefix + '-99-final');

  return {
    tab: tabName,
    route: routePath,
    finalUrl: finalUrl,
    screenshots: [ss1, ssFinal].filter(Boolean),
    pageTextPreview: pageText.substring(0, 600),
    visualIssues: visualIssues,
    allButtons: allBtns,
    actionButtons: actionBtns,
    modalResults: modalResults,
    consoleErrors: currentTabLogs.console.filter(function(m) { return m.type === 'error'; }),
    consoleWarnings: currentTabLogs.console.filter(function(m) { return m.type === 'warning'; }),
    networkErrors: currentTabLogs.network
  };
}

const TABS = [
  { name: 'Dashboard', route: '/', prefix: '01-dashboard' },
  { name: 'Leads', route: '/leads', prefix: '02-leads' },
  { name: 'Conversas', route: '/conversations', prefix: '03-conversas' },
  { name: 'Campanhas', route: '/campaigns', prefix: '04-campanhas' },
  { name: 'Templates MSG', route: '/templates', prefix: '05-templates' },
  { name: 'Config CRM', route: '/crm-settings', prefix: '06-config-crm' },
  { name: 'Tarefas (EcoTasks)', route: '/tasks', prefix: '07-tasks' },
  { name: 'Base Conhecimento', route: '/knowledge-base', prefix: '08-knowledge-base' },
  { name: 'Memória', route: '/memory', prefix: '09-memory' },
  { name: 'Prompts', route: '/prompts', prefix: '10-prompts' },
  { name: 'Credenciais', route: '/credentials', prefix: '11-credentials' },
  { name: 'Telegram Bot', route: '/telegram', prefix: '12-telegram' }
];

async function main() {
  console.log('\n==============================');
  console.log('CRM FULL AUDIT v2');
  console.log('==============================');
  console.log('Timestamp:', new Date().toISOString());

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');

  // Garantir que estamos na pagina inicial
  await navigateTo('http://localhost:3847/');
  await sleep(2000);
  console.log('[INIT] URL atual:', await evalJS('window.location.href'));

  const results = [];

  for (var i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    try {
      const result = await auditPage(tab.name, tab.route, tab.prefix);
      results.push(result);
    } catch(e) {
      console.error('[TAB ERROR]', tab.name, ':', e.message);
      results.push({ tab: tab.name, route: tab.route, error: e.message });
    }
  }

  // RELATORIO FINAL
  console.log('\n\n' + '='.repeat(70));
  console.log('RELATORIO FINAL CONSOLIDADO');
  console.log('='.repeat(70));

  const finalReport = {
    timestamp: new Date().toISOString(),
    tabsAudited: results.length,
    globalConsoleErrors: logs.console.filter(function(m) { return m.type === 'error'; }),
    globalNetworkErrors: logs.network,
    tabs: results,
    summary: {}
  };

  // Summary
  var totalConsoleErrors = 0;
  var totalConsoleWarnings = 0;
  var totalNetworkErrors = 0;
  var brokenModals = [];
  var tabsWithVisualIssues = [];
  var tabsWithErrors = [];

  results.forEach(function(r) {
    if (r.error) return;
    totalConsoleErrors += (r.consoleErrors || []).length;
    totalConsoleWarnings += (r.consoleWarnings || []).length;
    totalNetworkErrors += (r.networkErrors || []).length;

    if (r.visualIssues && r.visualIssues.length > 0) {
      tabsWithVisualIssues.push({ tab: r.tab, issues: r.visualIssues });
    }
    if ((r.consoleErrors || []).length > 0 || (r.networkErrors || []).length > 0) {
      tabsWithErrors.push({ tab: r.tab, consoleErrors: (r.consoleErrors || []).length, networkErrors: (r.networkErrors || []).length });
    }
    (r.modalResults || []).forEach(function(m) {
      if (!m.modalOpened && m.clickResult && !m.clickResult.startsWith('NOT_FOUND')) {
        brokenModals.push({ tab: r.tab, button: m.button, clickResult: m.clickResult });
      }
    });
  });

  finalReport.summary = {
    totalConsoleErrors: totalConsoleErrors,
    totalConsoleWarnings: totalConsoleWarnings,
    totalNetworkErrors: totalNetworkErrors,
    tabsWithErrors: tabsWithErrors,
    tabsWithVisualIssues: tabsWithVisualIssues,
    brokenModals: brokenModals
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'full-report-v2.json'), JSON.stringify(finalReport, null, 2));

  // IMPRIMIR RELATORIO
  console.log('\n--- ERROS DE CONSOLE POR ABA ---');
  results.forEach(function(r) {
    if (r.error) {
      console.log('\n[' + r.tab + '] ERRO NA AUDITORIA:', r.error);
      return;
    }
    const errs = r.consoleErrors || [];
    const warns = r.consoleWarnings || [];
    const nets = r.networkErrors || [];
    if (errs.length > 0 || warns.length > 0 || nets.length > 0) {
      console.log('\n[' + r.tab + ' (' + r.route + ')]');
      errs.forEach(function(e) { console.log('  [ERROR]', e.text.substring(0, 200), e.url ? '| ' + e.url.substring(0, 80) : ''); });
      warns.forEach(function(e) { console.log('  [WARN]', e.text.substring(0, 150)); });
      nets.forEach(function(e) { console.log('  [NET ' + e.status + ']', e.url.substring(0, 120)); });
    } else {
      console.log('\n[' + r.tab + '] OK - Sem erros');
    }
  });

  console.log('\n--- ISSUES VISUAIS ---');
  if (tabsWithVisualIssues.length === 0) {
    console.log('Nenhum problema visual detectado.');
  } else {
    tabsWithVisualIssues.forEach(function(t) {
      console.log('\n[' + t.tab + ']');
      t.issues.forEach(function(issue) { console.log('  -', issue); });
    });
  }

  console.log('\n--- MODAIS ---');
  results.forEach(function(r) {
    if (r.error || !r.modalResults) return;
    if (r.modalResults.length === 0) {
      console.log('[' + r.tab + '] Nenhum botao de acao testado');
      return;
    }
    r.modalResults.forEach(function(m) {
      const status = m.modalOpened ? 'ABRIU OK' : (m.clickResult.startsWith('NOT_FOUND') ? 'BTN NAO ENCONTRADO' : 'NAO ABRIU MODAL');
      console.log('[' + r.tab + '] "' + m.button.substring(0, 40) + '" -> ' + status);
      if (m.newErrors && m.newErrors.length > 0) {
        m.newErrors.forEach(function(e) { console.log('  [ERROR apos click]', e.text.substring(0, 150)); });
      }
    });
  });

  console.log('\n--- BOTOES DISPONIVEIS POR ABA ---');
  results.forEach(function(r) {
    if (r.error || !r.allButtons) return;
    const btns = r.allButtons.map(function(b) { return '"' + b.text.substring(0,25) + '"' + (b.disabled ? '(D)' : ''); });
    console.log('[' + r.tab + ']', btns.join(', ') || '(nenhum)');
  });

  console.log('\n--- RESUMO FINAL ---');
  console.log('Total erros de console:', totalConsoleErrors);
  console.log('Total warnings de console:', totalConsoleWarnings);
  console.log('Total erros de rede (4xx/5xx):', totalNetworkErrors);
  console.log('Abas com problemas:', tabsWithErrors.length);
  console.log('Modais que nao abriram:', brokenModals.length);
  console.log('Abas com issues visuais:', tabsWithVisualIssues.length);

  console.log('\n[RELATORIO SALVO]:', path.join(OUTPUT_DIR, 'full-report-v2.json'));
  console.log('\n=== AUDIT CONCLUIDO ===');

  ws.close();
  process.exit(0);
}

ws.on('open', function() {
  main().catch(function(err) {
    console.error('FATAL:', err.message, err.stack);
    try { fs.writeFileSync(path.join(OUTPUT_DIR, 'fatal.txt'), err.message + '\n' + err.stack); } catch(e2) {}
    ws.close();
    process.exit(1);
  });
});
