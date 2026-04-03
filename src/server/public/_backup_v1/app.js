/**
 * CLAUDE CODE ECOSYSTEM - Dashboard App
 * Reescrita completa com UX melhorada
 */

console.log('[Dashboard] Inicializando Claude Code Ecosystem v3.0...');

// ============ CONFIGURACAO ============
const API = '/api';
const WS_URL = `ws://${location.host}/ws`;
const MAX_FEED_EVENTS = 100;

// Mapa de nomes legiveis para integrações
const INTG_NAMES = {
  devToolsMcp: 'Chrome DevTools',
  desktopCommander: 'Desktop Commander',
  sequentialThinking: 'Sequential Thinking',
  playwright: 'Playwright',
  memory: 'Memory MCP',
  context7: 'Context7',
  fetch: 'Fetch MCP'
};

// ============ STATE ============
const state = {
  // Data
  tasks: [],
  executions: [],
  kbDocs: [],
  kbStats: {},
  sessions: [],
  sessionStats: {},
  credentials: [],
  credStats: {},
  templates: [],
  templateStats: {},
  integrations: {},
  config: {},
  notifConfig: {},

  // UI
  activeSection: 'dashboard',
  taskView: 'list',
  theme: 'dark',
  cmdPaletteOpen: false,
  qeOpen: false,

  // WebSocket
  ws: null,
  wsReconnectAttempt: 0,
  wsRetryInterval: null,
  schedulerRunning: false,

  // Charts
  charts: {},

  // Feed
  feedEvents: [],
  feedPaused: false,
  feedFilter: 'all',

  // Terminal real-time
  terminalSteps: {},        // Map executionId → [steps]
  terminalActiveExec: null, // executionId ativo no terminal
  terminalAutoScroll: true,
  terminalCollapsed: false,
  terminalRunningExecs: [],  // execuções ativas

  // MCP Health Monitor
  mcpHealthInterval: null,

  // Task Logs modal
  taskLogsOpenTaskId: null
};

