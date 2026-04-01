// Audit detalhado - segunda fase
// Foca nas paginas com problemas e nos botoes que nao abriram modais
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PAGE_ID = '3745CEDB449876598A590E2ECC9722B9';
const WS_URL = 'ws://localhost:9333/devtools/page/' + PAGE_ID;
const OUTPUT_DIR = 'D:\\crm-audit';

const ws = new WebSocket(WS_URL);
let msgId = 1;
const pendingCallbacks = {};
const allLogs = [];

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
      if (a.type === 'string') return a.value;
      if (a.type === 'number') return String(a.value);
      if (a.description) return a.description;
      return a.type || '';
    }).join(' ');
    if (msg.params.type === 'error' || msg.params.type === 'warning') {
      allLogs.push({ source: 'console', type: msg.params.type, text: args });
      console.log('[CONSOLE ' + msg.params.type.toUpperCase() + ']', args.substring(0, 300));
    }
  }
  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    if (e.level === 'verbose') return;
    if (e.level === 'error' || e.level === 'warning') {
      allLogs.push({ source: 'log', type: e.level, text: e.text, url: e.url });
      console.log('[LOG ' + e.level.toUpperCase() + ']', e.text.substring(0, 200));
    }
  }
  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.status >= 400) {
      allLogs.push({ source: 'network', type: 'error', status: r.status, url: r.url });
      console.log('[NET ' + r.status + ']', r.url.substring(0, 120));
    }
  }
});

ws.on('error', function(err) { console.error('WS Error:', err.message); process.exit(1); });

async function evalJS(expression) {
  try {
    const result = await send('Runtime.evaluate', { expression: expression, returnByValue: true });
    if (result && result.result && result.result.type !== 'undefined') return result.result.value;
    return null;
  } catch(e) { return null; }
}

async function screenshot(name) {
  try {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(OUTPUT_DIR, name + '.png');
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
    console.log('[SS]', name + '.png');
    return filePath;
  } catch(e) {
    console.error('[SS ERR]', name, e.message);
    return null;
  }
}

async function navigate(url) {
  await send('Page.navigate', { url: url });
  await sleep(4000);
}

async function getPageText() {
  return await evalJS('document.body ? document.body.innerText.replace(/\\s+/g, " ").substring(0, 4000) : ""') || '';
}