// ============ DOM CACHE ============
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ============ UTILIDADES ============
function debounce(fn, ms = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms = 100) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '--';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function timeAgo(dateStr) {
  if (!dateStr) return '--';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

// ============ API ============
async function apiCall(endpoint, method = 'GET', body = null, { silent = false } = {}) {
  console.log(`[API] ${method} ${endpoint}`);
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(API + endpoint, options);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[API] Erro em ${method} ${endpoint}:`, error);
    if (!silent) showToast(`Erro na API: ${error.message}`, 'error');
    throw error;
  }
}

// ============ INICIALIZACAO ============
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Dashboard] DOM loaded, inicializando...');

  // Inicializar UI
  initTheme();
  initNavigation();
  initKeyboardShortcuts();
  initEventDelegation();

  // Conectar WebSocket
  connectWS();

  // Carregar dados iniciais
  loadDashboard();
  updateAllBadges();

  // Auto-refresh (60s)
  setInterval(() => {
    if (state.activeSection === 'dashboard') {
      loadDashboard();
    }
  }, 60000);

  console.log('[Dashboard] Inicializacao completa');
});

// ============ TEMA ============
function initTheme() {
  console.log('[Theme] Inicializando...');

  // Verificar preferência do sistema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');

  // Se não há tema salvo, usar preferência do sistema
  state.theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.body.dataset.theme = state.theme;

  console.log('[Theme] Tema inicial:', state.theme, {
    savedTheme,
    prefersDark
  });

  // Listener para mudanças na preferência do sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const storedTheme = localStorage.getItem('theme');
    if (!storedTheme) {
      state.theme = e.matches ? 'dark' : 'light';
      document.body.dataset.theme = state.theme;
      console.log('[Theme] Tema alterado automaticamente (sistema):', state.theme);
      showToast(`Tema alterado automaticamente para ${state.theme === 'dark' ? 'escuro' : 'claro'}`, 'info');
    }
  });

  $('btn-theme').addEventListener('click', toggleTheme);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = state.theme;
  localStorage.setItem('theme', state.theme);
  showToast(`Tema alterado para ${state.theme === 'dark' ? 'escuro' : 'claro'}`, 'info');
}

// ============ NAVEGACAO ============
function initNavigation() {
  // Nav items
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });

  // Breadcrumb home
  $$('.breadcrumb-item[data-section]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(item.dataset.section);
    });
  });

  // Menu toggle (sidebar)
  $('btn-menu').addEventListener('click', () => {
    $('sidebar').classList.toggle('collapsed');
  });

  // Links de navegacao interna
  $$('.link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(link.dataset.section);
    });
  });
}

function switchSection(sectionName) {
  console.log(`[Nav] Mudando para secao: ${sectionName}`);
  state.activeSection = sectionName;

  // Atualizar nav
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionName);
  });

  // Atualizar sections
  $$('.section').forEach(section => {
    section.classList.toggle('active', section.id === `section-${sectionName}`);
  });

  // Atualizar titulo e breadcrumb
  const titles = {
    dashboard: 'Dashboard',
    tasks: 'Tarefas',
    kb: 'Knowledge Base',
    prompts: 'Prompt Manager',
    memory: 'Memory',
    credentials: 'Credenciais',
    settings: 'Configuracoes'
  };

  const title = titles[sectionName] || 'Dashboard';
  $('page-title').textContent = title;
  $('breadcrumb-current').textContent = title;

  // Carregar dados da secao
  loadSectionData(sectionName);
}

function loadSectionData(section) {
  console.log(`[Nav] Carregando dados da secao: ${section}`);

  // Limpar MCP health interval ao sair da seção settings
  if (state.activeSection === 'settings' && section !== 'settings') {
    console.log('[MCP Health] Limpando interval ao sair de settings');
    if (state.mcpHealthInterval) {
      clearInterval(state.mcpHealthInterval);
      state.mcpHealthInterval = null;
    }
  }

  switch(section) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'tasks':
      loadTasks();
      break;
    case 'kb':
      loadKB();
      break;
    case 'prompts':
      loadPrompts();
      break;
    case 'memory':
      loadMemory();
      break;
    case 'credentials':
      loadCredentials();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// ============ WEBSOCKET ============
function connectWS() {
  console.log('[WS] Conectando...');

  state.ws = new WebSocket(WS_URL);

  state.ws.onopen = () => {
    console.log('[WS] Conectado');
    state.wsReconnectAttempt = 0;
    if (state.wsRetryInterval) {
      clearInterval(state.wsRetryInterval);
      state.wsRetryInterval = null;
    }

    const wsStatus = $('ws-status');
    wsStatus.classList.add('connected');
    wsStatus.classList.remove('reconnecting');
    wsStatus.innerHTML = '<span class="ws-dot"></span><span>Conectado</span>';

    addFeedEvent('connected', { message: 'WebSocket conectado' });
  };

  state.ws.onclose = () => {
    console.log('[WS] Desconectado');

    const wsStatus = $('ws-status');
    wsStatus.classList.remove('connected');
    wsStatus.classList.add('reconnecting');

    state.wsReconnectAttempt++;
    const delay = Math.min(3000 * Math.pow(2, state.wsReconnectAttempt - 1), 30000);
    const delaySec = Math.round(delay / 1000);

    wsStatus.innerHTML = `<span class="ws-dot"></span><span>Reconectando em ${delaySec}s...</span>`;

    let countdown = delaySec;
    state.wsRetryInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        wsStatus.innerHTML = `<span class="ws-dot"></span><span>Reconectando em ${countdown}s...</span>`;
      }
    }, 1000);

    setTimeout(() => {
      if (state.wsRetryInterval) clearInterval(state.wsRetryInterval);
      connectWS();
    }, delay);
  };

  state.ws.onerror = (error) => {
    console.error('[WS] Erro:', error);
  };

  state.ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWSMessage(message);
    } catch (error) {
      console.error('[WS] Erro ao processar mensagem:', error);
    }
  };
}

function handleWSMessage(message) {
  console.log('[WS] Mensagem:', message.type);

  // Adicionar ao feed
  addFeedEvent(message.type, message.data || {});

  switch(message.type) {
    case 'connected':
      state.schedulerRunning = message.data?.schedulerRunning || false;
      updateSchedulerUI();
      break;

    case 'task:created':
    case 'task:updated':
    case 'task:deleted':
      if (state.activeSection === 'tasks' || state.activeSection === 'dashboard') {
        loadTasks();
      }
      break;

    case 'scheduler:started':
      state.schedulerRunning = true;
      updateSchedulerUI();
      showToast('Scheduler iniciado', 'success');
      break;

    case 'scheduler:stopped':
      state.schedulerRunning = false;
      updateSchedulerUI();
      showToast('Scheduler parado', 'warning');
      break;

    case 'execution:started':
      // Adicionar à lista de execuções running
      if (message.data?.executionId) {
        const exists = state.terminalRunningExecs.find(e => e.executionId === message.data.executionId);
        if (!exists) {
          state.terminalRunningExecs.push({
            executionId: message.data.executionId,
            taskId: message.data.taskId,
            taskName: message.data.taskName,
            startedAt: new Date().toISOString()
          });
          updateTerminalExecSelector();
          // Auto-selecionar se não houver execução ativa
          if (!state.terminalActiveExec) {
            state.terminalActiveExec = message.data.executionId;
            state.terminalSteps[message.data.executionId] = [];
            updateTerminalOutput();
          }
        }
      }
      if (state.activeSection === 'dashboard') {
        loadDashboard();
      }
      break;

    case 'execution:completed':
    case 'execution:failed':
      // Remover da lista de running e marcar como finalizado
      if (message.data?.executionId) {
        state.terminalRunningExecs = state.terminalRunningExecs.filter(
          e => e.executionId !== message.data.executionId
        );
        updateTerminalExecSelector();
        // Marcar terminal como finalizado
        if (state.terminalActiveExec === message.data.executionId) {
          const statusEl = $('terminal-status');
          if (statusEl) {
            statusEl.textContent = message.type === 'execution:completed' ? 'Finalizada' : 'Erro';
            statusEl.className = message.type === 'execution:completed' ? 'text-success' : 'text-error';
          }
        }
      }
      if (state.activeSection === 'dashboard') {
        loadDashboard();
      }
      // Auto-refresh task logs modal se aberto
      if (state.taskLogsOpenTaskId && message.data?.taskId === state.taskLogsOpenTaskId) {
        setTimeout(() => viewTaskLogs(state.taskLogsOpenTaskId), 1500);
      }
      break;

    case 'execution:step':
      // Processar step do terminal
      if (message.data) {
        handleTerminalStep(message.data);
      }
      break;

    case 'execution:resumed':
    case 'execution:resume_failed':
      // Auto-refresh task logs modal se aberto
      if (state.taskLogsOpenTaskId && message.data?.taskId === state.taskLogsOpenTaskId) {
        setTimeout(() => viewTaskLogs(state.taskLogsOpenTaskId), 1500);
      }
      if (state.activeSection === 'dashboard') {
        loadDashboard();
      }
      break;

    case 'memory:session_created':
    case 'memory:session_updated':
    case 'memory:session_deleted':
      if (state.activeSection === 'memory') {
        loadMemory();
      }
      break;

    case 'kb:created':
    case 'kb:updated':
    case 'kb:deleted':
      if (state.activeSection === 'kb') {
        loadKB();
      }
      updateKBBadge();
      break;

    case 'credential:created':
    case 'credential:updated':
    case 'credential:deleted':
      if (state.activeSection === 'credentials') {
        loadCredentials();
      }
      break;
  }
}

function updateSchedulerUI() {
  const indicator = $('scheduler-status-indicator');
  const toggle = $('btn-scheduler-toggle');
  const icon = $('toggle-icon');

  if (state.schedulerRunning) {
    indicator.classList.add('running');
    icon.textContent = '⏸';
    toggle.title = 'Pausar Scheduler';
  } else {
    indicator.classList.remove('running');
    icon.textContent = '▶';
    toggle.title = 'Iniciar Scheduler';
  }
}

// ============ DASHBOARD ============
async function loadDashboard() {
  console.log('[Dashboard] Carregando dados...');

  try {
    // Carregar tasks e executions em paralelo
    const [tasks, executions, stats] = await Promise.all([
      apiCall('/tasks'),
      apiCall('/executions?limit=50'),
      apiCall('/executions/stats')
    ]);

    state.tasks = tasks;
    state.executions = executions;

    // Atualizar stats
    updateDashboardStats(tasks, stats);

    // Atualizar charts
    updateCharts(executions);

    // Atualizar atividade recente
    updateRecentActivity(executions);

    // Atualizar badges
    updateTasksBadge(tasks.length);

  } catch (error) {
    console.error('[Dashboard] Erro ao carregar:', error);
  }
}

function updateDashboardStats(tasks, stats) {
  // Stats principais
  $('stat-total').textContent = tasks.length;
  $('stat-scheduled').textContent = tasks.filter(t => t.status === 'scheduled').length;
  $('stat-running').textContent = tasks.filter(t => t.status === 'running').length;

  const successRate = stats.successRate || 0;
  $('stat-success').textContent = `${Math.round(successRate)}%`;

  // Health metrics
  const avgDuration = stats.avgDuration || 0;
  $('stat-avg-duration').textContent = formatDuration(avgDuration);

  const totalTokens = stats.totalTokens || 0;
  $('stat-total-tokens').textContent = totalTokens.toLocaleString();

  const totalCost = stats.totalCost || 0;
  $('stat-cost').textContent = `$${totalCost.toFixed(2)}`;

  // Health (placeholder)
  $('stat-health').textContent = successRate > 80 ? 'Otima' : successRate > 50 ? 'Boa' : 'Regular';
}

function updateCharts(executions) {
  // Executions por dia
  const executionsByDay = {};
  executions.forEach(ex => {
    const date = new Date(ex.startedAt).toLocaleDateString('pt-BR');
    executionsByDay[date] = (executionsByDay[date] || 0) + 1;
  });

  const labels = Object.keys(executionsByDay).slice(-7);
  const data = labels.map(date => executionsByDay[date] || 0);

  // Empty state overlays
  const execEmpty = $('chart-exec-empty');
  if (execEmpty) execEmpty.style.display = data.length === 0 ? 'flex' : 'none';
  const statusEmpty = $('chart-status-empty');
  if (statusEmpty) statusEmpty.style.display = state.tasks.length === 0 ? 'flex' : 'none';

  if (state.charts.executions) {
    state.charts.executions.data.labels = labels;
    state.charts.executions.data.datasets[0].data = data;
    state.charts.executions.update();
  } else {
    const ctx = $('chart-executions').getContext('2d');
    state.charts.executions = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Execucoes',
          data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Status das tarefas
  const statusCount = {
    scheduled: state.tasks.filter(t => t.status === 'scheduled').length,
    running: state.tasks.filter(t => t.status === 'running').length,
    completed: state.tasks.filter(t => t.status === 'completed').length,
    failed: state.tasks.filter(t => t.status === 'failed').length
  };

  if (state.charts.status) {
    state.charts.status.data.datasets[0].data = Object.values(statusCount);
    state.charts.status.update();
  } else {
    const ctx = $('chart-status').getContext('2d');
    state.charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Agendada', 'Executando', 'Concluida', 'Falhou'],
        datasets: [{
          data: Object.values(statusCount),
          backgroundColor: [
            'rgb(168, 85, 247)',
            'rgb(251, 146, 60)',
            'rgb(34, 197, 94)',
            'rgb(239, 68, 68)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function updateRecentActivity(executions) {
  const container = $('recent-activity');

  if (!executions || executions.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state-title">Nenhuma atividade recente</p></div>';
    return;
  }

  const recent = executions.slice(0, 5);
  container.innerHTML = recent.map(ex => `
    <div class="feed-item">
      <span class="feed-dot" style="background:${getStatusColor(ex.status)}"></span>
      <div class="feed-content">
        <div><strong>${ex.taskName || 'Tarefa'}</strong> - ${ex.status}</div>
        <div class="feed-time">${timeAgo(ex.startedAt)}</div>
      </div>
    </div>
  `).join('');
}

function getStatusColor(status) {
  const colors = {
    scheduled: 'var(--color-purple)',
    running: 'var(--color-orange)',
    completed: 'var(--color-success)',
    failed: 'var(--color-error)',
    paused: 'var(--color-warning)'
  };
  return colors[status] || 'var(--color-muted)';
}

// ============ TASKS ============
async function loadTasks() {
  console.log('[Tasks] Carregando...');

  try {
    const tasks = await apiCall('/tasks');
    state.tasks = tasks;

    renderTasks();
    updateTasksBadge(tasks.length);
  } catch (error) {
    console.error('[Tasks] Erro ao carregar:', error);
  }
}

function renderTasks() {
  const filterStatus = $('filter-status').value;
  const filterCategory = $('filter-task-category').value;
  let filtered = state.tasks;

  if (filterStatus) {
    filtered = filtered.filter(t => t.status === filterStatus);
  }

  if (filterCategory) {
    filtered = filtered.filter(t => t.category === filterCategory);
  }

  if (state.taskView === 'list') {
    renderTasksList(filtered);
  } else {
    renderTasksKanban(filtered);
  }
}

function renderTasksList(tasks) {
  const grid = $('tasks-grid');
  grid.style.display = 'grid';
  $('kanban-board').style.display = 'none';

  // Controlar visibilidade do botão "Limpar Tudo"
  const purgeBtn = $('btn-purge-tasks');
  if (purgeBtn) purgeBtn.style.display = tasks.length === 0 ? 'none' : '';

  if (tasks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <p class="empty-state-title">Nenhuma tarefa encontrada</p>
        <p class="empty-state-desc">Crie uma nova tarefa para comecar</p>
        <button class="btn btn-primary" data-action="new-task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Tarefa
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = tasks.map(renderTaskCard).join('');
}

function renderTaskCard(task) {
  const statusBadge = `<span class="badge badge-${getStatusBadgeClass(task.status)}">${task.status}</span>`;
  const categoryBadge = task.category ? `<span class="badge badge-muted">${task.category}</span>` : '';
  const claudeBadge = task.source === 'claude-code'
    ? `<span class="badge badge-info" title="Criada pelo Claude Code terminal" style="font-size:10px;">⚡ Claude</span>`
    : '';

  return `
    <div class="task-card${task.source === 'claude-code' ? ' task-card--claude' : ''}">
      <div class="task-card-header">
        <div class="task-card-title">${task.name}</div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">${claudeBadge}${statusBadge}</div>
      </div>
      ${categoryBadge ? `<div style="margin-bottom:var(--space-2);">${categoryBadge}</div>` : ''}
      <div class="task-card-meta">
        <div class="text-muted">
          ${task.schedule ? `<span>🔁 ${task.schedule}</span>` : `<span>📅 ${formatDate(task.scheduledAt)}</span>`}
        </div>
        ${task.description ? `<div class="text-muted">${task.description.slice(0, 100)}...</div>` : ''}
      </div>
      <div class="task-card-actions">
        <button class="btn btn-sm btn-success" data-action="run-task" data-id="${task.id}" title="Executar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="5,3 19,12 5,21 5,3"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="view-task-logs" data-id="${task.id}" title="Ver Logs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="edit-task" data-id="${task.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="delete-task" data-id="${task.id}" title="Deletar" style="color:var(--color-error);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderTasksKanban(tasks) {
  $('tasks-grid').style.display = 'none';
  const kanban = $('kanban-board');
  kanban.style.display = 'grid';

  // Controlar visibilidade do botão "Limpar Tudo"
  const purgeBtn = $('btn-purge-tasks');
  if (purgeBtn) purgeBtn.style.display = tasks.length === 0 ? 'none' : '';

  const columns = {
    scheduled: tasks.filter(t => t.status === 'scheduled'),
    running: tasks.filter(t => t.status === 'running'),
    completed: tasks.filter(t => t.status === 'completed'),
    failed: tasks.filter(t => t.status === 'failed')
  };

  Object.keys(columns).forEach(status => {
    const col = $(`kanban-col-${status}`);
    const count = $(`kanban-count-${status}`);

    count.textContent = columns[status].length;

    if (columns[status].length === 0) {
      col.innerHTML = '<div class="empty-state"><p class="empty-state-desc">Nenhuma tarefa</p></div>';
    } else {
      col.innerHTML = columns[status].map(renderTaskCard).join('');
    }
  });
}

function getStatusBadgeClass(status) {
  const classes = {
    scheduled: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'error',
    paused: 'muted',
    active: 'success',
    finalized: 'info',
    pending: 'warning',
    cancelled: 'muted'
  };
  return classes[status] || 'muted';
}

function updateTasksBadge(count) {
  $('nav-tasks-count').textContent = count;
}

// ============ KNOWLEDGE BASE ============
async function loadKB() {
  console.log('[KB] Carregando...');

  try {
    const [docsResponse, stats] = await Promise.all([
      apiCall('/kb/documents'),
      apiCall('/kb/stats')
    ]);

    // API retorna {documents: [...]} - extrair array
    const docs = Array.isArray(docsResponse) ? docsResponse : (docsResponse.documents || []);
    state.kbDocs = docs;
    state.kbStats = stats;

    updateKBStats(stats, docs);
    renderKBDocs(docs);
    updateKBBadge();

    // Popular categorias no filtro
    const categories = [...new Set(docs.map(d => d.category).filter(Boolean))];
    const filterSelect = $('kb-filter-category');
    filterSelect.innerHTML = '<option value="">Todas Categorias</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  } catch (error) {
    console.error('[KB] Erro ao carregar:', error);
  }
}

function updateKBStats(stats, docs) {
  $('kb-stat-total').textContent = stats.totalDocuments || (docs ? docs.length : 0);
  const categories = docs ? new Set(docs.map(d => d.category).filter(Boolean)) : new Set();
  $('kb-stat-categories').textContent = stats.totalCategories || categories.size;
  const totalSections = docs ? docs.reduce((sum, d) => sum + (d.sections?.length || 0), 0) : 0;
  $('kb-stat-sections').textContent = stats.totalSections || totalSections;
}

function renderKBDocs(docs) {
  const container = $('kb-documents-list');

  if (docs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
        <p class="empty-state-title">Nenhum documento encontrado</p>
        <p class="empty-state-desc">Adicione documentos a base de conhecimento</p>
      </div>
    `;
    return;
  }

  container.innerHTML = docs.map(renderKBDocCard).join('');
}

function renderKBDocCard(doc) {
  const searchTerm = ($('kb-search-input')?.value || '').toLowerCase();
  let previewHtml = '';

  // Se há busca e documento tem snippet (da API search) ou content, mostrar preview
  const docContent = doc.snippet || doc.content || '';
  if (searchTerm && docContent) {
    let preview = docContent;

    // Se snippet é longo, truncar
    if (preview.length > 300) preview = preview.substring(0, 300) + '...';

    // Escape HTML básico para segurança
    preview = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Highlight do termo (case-insensitive, escape regex)
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    preview = preview.replace(regex, '<mark style="background:var(--warning);color:var(--bg-primary);padding:2px 4px;border-radius:2px;">$1</mark>');

    previewHtml = `
      <div style="margin-top:var(--sp-2);padding:var(--sp-2);background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-muted);line-height:1.4;">
        ${preview}
      </div>
    `;
  }

  // Score de relevância (se disponível)
  let scoreHtml = '';
  if (doc.score !== undefined) {
    const scorePercent = Math.round(doc.score * 100);
    scoreHtml = `
      <div style="margin-top:var(--sp-2);">
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-1);">
          Relevância: ${scorePercent}%
        </div>
        <div style="height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;">
          <div style="height:100%;background:var(--primary);width:${scorePercent}%;transition:width 0.3s;"></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="kb-doc-card">
      <div class="kb-doc-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
      </div>
      <div class="kb-doc-title">${doc.title || doc.name || doc.path}</div>
      <div class="kb-doc-meta">
        ${doc.category ? `<span class="badge badge-muted">${doc.category}</span>` : ''}
        <span class="text-muted">${doc.sections?.length || 0} secoes</span>
      </div>
      ${scoreHtml}
      ${previewHtml}
      <div class="kb-doc-tags">
        ${(Array.isArray(doc.tags) ? doc.tags : []).map(tag => `<span class="kb-tag">${tag}</span>`).join('')}
      </div>
      <div class="task-card-actions" style="margin-top:var(--space-3);">
        <button class="btn btn-sm btn-ghost" data-action="view-kb-doc" data-filename="${doc.path || doc.filename}" title="Visualizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="edit-kb-doc" data-filename="${doc.path || doc.filename}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="delete-kb-doc" data-filename="${doc.path || doc.filename}" title="Deletar" style="color:var(--color-error);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function updateKBBadge() {
  apiCall('/kb/documents').then(resp => {
    const docs = Array.isArray(resp) ? resp : (resp.documents || []);
    $('nav-kb-count').textContent = docs.length;
  });
}

// ============ UPDATE ALL BADGES ============
async function updateAllBadges() {
  // KB
  apiCall('/kb/documents', 'GET', null, { silent: true }).then(resp => {
    const docs = Array.isArray(resp) ? resp : (resp.documents || []);
    $('nav-kb-count').textContent = docs.length;
  }).catch(() => {});

  // Prompts
  apiCall('/prompt-templates', 'GET', null, { silent: true }).then(templates => {
    $('nav-prompts-count').textContent = Array.isArray(templates) ? templates.length : 0;
  }).catch(() => {});

  // Memory - retorna {data: [...]}
  apiCall('/memory/sessions', 'GET', null, { silent: true }).then(resp => {
    const sessions = Array.isArray(resp) ? resp : (resp.data || []);
    $('nav-memory-count').textContent = sessions.length;
  }).catch(() => {});

  // Credentials
  apiCall('/credentials', 'GET', null, { silent: true }).then(creds => {
    $('nav-cred-count').textContent = Array.isArray(creds) ? creds.length : 0;
  }).catch(() => {});
}

// ============ PROMPTS ============
async function loadPrompts() {
  console.log('[Prompts] Carregando...');

  try {
    const templates = await apiCall('/prompt-templates');
    state.templates = templates;

    updatePromptsStats(templates);
    renderTemplates(templates);
    updatePromptsBadge(templates.length);
    populateCategoryFilter(templates);

    // Gallery é opcional - não bloqueia se falhar
    try {
      const gallery = await apiCall('/prompt-templates/gallery', 'GET', null, { silent: true });
      renderGallery(gallery);
    } catch (galleryError) {
      console.warn('[Prompts] Gallery não disponível:', galleryError.message);
      renderGallery([]);
    }

  } catch (error) {
    console.error('[Prompts] Erro ao carregar:', error);
  }
}

function updatePromptsStats(templates) {
  $('pm-stat-total').textContent = templates.length;

  const categories = new Set(templates.map(t => t.category).filter(Boolean));
  $('pm-stat-categories').textContent = categories.size;

  const variables = new Set();
  templates.forEach(t => {
    const matches = (t.promptText || t.template || '').match(/\{\{(\w+)\}\}/g) || [];
    matches.forEach(m => variables.add(m.replace(/\{\{|\}\}/g, '')));
  });
  $('pm-stat-variables').textContent = variables.size;
}

function renderTemplates(templates) {
  const container = $('templates-list');

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <p class="empty-state-title">Nenhum template encontrado</p>
        <p class="empty-state-desc">Crie templates de prompts reutilizaveis</p>
      </div>
    `;
    return;
  }

  container.innerHTML = templates.map(renderTemplateCard).join('');
}

function renderTemplateCard(template) {
  const promptText = template.promptText || template.template || '';
  const matches = promptText.match(/\{\{(\w+)\}\}/g) || [];
  const uniqueVars = [...new Set(matches.map(v => v.replace(/\{\{|\}\}/g, '')))];
  const maxVars = 3;
  const visibleVars = uniqueVars.slice(0, maxVars);
  const extraVars = uniqueVars.length - maxVars;

  return `
    <div class="pm-template-card">
      <div class="kb-doc-title">${template.icon ? template.icon + ' ' : ''}${template.name || 'Sem nome'}</div>
      <div class="kb-doc-meta">
        ${template.category ? `<span class="badge badge-muted">${template.category}</span>` : ''}
        <span class="text-muted">${uniqueVars.length} variav${uniqueVars.length === 1 ? 'el' : 'eis'}</span>
      </div>
      ${template.description ? `<div class="text-muted" style="margin-top:var(--sp-2);font-size:var(--text-xs);line-height:1.4;max-height:2.8em;overflow:hidden;">${template.description}</div>` : ''}
      ${visibleVars.length > 0 ? `<div style="margin-top:var(--sp-2);display:flex;flex-wrap:wrap;gap:4px;align-items:center;">${visibleVars.map(v => `<span class="pm-variable">{{${v}}}</span>`).join('')}${extraVars > 0 ? `<span class="text-muted" style="font-size:var(--text-xs);">+${extraVars}</span>` : ''}</div>` : ''}
      <div class="pm-preview">
        ${promptText.slice(0, 120)}${promptText.length > 120 ? '...' : ''}
      </div>
      <div class="task-card-actions" style="margin-top:auto;padding-top:var(--sp-2);">
        <button class="btn btn-sm btn-success" data-action="use-template" data-id="${template.id}" title="Usar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="5,3 19,12 5,21 5,3"/>
          </svg>
          Usar
        </button>
        <button class="btn btn-sm btn-ghost" data-action="edit-template" data-id="${template.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="delete-template" data-id="${template.id}" title="Deletar" style="color:var(--color-error);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderGallery(gallery) {
  const section = $('gallery-section');
  const container = $('gallery-list');

  if (!gallery || gallery.length === 0) {
    if (section) section.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  if (section) section.style.display = '';
  container.innerHTML = gallery.map(renderTemplateCard).join('');
}

function populateCategoryFilter(templates) {
  const select = $('pm-filter-category');
  if (!select) return;

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="">Todas Categorias</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function filterTemplates() {
  const search = ($('pm-search-input')?.value || '').toLowerCase().trim();
  const category = $('pm-filter-category')?.value || '';

  const filtered = (state.templates || []).filter(t => {
    const matchSearch = !search ||
      (t.name || '').toLowerCase().includes(search) ||
      (t.description || '').toLowerCase().includes(search) ||
      (t.promptText || t.template || '').toLowerCase().includes(search);
    const matchCategory = !category || t.category === category;
    return matchSearch && matchCategory;
  });

  renderTemplates(filtered);
}

function updatePromptsBadge(count) {
  $('nav-prompts-count').textContent = count;
}

// ============ MEMORY ============
async function loadMemory() {
  console.log('[Memory] Carregando...');

  try {
    const [sessionsResp, statsResp] = await Promise.all([
      apiCall('/memory/sessions'),
      apiCall('/memory/stats')
    ]);

    // Unwrap API responses
    const sessions = Array.isArray(sessionsResp) ? sessionsResp : (sessionsResp.data || []);
    const stats = statsResp.data || statsResp;

    state.sessions = sessions;
    state.sessionStats = stats;

    updateMemoryStats(stats);
    renderSessions(sessions);
    updateMemoryBadge(sessions.length);

    // Inicializar terminal se ainda não foi inicializado
    if (typeof initTerminalControls === 'function') {
      initTerminalControls();
      loadRunningExecutions();
    }

  } catch (error) {
    console.error('[Memory] Erro ao carregar:', error);
  }
}

function updateMemoryStats(stats) {
  $('mem-stat-total').textContent = stats.totalSessions || 0;
  $('mem-stat-active').textContent = stats.activeSessions || 0;
  $('mem-stat-tasks').textContent = stats.totalTasks || 0;
  $('mem-stat-checkpoints').textContent = stats.totalCheckpoints || 0;
}

function renderSessions(sessions) {
  const container = $('sessions-list');

  // Controlar visibilidade do botão "Limpar"
  const purgeBtn = $('btn-purge-sessions');
  if (purgeBtn) purgeBtn.style.display = sessions.length === 0 ? 'none' : '';

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="19" r="3"/>
        </svg>
        <p class="empty-state-title">Nenhuma sessao encontrada</p>
        <p class="empty-state-desc">Crie sessoes para armazenar contexto</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(renderSessionCard).join('');
}

function renderSessionCard(session) {
  const phaseBadge = session.phase || session.currentPhase ? `<span class="badge badge-info">${session.phase || session.currentPhase}</span>` : '';
  const statusBadge = `<span class="badge badge-${getStatusBadgeClass(session.status)}">${session.status || 'active'}</span>`;
  const favIcon = session.favorite ? '⭐' : '';

  return `
    <div class="mem-session">
      <div class="mem-session-header">
        <div>
          ${favIcon}<strong>${session.objective || 'Sessao'}</strong>
          ${statusBadge} ${phaseBadge}
        </div>
        <div class="text-muted">${formatDate(session.startedAt || session.createdAt)}</div>
      </div>
      <div class="mem-session-tasks">
        ${session.tasks?.length || 0} tarefas • ${session.checkpoints?.length || 0} checkpoints
      </div>
      <div class="task-card-actions" style="margin-top:var(--space-3);">
        <button class="btn btn-sm btn-ghost" data-action="view-session" data-id="${session.id}" title="Visualizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="favorite-session" data-id="${session.id}" title="Favoritar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="finalize-session" data-id="${session.id}" title="Finalizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="delete-session" data-id="${session.id}" title="Deletar" style="color:var(--color-error);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function updateMemoryBadge(count) {
  $('nav-memory-count').textContent = count;
}

// ============ CREDENTIALS ============
async function loadCredentials() {
  console.log('[Credentials] Carregando...');

  try {
    const credentials = await apiCall('/credentials');
    state.credentials = credentials;

    updateCredentialsStats(credentials);
    renderCredentials(credentials);
    updateCredentialsBadge(credentials.length);

    // Popular categorias
    const categories = [...new Set(credentials.map(c => c.category).filter(Boolean))];
    const filterSelect = $('cred-filter-category');
    filterSelect.innerHTML = '<option value="">Todas Categorias</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  } catch (error) {
    console.error('[Credentials] Erro ao carregar:', error);
  }
}

function updateCredentialsStats(credentials) {
  $('cred-stat-total').textContent = credentials.length;

  const categories = new Set(credentials.map(c => c.category).filter(Boolean));
  $('cred-stat-categories').textContent = categories.size;

  // Ultimo uso (placeholder)
  const lastUsed = credentials.map(c => c.lastUsedAt).filter(Boolean).sort().pop();
  $('cred-stat-last-used').textContent = lastUsed ? timeAgo(lastUsed) : '--';
}

function renderCredentials(credentials) {
  const container = $('credentials-list');

  if (credentials.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        <p class="empty-state-title">Nenhuma credencial encontrada</p>
        <p class="empty-state-desc">Adicione credenciais ao vault</p>
      </div>
    `;
    return;
  }

  container.innerHTML = credentials.map(renderCredentialItem).join('');
}

function renderCredentialItem(cred) {
  return `
    <div class="cred-item">
      <div class="cred-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <div style="flex:1;">
        <div class="cred-name">${cred.name}</div>
        <div class="cred-value">••••••••</div>
        <div class="cred-category">
          ${cred.category ? `<span class="badge badge-muted">${cred.category}</span>` : ''}
        </div>
      </div>
      <div class="task-card-actions">
        <button class="btn btn-sm btn-ghost" data-action="reveal-credential" data-id="${cred.id}" title="Revelar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="edit-credential" data-id="${cred.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-ghost" data-action="delete-credential" data-id="${cred.id}" title="Deletar" style="color:var(--color-error);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function updateCredentialsBadge(count) {
  $('nav-cred-count').textContent = count;
}

// ============ SETTINGS ============
async function loadSettings() {
  console.log('[Settings] Carregando...');

  try {
    const [config, notifConfig, integrationsResp] = await Promise.all([
      apiCall('/config'),
      apiCall('/notifications/config'),
      apiCall('/integrations/status')
    ]);

    // Unwrap integrations response
    const integrations = integrationsResp.data || integrationsResp;

    state.config = config;
    state.notifConfig = notifConfig;
    state.integrations = integrations;

    renderNotificationSettings(notifConfig);
    renderSchedulerSettings(config);
    renderIntegrations(integrations);

    // Carregar Chrome profiles e Telegram config em paralelo
    loadChromeProfiles();
    loadTelegramConfig();

    // Iniciar polling de MCP health a cada 60s
    console.log('[MCP Health] Iniciando polling (60s)');
    if (state.mcpHealthInterval) clearInterval(state.mcpHealthInterval);
    state.mcpHealthInterval = setInterval(refreshMCPStatus, 60000);

  } catch (error) {
    console.error('[Settings] Erro ao carregar:', error);
  }
}

function renderNotificationSettings(config) {
  $('notif-enabled').checked = config.enabled || false;
  $('notif-webhook').value = config.webhookUrl || '';
  $('notif-task-created').checked = config.events?.includes('task:created') || false;
  $('notif-exec-completed').checked = config.events?.includes('execution:completed') || false;
  $('notif-exec-failed').checked = config.events?.includes('execution:failed') || false;
}

function renderSchedulerSettings(config) {
  $('scheduler-interval').value = config.checkInterval || 5000;
  $('scheduler-max-concurrent').value = config.maxConcurrentExecutions || 3;
}

function renderIntegrations(integrations) {
  const container = $('integrations-strip');

  const intgIcons = {
    devToolsMcp: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    desktopCommander: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    sequentialThinking: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    playwright: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
    memory: '<circle cx="12" cy="5" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="19" r="3"/><path d="M12 8v1m0 6v1"/>',
    context7: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    fetch: '<path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>'
  };

  const intgList = Object.entries(integrations).map(([name, data]) => {
    const isInstalled = data.installed;
    const statusClass = isInstalled ? 'success' : 'error';
    const statusText = isInstalled ? 'Instalado' : 'Indisponivel';
    const displayName = INTG_NAMES[name] || name;
    const iconSvg = intgIcons[name] || '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>';
    const source = data.details?.source || '';
    const lastChecked = data.lastChecked ? formatDate(data.lastChecked) : '';

    return `
      <div class="intg-card ${statusClass}">
        <div class="intg-card-icon ${statusClass}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${iconSvg}
          </svg>
        </div>
        <div class="intg-card-info">
          <div class="intg-card-name">${displayName}</div>
          <div class="intg-card-status ${statusClass}">
            <span class="intg-dot ${statusClass}"></span>
            ${statusText}
          </div>
          ${source ? `<div class="intg-card-source">${source}</div>` : ''}
          ${lastChecked ? `<div class="intg-card-source" style="font-size:10px;color:var(--text-muted);">Verificado: ${lastChecked}</div>` : ''}
        </div>
        ${isInstalled ? `
          <button class="btn btn-sm btn-ghost intg-card-action" data-action="test-mcp" data-type="${name}" title="Testar integracao">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polygon points="5,3 19,12 5,21 5,3"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  });

  container.innerHTML = intgList.length > 0 ? intgList.join('') :
    '<div class="empty-state-inline">Nenhuma integracao MCP detectada</div>';
}

// Atualizar status MCP em background
async function refreshMCPStatus() {
  console.log('[MCP Health] Atualizando status...');

  try {
    const integrationsResp = await apiCall('/integrations/status', 'GET', null, { silent: true });
    const integrations = integrationsResp.data || integrationsResp;

    // Adicionar timestamp
    Object.keys(integrations).forEach(key => {
      integrations[key].lastChecked = new Date().toISOString();
    });

    state.integrations = integrations;
    renderIntegrations(integrations);

    console.log('[MCP Health] Status atualizado');
  } catch (error) {
    console.error('[MCP Health] Erro ao atualizar:', error);
  }
}

// ============ CHROME PROFILES ============
async function loadChromeProfiles() {
  console.log('[ChromeProfiles] Carregando...');
  const container = $('chrome-profiles-list');

  try {
    const [profilesResp, selectedResp] = await Promise.all([
      apiCall('/chrome/profiles', 'GET', null, { silent: true }),
      apiCall('/chrome/selected-profile', 'GET', null, { silent: true })
    ]);

    const profiles = profilesResp?.data?.profiles || profilesResp?.profiles || [];
    const selectedProfile = selectedResp?.data?.selectedProfile || '';

    renderChromeProfiles(profiles, selectedProfile);
  } catch (error) {
    console.error('[ChromeProfiles] Erro ao carregar:', error);
    container.innerHTML = '<div class="empty-state-inline">Erro ao carregar perfis Chrome</div>';
  }
}

function renderChromeProfiles(profiles, selectedProfile) {
  const container = $('chrome-profiles-list');

  if (!profiles || profiles.length === 0) {
    container.innerHTML = `
      <div class="empty-state-inline">
        Nenhum perfil Chrome encontrado. Clique em "Scan" para detectar.
      </div>
    `;
    return;
  }

  const html = `<div class="chrome-profile-grid">${profiles.map(profile => {
    const isSelected = profile.directory === selectedProfile || profile.name === selectedProfile;
    const email = profile.googleAccount?.email || '';
    const displayName = profile.googleAccount?.name || profile.name || 'Perfil';
    const initials = displayName.substring(0, 2).toUpperCase();
    const subtitle = email || profile.directory || '--';

    return `
      <div class="chrome-profile-card ${isSelected ? 'selected' : ''}"
           data-action="select-chrome-profile"
           data-id="${profile.directory || profile.name}">
        <div class="chrome-profile-avatar">${initials}</div>
        <div class="chrome-profile-info">
          <div class="chrome-profile-name">${displayName}</div>
          <div class="chrome-profile-email">${subtitle}</div>
        </div>
        ${isSelected ? '<span class="chrome-profile-badge">Ativo</span>' : ''}
      </div>
    `;
  }).join('')}</div>`;

  container.innerHTML = html;
}

// ============ FEED DE ATIVIDADES ============
function addFeedEvent(type, data) {
  if (state.feedPaused) return;

  // Evitar duplicatas consecutivas (especialmente "WebSocket conectado")
  if (state.feedEvents.length > 0) {
    const lastEvent = state.feedEvents[0];
    const message = data?.message || JSON.stringify(data);
    const lastMessage = lastEvent.data?.message || JSON.stringify(lastEvent.data);

    // Se o tipo e mensagem são idênticos ao último evento, ignorar
    if (lastEvent.type === type && lastMessage === message) {
      console.log('[Feed] Evento duplicado ignorado:', type);
      return;
    }
  }

  const event = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  state.feedEvents.unshift(event);
  if (state.feedEvents.length > MAX_FEED_EVENTS) {
    state.feedEvents.pop();
  }

  renderFeed();
}

function renderFeed() {
  const container = $('feed-stream');
  const filter = $('feed-filter').value;

  let filtered = state.feedEvents;
  if (filter !== 'all') {
    filtered = filtered.filter(e => e.type.startsWith(filter));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
        </svg>
        <p class="empty-state-title">Aguardando eventos...</p>
      </div>
    `;
    $('feed-count').textContent = 0;
    return;
  }

  container.innerHTML = filtered.slice(0, 20).map(renderFeedItem).join('');
  $('feed-count').textContent = filtered.length;
}

function renderFeedItem(event) {
  const typeIcon = getFeedIcon(event.type);
  const color = getFeedColor(event.type);

  return `
    <div class="feed-item">
      <span class="feed-dot" style="background:${color};">${typeIcon}</span>
      <div class="feed-content">
        <div>${getFeedMessage(event)}</div>
        <div class="feed-time">${timeAgo(event.timestamp)}</div>
      </div>
    </div>
  `;
}

function getFeedIcon(type) {
  const icons = {
    connected: '🔗',
    'task:created': '✅',
    'task:updated': '📝',
    'task:deleted': '🗑️',
    'execution:started': '▶️',
    'execution:completed': '✔️',
    'execution:failed': '❌',
    'scheduler:started': '🚀',
    'scheduler:stopped': '⏸️',
    'memory:session_created': '💾',
    'kb:created': '📄',
    'credential:created': '🔐'
  };
  return icons[type] || '•';
}

function getFeedColor(type) {
  if (type.includes('error') || type.includes('failed')) return 'var(--color-error)';
  if (type.includes('success') || type.includes('completed')) return 'var(--color-success)';
  if (type.includes('warning')) return 'var(--color-warning)';
  return 'var(--color-info)';
}

function getFeedMessage(event) {
  const { type, data } = event;

  switch(type) {
    case 'connected':
      return 'WebSocket conectado';
    case 'task:created':
      return `Tarefa criada: ${data.name}`;
    case 'task:updated':
      return `Tarefa atualizada: ${data.name}`;
    case 'task:deleted':
      return `Tarefa deletada`;
    case 'execution:started':
      return `Execucao iniciada: ${data.taskName}`;
    case 'execution:completed':
      return `Execucao concluida: ${data.taskName}`;
    case 'execution:failed':
      return `Execucao falhou: ${data.taskName}`;
    case 'scheduler:started':
      return 'Scheduler iniciado';
    case 'scheduler:stopped':
      return 'Scheduler parado';
    default:
      return type;
  }
}

// ============ COMMAND PALETTE ============
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K - Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }

    // Ctrl+Shift+X - Quick Execute
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      openQuickExecute();
    }

    // Escape - Fechar overlays
    if (e.key === 'Escape') {
      closeCommandPalette();
      closeQuickExecute();
      closeAllModals();
    }
  });
}

function openCommandPalette() {
  state.cmdPaletteOpen = true;
  $('cmd-overlay').style.display = 'flex';
  $('cmd-input').focus();

  // Popular com acoes
  const allCommands = [
    { title: 'Nova Tarefa', action: 'new-task', icon: '➕' },
    { title: 'Novo Documento KB', action: 'new-doc', icon: '📄' },
    { title: 'Upload PDF', action: () => { openPDFUploadModal(); closeCommandPalette(); }, icon: '📎' },
    { title: 'Novo Template', action: 'new-template', icon: '📝' },
    { title: 'Nova Sessao Memory', action: 'new-session', icon: '💾' },
    { title: 'Nova Credencial', action: () => { openCredentialModal(); closeCommandPalette(); }, icon: '🔐' },
    { title: 'Dashboard', action: () => { switchSection('dashboard'); closeCommandPalette(); }, icon: '🏠' },
    { title: 'Tarefas', action: () => { switchSection('tasks'); closeCommandPalette(); }, icon: '✅' },
    { title: 'Knowledge Base', action: () => { switchSection('kb'); closeCommandPalette(); }, icon: '📚' },
    { title: 'Prompts', action: () => { switchSection('prompts'); closeCommandPalette(); }, icon: '📝' },
    { title: 'Memory', action: () => { switchSection('memory'); closeCommandPalette(); }, icon: '💾' },
    { title: 'Credenciais', action: () => { switchSection('credentials'); closeCommandPalette(); }, icon: '🔐' },
    { title: 'Configuracoes', action: () => { switchSection('settings'); closeCommandPalette(); }, icon: '⚙️' },
    { title: 'Toggle Scheduler', action: 'toggle-scheduler', icon: '⚙️' }
  ];

  renderCommandResults(allCommands);

  // Input handler
  $('cmd-input').addEventListener('input', handleCommandInput);

  // Store commands for filtering
  state._cmdCommands = allCommands;
}

function handleCommandInput(e) {
  const query = e.target.value.toLowerCase();
  const commands = state._cmdCommands || [];
  renderCommandResults(commands.filter(cmd => cmd.title.toLowerCase().includes(query)));
}

function renderCommandResults(commands) {
  const container = $('cmd-results');

  if (commands.length === 0) {
    container.innerHTML = '<div class="cmd-item">Nenhum resultado</div>';
    return;
  }

  container.innerHTML = commands.map((cmd, i) => `
    <div class="cmd-item ${i === 0 ? 'active' : ''}" data-cmd-index="${i}">
      <span>${cmd.icon}</span>
      <span>${cmd.title}</span>
    </div>
  `).join('');

  // Bind click handlers
  container.querySelectorAll('.cmd-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.cmdIndex);
      const cmd = commands[idx];
      if (!cmd) return;

      if (typeof cmd.action === 'function') {
        cmd.action();
      } else if (typeof cmd.action === 'string') {
        closeCommandPalette();
        handleAction(cmd.action, {});
      }
    });
  });
}