async function main() {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');

  console.log('\n=== AUDIT DETALHADO - FASE 2 ===\n');

  const details = {};

  // ============================================
  // 1. LEADS - N.slice is not a function
  // ============================================
  console.log('\n[LEADS] Investigando erro "N.slice is not a function"...');
  await navigate('http://localhost:3847/leads');
  await sleep(2000);

  const leadsText = await getPageText();
  const leadsDom = await evalJS('document.documentElement.outerHTML');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'leads-dom.html'), leadsDom || '');

  // Tentar pegar stack trace do erro
  const leadsErrorStack = await evalJS(`
    (function() {
      try {
        var errText = document.querySelector('[class*="error"], [class*="Error"]');
        return errText ? errText.innerHTML : 'NO_ERROR_EL';
      } catch(e) { return e.message; }
    })()
  `);
  console.log('[LEADS ERROR ELEMENT]', leadsErrorStack ? leadsErrorStack.substring(0, 300) : 'null');

  // Verificar dados que chegaram da API
  const leadsApiCheck = await evalJS(`
    JSON.stringify((function() {
      var xhrData = window.__lastApiResponse;
      return { xhrData: xhrData, hasLeadsData: typeof window.__leadsData !== 'undefined' };
    })())
  `);
  console.log('[LEADS API DATA]', leadsApiCheck);

  // Tentar clicar em "Tentar novamente"
  console.log('[LEADS] Clicando "Tentar novamente"...');
  await evalJS(`
    (function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.includes('Tentar')) {
          btns[i].click();
          return;
        }
      }
    })()
  `);
  await sleep(3000);

  const leadsAfterRetry = await getPageText();
  await screenshot('detail-leads-after-retry');
  console.log('[LEADS after retry]', leadsAfterRetry.substring(0, 300));

  details.leads = {
    errorText: leadsText,
    afterRetry: leadsAfterRetry
  };

  // ============================================
  // 2. CONVERSAS - h.find is not a function
  // ============================================
  console.log('\n[CONVERSAS] Investigando erro "h.find is not a function"...');
  await navigate('http://localhost:3847/conversations');

  const convsText = await getPageText();
  const convsDom = await evalJS('document.documentElement.outerHTML');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'conversations-dom.html'), convsDom || '');

  details.conversations = { errorText: convsText };

  // ============================================
  // 3. CAMPANHAS - x.map is not a function
  // ============================================
  console.log('\n[CAMPANHAS] Investigando erro "x.map is not a function"...');
  await navigate('http://localhost:3847/campaigns');

  const campText = await getPageText();
  const campDom = await evalJS('document.documentElement.outerHTML');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'campaigns-dom.html'), campDom || '');

  details.campaigns = { errorText: campText };

  // ============================================
  // 4. TEMPLATES MSG - c.filter is not a function
  // ============================================
  console.log('\n[TEMPLATES] Investigando erro "c.filter is not a function"...');
  await navigate('http://localhost:3847/templates');

  const templText = await getPageText();
  details.templates = { errorText: templText };

  // ============================================
  // 5. DASHBOARD - API 404
  // ============================================
  console.log('\n[DASHBOARD] Investigando API /api/crm/dashboard 404...');
  await navigate('http://localhost:3847/');
  await sleep(2000);

  // Verificar se a API existe
  const dashApiResult = await evalJS(`
    (function() {
      return new Promise(function(resolve) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            resolve({ status: xhr.status, response: xhr.responseText.substring(0, 500) });
          }
        };
        xhr.open('GET', '/api/crm/dashboard', true);
        xhr.send();
        setTimeout(function() { resolve({ status: 'TIMEOUT' }); }, 5000);
      });
    })()
  `);

  // Usar fetch para testar API
  const dashFetchResult = await send('Runtime.evaluate', {
    expression: `
      fetch('/api/crm/dashboard').then(r => r.text()).then(t => r_status + '|' + t.substring(0, 200)).catch(e => 'ERROR:' + e.message)
    `,
    returnByValue: false,
    awaitPromise: true
  }).catch(function(e) { return { result: { value: 'EVAL_ERR: ' + e.message } }; });

  // Testar API com fetch correto
  let dashApiStatus = 'unknown';
  try {
    const fetchTest = await send('Runtime.evaluate', {
      expression: `
        (async function() {
          try {
            const r = await fetch('/api/crm/dashboard');
            const t = await r.text();
            return r.status + '|' + t.substring(0, 300);
          } catch(e) {
            return 'FETCH_ERROR:' + e.message;
          }
        })()
      `,
      returnByValue: true,
      awaitPromise: true
    });
    dashApiStatus = fetchTest.result ? fetchTest.result.value : 'null result';
  } catch(e) {
    dashApiStatus = 'EVAL_ERROR: ' + e.message;
  }
  console.log('[DASH API STATUS]', dashApiStatus);

  // Verificar quais APIs CRM existem (testar rotas comuns)
  const apiRoutes = [
    '/api/crm/health',
    '/api/crm/leads',
    '/api/crm/campaigns',
    '/api/crm/templates',
    '/api/crm/dashboard',
    '/api/crm/stats',
    '/api/health'
  ];

  console.log('\n[API ROUTES TEST]');
  const apiResults = {};
  for (var r = 0; r < apiRoutes.length; r++) {
    const route = apiRoutes[r];
    try {
      const testResult = await send('Runtime.evaluate', {
        expression: '(async function() { try { const r = await fetch("' + route + '"); return r.status + ""; } catch(e) { return "ERROR"; } })()',
        returnByValue: true,
        awaitPromise: true
      });
      const status = testResult.result ? testResult.result.value : 'null';
      apiResults[route] = status;
      console.log('  ' + route + ' ->', status);
    } catch(e) {
      apiResults[route] = 'EVAL_ERROR';
    }
    await sleep(200);
  }

  details.dashboard = {
    dashApiStatus: dashApiStatus,
    apiRoutes: apiResults
  };

  // ============================================
  // 6. CONFIG CRM - "Salvar Conta" comportamento
  // ============================================
  console.log('\n[CONFIG CRM] Investigando "Salvar Conta"...');
  await navigate('http://localhost:3847/crm-settings');
  await sleep(2000);

  await screenshot('detail-config-crm-initial');
  const configText = await getPageText();
  console.log('[CONFIG TEXT]', configText.substring(0, 500));

  // Ver campos do formulario
  const configFormFields = await evalJS(`
    JSON.stringify((function() {
      var fields = [];
      var inputs = document.querySelectorAll('input, select, textarea');
      for (var i = 0; i < inputs.length; i++) {
        fields.push({
          tag: inputs[i].tagName,
          type: inputs[i].type,
          name: inputs[i].name,
          id: inputs[i].id,
          placeholder: inputs[i].placeholder,
          value: inputs[i].value ? inputs[i].value.substring(0, 50) : '',
          required: inputs[i].required
        });
      }
      return fields;
    })())
  `);
  console.log('[CONFIG FORM FIELDS]', configFormFields);

  // Checar as tabs da Config CRM
  const configTabs = await evalJS(`
    JSON.stringify((function() {
      var btns = document.querySelectorAll('button, [role="tab"]');
      var tabs = [];
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim();
        if (text && text.length < 40) {
          tabs.push({ text: text, active: btns[i].getAttribute('aria-selected') === 'true' || btns[i].classList.contains('active') });
        }
      }
      return tabs;
    })())
  `);
  console.log('[CONFIG TABS]', configTabs);

  // Testar cada tab de config
  const configTabNames = ['Conta', 'Evolution API', 'Email SMTP/IMAP', 'Agente'];
  for (var ct = 0; ct < configTabNames.length; ct++) {
    const tabName = configTabNames[ct];
    console.log('\n  [CONFIG TAB]', tabName);

    await evalJS(`
      (function() {
        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].textContent.trim() === '` + tabName + `') {
            btns[i].click();
            return;
          }
        }
      })()
    `);
    await sleep(1500);

    const tabText = await getPageText();
    console.log('  [TEXT]', tabText.substring(0, 200));

    await screenshot('detail-config-crm-tab-' + tabName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());

    // Verificar campos desta tab
    const tabFields = await evalJS(`
      JSON.stringify((function() {
        var inputs = document.querySelectorAll('input, textarea');
        var visible = [];
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].offsetParent !== null) {
            visible.push({
              type: inputs[i].type,
              name: inputs[i].name,
              id: inputs[i].id,
              placeholder: inputs[i].placeholder,
              value: inputs[i].value ? '(has value)' : '(empty)',
              required: inputs[i].required
            });
          }
        }
        return visible;
      })())
    `);
    console.log('  [FIELDS]', tabFields);
  }

  // ============================================
  // 7. PROMPTS - "Novo Template" comportamento
  // ============================================
  console.log('\n[PROMPTS] Investigando "Novo Template"...');
  await navigate('http://localhost:3847/prompts');
  await sleep(2000);

  await screenshot('detail-prompts-initial');
  const promptsText = await getPageText();
  console.log('[PROMPTS TEXT]', promptsText.substring(0, 300));

  // Ver DOM detalhado para encontrar o modal
  const promptsDom = await evalJS('document.documentElement.outerHTML');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'prompts-dom.html'), promptsDom || '');

  // Clicar em "Novo Template"
  console.log('[PROMPTS] Clicando Novo Template...');
  const novoTemplateResult = await evalJS(`
    (function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.trim().toLowerCase().includes('novo template')) {
          btns[i].click();
          return 'CLICKED';
        }
      }
      return 'NOT_FOUND';
    })()
  `);
  console.log('[CLICK]', novoTemplateResult);
  await sleep(2500);

  await screenshot('detail-prompts-after-click');
  const promptsAfterClick = await getPageText();
  console.log('[PROMPTS after click]', promptsAfterClick.substring(0, 300));

  // Verificar se modal existe mas esta oculto
  const promptsModalCheck = await evalJS(`
    JSON.stringify((function() {
      var allDivs = document.querySelectorAll('div');
      var modals = [];
      for (var i = 0; i < allDivs.length; i++) {
        var cls = allDivs[i].className ? allDivs[i].className.toString() : '';
        if (cls.toLowerCase().includes('modal') || cls.toLowerCase().includes('dialog') || cls.toLowerCase().includes('overlay')) {
          modals.push({
            classes: cls.substring(0, 80),
            visible: allDivs[i].offsetParent !== null,
            display: window.getComputedStyle(allDivs[i]).display,
            opacity: window.getComputedStyle(allDivs[i]).opacity,
            zIndex: window.getComputedStyle(allDivs[i]).zIndex,
            text: allDivs[i].innerText ? allDivs[i].innerText.substring(0, 100) : ''
          });
        }
      }
      return modals.slice(0, 10);
    })())
  `);
  console.log('[PROMPTS MODAL ELEMENTS]', promptsModalCheck);

  // DOM após click
  const promptsDomAfterClick = await evalJS('document.documentElement.outerHTML');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'prompts-dom-after-click.html'), promptsDomAfterClick || '');

  details.prompts = {
    clickResult: novoTemplateResult,
    textAfterClick: promptsAfterClick.substring(0, 300),
    modalCheck: promptsModalCheck
  };

  // ============================================
  // 8. TAREFAS - Nova Tarefa button
  // ============================================
  console.log('\n[TAREFAS] Testando "Nova Tarefa"...');
  await navigate('http://localhost:3847/tasks');
  await sleep(2000);

  await screenshot('detail-tasks-initial');
  const tasksText = await getPageText();
  console.log('[TASKS TEXT]', tasksText.substring(0, 400));

  // Clicar Nova Tarefa
  console.log('[TASKS] Clicando Nova Tarefa...');
  const novaTarefaResult = await evalJS(`
    (function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().toLowerCase();
        if (text.includes('nova tarefa') || text.includes('new task')) {
          btns[i].click();
          return 'CLICKED: ' + btns[i].textContent.trim();
        }
      }
      return 'NOT_FOUND';
    })()
  `);
  console.log('[CLICK]', novaTarefaResult);
  await sleep(2500);

  await screenshot('detail-tasks-after-nova-tarefa');
  const tasksAfterClick = await getPageText();
  console.log('[TASKS after click]', tasksAfterClick.substring(0, 300));

  const tasksModalCheck = await evalJS(`
    JSON.stringify((function() {
      var dialogs = document.querySelectorAll('[role="dialog"], dialog');
      var result = [];
      for (var i = 0; i < dialogs.length; i++) {
        result.push({
          open: dialogs[i].open !== undefined ? dialogs[i].open : true,
          text: dialogs[i].innerText ? dialogs[i].innerText.replace(/\\s+/g, ' ').substring(0, 200) : ''
        });
      }
      // Tambem checar por overlays
      var overlays = document.querySelectorAll('[class*="modal" i], [class*="dialog" i]');
      for (var i = 0; i < overlays.length; i++) {
        if (overlays[i].offsetParent !== null) {
          result.push({
            classes: overlays[i].className ? overlays[i].className.toString().substring(0, 60) : '',
            text: overlays[i].innerText ? overlays[i].innerText.replace(/\\s+/g, ' ').substring(0, 200) : ''
          });
        }
      }
      return result;
    })())
  `);
  console.log('[TASKS MODAL]', tasksModalCheck);

  details.tasks = {
    clickResult: novaTarefaResult,
    textAfterClick: tasksAfterClick.substring(0, 300),
    modalCheck: tasksModalCheck
  };

  // ============================================
  // 9. MEMORIA - "Nova Sessao" button
  // ============================================
  console.log('\n[MEMORIA] Testando "Nova Sessao"...');
  await navigate('http://localhost:3847/memory');
  await sleep(2000);

  await screenshot('detail-memory-initial');
  const memText = await getPageText();
  console.log('[MEMORY TEXT]', memText.substring(0, 300));

  const novaSessaoResult = await evalJS(`
    (function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().toLowerCase();
        if (text.includes('nova sess') || text.includes('new session')) {
          btns[i].click();
          return 'CLICKED: ' + btns[i].textContent.trim();
        }
      }
      return 'NOT_FOUND';
    })()
  `);
  console.log('[CLICK]', novaSessaoResult);
  await sleep(2500);

  await screenshot('detail-memory-after-nova-sessao');
  const memAfterClick = await getPageText();
  console.log('[MEMORY after click]', memAfterClick.substring(0, 300));

  const memModal = await evalJS(`
    JSON.stringify((function() {
      var dialogs = document.querySelectorAll('[role="dialog"], dialog, [class*="modal" i]');
      var result = [];
      for (var i = 0; i < dialogs.length; i++) {
        if (dialogs[i].offsetParent !== null) {
          result.push({
            tag: dialogs[i].tagName,
            role: dialogs[i].getAttribute('role'),
            text: dialogs[i].innerText ? dialogs[i].innerText.replace(/\\s+/g, ' ').substring(0, 200) : ''
          });
        }
      }
      return result;
    })())
  `);
  console.log('[MEMORY MODAL]', memModal);

  details.memory = {
    clickResult: novaSessaoResult,
    textAfterClick: memAfterClick.substring(0, 300),
    modalCheck: memModal
  };

  // Salvar relatorio detalhado
  const detailReport = {
    timestamp: new Date().toISOString(),
    details: details,
    allErrors: allLogs
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'detail-report.json'), JSON.stringify(detailReport, null, 2));

  console.log('\n=== AUDIT DETALHADO CONCLUIDO ===');
  console.log('[SALVO]', path.join(OUTPUT_DIR, 'detail-report.json'));

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