function closeCommandPalette() {
  state.cmdPaletteOpen = false;
  $('cmd-overlay').style.display = 'none';
  $('cmd-input').value = '';
}

// ============ QUICK EXECUTE ============
function openQuickExecute() {
  console.log('[QE] Abrindo Quick Execute...');
  state.qeOpen = true;
  $('qe-overlay').style.display = 'flex';

  // Injetar dropdown de templates se ainda não existe
  const existingDropdown = $('qe-template-select');
  if (!existingDropdown && state.templates && state.templates.length > 0) {
    console.log('[QE] Injetando dropdown de templates:', state.templates.length);

    const promptGroup = $('qe-prompt').closest('.form-group');
    const selectHtml = `
      <div class="form-group" id="qe-template-wrapper">
        <label class="form-label">Template (opcional)</label>
        <select class="select" id="qe-template-select">
          <option value="">-- Nenhum --</option>
          ${state.templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
    `;

    promptGroup.insertAdjacentHTML('beforebegin', selectHtml);

    // Listener para preencher prompt quando template selecionado
    $('qe-template-select').addEventListener('change', (e) => {
      const templateId = e.target.value;
      if (!templateId) {
        $('qe-prompt').value = '';
        return;
      }

      const template = state.templates.find(t => t.id === templateId);
      if (template) {
        console.log('[QE] Template selecionado:', template.name);
        $('qe-prompt').value = template.prompt || '';

        // TODO: Se template tem variáveis {{var}}, mostrar inputs
        // Por enquanto, apenas preenche o prompt
      }
    });
  }

  $('qe-prompt').focus();
}

function closeQuickExecute() {
  state.qeOpen = false;
  $('qe-overlay').style.display = 'none';
  $('qe-prompt').value = '';

  // Resetar template select se existir
  const templateSelect = $('qe-template-select');
  if (templateSelect) templateSelect.value = '';
}

async function executeQuickTask() {
  const prompt = $('qe-prompt').value.trim();
  const useMemory = $('qe-use-memory').checked;

  if (!prompt) {
    showToast('Digite um prompt', 'warning');
    return;
  }

  try {
    showToast('Executando tarefa...', 'info');

    const task = {
      name: 'Quick Execute',
      type: 'claude_prompt',
      prompt,
      useMemory,
      runImmediately: true
    };

    await apiCall('/tasks', 'POST', task);

    closeQuickExecute();
    showToast('Tarefa executada!', 'success');

    // Ir para tasks
    switchSection('tasks');

  } catch (error) {
    console.error('[QE] Erro:', error);
    showToast('Erro ao executar tarefa', 'error');
  }
}

// ============ EVENT DELEGATION ============
function initEventDelegation() {
  // Delegacao de eventos no content container
  $('content').addEventListener('click', (e) => {
    // Primeiro: verificar se clicou em um botao com data-action
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const filename = btn.dataset.filename;
      const type = btn.dataset.type;
      handleAction(action, { id, filename, type });
      return;
    }

    // Segundo: verificar se clicou no card KB (fora dos botoes de acao)
    const kbCard = e.target.closest('.kb-doc-card');
    if (kbCard) {
      // Extrair filename do botao view dentro do card
      const viewBtn = kbCard.querySelector('[data-action="view-kb-doc"]');
      if (viewBtn && viewBtn.dataset.filename) {
        handleAction('view-kb-doc', { filename: viewBtn.dataset.filename });
      }
    }
  });

  // Botoes fixos
  $('btn-refresh').addEventListener('click', () => loadSectionData(state.activeSection));
  $('search-hint').addEventListener('click', openCommandPalette);
  $('btn-quick-exec').addEventListener('click', openQuickExecute);
  $('btn-scheduler-toggle').addEventListener('click', toggleScheduler);

  // View toggle
  $$('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setTaskView(view);
    });
  });

  // Feed controls
  $('btn-feed-pause').addEventListener('click', () => {
    state.feedPaused = !state.feedPaused;
    const icon = $('btn-feed-pause').querySelector('svg');
    if (state.feedPaused) {
      icon.innerHTML = '<polygon points="5,3 19,12 5,21 5,3"/>';
      showToast('Feed pausado', 'info');
    } else {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      showToast('Feed retomado', 'info');
    }
  });

  $('btn-feed-clear').addEventListener('click', () => {
    state.feedEvents = [];
    renderFeed();
    showToast('Feed limpo', 'info');
  });

  $('feed-filter').addEventListener('change', () => {
    state.feedFilter = $('feed-filter').value;
    renderFeed();
  });

  // Filter status e category
  $('filter-status').addEventListener('change', renderTasks);
  $('filter-task-category').addEventListener('change', renderTasks);

  // Quick Execute
  $('btn-qe-close').addEventListener('click', closeQuickExecute);
  $('btn-qe-cancel').addEventListener('click', closeQuickExecute);
  $('btn-qe-execute').addEventListener('click', executeQuickTask);

  // Export dropdown
  $('btn-export').addEventListener('click', () => {
    $('export-menu').classList.toggle('show');
  });

  // Settings
  $('btn-save-notif').addEventListener('click', saveNotificationSettings);
  $('btn-test-notif').addEventListener('click', testNotification);
  $('btn-save-scheduler').addEventListener('click', saveSchedulerSettings);
  $('btn-refresh-intg').addEventListener('click', () => loadSettings());
  $('btn-refresh-profiles').addEventListener('click', () => loadChromeProfiles());

  // Telegram
  $('btn-tg-save').addEventListener('click', saveTelegramConfig);
  $('btn-tg-start').addEventListener('click', startTelegramBot);
  $('btn-tg-stop').addEventListener('click', stopTelegramBot);
  $('btn-tg-test').addEventListener('click', testTelegram);

  // === PURGE BUTTONS ===
  const btnPurgeTasks = $('btn-purge-tasks');
  if (btnPurgeTasks) {
    btnPurgeTasks.addEventListener('click', () => {
      confirmAction('Limpar Todas as Tarefas', 'Isso vai deletar TODAS as tarefas e suas execucoes. Esta acao nao pode ser desfeita.', purgeAllTasks);
    });
  }
  const btnPurgeSessions = $('btn-purge-sessions');
  if (btnPurgeSessions) {
    btnPurgeSessions.addEventListener('click', () => {
      confirmAction('Limpar Todas as Sessoes', 'Isso vai deletar TODAS as sessoes de memoria e seus logs. Esta acao nao pode ser desfeita.', purgeAllSessions);
    });
  }

  // === MODAL TRIGGERS (botoes das secoes) ===
  $('btn-new-task').addEventListener('click', () => openTaskModal());
  $('btn-new-doc').addEventListener('click', () => openKBDocModal());
  $('btn-new-template').addEventListener('click', () => openTemplateModal());
  $('btn-new-session').addEventListener('click', () => openSessionModal());
  $('btn-new-credential').addEventListener('click', () => openCredentialModal());
  const btnImportCred = $('btn-import-credentials');
  if (btnImportCred) btnImportCred.addEventListener('click', () => openPDFUploadModal());

  // Upload PDF (botao na secao KB)
  const btnUploadPdfTrigger = $('btn-upload-pdf-trigger');
  if (btnUploadPdfTrigger) btnUploadPdfTrigger.addEventListener('click', () => openPDFUploadModal());

  // === MODAL SAVE HANDLERS ===
  $('btn-save-task').addEventListener('click', saveTask);
  $('btn-save-kb-doc').addEventListener('click', saveKBDoc);
  $('btn-upload-pdf').addEventListener('click', uploadPDF);
  $('btn-save-template').addEventListener('click', saveTemplate);
  $('btn-save-session').addEventListener('click', saveSession);
  $('btn-save-credential').addEventListener('click', saveCredential);

  // === MODAL ACTION HANDLERS ===
  $('btn-copy-template').addEventListener('click', copyTemplateResult);
  $('btn-execute-template').addEventListener('click', executeTemplateResult);
  $('btn-session-checkpoint').addEventListener('click', createSessionCheckpoint);
  $('btn-kb-view-edit').addEventListener('click', editFromKBView);
  const btnKbViewRaw = $('btn-kb-view-raw');
  if (btnKbViewRaw) btnKbViewRaw.addEventListener('click', toggleKBViewRaw);
  const btnKbViewDelete = $('btn-kb-view-delete');
  if (btnKbViewDelete) btnKbViewDelete.addEventListener('click', deleteKBDocFromView);

  // === PROMPT MANAGER SEARCH/FILTER ===
  const pmSearch = $('pm-search-input');
  if (pmSearch) pmSearch.addEventListener('input', filterTemplates);
  const pmFilter = $('pm-filter-category');
  if (pmFilter) pmFilter.addEventListener('change', filterTemplates);

  // === TEMPLATE VARIABLE DETECTION ===
  $('template-prompt-text').addEventListener('input', detectTemplateVars);

  // === KB SEARCH ===
  const kbSearch = $('kb-search-input');
  if (kbSearch) kbSearch.addEventListener('input', debounce(filterKBDocs, 300));

  // === CREDENTIAL SEARCH ===
  const credSearch = $('cred-search-input');
  if (credSearch) credSearch.addEventListener('input', debounce(filterCredentials, 300));

  // === KB CATEGORY FILTER ===
  const kbFilterCat = $('kb-filter-category');
  if (kbFilterCat) kbFilterCat.addEventListener('change', filterKBDocs);

  // === CREDENTIAL CATEGORY FILTER ===
  const credFilterCat = $('cred-filter-category');
  if (credFilterCat) credFilterCat.addEventListener('change', filterCredentials);

  // Fechar modais clicando no overlay
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      $$('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
    }
  });
}

function handleAction(action, data) {
  console.log('[Action]', action, data);

  switch(action) {
    // Tasks
    case 'new-task':
      openTaskModal();
      break;
    case 'run-task':
      runTask(data.id);
      break;
    case 'edit-task':
      openTaskModal(data.id);
      break;
    case 'delete-task':
      confirmAction('Deletar Tarefa', 'Deseja realmente deletar esta tarefa? Esta acao nao pode ser desfeita.', () => deleteTask(data.id));
      break;
    case 'view-task-logs':
      viewTaskLogs(data.id);
      break;

    // KB
    case 'view-kb-doc':
      viewKBDoc(data.filename);
      break;
    case 'edit-kb-doc':
      openKBDocModal(data.filename);
      break;
    case 'delete-kb-doc':
      confirmAction('Deletar Documento', `Deseja realmente deletar "${data.filename}"?`, () => deleteKBDoc(data.filename));
      break;

    // Templates
    case 'use-template':
      openUseTemplateModal(data.id);
      break;
    case 'edit-template':
      openTemplateModal(data.id);
      break;
    case 'delete-template':
      confirmAction('Deletar Template', 'Deseja realmente deletar este template?', () => deleteTemplate(data.id));
      break;

    // Sessions
    case 'view-session':
      viewSession(data.id);
      break;
    case 'favorite-session':
      toggleFavoriteSession(data.id);
      break;
    case 'finalize-session':
      confirmAction('Finalizar Sessao', 'Deseja finalizar esta sessao?', () => finalizeSession(data.id));
      break;
    case 'delete-session':
      confirmAction('Deletar Sessao', 'Deseja realmente deletar esta sessao?', () => deleteSession(data.id));
      break;

    // Credentials
    case 'reveal-credential':
      revealCredential(data.id);
      break;
    case 'edit-credential':
      openCredentialModal(data.id);
      break;
    case 'delete-credential':
      confirmAction('Deletar Credencial', 'Deseja realmente deletar esta credencial?', () => deleteCredential(data.id));
      break;

    // Export
    case 'export-json':
      exportData('json');
      break;
    case 'export-csv':
      exportData('csv');
      break;

    // Integrations
    case 'test-integration':
      testIntegration(data.type);
      break;
    case 'test-mcp':
      testMCPDetailed(data.type);
      break;

    // Chrome Profiles
    case 'select-chrome-profile':
      selectChromeProfile(data);
      break;

    // Command palette
    case 'new-doc':
      openKBDocModal();
      closeCommandPalette();
      break;
    case 'new-template':
      openTemplateModal();
      closeCommandPalette();
      break;
    case 'new-session':
      openSessionModal();
      closeCommandPalette();
      break;
    case 'toggle-scheduler':
      toggleScheduler();
      closeCommandPalette();
      break;

    default:
      console.log('[Action] Nao implementada:', action);
  }
}

// ============ TASK ACTIONS ============
async function runTask(taskId) {
  try {
    showToast('Executando tarefa...', 'info');
    await apiCall(`/tasks/${taskId}/run`, 'POST');
    showToast('Tarefa executada!', 'success');
    loadTasks();
  } catch (error) {
    showToast('Erro ao executar tarefa', 'error');
  }
}

async function deleteTask(taskId) {
  try {
    await apiCall(`/tasks/${taskId}`, 'DELETE');
    showToast('Tarefa deletada', 'success');
    loadTasks();
  } catch (error) {
    showToast('Erro ao deletar tarefa', 'error');
  }
}

async function purgeAllTasks() {
  try {
    console.log('[Purge] Limpando todas as tarefas e execucoes...');

    // Deletar execuções primeiro, depois tarefas
    const [execResult, taskResult] = await Promise.all([
      apiCall('/executions', 'DELETE'),
      apiCall('/tasks', 'DELETE')
    ]);

    console.log('[Purge] Resultado:', { execResult, taskResult });
    showToast(`Tarefas e execucoes removidas`, 'success');
    loadTasks();
    loadDashboard();
  } catch (error) {
    console.error('[Purge] Erro:', error);
    showToast('Erro ao limpar tarefas', 'error');
  }
}

async function purgeAllSessions() {
  try {
    console.log('[Purge] Limpando todas as sessoes (force=true)...');

    const result = await apiCall('/memory/sessions?force=true', 'DELETE');

    console.log('[Purge] Resultado:', result);
    const count = result.removed || 0;
    showToast(`${count} sessoes removidas`, 'success');
    loadMemory();
  } catch (error) {
    console.error('[Purge] Erro:', error);
    showToast('Erro ao limpar sessoes', 'error');
  }
}

function setTaskView(view) {
  state.taskView = view;
  localStorage.setItem('taskView', view);

  $$('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  renderTasks();
}

async function toggleScheduler() {
  try {
    const endpoint = state.schedulerRunning ? '/scheduler/stop' : '/scheduler/start';
    await apiCall(endpoint, 'POST');
    // O WS vai atualizar o estado
  } catch (error) {
    showToast('Erro ao alternar scheduler', 'error');
  }
}

// ============ SETTINGS ACTIONS ============
async function saveNotificationSettings() {
  try {
    const config = {
      enabled: $('notif-enabled').checked,
      webhookUrl: $('notif-webhook').value,
      events: []
    };

    if ($('notif-task-created').checked) config.events.push('task:created');
    if ($('notif-exec-completed').checked) config.events.push('execution:completed');
    if ($('notif-exec-failed').checked) config.events.push('execution:failed');

    await apiCall('/notifications/config', 'PUT', config);
    showToast('Configuracoes salvas', 'success');
  } catch (error) {
    showToast('Erro ao salvar configuracoes', 'error');
  }
}

async function testNotification() {
  try {
    await apiCall('/notifications/test', 'POST');
    showToast('Notificacao de teste enviada', 'success');
  } catch (error) {
    showToast('Erro ao enviar notificacao', 'error');
  }
}

async function saveSchedulerSettings() {
  try {
    const config = {
      checkInterval: parseInt($('scheduler-interval').value),
      maxConcurrentExecutions: parseInt($('scheduler-max-concurrent').value)
    };

    await apiCall('/config', 'PUT', config);
    showToast('Configuracoes salvas', 'success');
  } catch (error) {
    showToast('Erro ao salvar configuracoes', 'error');
  }
}

// ============ EXPORT ============
async function exportData(format) {
  try {
    if (format === 'json') {
      const data = await apiCall('/export');
      downloadJSON(data, 'claude-code-export.json');
      showToast('Exportado como JSON', 'success');
    } else if (format === 'csv') {
      // CSV export (simplificado)
      const csv = convertToCSV(state.tasks);
      downloadCSV(csv, 'tasks-export.csv');
      showToast('Exportado como CSV', 'success');
    }
  } catch (error) {
    showToast('Erro ao exportar', 'error');
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function convertToCSV(tasks) {
  const headers = ['ID', 'Nome', 'Status', 'Tipo', 'Criado'];
  const rows = tasks.map(t => [
    t.id,
    t.name,
    t.status,
    t.type,
    formatDate(t.createdAt)
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'info', duration = 3000) {
  const container = $('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-2);">
      <span>${getToastIcon(type)}</span>
      <span>${message}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || 'ℹ';
}

// ============ MODAL SYSTEM ============
let _confirmCallback = null;

function closeAllModals() {
  ['modal-task', 'modal-kb-doc', 'modal-kb-pdf', 'modal-template',
   'modal-use-template', 'modal-session', 'modal-credential',
   'modal-kb-view', 'modal-session-view', 'modal-task-logs', 'modal-confirm'
  ].forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });
  _confirmCallback = null;
  state.taskLogsOpenTaskId = null;
}

function showModal(id) {
  closeAllModals();
  $(id).style.display = 'flex';
}

function confirmAction(title, message, callback) {
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = message;

  // Mostrar modal sem usar showModal (que chama closeAllModals e anula _confirmCallback)
  ['modal-task', 'modal-kb-doc', 'modal-kb-pdf', 'modal-template',
   'modal-use-template', 'modal-session', 'modal-credential',
   'modal-kb-view', 'modal-session-view', 'modal-task-logs'
  ].forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });
  $('modal-confirm').style.display = 'flex';

  // Remover listeners antigos clonando o botão
  const oldBtn = $('btn-confirm-action');
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  // Bind confirm button com callback direto (não depende de variável global)
  btn.addEventListener('click', async () => {
    $('modal-confirm').style.display = 'none';
    if (callback) {
      await callback();
    }
  });
}

// ============ TASK MODAL ============
async function openTaskModal(taskId) {
  // Reset form
  $('task-edit-id').value = '';
  $('task-name').value = '';
  $('task-prompt').value = '';
  $('task-description').value = '';
  $('task-scheduled-at').value = '';
  $('task-cron').value = '';
  $('task-priority').value = 'normal';
  $('task-tags').value = '';
  $('task-run-immediately').checked = false;

  if (taskId) {
    // Edit mode
    $('modal-task-title').textContent = 'Editar Tarefa';
    try {
      const task = state.tasks.find(t => t.id === taskId) || await apiCall(`/tasks/${taskId}`);
      $('task-edit-id').value = task.id;
      $('task-name').value = task.name || '';
      $('task-prompt').value = task.prompt || '';
      $('task-description').value = task.description || '';
      $('task-scheduled-at').value = task.scheduledAt ? new Date(task.scheduledAt).toISOString().slice(0, 16) : '';
      $('task-cron').value = task.schedule || '';
      $('task-priority').value = task.priority || 'normal';
      $('task-tags').value = (task.tags || []).join(', ');
    } catch (error) {
      showToast('Erro ao carregar tarefa', 'error');
      return;
    }
  } else {
    $('modal-task-title').textContent = 'Nova Tarefa';
  }

  showModal('modal-task');
  $('task-name').focus();
}

async function saveTask() {
  const id = $('task-edit-id').value;
  const name = $('task-name').value.trim();
  const prompt = $('task-prompt').value.trim();

  if (!name) {
    showToast('Nome e obrigatorio', 'warning');
    return;
  }

  const data = {
    name,
    prompt,
    description: $('task-description').value.trim(),
    scheduledAt: $('task-scheduled-at').value || undefined,
    schedule: $('task-cron').value.trim() || undefined,
    priority: $('task-priority').value,
    tags: $('task-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    runImmediately: $('task-run-immediately').checked
    // category: definida automaticamente pelo servidor com base no conteúdo
  };

  try {
    if (id) {
      await apiCall(`/tasks/${id}`, 'PUT', data);
      showToast('Tarefa atualizada', 'success');
    } else {
      await apiCall('/tasks', 'POST', data);
      showToast('Tarefa criada', 'success');
    }
    closeAllModals();
    loadTasks();
  } catch (error) {
    showToast('Erro ao salvar tarefa', 'error');
  }
}

// ============ MARKDOWN RENDERER ============
function renderMarkdown(md) {
  if (!md) return '<p class="text-muted">(vazio)</p>';

  let html = md;
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="md-lang">${lang}</span>` : '';
    return `<div class="md-code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="md-h">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="md-h">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="md-h">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="md-h">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="md-h">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="md-h">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="md-hr">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');

  // Tables
  const tableRegex = /(?:^\|.+\|$\n?)+/gm;
  html = html.replace(tableRegex, (tableBlock) => {
    const rows = tableBlock.trim().split('\n');
    if (rows.length < 2) return tableBlock;
    let tableHtml = '<div class="md-table-wrap"><table class="md-table">';
    rows.forEach((row, i) => {
      const cells = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return; // separator
      const tag = i === 0 ? 'th' : 'td';
      const wrap = i === 0 ? 'thead' : (i === 1 ? 'tbody' : '');
      if (wrap === 'thead') tableHtml += '<thead>';
      if (wrap === 'tbody') tableHtml += '</thead><tbody>';
      tableHtml += '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
    if (match.includes('class="md-oli"')) return match;
    return '<ul class="md-ul">' + match + '</ul>';
  });

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(/((?:<li class="md-oli">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

  // Blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote class="md-bq">$1</blockquote>');

  // Paragraphs
  html = html.replace(/\n\n+/g, '\n\n');
  const blocks = html.split('\n\n');
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.match(/^<(h[1-6]|ul|ol|pre|hr|table|div|blockquote|thead|tbody)/)) return block;
    return `<p class="md-p">${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// ============ KB DOC MODAL ============
async function openKBDocModal(filename) {
  $('kb-edit-filename').value = '';
  $('kb-doc-filename').value = '';
  $('kb-doc-filename').disabled = false;
  $('kb-doc-category').value = '';
  $('kb-doc-content').value = '';

  if (filename) {
    $('modal-kb-title').textContent = 'Editar Documento';
    $('kb-edit-filename').value = filename;
    $('kb-doc-filename').value = filename.replace(/\.md$/, '');
    $('kb-doc-filename').disabled = true;

    try {
      const resp = await apiCall(`/kb/documents/${encodeURIComponent(filename)}`);
      const doc = resp.document || resp;
      $('kb-doc-content').value = doc.content || '';
      $('kb-doc-category').value = doc.metadata?.category || '';
    } catch (error) {
      showToast('Erro ao carregar documento', 'error');
      return;
    }
  } else {
    $('modal-kb-title').textContent = 'Novo Documento';
  }

  showModal('modal-kb-doc');
  if (!filename) $('kb-doc-filename').focus();
}

async function saveKBDoc() {
  const editFilename = $('kb-edit-filename').value;
  const filename = $('kb-doc-filename').value.trim();
  const content = $('kb-doc-content').value;

  if (!filename) {
    showToast('Nome do arquivo e obrigatorio', 'warning');
    return;
  }
  if (!content) {
    showToast('Conteudo e obrigatorio', 'warning');
    return;
  }

  const fullFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

  try {
    if (editFilename) {
      await apiCall(`/kb/documents/${encodeURIComponent(editFilename)}`, 'PUT', { content });
      showToast('Documento atualizado', 'success');
    } else {
      await apiCall('/kb/documents', 'POST', { filename: fullFilename, content });
      showToast('Documento criado', 'success');
    }
    closeAllModals();
    loadKB();
  } catch (error) {
    showToast('Erro ao salvar documento', 'error');
  }
}

let _kbViewRawMode = false;
let _kbViewCurrentDoc = null;

async function viewKBDoc(filename) {
  try {
    const resp = await apiCall(`/kb/documents/${encodeURIComponent(filename)}`);
    const doc = resp.document || resp;
    _kbViewCurrentDoc = doc;
    _kbViewRawMode = false;

    $('modal-kb-view-title').textContent = doc.title || filename;

    // Render markdown
    $('kb-view-content').innerHTML = renderMarkdown(doc.content);
    $('kb-view-content').className = 'kb-view-rendered';

    // Update raw/rendered toggle text
    const rawBtn = $('btn-kb-view-raw');
    if (rawBtn) rawBtn.querySelector('span').textContent = 'Codigo';

    // Store filename for edit/delete buttons
    $('btn-kb-view-edit').dataset.filename = filename;
    const delBtn = $('btn-kb-view-delete');
    if (delBtn) delBtn.dataset.filename = filename;

    // Show metadata
    const meta = [];
    if (doc.metadata?.category) meta.push(`<span class="badge badge-info">${doc.metadata.category}</span>`);
    if (doc.lastModified) meta.push(`<span>Atualizado: ${formatDate(doc.lastModified)}</span>`);
    if (doc.sections?.length) meta.push(`<span>${doc.sections.length} secoes</span>`);
    if (doc.content) {
      const wordCount = doc.content.split(/\s+/).filter(w => w).length;
      const lineCount = doc.content.split('\n').length;
      meta.push(`<span>${wordCount} palavras</span>`);
      meta.push(`<span>${lineCount} linhas</span>`);
    }
    const metaEl = $('kb-view-meta');
    if (metaEl) metaEl.innerHTML = meta.join('<span class="meta-sep">·</span>');

    showModal('modal-kb-view');
  } catch (error) {
    showToast('Erro ao carregar documento', 'error');
  }
}

function toggleKBViewRaw() {
  if (!_kbViewCurrentDoc) return;
  _kbViewRawMode = !_kbViewRawMode;
  const contentEl = $('kb-view-content');
  const rawBtn = $('btn-kb-view-raw');

  if (_kbViewRawMode) {
    contentEl.textContent = _kbViewCurrentDoc.content || '(vazio)';
    contentEl.className = 'kb-view-raw';
    if (rawBtn) rawBtn.querySelector('span').textContent = 'Renderizado';
  } else {
    contentEl.innerHTML = renderMarkdown(_kbViewCurrentDoc.content);
    contentEl.className = 'kb-view-rendered';
    if (rawBtn) rawBtn.querySelector('span').textContent = 'Codigo';
  }
}

function deleteKBDocFromView() {
  const filename = $('btn-kb-view-delete')?.dataset.filename;
  if (!filename) return;
  confirmAction('Deletar Documento', `Tem certeza que deseja deletar "${filename}"? Esta acao nao pode ser desfeita.`, async () => {
    await deleteKBDoc(filename);
    closeAllModals();
  });
}

function editFromKBView() {
  const filename = $('btn-kb-view-edit').dataset.filename;
  if (filename) openKBDocModal(filename);
}

async function deleteKBDoc(filename) {
  try {
    await apiCall(`/kb/documents/${encodeURIComponent(filename)}`, 'DELETE');
    showToast('Documento deletado', 'success');
    loadKB();
  } catch (error) {
    showToast('Erro ao deletar documento', 'error');
  }
}

// ============ PDF UPLOAD ============
function openPDFUploadModal() {
  $('kb-pdf-file').value = '';
  $('kb-pdf-name').value = '';
  $('kb-pdf-progress').style.display = 'none';
  $('kb-pdf-progress-bar').style.width = '0%';
  showModal('modal-kb-pdf');
}

async function uploadPDF() {
  const fileInput = $('kb-pdf-file');
  const file = fileInput.files[0];

  if (!file) {
    showToast('Selecione um arquivo PDF', 'warning');
    return;
  }

  if (!file.name.endsWith('.pdf')) {
    showToast('Apenas arquivos PDF sao aceitos', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('pdf', file);
  const customName = $('kb-pdf-name').value.trim();
  if (customName) formData.append('name', customName);

  $('kb-pdf-progress').style.display = 'block';
  $('kb-pdf-progress-bar').style.width = '30%';

  try {
    const response = await fetch(API + '/kb/upload-pdf', {
      method: 'POST',
      body: formData
    });

    $('kb-pdf-progress-bar').style.width = '80%';

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    $('kb-pdf-progress-bar').style.width = '100%';

    setTimeout(() => {
      closeAllModals();
      showToast(`PDF processado: ${result.filename || file.name}`, 'success');
      loadKB();
    }, 500);
  } catch (error) {
    $('kb-pdf-progress').style.display = 'none';
    showToast('Erro ao processar PDF', 'error');
  }
}

// ============ TEMPLATE MODAL ============
async function openTemplateModal(templateId) {
  $('template-edit-id').value = '';
  $('template-name').value = '';
  $('template-category').value = '';
  $('template-description').value = '';
  $('template-prompt-text').value = '';
  $('template-vars-detected').style.display = 'none';
  $('template-vars-list').innerHTML = '';

  if (templateId) {
    $('modal-template-title').textContent = 'Editar Template';
    try {
      const template = state.templates.find(t => t.id === templateId) || await apiCall(`/prompt-templates/${templateId}`);
      $('template-edit-id').value = template.id;
      $('template-name').value = template.name || '';
      $('template-category').value = template.category || '';
      $('template-description').value = template.description || '';
      $('template-prompt-text').value = template.promptText || template.template || '';
      detectTemplateVars();
    } catch (error) {
      showToast('Erro ao carregar template', 'error');
      return;
    }
  } else {
    $('modal-template-title').textContent = 'Novo Template';
  }

  showModal('modal-template');
  $('template-name').focus();
}

function detectTemplateVars() {
  const text = $('template-prompt-text').value;
  const matches = [...new Set((text.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, '')))];

  if (matches.length > 0) {
    $('template-vars-detected').style.display = 'block';
    $('template-vars-list').innerHTML = matches.map(v =>
      `<span class="badge badge-info">{{${v}}}</span>`
    ).join('');
  } else {
    $('template-vars-detected').style.display = 'none';
  }
}

async function saveTemplate() {
  const id = $('template-edit-id').value;
  const name = $('template-name').value.trim();
  const promptText = $('template-prompt-text').value.trim();

  if (!name) {
    showToast('Nome e obrigatorio', 'warning');
    return;
  }
  if (!promptText) {
    showToast('Prompt e obrigatorio', 'warning');
    return;
  }

  const variables = [...new Set((promptText.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, '')))];

  const data = {
    name,
    promptText,
    category: $('template-category').value.trim() || undefined,
    description: $('template-description').value.trim() || undefined,
    variables
  };

  try {
    if (id) {
      await apiCall(`/prompt-templates/${id}`, 'PUT', data);
      showToast('Template atualizado', 'success');
    } else {
      await apiCall('/prompt-templates', 'POST', data);
      showToast('Template criado', 'success');
    }
    closeAllModals();
    loadPrompts();
  } catch (error) {
    showToast('Erro ao salvar template', 'error');
  }
}

async function deleteTemplate(id) {
  try {
    await apiCall(`/prompt-templates/${id}`, 'DELETE');
    showToast('Template deletado', 'success');
    loadPrompts();
  } catch (error) {
    showToast('Erro ao deletar template', 'error');
  }
}

// ============ USE TEMPLATE MODAL ============
async function openUseTemplateModal(templateId) {
  const template = state.templates.find(t => t.id === templateId);
  if (!template) {
    showToast('Template nao encontrado', 'error');
    return;
  }

  $('use-template-id').value = templateId;
  $('modal-use-template-title').textContent = `Usar: ${template.name}`;

  const promptText = template.promptText || template.template || '';
  const variables = [...new Set((promptText.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, '')))];

  const varsContainer = $('use-template-vars');

  if (variables.length === 0) {
    varsContainer.innerHTML = '<p class="text-muted">Este template nao possui variaveis.</p>';
  } else {
    varsContainer.innerHTML = variables.map(v => `
      <div class="form-group">
        <label class="form-label">{{${v}}}</label>
        <input type="text" class="input use-template-var" data-var="${v}" placeholder="Valor para ${v}">
      </div>
    `).join('');

    // Live preview on input
    varsContainer.querySelectorAll('.use-template-var').forEach(input => {
      input.addEventListener('input', () => updateTemplatePreview(promptText, variables));
    });
  }

  updateTemplatePreview(promptText, variables);
  showModal('modal-use-template');
}

function updateTemplatePreview(promptText, variables) {
  let result = promptText;
  variables.forEach(v => {
    const input = document.querySelector(`.use-template-var[data-var="${v}"]`);
    const value = input ? input.value : '';
    result = result.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), value || `{{${v}}}`);
  });
  $('use-template-preview').textContent = result;
}

function getFilledTemplate() {
  return $('use-template-preview').textContent;
}

function copyTemplateResult() {
  const text = getFilledTemplate();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Prompt copiado!', 'success');
  }).catch(() => {
    showToast('Erro ao copiar', 'error');
  });
}

async function executeTemplateResult() {
  const prompt = getFilledTemplate();
  if (prompt.includes('{{')) {
    showToast('Preencha todas as variaveis antes de executar', 'warning');
    return;
  }

  try {
    const task = {
      name: 'Template Execute',
      type: 'claude_prompt',
      prompt,
      runImmediately: true
    };
    await apiCall('/tasks', 'POST', task);
    closeAllModals();
    showToast('Tarefa criada e executando!', 'success');
    switchSection('tasks');
  } catch (error) {
    showToast('Erro ao executar template', 'error');
  }
}

// ============ SESSION MODAL ============
function openSessionModal() {
  $('session-objective').value = '';
  $('session-force-active').checked = true;
  showModal('modal-session');
  $('session-objective').focus();
}

async function saveSession() {
  const objective = $('session-objective').value.trim();
  if (!objective) {
    showToast('Objetivo e obrigatorio', 'warning');
    return;
  }

  try {
    await apiCall('/memory/sessions', 'POST', {
      objective,
      forceActive: $('session-force-active').checked
    });
    closeAllModals();
    showToast('Sessao criada', 'success');
    loadMemory();
  } catch (error) {
    showToast('Erro ao criar sessao', 'error');
  }
}

async function viewSession(sessionId) {
  console.log('[viewSession] Carregando sessao:', sessionId);

  try {
    // Buscar sessão (unwrap API response)
    const sessionResp = await apiCall(`/memory/sessions/${sessionId}`);
    const session = sessionResp.data || sessionResp;
    console.log('[viewSession] Sessao carregada:', session);

    $('modal-session-view-title').textContent = session.objective || session.context?.objective || 'Sessao';

    // Buscar execuções relacionadas (se houver taskId nas tasks)
    let executionLogs = [];
    let executionId = null;
    let execMeta = null;

    if (session.tasks && session.tasks.length > 0) {
      console.log('[viewSession] Buscando execucoes das tasks...');

      for (const task of session.tasks) {
        if (task.taskId) {
          try {
            const executions = await apiCall(`/tasks/${task.taskId}/executions?limit=1`);
            console.log('[viewSession] Execucoes encontradas para task', task.taskId, ':', executions);

            if (executions && executions.length > 0) {
              const exec = executions[0];
              executionId = exec.id;
              execMeta = {
                id: exec.id,
                taskName: exec.taskName || task.content || task.name || task.description || 'Tarefa',
                status: exec.status || 'completed',
                startedAt: exec.startedAt,
                finishedAt: exec.finishedAt,
                duration: exec.duration
              };

              // Parse conversationLog se existir
              if (exec.conversationLog) {
                try {
                  const parsedLog = typeof exec.conversationLog === 'string'
                    ? JSON.parse(exec.conversationLog)
                    : exec.conversationLog;

                  const steps = Array.isArray(parsedLog) ? parsedLog : (parsedLog.steps && Array.isArray(parsedLog.steps) ? parsedLog.steps : null);
                  if (steps && steps.length > 0) {
                    executionLogs = steps;
                    console.log('[viewSession] Logs parseados:', executionLogs.length, 'steps');
                  }
                } catch (parseError) {
                  console.error('[viewSession] Erro ao parsear conversationLog:', parseError);
                }
              }
              break; // Usar apenas a primeira execução encontrada
            }
          } catch (error) {
            console.error('[viewSession] Erro ao buscar execucoes:', error);
          }
        }
      }
    }

    // Renderizar logs usando renderTerminalStep com header informativo
    let logsHtml = '<div class="text-muted">Nenhum log disponivel</div>';

    if (executionLogs.length > 0) {
      console.log('[viewSession] Renderizando', executionLogs.length, 'steps');
      const execName = execMeta?.taskName || 'Execucao';
      const execShortId = executionId ? executionId.substring(0, 8) : '--';
      const execStatus = execMeta?.status || 'completed';
      const execDuration = execMeta?.duration ? formatDuration(execMeta.duration) :
        (execMeta?.startedAt && execMeta?.finishedAt ? formatDuration(new Date(execMeta.finishedAt) - new Date(execMeta.startedAt)) : '--');
      const statusClass = execStatus === 'running' ? 'warning' : (execStatus === 'failed' ? 'error' : 'success');
      const statusLabel = execStatus === 'running' ? 'Executando' : (execStatus === 'failed' ? 'Falhou' : 'Concluida');

      logsHtml = `
        <div class="terminal-output" style="max-height:400px;overflow-y:auto;background:var(--bg-tertiary);border-radius:var(--radius);">
          <div class="terminal-exec-header">
            <div class="terminal-exec-info">
              <span class="terminal-exec-name">${execName}</span>
              <span class="terminal-exec-id">${execShortId}</span>
            </div>
            <div class="terminal-exec-meta">
              <span class="badge badge-${statusClass}">${statusLabel}</span>
              <span class="text-muted">${execDuration}</span>
              <span class="text-muted">${executionLogs.length} steps</span>
            </div>
          </div>
          <div style="padding:var(--sp-3);">
            ${executionLogs.map((step, idx) => renderTerminalStep(step, idx)).join('')}
          </div>
        </div>
      `;
    }

    // Determinar modo de interação
    const hasExecution = !!executionId;
    const sessionObjective = session.objective || session.context?.objective || '';
    const interactPlaceholder = hasExecution
      ? 'Continuar conversa com o agente...'
      : 'Enviar novo prompt para esta sessao...';
    const interactBtnText = hasExecution ? 'Continuar' : 'Executar';
    const interactHint = hasExecution
      ? '<span style="font-size:var(--text-xs);color:var(--text-muted);">Retoma a execucao existente via Claude --resume</span>'
      : '<span style="font-size:var(--text-xs);color:var(--text-muted);">Cria nova execucao com o contexto desta sessao</span>';

    const html = `
      <div style="display:grid;gap:var(--sp-4);">
        <div class="session-info">
          <div>
            <strong>Status:</strong> <span class="badge badge-${getStatusBadgeClass(session.status)}">${session.status || 'active'}</span>
            ${session.favorite ? ' <span>⭐</span>' : ''}
          </div>
          <div><strong>Inicio:</strong> ${formatDate(session.createdAt)}</div>
          ${session.context?.currentPhase ? `<div><strong>Fase:</strong> ${session.context.currentPhase}</div>` : ''}
        </div>

        <div class="session-tasks">
          <strong>Tarefas (${session.tasks?.length || 0}):</strong>
          ${(session.tasks || []).map(t => `
            <div style="padding:var(--sp-2);margin-top:var(--sp-1);background:var(--bg-tertiary);border-radius:var(--radius);">
              <span class="badge badge-${getStatusBadgeClass(t.status)}">${t.status}</span>
              ${t.content || t.description || t.name || 'Tarefa'}
            </div>
          `).join('') || '<div class="text-muted">Nenhuma tarefa</div>'}
        </div>

        <div class="session-checkpoints">
          <strong>Checkpoints (${session.checkpoints?.length || 0}):</strong>
          ${(session.checkpoints || []).map(cp => `
            <div style="padding:var(--sp-2);margin-top:var(--sp-1);background:var(--bg-tertiary);border-radius:var(--radius);">
              ${formatDate(cp.timestamp)} - ${cp.name || 'Checkpoint'}
            </div>
          `).join('') || '<div class="text-muted">Nenhum checkpoint</div>'}
        </div>

        <div class="session-logs">
          <strong>Logs da Execucao:</strong>
          ${logsHtml}
        </div>

        <div class="session-interact" style="border-top:1px solid var(--border);padding-top:var(--sp-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2);">
            <strong>Interagir com a Sessao</strong>
            ${interactHint}
          </div>
          <div style="display:flex;gap:var(--sp-2);align-items:center;">
            <input
              type="text"
              class="input"
              id="session-interact-input"
              placeholder="${interactPlaceholder}"
              style="flex:1;"
            >
            <button
              class="btn btn-success btn-sm"
              id="btn-session-interact"
              data-execution-id="${executionId || ''}"
              data-session-id="${sessionId}"
              data-session-objective="${sessionObjective.replace(/"/g, '&quot;')}"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              ${interactBtnText}
            </button>
          </div>
        </div>
      </div>
    `;

    $('session-view-content').innerHTML = html;
    $('btn-session-checkpoint').dataset.sessionId = sessionId;

    // Adicionar event listener para interação
    const btnInteract = $('btn-session-interact');
    if (btnInteract) {
      btnInteract.addEventListener('click', async () => {
        const input = $('session-interact-input');
        const message = input.value.trim();
        const execId = btnInteract.dataset.executionId;
        const sessId = btnInteract.dataset.sessionId;
        const sessObj = btnInteract.dataset.sessionObjective;

        if (!message) {
          showToast('Digite uma mensagem', 'error');
          return;
        }

        try {
          btnInteract.disabled = true;
          input.disabled = true;
          btnInteract.textContent = 'Enviando...';

          if (execId) {
            // MODO 1: Resume execução existente
            console.log('[viewSession] Resumindo execucao:', execId, message);
            await apiCall(`/executions/${execId}/resume`, 'POST', { message });
            showToast('Mensagem enviada! Execucao retomada.', 'success');

          } else {
            // MODO 2: Criar nova execução com contexto da sessão
            console.log('[viewSession] Criando nova execucao para sessao:', sessId);

            const contextPrefix = sessObj
              ? `[Contexto da sessao: ${sessObj}]\n\n`
              : '';

            const task = {
              name: `Sessao: ${sessObj?.substring(0, 50) || sessId.substring(0, 12)}`,
              type: 'claude_prompt',
              prompt: contextPrefix + message,
              useMemory: true,
              runImmediately: true,
              sessionId: sessId
            };

            const createdTask = await apiCall('/tasks', 'POST', task);
            console.log('[viewSession] Task criada:', createdTask);

            showToast('Nova execucao iniciada!', 'success');

            // Associar task à sessão
            try {
              await apiCall(`/memory/sessions/${sessId}/tasks`, 'POST', {
                taskId: createdTask.id,
                content: message.substring(0, 100),
                status: 'running'
              });
            } catch (linkErr) {
              console.warn('[viewSession] Nao foi possivel linkar task a sessao:', linkErr);
            }
          }

          input.value = '';

          // Recarregar sessão após 2 segundos para mostrar nova execução
          setTimeout(() => viewSession(sessId || sessionId), 2500);

        } catch (error) {
          console.error('[viewSession] Erro ao enviar mensagem:', error);
          showToast('Erro ao interagir: ' + (error.message || 'Erro desconhecido'), 'error');
        } finally {
          btnInteract.disabled = false;
          input.disabled = false;
          btnInteract.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            ${execId ? 'Continuar' : 'Executar'}
          `;
        }
      });

      // Enter key para enviar
      const input = $('session-interact-input');
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            btnInteract.click();
          }
        });
      }
    }

    showModal('modal-session-view');
    console.log('[viewSession] Modal exibido');

  } catch (error) {
    console.error('[viewSession] Erro ao carregar sessao:', error);
    showToast('Erro ao carregar sessao', 'error');
  }
}

async function createSessionCheckpoint() {
  const sessionId = $('btn-session-checkpoint').dataset.sessionId;
  if (!sessionId) return;

  try {
    await apiCall(`/memory/sessions/${sessionId}/checkpoint`, 'POST');
    showToast('Checkpoint criado', 'success');
    viewSession(sessionId); // Refresh
  } catch (error) {
    showToast('Erro ao criar checkpoint', 'error');
  }
}

async function toggleFavoriteSession(sessionId) {
  try {
    const session = state.sessions.find(s => s.id === sessionId);
    await apiCall(`/memory/sessions/${sessionId}/favorite`, 'PUT');
    showToast(session?.favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'success');
    loadMemory();
  } catch (error) {
    showToast('Erro ao atualizar favorito', 'error');
  }
}

async function finalizeSession(sessionId) {
  try {
    await apiCall(`/memory/sessions/${sessionId}/finalize`, 'POST');
    showToast('Sessao finalizada', 'success');
    loadMemory();
  } catch (error) {
    showToast('Erro ao finalizar sessao', 'error');
  }
}

async function deleteSession(sessionId) {
  try {
    await apiCall(`/memory/sessions/${sessionId}`, 'DELETE');
    showToast('Sessao deletada', 'success');
    loadMemory();
  } catch (error) {
    showToast('Erro ao deletar sessao', 'error');
  }
}

// ============ CREDENTIAL MODAL ============
async function openCredentialModal(credId) {
  $('cred-edit-id').value = '';
  $('cred-name').value = '';
  $('cred-value').value = '';
  $('cred-category').value = '';
  $('cred-source').value = '';
  $('cred-description').value = '';

  if (credId) {
    $('modal-cred-title').textContent = 'Editar Credencial';
    const cred = state.credentials.find(c => c.id === credId);
    if (cred) {
      $('cred-edit-id').value = cred.id;
      $('cred-name').value = cred.name || '';
      $('cred-category').value = cred.category || '';
      $('cred-source').value = cred.source || '';
      $('cred-description').value = cred.description || '';
      // Value is not populated for security
    }
  } else {
    $('modal-cred-title').textContent = 'Nova Credencial';
  }

  showModal('modal-credential');
  $('cred-name').focus();
}

async function saveCredential() {
  const id = $('cred-edit-id').value;
  const name = $('cred-name').value.trim();
  const value = $('cred-value').value;

  if (!name) {
    showToast('Nome e obrigatorio', 'warning');
    return;
  }
  if (!id && !value) {
    showToast('Valor e obrigatorio', 'warning');
    return;
  }

  const data = {
    name,
    category: $('cred-category').value.trim() || undefined,
    source: $('cred-source').value.trim() || undefined,
    description: $('cred-description').value.trim() || undefined
  };
  if (value) data.value = value;

  try {
    if (id) {
      await apiCall(`/credentials/${id}`, 'PUT', data);
      showToast('Credencial atualizada', 'success');
    } else {
      await apiCall('/credentials', 'POST', data);
      showToast('Credencial criada', 'success');
    }
    closeAllModals();
    loadCredentials();
  } catch (error) {
    showToast('Erro ao salvar credencial', 'error');
  }
}

async function revealCredential(credId) {
  try {
    const result = await apiCall(`/credentials/${credId}/reveal`, 'POST');
    const credItem = document.querySelector(`[data-action="reveal-credential"][data-id="${credId}"]`);
    if (credItem) {
      const valueEl = credItem.closest('.cred-item')?.querySelector('.cred-value');
      if (valueEl) {
        valueEl.textContent = result.value || result.decryptedValue || '***';
        valueEl.style.fontFamily = 'var(--font-mono)';
        valueEl.style.fontSize = 'var(--text-sm)';
        // Auto-hide after 5s
        setTimeout(() => {
          valueEl.textContent = '••••••••';
          valueEl.style.fontFamily = '';
          valueEl.style.fontSize = '';
        }, 5000);
      }
    }
    showToast('Credencial revelada (oculta em 5s)', 'info');
  } catch (error) {
    showToast('Erro ao revelar credencial', 'error');
  }
}

async function deleteCredential(credId) {
  try {
    await apiCall(`/credentials/${credId}`, 'DELETE');
    showToast('Credencial deletada', 'success');
    loadCredentials();
  } catch (error) {
    showToast('Erro ao deletar credencial', 'error');
  }
}

// ============ FILTERS ============
async function filterKBDocs() {
  const search = ($('kb-search-input')?.value || '').trim();
  const category = $('kb-filter-category')?.value || '';

  // Se tem busca com 2+ chars, usar API de search (retorna snippet + score)
  if (search.length >= 2) {
    try {
      const params = new URLSearchParams({ q: search, maxResults: 20 });
      if (category) params.append('category', category);
      const resp = await apiCall(`/kb/search?${params}`, 'GET', null, { silent: true });
      const results = resp.results || [];
      renderKBDocs(results);
      return;
    } catch (e) {
      console.warn('[KB] Search API failed, fallback to local filter');
    }
  }

  let filtered = state.kbDocs;
  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = filtered.filter(d =>
      (d.name || '').toLowerCase().includes(lowerSearch) ||
      (d.title || '').toLowerCase().includes(lowerSearch) ||
      (d.tags || []).some(t => t.toLowerCase().includes(lowerSearch))
    );
  }
  if (category) {
    filtered = filtered.filter(d => d.category === category);
  }
  renderKBDocs(filtered);
}

function filterCredentials() {
  const search = ($('cred-search-input')?.value || '').toLowerCase();
  const category = $('cred-filter-category')?.value || '';

  let filtered = state.credentials;
  if (search) {
    filtered = filtered.filter(c =>
      (c.name || '').toLowerCase().includes(search) ||
      (c.description || '').toLowerCase().includes(search)
    );
  }
  if (category) {
    filtered = filtered.filter(c => c.category === category);
  }
  renderCredentials(filtered);
}

// ============ INTEGRATION TEST ============
async function testIntegration(type) {
  try {
    showToast(`Testando ${type}...`, 'info');
    await apiCall(`/integrations/${type}/test`, 'POST');
    showToast(`${type} funcionando!`, 'success');
  } catch (error) {
    showToast(`Erro ao testar ${type}`, 'error');
  }
}

async function testMCPDetailed(type) {
  console.log('[MCP Test] Testando:', type);

  try {
    showToast(`Testando ${INTG_NAMES[type] || type}...`, 'info');

    const startTime = performance.now();
    const result = await apiCall(`/integrations/${type}/test`, 'POST');
    const responseTime = performance.now() - startTime;

    console.log('[MCP Test] Resultado:', result);

    // Mostrar modal com resultado detalhado
    showMCPTestResult(type, result, responseTime);

  } catch (error) {
    console.error('[MCP Test] Erro:', error);
    showToast(`Erro ao testar ${INTG_NAMES[type] || type}`, 'error');
  }
}

function showMCPTestResult(type, result, responseTime) {
  const displayName = INTG_NAMES[type] || type;

  // Construir HTML do resultado
  let detailsHtml = '';

  if (result.tools && Array.isArray(result.tools)) {
    detailsHtml += `
      <div style="margin-bottom:var(--sp-4);">
        <strong>Tools disponiveis:</strong> ${result.tools.length}
        <div style="margin-top:var(--sp-2);display:flex;flex-wrap:wrap;gap:var(--sp-2);">
          ${result.tools.map(tool => `<span class="badge badge-muted">${tool}</span>`).join('')}
        </div>
      </div>
    `;
  }

  if (result.version) {
    detailsHtml += `<div><strong>Versao:</strong> ${result.version}</div>`;
  }

  detailsHtml += `<div><strong>Tempo de resposta:</strong> ${responseTime.toFixed(2)}ms</div>`;
  detailsHtml += `<div><strong>Status:</strong> <span style="color:var(--success);">✓ Operacional</span></div>`;

  // Usar modal genérico (criar inline)
  const existingModal = $('mcp-test-modal');
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div class="modal-overlay" id="mcp-test-modal" style="display:flex;">
      <div class="modal">
        <div class="modal-header">
          <h3>Teste MCP: ${displayName}</h3>
          <button class="btn btn-icon btn-sm" onclick="document.getElementById('mcp-test-modal').remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${detailsHtml}
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('mcp-test-modal').remove()">Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function selectChromeProfile(data) {
  const profileDir = data.id || '';
  if (!profileDir) return;

  try {
    await apiCall('/chrome/selected-profile', 'PUT', {
      selectedProfile: profileDir,
      profileName: profileDir
    });
    showToast(`Perfil Chrome selecionado: ${profileDir}`, 'success');
    loadChromeProfiles();
  } catch (error) {
    showToast('Erro ao selecionar perfil', 'error');
  }
}

// ============ TELEGRAM BOT ============
async function loadTelegramConfig() {
  console.log('[Telegram] Carregando configuracao...');

  try {
    const [config, status] = await Promise.all([
      apiCall('/telegram/config', 'GET', null, { silent: true }),
      apiCall('/telegram/status', 'GET', null, { silent: true })
    ]);

    console.log('[Telegram] Config:', config);
    console.log('[Telegram] Status:', status);

    // Preencher inputs
    if (config) {
      $('telegram-token').value = config.token || '';
      $('telegram-chat-id').value = config.chatId || '';
      $('tg-notif-success').checked = config.events?.includes('execution:completed') || false;
      $('tg-notif-failed').checked = config.events?.includes('execution:failed') || false;
      $('tg-notif-created').checked = config.events?.includes('task:created') || false;
    }

    // Atualizar status visual
    updateTelegramStatusUI(status?.running || false);

  } catch (error) {
    console.error('[Telegram] Erro ao carregar:', error);
  }
}

function updateTelegramStatusUI(isRunning) {
  const statusContainer = $('telegram-status');
  const dot = statusContainer.querySelector('.status-dot');
  const text = statusContainer.querySelector('span:last-child');

  if (isRunning) {
    dot.style.background = 'var(--success)';
    text.textContent = 'Conectado';
    text.style.color = 'var(--success)';
  } else {
    dot.style.background = 'var(--muted)';
    text.textContent = 'Desconectado';
    text.style.color = 'var(--text-muted)';
  }
}

async function saveTelegramConfig() {
  console.log('[Telegram] Salvando configuracao...');

  const token = $('telegram-token').value.trim();
  const chatId = $('telegram-chat-id').value.trim();

  if (!token) {
    showToast('Token do bot e obrigatorio', 'warning');
    return;
  }

  const events = [];
  if ($('tg-notif-success').checked) events.push('execution:completed');
  if ($('tg-notif-failed').checked) events.push('execution:failed');
  if ($('tg-notif-created').checked) events.push('task:created');

  try {
    await apiCall('/telegram/config', 'PUT', {
      token,
      chatId,
      events
    });

    showToast('Configuracao do Telegram salva', 'success');
    console.log('[Telegram] Config salva:', { token: '***', chatId, events });

  } catch (error) {
    console.error('[Telegram] Erro ao salvar:', error);
    showToast('Erro ao salvar configuracao', 'error');
  }
}

async function startTelegramBot() {
  console.log('[Telegram] Iniciando bot...');

  try {
    showToast('Iniciando Telegram bot...', 'info');
    await apiCall('/telegram/start', 'POST');

    showToast('Telegram bot iniciado', 'success');
    updateTelegramStatusUI(true);

  } catch (error) {
    console.error('[Telegram] Erro ao iniciar:', error);
    showToast('Erro ao iniciar bot', 'error');
  }
}

async function stopTelegramBot() {
  console.log('[Telegram] Parando bot...');

  try {
    showToast('Parando Telegram bot...', 'info');
    await apiCall('/telegram/stop', 'POST');

    showToast('Telegram bot parado', 'success');
    updateTelegramStatusUI(false);

  } catch (error) {
    console.error('[Telegram] Erro ao parar:', error);
    showToast('Erro ao parar bot', 'error');
  }
}

async function testTelegram() {
  console.log('[Telegram] Testando envio...');

  try {
    showToast('Enviando mensagem de teste...', 'info');

    await apiCall('/telegram/send', 'POST', {
      message: '🤖 Teste de configuracao do Telegram Bot\n\nSe voce recebeu esta mensagem, a configuracao esta correta!'
    });

    showToast('Mensagem de teste enviada! Verifique o Telegram.', 'success');

  } catch (error) {
    console.error('[Telegram] Erro no teste:', error);
    showToast('Erro ao enviar mensagem de teste', 'error');
  }
}

// ============ TERMINAL REAL-TIME ============

/**
 * Carrega execuções em andamento para o terminal
 */
async function loadRunningExecutions() {
  console.log('[Terminal] Carregando execuções running...');

  try {
    const data = await apiCall('/executions/running', 'GET', null, { silent: true });
    const running = Array.isArray(data) ? data : (data.data || []);

    state.terminalRunningExecs = running;
    updateTerminalExecSelector();

    if (running.length > 0 && !state.terminalActiveExec) {
      state.terminalActiveExec = running[0].executionId;
      state.terminalSteps[running[0].executionId] = [];
      updateTerminalOutput();
    }

    console.log('[Terminal] Execuções carregadas:', running.length);
  } catch (error) {
    console.error('[Terminal] Erro ao carregar execuções running:', error);
    // API pode não existir ainda, silenciar erro
  }
}

/**
 * Processa step recebido via WebSocket
 */
function handleTerminalStep(data) {
  console.log('[Terminal] Step recebido:', {
    executionId: data.executionId,
    stepType: data.step?.type
  });

  const { executionId, step } = data;

  if (!executionId || !step) {
    console.warn('[Terminal] Step inválido:', data);
    return;
  }

  // Inicializar array de steps se não existir
  if (!state.terminalSteps[executionId]) {
    state.terminalSteps[executionId] = [];
  }

  // Adicionar timestamp se não tiver
  if (!step.timestamp) {
    step.timestamp = new Date().toISOString();
  }

  // Adicionar step ao histórico
  state.terminalSteps[executionId].push(step);

  console.log('[Terminal] Step armazenado. Total steps:', state.terminalSteps[executionId].length);

  // Atualizar output se for a execução ativa
  if (executionId === state.terminalActiveExec) {
    updateTerminalOutput();
  }
}

/**
 * Ver logs de execucao de uma tarefa pelo card
 */
async function viewTaskLogs(taskId) {
  state.taskLogsOpenTaskId = taskId;
  try {
    showModal('modal-task-logs');
    $('modal-task-logs-title').textContent = 'Carregando...';
    $('task-logs-content').innerHTML = '<div class="text-muted" style="padding:var(--sp-4);text-align:center;">Buscando execucoes...</div>';

    // Buscar dados da tarefa
    const task = state.tasks.find(t => t.id === taskId);
    const taskName = task?.name || task?.description || taskId.substring(0, 8);

    $('modal-task-logs-title').textContent = `Logs - ${taskName}`;

    // Buscar execucoes da tarefa
    const executions = await apiCall(`/tasks/${taskId}/executions?limit=10`);

    if (!executions || executions.length === 0) {
      $('task-logs-content').innerHTML = '<div class="text-muted" style="padding:var(--sp-4);text-align:center;">Nenhuma execucao encontrada para esta tarefa.</div>';
      return;
    }

    // Renderizar lista de execucoes com logs
    let html = '';

    for (const exec of executions) {
      const shortId = (exec.id || exec.executionId || '').substring(0, 8);
      const status = exec.status || 'completed';
      const statusClass = status === 'running' ? 'warning' : (status === 'failed' ? 'error' : 'success');
      const statusLabel = status === 'running' ? 'Executando' : (status === 'failed' ? 'Falhou' : 'Concluida');
      const duration = exec.duration ? formatDuration(exec.duration) :
        (exec.startedAt && exec.finishedAt ? formatDuration(new Date(exec.finishedAt) - new Date(exec.startedAt)) : '--');
      const startDate = exec.startedAt ? formatDate(exec.startedAt) : '--';

      let stepsHtml = '';
      if (exec.conversationLog) {
        try {
          const parsedLog = typeof exec.conversationLog === 'string'
            ? JSON.parse(exec.conversationLog)
            : exec.conversationLog;

          const steps = Array.isArray(parsedLog) ? parsedLog : (parsedLog.steps && Array.isArray(parsedLog.steps) ? parsedLog.steps : null);
          if (steps && steps.length > 0) {
            stepsHtml = `
              <div style="padding:var(--sp-3);">
                ${steps.map((step, idx) => renderTerminalStep(step, idx)).join('')}
              </div>
            `;
          }
        } catch (e) {
          stepsHtml = '<div class="text-muted" style="padding:var(--sp-3);">Erro ao parsear logs</div>';
        }
      }

      if (!stepsHtml) {
        stepsHtml = '<div class="text-muted" style="padding:var(--sp-3);">Sem logs detalhados</div>';
      }

      html += `
        <div class="terminal-output" style="margin-bottom:var(--sp-3);background:var(--bg-tertiary);border-radius:var(--radius);max-height:500px;overflow-y:auto;">
          <div class="terminal-exec-header">
            <div class="terminal-exec-info">
              <span class="terminal-exec-name">${exec.taskName || taskName}</span>
              <span class="terminal-exec-id">${shortId}</span>
              <span class="text-muted" style="font-size:var(--text-xs);">${startDate}</span>
            </div>
            <div class="terminal-exec-meta">
              <span class="badge badge-${statusClass}">${statusLabel}</span>
              <span class="text-muted">${duration}</span>
            </div>
          </div>
          ${stepsHtml}
        </div>
      `;
    }

    $('task-logs-content').innerHTML = html;

    // Configurar interacao com sessao Claude
    const interactContainer = $('task-logs-interact');
    const interactHint = $('task-logs-interact-hint');
    const interactInput = $('task-logs-interact-input');
    const interactBtn = $('btn-task-logs-interact');
    const interactBtnText = $('btn-task-logs-interact-text');

    // Encontrar execucao mais recente com claudeSessionId
    const resumableExec = executions.find(e => e.claudeSessionId && e.status !== 'running');
    const runningExec = executions.find(e => e.status === 'running');

    if (runningExec) {
      // Execucao em andamento - mostrar status
      interactContainer.style.display = 'block';
      interactInput.disabled = true;
      interactBtn.disabled = true;
      interactInput.placeholder = 'Execucao em andamento, aguarde...';
      interactHint.textContent = 'Uma execucao esta rodando nesta tarefa';
      interactBtnText.textContent = 'Aguarde';
    } else if (resumableExec) {
      // Tem sessao para continuar
      interactContainer.style.display = 'block';
      interactInput.disabled = false;
      interactBtn.disabled = false;
      interactInput.placeholder = 'Continuar conversa com o agente...';
      interactHint.textContent = 'Retoma via Claude --resume';
      interactBtnText.textContent = 'Continuar';
      interactBtn.dataset.executionId = resumableExec.id || resumableExec.executionId;
      interactBtn.dataset.taskId = taskId;
      interactBtn.dataset.mode = 'resume';
    } else {
      // Sem sessao, mas pode criar nova execucao
      interactContainer.style.display = 'block';
      interactInput.disabled = false;
      interactBtn.disabled = false;
      interactInput.placeholder = 'Enviar novo prompt para esta tarefa...';
      interactHint.textContent = 'Cria nova execucao';
      interactBtnText.textContent = 'Executar';
      interactBtn.dataset.executionId = '';
      interactBtn.dataset.taskId = taskId;
      interactBtn.dataset.mode = 'new';
    }

    // Event listeners (remover antigos para evitar duplicatas)
    const newBtn = interactBtn.cloneNode(true);
    interactBtn.parentNode.replaceChild(newBtn, interactBtn);
    const newInput = interactInput.cloneNode(true);
    interactInput.parentNode.replaceChild(newInput, interactInput);

    newBtn.addEventListener('click', () => handleTaskLogsInteract(taskId, taskName));
    newInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') newBtn.click();
    });

  } catch (error) {
    console.error('[viewTaskLogs] Erro:', error);
    $('task-logs-content').innerHTML = `<div class="text-muted" style="padding:var(--sp-4);text-align:center;">Erro ao carregar logs: ${error.message}</div>`;
    if ($('task-logs-interact')) $('task-logs-interact').style.display = 'none';
  }
}

/**
 * Handler de interacao nos logs de tarefas (resume ou nova execucao)
 */
async function handleTaskLogsInteract(taskId, taskName) {
  const input = $('task-logs-interact-input');
  const btn = $('btn-task-logs-interact');
  const message = input.value.trim();

  if (!message) {
    showToast('Digite uma mensagem', 'error');
    return;
  }

  const mode = btn.dataset.mode;
  const executionId = btn.dataset.executionId;

  try {
    btn.disabled = true;
    input.disabled = true;
    const btnTextEl = btn.querySelector('#btn-task-logs-interact-text') || btn.querySelector('span') || btn;
    const originalText = btnTextEl.textContent;
    btnTextEl.textContent = 'Enviando...';

    if (mode === 'resume' && executionId) {
      console.log('[viewTaskLogs] Resumindo execucao:', executionId, message);
      await apiCall(`/executions/${executionId}/resume`, 'POST', { message });
      showToast('Mensagem enviada! Execucao retomada.', 'success');
    } else {
      console.log('[viewTaskLogs] Nova execucao para tarefa:', taskId);
      await apiCall(`/tasks/${taskId}`, 'PUT', { prompt: message });
      await apiCall(`/tasks/${taskId}/run`, 'POST');
      showToast('Nova execucao iniciada!', 'success');
    }

    input.value = '';

    // Recarregar logs apos delay para mostrar nova execucao
    setTimeout(() => viewTaskLogs(taskId), 3000);

  } catch (error) {
    console.error('[viewTaskLogs] Erro ao interagir:', error);
    showToast('Erro: ' + (error.message || 'Falha desconhecida'), 'error');
  } finally {
    btn.disabled = false;
    input.disabled = false;
    const btnTextEl = btn.querySelector('#btn-task-logs-interact-text') || btn.querySelector('span') || btn;
    btnTextEl.textContent = mode === 'resume' ? 'Continuar' : 'Executar';
  }
}

/**
 * Renderiza um step individual
 */
function renderTerminalStep(step, index) {
  const timestamp = step.timestamp ? formatDate(step.timestamp) : '--';
  const stepId = `step-${index}`;

  // Sanitizar HTML
  const sanitize = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Truncar texto longo
  const truncate = (text, maxLen = 500) => {
    if (!text) return '';
    const sanitized = sanitize(text);
    if (sanitized.length <= maxLen) return sanitized;
    return `
      <div class="terminal-truncated">
        <div class="terminal-truncated-preview">${sanitized.substring(0, maxLen)}...</div>
        <button class="btn btn-sm btn-ghost terminal-expand-btn" data-toggle-step="${stepId}" onclick="toggleTerminalExpand('${stepId}')">
          Ver mais
        </button>
        <div class="terminal-truncated-full" id="${stepId}-full" style="display:none;">
          ${sanitized}
        </div>
      </div>
    `;
  };

  let content = '';
  let className = 'terminal-step';
  let icon = '';
  let label = '';

  switch (step.type) {
    case 'tool_call':
      className += ' terminal-step-tool-call';
      icon = '🔧';
      label = `Ferramenta: ${step.toolName || 'Desconhecida'}`;
      const inputStr = typeof step.input === 'object'
        ? JSON.stringify(step.input, null, 2)
        : (step.input || '');
      content = `
        <div class="terminal-tool-badge">${sanitize(step.toolName || 'Tool')}</div>
        <div class="terminal-step-input">${truncate(inputStr)}</div>
      `;
      break;

    case 'tool_result':
      className += ' terminal-step-tool-result';
      if (step.isError) {
        className += ' terminal-step-error';
        icon = '❌';
        label = 'Erro';
      } else {
        icon = '✅';
        label = 'Resultado';
      }
      const resultStr = typeof step.content === 'object'
        ? JSON.stringify(step.content, null, 2)
        : (step.content || step.text || '');
      content = `<div class="terminal-step-result">${truncate(resultStr)}</div>`;
      break;

    case 'assistant_text':
      className += ' terminal-step-assistant';
      icon = '🤖';
      label = 'Claude';
      content = `<div class="terminal-step-text">${sanitize(step.text || step.content || '')}</div>`;
      break;

    case 'result':
      className += ' terminal-step-final-result';
      icon = '🎯';
      label = 'Resultado Final';
      const costVal = step.totalCost || step.cost || 0;
      const cost = costVal ? `Custo: $${costVal.toFixed(4)}` : '';
      const duration = step.duration ? `Duração: ${formatDuration(step.duration)}` : '';
      content = `
        <div class="terminal-step-text">${sanitize(step.finalText || step.text || step.content || '')}</div>
        <div class="terminal-step-meta">${cost} ${duration}</div>
      `;
      break;

    case 'system':
      className += ' terminal-step-system';
      icon = 'ℹ️';
      label = 'Sistema';
      const sysInfo = step.model ? `Modelo: ${step.model}` : (step.text || step.content || 'Inicializado');
      content = `<div class="terminal-step-text text-muted">${sanitize(sysInfo)}</div>`;
      break;

    case 'user_message':
      className += ' terminal-step-user';
      icon = '👤';
      label = 'Usuário';
      content = `<div class="terminal-step-text">${sanitize(step.text || step.content || '')}</div>`;
      break;

    default:
      className += ' terminal-step-unknown';
      icon = '📄';
      label = step.type || 'Desconhecido';
      content = `<div class="terminal-step-text">${sanitize(step.text || step.content || JSON.stringify(step))}</div>`;
  }

  return `
    <div class="${className}" id="${stepId}">
      <div class="terminal-step-header">
        <span class="terminal-step-icon">${icon}</span>
        <span class="terminal-step-label">${label}</span>
        <span class="terminal-step-timestamp">${timestamp}</span>
      </div>
      <div class="terminal-step-content">
        ${content}
      </div>
    </div>
  `;
}

/**
 * Atualiza o output completo do terminal
 */
function updateTerminalOutput() {
  console.log('[Terminal] Atualizando output...');

  const outputEl = $('terminal-output');
  const statusEl = $('terminal-status');

  if (!outputEl) {
    console.warn('[Terminal] Elemento terminal-output não encontrado');
    return;
  }

  const execId = state.terminalActiveExec;

  if (!execId) {
    outputEl.innerHTML = `
      <div class="terminal-empty">
        <p>Nenhuma execução selecionada</p>
        <p class="text-muted">Selecione uma execução no dropdown acima</p>
      </div>
    `;
    updateTerminalStatus('Aguardando', 'idle');
    return;
  }

  const steps = state.terminalSteps[execId] || [];
  const execInfo = state.terminalRunningExecs.find(e => e.executionId === execId);
  const taskName = execInfo?.taskName || execInfo?.taskId || 'Sem nome';
  const shortId = execId.substring(0, 8);
  const isRunning = state.terminalRunningExecs.some(e => e.executionId === execId);
  const elapsed = execInfo?.startedAt ? formatDuration(Date.now() - new Date(execInfo.startedAt).getTime()) : '--';

  // Header com informacoes da tarefa (mesmo padrao do task-card)
  const terminalHeader = `
    <div class="terminal-exec-header">
      <div class="terminal-exec-info">
        <span class="terminal-exec-name">${taskName}</span>
        <span class="terminal-exec-id">${shortId}</span>
      </div>
      <div class="terminal-exec-meta">
        <span class="badge badge-${isRunning ? 'warning' : 'success'}">${isRunning ? 'Executando' : 'Finalizada'}</span>
        <span class="text-muted">${elapsed}</span>
      </div>
    </div>
  `;

  if (steps.length === 0) {
    outputEl.innerHTML = `
      ${terminalHeader}
      <div class="terminal-empty">
        <p>Aguardando steps...</p>
        <p class="text-muted">Execucao: ${shortId} - ${taskName}</p>
      </div>
    `;
    updateTerminalStatus('Em andamento', 'running');
    return;
  }

  console.log('[Terminal] Renderizando', steps.length, 'steps');

  outputEl.innerHTML = terminalHeader + steps.map((step, i) => renderTerminalStep(step, i)).join('');

  // Auto-scroll se habilitado
  if (state.terminalAutoScroll) {
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  updateTerminalStatus(
    isRunning ? 'Em andamento' : 'Finalizada',
    isRunning ? 'running' : 'success'
  );
}

/**
 * Atualiza status bar do terminal
 */
function updateTerminalStatus(text, statusType) {
  const statusEl = $('terminal-status');
  if (!statusEl) return;
  const dot = statusEl.querySelector('.status-dot');
  const label = statusEl.querySelector('.status-label');
  if (dot) {
    dot.className = 'status-dot';
    if (statusType === 'running') dot.classList.add('status-running');
    else if (statusType === 'success') dot.classList.add('status-success');
    else if (statusType === 'error') dot.classList.add('status-error');
    else dot.classList.add('status-idle');
  }
  if (label) label.textContent = text;
}

/**
 * Atualiza o dropdown de seleção de execuções
 */
function updateTerminalExecSelector() {
  console.log('[Terminal] Atualizando selector...');

  const selectEl = $('terminal-exec-select');
  if (!selectEl) return;

  const running = state.terminalRunningExecs;

  if (running.length === 0) {
    selectEl.innerHTML = '<option value="">Nenhuma execução ativa</option>';
    selectEl.disabled = true;
    return;
  }

  selectEl.disabled = false;
  selectEl.innerHTML = running.map(exec => {
    const name = exec.taskName || exec.taskId || 'Sem nome';
    const shortId = exec.executionId.substring(0, 8);
    const selected = exec.executionId === state.terminalActiveExec ? 'selected' : '';
    return `<option value="${exec.executionId}" ${selected}>${shortId} - ${name}</option>`;
  }).join('');

  console.log('[Terminal] Selector atualizado com', running.length, 'execuções');
}

/**
 * Inicializa event listeners do terminal
 */
function initTerminalControls() {
  console.log('[Terminal] Inicializando controles...');

  // Botão enviar
  const btnSend = $('btn-terminal-send');
  if (btnSend) {
    btnSend.removeEventListener('click', sendTerminalMessage); // Evitar duplicatas
    btnSend.addEventListener('click', sendTerminalMessage);
  }

  // Botão limpar
  const btnClear = $('btn-terminal-clear');
  if (btnClear) {
    btnClear.removeEventListener('click', clearTerminal);
    btnClear.addEventListener('click', clearTerminal);
  }

  // Botão auto-scroll
  const btnScroll = $('btn-terminal-scroll');
  if (btnScroll) {
    btnScroll.removeEventListener('click', toggleTerminalScroll);
    btnScroll.addEventListener('click', toggleTerminalScroll);
    // Atualizar ícone inicial
    updateScrollButtonIcon();
  }

  // Botão toggle collapse
  const btnToggle = $('btn-terminal-toggle');
  if (btnToggle) {
    btnToggle.removeEventListener('click', toggleTerminalCollapse);
    btnToggle.addEventListener('click', toggleTerminalCollapse);
  }

  // Input Enter
  const inputEl = $('terminal-input');
  if (inputEl) {
    inputEl.removeEventListener('keydown', handleTerminalInputKeydown);
    inputEl.addEventListener('keydown', handleTerminalInputKeydown);
  }

  // Select execução
  const selectEl = $('terminal-exec-select');
  if (selectEl) {
    selectEl.removeEventListener('change', handleTerminalExecChange);
    selectEl.addEventListener('change', handleTerminalExecChange);
  }

  console.log('[Terminal] Controles inicializados');
}

/**
 * Handler de keydown no input do terminal
 */
function handleTerminalInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendTerminalMessage();
  }
}

/**
 * Handler de mudança de execução no select
 */
function handleTerminalExecChange(event) {
  const newExecId = event.target.value;
  console.log('[Terminal] Mudando execução ativa para:', newExecId);

  state.terminalActiveExec = newExecId || null;

  // Inicializar steps se não existir
  if (newExecId && !state.terminalSteps[newExecId]) {
    state.terminalSteps[newExecId] = [];
  }

  // Mostrar/ocultar input bar
  const inputBar = $('terminal-input-bar');
  if (inputBar) {
    inputBar.style.display = newExecId ? 'flex' : 'none';
  }

  updateTerminalOutput();
}

/**
 * Envia mensagem via POST /api/executions/:id/resume
 */
async function sendTerminalMessage() {
  console.log('[Terminal] Enviando mensagem...');

  const inputEl = $('terminal-input');
  const execId = state.terminalActiveExec;

  if (!inputEl || !execId) {
    console.warn('[Terminal] Input ou execId inválido');
    showToast('Selecione uma execução ativa', 'warning');
    return;
  }

  const message = inputEl.value.trim();

  if (!message) {
    console.warn('[Terminal] Mensagem vazia');
    return;
  }

  try {
    console.log('[Terminal] POST /api/executions/' + execId + '/resume', { message });

    await apiCall(`/executions/${execId}/resume`, 'POST', { message });

    // Adicionar ao terminal como user_message
    const userStep = {
      type: 'user_message',
      text: message,
      timestamp: new Date().toISOString()
    };

    if (!state.terminalSteps[execId]) {
      state.terminalSteps[execId] = [];
    }

    state.terminalSteps[execId].push(userStep);
    updateTerminalOutput();

    // Limpar input
    inputEl.value = '';

    showToast('Mensagem enviada', 'success');

    console.log('[Terminal] Mensagem enviada com sucesso');

  } catch (error) {
    console.error('[Terminal] Erro ao enviar mensagem:', error);
    showToast('Erro ao enviar mensagem', 'error');
  }
}

/**
 * Limpa o output do terminal
 */
function clearTerminal() {
  console.log('[Terminal] Limpando terminal...');

  const execId = state.terminalActiveExec;

  if (execId && state.terminalSteps[execId]) {
    state.terminalSteps[execId] = [];
    updateTerminalOutput();
  }

  showToast('Terminal limpo', 'info');
}

/**
 * Toggle auto-scroll
 */
function toggleTerminalScroll() {
  state.terminalAutoScroll = !state.terminalAutoScroll;

  console.log('[Terminal] Auto-scroll:', state.terminalAutoScroll);

  updateScrollButtonIcon();

  showToast(
    state.terminalAutoScroll ? 'Auto-scroll ativado' : 'Auto-scroll desativado',
    'info'
  );
}

/**
 * Atualiza ícone do botão de scroll
 */
function updateScrollButtonIcon() {
  const btnScroll = $('btn-terminal-scroll');
  if (btnScroll) {
    btnScroll.title = state.terminalAutoScroll ? 'Desativar auto-scroll' : 'Ativar auto-scroll';
    btnScroll.style.opacity = state.terminalAutoScroll ? '1' : '0.5';
  }
}

/**
 * Toggle minimizar/maximizar terminal
 */
function toggleTerminalCollapse() {
  state.terminalCollapsed = !state.terminalCollapsed;

  console.log('[Terminal] Collapsed:', state.terminalCollapsed);

  const panelEl = $('terminal-panel');
  const btnToggle = $('btn-terminal-toggle');

  if (panelEl) {
    if (state.terminalCollapsed) {
      panelEl.classList.add('terminal-collapsed');
    } else {
      panelEl.classList.remove('terminal-collapsed');
    }
  }

  if (btnToggle) {
    btnToggle.title = state.terminalCollapsed ? 'Maximizar terminal' : 'Minimizar terminal';
    // Rotacionar ícone SVG para indicar estado
    const svg = btnToggle.querySelector('svg');
    if (svg) svg.style.transform = state.terminalCollapsed ? 'rotate(180deg)' : '';
  }
}

/**
 * Toggle expandir step truncado
 * (chamada via onclick no HTML)
 */
function toggleTerminalExpand(stepId) {
  const fullEl = document.getElementById(`${stepId}-full`);
  const truncEl = document.getElementById(`${stepId}-truncated`);
  const btnEl = document.querySelector(`[data-toggle-step="${stepId}"]`);

  if (!fullEl) return;

  const isExpanded = fullEl.style.display !== 'none';

  if (isExpanded) {
    fullEl.style.display = 'none';
    if (truncEl) truncEl.style.display = '';
    if (btnEl) btnEl.textContent = 'Ver mais';
  } else {
    fullEl.style.display = 'block';
    if (truncEl) truncEl.style.display = 'none';
    if (btnEl) btnEl.textContent = 'Ver menos';
  }
}

// Tornar função global para onclick
window.toggleTerminalExpand = toggleTerminalExpand;

// ============ LOG ============
console.log('[Dashboard] App carregado. Aguardando DOM...');
