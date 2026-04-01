/* ═══════════════════════════════════════════════════════════════
   CLAUDE CODE ECOSYSTEM — APP.JS
   SPA Vanilla JS — Arquitetura Completa
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── CONFIG ─────────────────────────────────────────────────── */
const CFG = {
  API:     'http://localhost:3847/api/crm',
  API_ECO: 'http://localhost:3847/api',
  APP_URL: 'http://localhost:3847',
};

/* ─── STATE GLOBAL ───────────────────────────────────────────── */
const State = {
  token: null,
  user: null,
  currentRoute: '/',
  charts: {},
};

/* ─── HELPERS HTTP ───────────────────────────────────────────── */
async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${CFG.API}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (State.token) headers['Authorization'] = `Bearer ${State.token}`;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) { authLogout(); return null; }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || 'Erro na requisição');
  return json;
}
async function apiEco(path, opts = {}) {
  return api(`${CFG.API_ECO}${path}`, opts);
}
const http = {
  get:    (p, o) => api(p, { method: 'GET', ...o }),
  post:   (p, b, o) => api(p, { method: 'POST', body: JSON.stringify(b), ...o }),
  put:    (p, b, o) => api(p, { method: 'PUT', body: JSON.stringify(b), ...o }),
  patch:  (p, b, o) => api(p, { method: 'PATCH', body: JSON.stringify(b), ...o }),
  del:    (p, o) => api(p, { method: 'DELETE', ...o }),
};

/* ─── TOAST ──────────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', title = '') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
    const titles = { success: 'Sucesso', error: 'Erro', warning: 'Atenção', info: 'Info' };
    const id = `t-${Date.now()}`;
    c.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="toast toast-${type}" role="alert">
        <div class="toast-icon"><i data-lucide="${icons[type]}" width="18" height="18"></i></div>
        <div class="toast-content">
          <div class="toast-title">${title || titles[type]}</div>
          <div class="toast-message">${msg}</div>
        </div>
        <button class="toast-close" onclick="Toast.dismiss('${id}')">
          <i data-lucide="x" width="14" height="14"></i>
        </button>
      </div>`);
    lucide.createIcons();
    setTimeout(() => Toast.dismiss(id), 4500);
  },
  dismiss(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('removing');
    setTimeout(() => el.remove(), 200);
  },
  success: (m, t) => Toast.show(m, 'success', t),
  error:   (m, t) => Toast.show(m, 'error', t),
  warning: (m, t) => Toast.show(m, 'warning', t),
  info:    (m, t) => Toast.show(m, 'info', t),
};

/* ─── MODAL ──────────────────────────────────────────────────── */
const Modal = {
  open(html, opts = {}) {
    const c = document.getElementById('modal-container');
    const size = opts.size ? `modal-${opts.size}` : '';
    c.innerHTML = `
      <div class="modal-backdrop" id="active-modal">
        <div class="modal ${size}" role="dialog" aria-modal="true">
          ${html}
        </div>
      </div>`;
    const backdrop = document.getElementById('active-modal');
    backdrop.addEventListener('click', e => { if (e.target === backdrop) Modal.close(); });
    lucide.createIcons();
    document.querySelector('.modal .form-input, .modal .form-select, .modal textarea')?.focus();
  },
  close() {
    document.getElementById('modal-container').innerHTML = '';
  },
  confirm(msg, onConfirm, opts = {}) {
    Modal.open(`
      <div class="modal-header">
        <h3 class="modal-title">${opts.title || 'Confirmar'}</h3>
        <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
      </div>
      <div class="modal-body">
        <p class="text-sm" style="color:var(--color-text-2)">${msg}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-danger" id="modal-confirm-btn">${opts.confirmText || 'Confirmar'}</button>
      </div>`, { size: 'sm' });
    document.getElementById('modal-confirm-btn').onclick = () => { Modal.close(); onConfirm(); };
  },
};

/* ─── AUTH ───────────────────────────────────────────────────── */
function authSave(token, user) {
  State.token = token;
  State.user = user;
  localStorage.setItem('cce_token', token);
  localStorage.setItem('cce_user', JSON.stringify(user));
}
function authLoad() {
  State.token = localStorage.getItem('cce_token');
  const u = localStorage.getItem('cce_user');
  State.user = u ? JSON.parse(u) : null;
}
function authLogout() {
  State.token = null;
  State.user = null;
  localStorage.removeItem('cce_token');
  localStorage.removeItem('cce_user');
  showLogin();
}

/* ─── ROUTER ─────────────────────────────────────────────────── */
const Routes = {
  '/':              pageDashboard,
  '/leads':         pageLeads,
  '/leads/:id':     pageLeadDetail,
  '/conversations': pageConversations,
  '/tags':          pageTags,
  '/crm-settings':  pageCrmSettings,
  '/tasks':         pageTasks,
  '/knowledge-base':pageKnowledgeBase,
  '/memory':        pageMemory,
  '/prompts':       pagePrompts,
  '/credentials':   pageCredentials,
  '/telegram':      pageTelegram,
  '/campaigns':     pageCampaigns,
  '/campaigns/:id': pageCampaignDetail,
  '/templates':     pageTemplates,
  '/follow-ups':    pageFollowUps,
  '/404':           renderNotFound,
};

function renderNotFound() {
  const content = document.getElementById('page-content');
  if (!content) return;
  content.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="map-pin-off" width="28" height="28"></i></div>
      <h3>Pagina nao encontrada</h3>
      <p>A rota acessada nao existe neste sistema.</p>
      <a href="#/" class="btn btn-primary mt-4">Ir ao Dashboard</a>
    </div>`;
  lucide.createIcons();
}

function routeMatch(pattern, path) {
  const pParts = pattern.split('/');
  const uParts = path.split('/');
  if (pParts.length !== uParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) { params[pParts[i].slice(1)] = uParts[i]; }
    else if (pParts[i] !== uParts[i]) return null;
  }
  return params;
}

async function navigate(path) {
  if (!State.token) { showLogin(); return; }

  State.currentRoute = path;
  updateActiveNav(path);
  updateBreadcrumb(path);
  scrollToTop();

  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>`;

  for (const [pattern, handler] of Object.entries(Routes)) {
    const params = routeMatch(pattern, path);
    if (params !== null) {
      try {
        await handler(params);
      } catch (e) {
        console.error('Route error:', e);
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="alert-triangle" width="28" height="28"></i></div>
          <h3>Erro ao carregar</h3>
          <p>${e.message}</p>
          <button class="btn btn-primary mt-4" onclick="navigate('${path}')">Tentar novamente</button>
        </div>`;
        lucide.createIcons();
      }
      return;
    }
  }

  // Rota nao encontrada — renderizar pagina 404
  console.warn('[navigate] Rota nao encontrada:', path);
  renderNotFound();
}

function updateActiveNav(path) {
  document.querySelectorAll('.nav-item').forEach(a => {
    const route = a.dataset.route;
    const isActive = route === path || (route !== '/' && path.startsWith(route));
    a.classList.toggle('active', isActive);
  });
}

function updateBreadcrumb(path) {
  const labels = {
    '/': 'Dashboard',
    '/leads': 'Leads',
    '/conversations': 'Conversas',
    '/tags': 'Tags IA',
    '/crm-settings': 'Config CRM',
    '/tasks': 'Tarefas',
    '/knowledge-base': 'Base de Conhecimento',
    '/memory': 'Memória',
    '/prompts': 'Prompts',
    '/credentials': 'Credenciais',
    '/telegram': 'Telegram Bot',
    '/campaigns': 'Campanhas',
    '/templates': 'Templates',
    '/follow-ups': 'Follow-ups',
  };
  const container = document.getElementById('breadcrumb-container');
  if (!container) return;
  const main = path.split('/').slice(0, 2).join('/') || '/';
  const label = labels[main] || 'Página';
  let html = `<span class="breadcrumb-item">${label}</span>`;
  if (path.includes('/:') || (path !== main && path !== '/')) {
    // Breadcrumb descritivo baseado na rota pai
    const detailLabels = {
      '/leads': 'Detalhe do Lead',
      '/campaigns': 'Detalhe da Campanha',
      '/templates': 'Detalhe do Template',
      '/tasks': 'Detalhe da Tarefa',
      '/conversations': 'Conversa',
    };
    const detailLabel = detailLabels[main] || 'Detalhe';
    html = `<a href="#${main}" class="breadcrumb-item text-muted">${labels[main] || 'Voltar'}</a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item">${detailLabel}</span>`;
  }
  container.innerHTML = html;
}

function scrollToTop() {
  document.getElementById('page-content')?.scrollTo(0, 0);
}

/* ─── STATUS CHECK ───────────────────────────────────────────── */
async function checkStatus() {
  const dot = document.querySelector('.status-dot');
  const txt = document.getElementById('topbar-status-text');
  if (!dot || !txt) return;
  try {
    dot.className = 'status-dot loading';
    txt.textContent = 'Verificando...';
    const r = await fetch(`${CFG.API}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      dot.className = 'status-dot online';
      txt.textContent = 'Online';
    } else throw new Error();
  } catch {
    dot.className = 'status-dot offline';
    txt.textContent = 'Offline';
  }
}

/* ─── SHOW LOGIN ─────────────────────────────────────────────── */
function showLogin() {
  document.getElementById('app').style.display = 'none';
  let lp = document.getElementById('login-page');
  if (!lp) {
    lp = document.createElement('div');
    lp.id = 'login-page';
    document.body.appendChild(lp);
  }
  lp.style.display = 'flex';
  lp.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon"><i data-lucide="layers" width="24" height="24"></i></div>
        <span class="login-logo-name">Claude Code</span>
      </div>
      <h1 class="login-title">Entrar</h1>
      <p class="login-subtitle">Claude Code Ecosystem</p>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="login-email" placeholder="você@email.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <div class="input-group">
            <input type="password" class="form-input" id="login-pass" placeholder="••••••••" required autocomplete="current-password" />
            <button type="button" class="input-action" onclick="togglePassVis('login-pass', this)">
              <i data-lucide="eye" width="16" height="16"></i>
            </button>
          </div>
        </div>
        <div id="login-error" class="alert alert-danger mb-4" style="display:none"></div>
        <button type="submit" class="btn btn-primary w-full btn-lg" id="login-btn">
          <i data-lucide="log-in" width="18" height="18"></i>
          Entrar
        </button>
      </form>
      <div class="login-footer">
        Sem conta? <a href="#" onclick="showRegister()">Criar uma</a>
      </div>
    </div>`;
  lucide.createIcons();

  document.getElementById('login-form').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    err.style.display = 'none';
    try {
      const r = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-pass').value,
        }),
      });
      if (!r) throw new Error('Falha no login');
      authSave(r.data?.token || r.token, r.data?.user || r.user);
      document.getElementById('login-page').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      initApp();
    } catch (e) {
      err.textContent = e.message;
      err.style.display = 'flex';
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  };
}

function showRegister() {
  const lp = document.getElementById('login-page');
  lp.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon"><i data-lucide="layers" width="24" height="24"></i></div>
        <span class="login-logo-name">Claude Code</span>
      </div>
      <h1 class="login-title">Criar Conta</h1>
      <form id="register-form">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input type="text" class="form-input" id="reg-name" placeholder="Seu nome" required />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="reg-email" placeholder="você@email.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" class="form-input" id="reg-pass" placeholder="••••••••" required minlength="6" />
        </div>
        <div id="reg-error" class="alert alert-danger mb-4" style="display:none"></div>
        <button type="submit" class="btn btn-primary w-full btn-lg" id="reg-btn">
          <i data-lucide="user-plus" width="18" height="18"></i>
          Criar Conta
        </button>
      </form>
      <div class="login-footer"><a href="#" onclick="showLogin()">Já tenho conta</a></div>
    </div>`;
  lucide.createIcons();

  document.getElementById('register-form').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn');
    const err = document.getElementById('reg-error');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    err.style.display = 'none';
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-pass').value,
        }),
      });
      Toast.success('Conta criada! Faça login.');
      showLogin();
    } catch (e) {
      err.textContent = e.message;
      err.style.display = 'flex';
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  };
}

function togglePassVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}" width="16" height="16"></i>`;
  lucide.createIcons();
}

/* ─── HELPERS UI ─────────────────────────────────────────────── */
function setHTML(id, html) {
  const el = document.getElementById(id) || document.getElementById('page-content');
  if (el) { el.innerHTML = html; lucide.createIcons(); }
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('pt-BR');
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtRelative(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s/60)}min atrás`;
  if (s < 86400) return `${Math.floor(s/3600)}h atrás`;
  if (s < 604800) return `${Math.floor(s/86400)}d atrás`;
  return fmtDate(d);
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
function avatarColor(name) {
  const colors = ['#2563EB','#7C3AED','#DB2777','#DC2626','#D97706','#059669','#0891B2'];
  let h = 0;
  for (const c of (name || 'A')) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function statusBadge(status) {
  const map = {
    new: ['Novo', 'badge-new'],
    contacted: ['Contatado', 'badge-contacted'],
    replied: ['Respondeu', 'badge-replied'],
    interested: ['Interessado', 'badge-interested'],
    negotiating: ['Negociando', 'badge-negotiating'],
    won: ['Ganho', 'badge-won'],
    lost: ['Perdido', 'badge-lost'],
  };
  const [label, cls] = map[status] || [status, 'badge-gray'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function tempBadge(temp) {
  const map = {
    hot: ['🔥 Quente', 'badge-hot'],
    warm: ['🌡 Morno', 'badge-warm'],
    cold: ['❄ Frio', 'badge-cold'],
  };
  const [label, cls] = map[temp] || [temp || '—', 'badge-gray'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function channelBadge(ch) {
  const map = { whatsapp: ['WhatsApp', 'badge-green'], email: ['Email', 'badge-blue'], phone: ['Telefone', 'badge-yellow'] };
  const [label, cls] = map[ch] || [ch || '—', 'badge-gray'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const a = JSON.parse(raw); if (Array.isArray(a)) return a; } catch {}
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}
function renderTags(tags) {
  if (!tags || !tags.length) return '<span class="text-faint text-xs">—</span>';
  return tags.map(t => `<span class="tag">${t}</span>`).join('');
}

function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => Toast.success('Copiado!'));
}

/* ─── PAGE: DASHBOARD ────────────────────────────────────────── */
async function pageDashboard() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Visão geral do ecossistema</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="pageDashboard()">
          <i data-lucide="refresh-cw" width="16" height="16"></i> Atualizar
        </button>
      </div>
    </div>

    <div class="stats-grid" id="dash-stats">
      ${[1,2,3,4].map(() => `
        <div class="stat-card">
          <div class="skeleton skeleton-avatar" style="width:44px;height:44px;border-radius:10px;flex-shrink:0"></div>
          <div class="stat-info" style="flex:1">
            <div class="skeleton skeleton-text" style="width:60%;height:28px;margin-bottom:8px"></div>
            <div class="skeleton skeleton-text-sm" style="width:80%"></div>
          </div>
        </div>`).join('')}
    </div>

    <div class="dashboard-grid" id="dash-grid">
      <div class="chart-card">
        <div class="card-header"><h3 class="card-title">Pipeline de Leads</h3></div>
        <div id="dash-pipeline" class="pipeline-list">
          ${[1,2,3,4,5].map(() => `
            <div class="pipeline-item">
              <div class="skeleton" style="width:90px;height:14px;flex-shrink:0"></div>
              <div class="pipeline-bar-track"><div class="skeleton" style="width:100%;height:100%;border-radius:999px"></div></div>
              <div class="skeleton" style="width:24px;height:14px"></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="chart-card">
        <div class="card-header"><h3 class="card-title">Atividade Recente</h3></div>
        <div id="dash-activity" class="activity-list">
          ${[1,2,3,4,5].map(() => `
            <div class="activity-item">
              <div class="skeleton" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px"></div>
              <div style="flex:1">
                <div class="skeleton skeleton-text" style="width:85%"></div>
                <div class="skeleton skeleton-text-sm" style="width:45%"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="chart-card" id="dash-donut-card">
        <div class="card-header"><h3 class="card-title">Temperatura dos Leads</h3></div>
        <div id="dash-donut" style="display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 0">
          <div class="skeleton" style="width:140px;height:140px;border-radius:50%"></div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${[1,2,3].map(() => `<div class="skeleton" style="width:100px;height:14px"></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="chart-card" id="dash-conversion-card">
        <div class="card-header"><h3 class="card-title">Taxa de Conversão</h3></div>
        <div id="dash-conversion" style="display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 0">
          <div class="skeleton" style="width:120px;height:120px;border-radius:50%"></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[1,2].map(() => `<div class="skeleton" style="width:80px;height:14px"></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `);

  // Carregar stats em paralelo
  const [stats, pipeline, activity] = await Promise.allSettled([
    http.get('/dashboard/stats'),
    http.get('/dashboard/pipeline'),
    http.get('/dashboard/activity'),
  ]);

  // Stats
  const s = stats.value?.data || {};
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue"><i data-lucide="users" width="20" height="20"></i></div>
      <div class="stat-info">
        <div class="stat-value">${fmt(s.totalLeads ?? 0)}</div>
        <div class="stat-label">Total de Leads</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i data-lucide="trophy" width="20" height="20"></i></div>
      <div class="stat-info">
        <div class="stat-value">${fmt(s.wonLeads ?? 0)}</div>
        <div class="stat-label">Leads Ganhos</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon yellow"><i data-lucide="flame" width="20" height="20"></i></div>
      <div class="stat-info">
        <div class="stat-value">${fmt(s.hotLeads ?? 0)}</div>
        <div class="stat-label">Leads Quentes</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan"><i data-lucide="send" width="20" height="20"></i></div>
      <div class="stat-info">
        <div class="stat-value">${fmt(s.messagesSent ?? 0)}</div>
        <div class="stat-label">Mensagens Enviadas</div>
      </div>
    </div>`;

  // Pipeline — API pode retornar objeto {new:0,...} ou array [{status,count}]
  const pColors = { new: '#3B82F6', contacted: '#A78BFA', replied: '#00D4FF', interested: '#F59E0B', negotiating: '#FB923C', won: '#22C55E', lost: '#EF4444' };
  const pLabels = { new: 'Novos', contacted: 'Contatados', replied: 'Responderam', interested: 'Interessados', negotiating: 'Negociando', won: 'Ganhos', lost: 'Perdidos' };
  const pRaw = pipeline.value?.data;
  const pData = Array.isArray(pRaw)
    ? pRaw
    : (pRaw && typeof pRaw === 'object')
      ? Object.entries(pRaw).map(([status, count]) => ({ status, count: Number(count) || 0 }))
      : [];
  const pTotal = pData.reduce((a, b) => a + (b.count || 0), 0) || 1;

  // Pipeline com barras animadas
  document.getElementById('dash-pipeline').innerHTML = pData.length ? pData.map(p => {
    const pct = ((p.count || 0) / pTotal * 100).toFixed(1);
    const color = pColors[p.status] || '#888';
    return `
    <div class="pipeline-item">
      <span class="pipeline-label">${pLabels[p.status] || p.status}</span>
      <div class="pipeline-bar-track">
        <div class="pipeline-bar-fill pipeline-bar-animated" style="--bar-width:${pct}%;background:${color}"></div>
      </div>
      <span class="pipeline-count-badge" style="background:${color}22;color:${color}">${p.count || 0}</span>
    </div>`;
  }).join('') : '<p class="text-faint text-sm">Sem dados de pipeline</p>';

  // Activity
  const aData = activity.value?.data || [];
  document.getElementById('dash-activity').innerHTML = aData.slice(0, 8).map(a => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${pColors[a.status] || '#888'}"></div>
      <div class="activity-content">
        <div class="activity-text">${a.description || a.text || 'Atividade'}</div>
        <div class="activity-time">${fmtRelative(a.createdAt || a.timestamp)}</div>
      </div>
    </div>`).join('') || '<p class="text-faint text-sm">Sem atividade recente</p>';

  // Renderizar graficos visuais
  renderDashboardCharts(s, pData);

  lucide.createIcons();
}

/* Graficos SVG para o dashboard */
function renderDashboardCharts(stats, pipelineData) {
  console.log('[renderDashboardCharts] INICIO', { stats, pipelineCount: pipelineData.length });

  const totalLeads = stats.totalLeads || 0;
  const hotLeads   = stats.hotLeads  || 0;
  const warmLeads  = stats.warmLeads || 0;
  const coldLeads  = totalLeads > 0 ? Math.max(0, totalLeads - hotLeads - warmLeads) : 0;
  const wonLeads   = stats.wonLeads  || 0;

  /* ── Donut SVG de temperaturas ── */
  const donutEl = document.getElementById('dash-donut');
  if (donutEl) {
    const tempData = [
      { label: 'Quente', value: hotLeads,  color: '#EF4444' },
      { label: 'Morno',  value: warmLeads, color: '#F59E0B' },
      { label: 'Frio',   value: coldLeads, color: '#3B82F6' },
    ];
    const tempTotal = tempData.reduce((a, b) => a + b.value, 0) || 1;
    const r = 54; const cx = 70; const cy = 70;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const arcs = tempData.map(d => {
      const dash = (d.value / tempTotal) * circumference;
      const gap  = circumference - dash;
      const arc  = { dash, gap, offset, color: d.color };
      offset += dash;
      return arc;
    });

    const svgArcs = arcs.map((a, i) => {
      if (tempData[i].value === 0) return '';
      return `<circle
        cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${a.color}"
        stroke-width="14"
        stroke-dasharray="${a.dash.toFixed(2)} ${a.gap.toFixed(2)}"
        stroke-dashoffset="${(-a.offset + circumference / 4).toFixed(2)}"
        style="transition:stroke-dasharray 0.8s ease"
      />`;
    }).join('');

    const legendHtml = tempData.map(d => `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${d.color};flex-shrink:0"></span>
        <span style="font-size:12px;color:var(--color-text-2)">${d.label}</span>
        <span style="font-size:12px;font-weight:600;color:var(--color-text);margin-left:auto">${d.value}</span>
      </div>`).join('');

    donutEl.innerHTML = `
      <div style="position:relative;width:140px;height:140px;flex-shrink:0">
        <svg width="140" height="140" viewBox="0 0 140 140" style="transform:rotate(-90deg)">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--color-surface-2)" stroke-width="14"/>
          ${tempTotal > 0 ? svgArcs : ''}
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none">
          <div style="font-size:22px;font-weight:700;color:var(--color-text)">${tempTotal}</div>
          <div style="font-size:10px;color:var(--color-text-3);text-align:center">leads</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:110px">${legendHtml}</div>`;

    console.log('[renderDashboardCharts] Donut renderizado', { hot: hotLeads, warm: warmLeads, cold: coldLeads });
  }

  /* ── Circular progress de conversao ── */
  const convEl = document.getElementById('dash-conversion');
  if (convEl) {
    const denominator = Math.max(1, totalLeads - (pipelineData.find(p => p.status === 'new')?.count || 0));
    const convRate = Math.min(100, Math.round((wonLeads / denominator) * 100));
    const rConv = 48; const cConv = 60;
    const circConv = 2 * Math.PI * rConv;
    const filled = (convRate / 100) * circConv;

    convEl.innerHTML = `
      <div style="position:relative;width:120px;height:120px;flex-shrink:0">
        <svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg)">
          <circle cx="${cConv}" cy="${cConv}" r="${rConv}" fill="none" stroke="var(--color-surface-2)" stroke-width="12"/>
          <circle cx="${cConv}" cy="${cConv}" r="${rConv}" fill="none"
            stroke="url(#convGrad)" stroke-width="12"
            stroke-dasharray="${filled.toFixed(2)} ${(circConv - filled).toFixed(2)}"
            stroke-linecap="round"
            style="transition:stroke-dasharray 1s ease"/>
          <defs>
            <linearGradient id="convGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#00D4FF"/>
              <stop offset="100%" stop-color="#2563EB"/>
            </linearGradient>
          </defs>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:20px;font-weight:700;color:var(--color-text)">${convRate}%</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div>
          <div style="font-size:12px;color:var(--color-text-3)">Leads ganhos</div>
          <div style="font-size:18px;font-weight:700;color:var(--color-success)">${wonLeads}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--color-text-3)">Total ativos</div>
          <div style="font-size:18px;font-weight:700;color:var(--color-text)">${totalLeads}</div>
        </div>
      </div>`;

    console.log('[renderDashboardCharts] Conversao renderizada', { convRate, wonLeads, totalLeads });
  }
}

/* ─── PAGE: LEADS ────────────────────────────────────────────── */
let leadsView = 'table';
let leadsPage = 1;
let leadsSearch = '';
let leadsStatus = '';
let leadsTemp = '';
/* Feature 4 — filtros avancados */
let leadsTagsFilter = [];
let leadsDateFrom = '';
let leadsDateTo = '';
let leadsShowAdvanced = false;
/* Feature 3 — bulk actions */
let leadsSelected = new Set();

function setLeadsPage(p) { leadsPage = p; loadLeads(); }

async function pageLeads() {
  const advancedCount = leadsTagsFilter.length + (leadsDateFrom ? 1 : 0) + (leadsDateTo ? 1 : 0);

  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Leads</h1>
        <p class="page-subtitle">Gerencie seus contatos e oportunidades</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button class="view-toggle-btn ${leadsView==='table'?'active':''}" onclick="setLeadsView('table')">
            <i data-lucide="list" width="16" height="16"></i> Lista
          </button>
          <button class="view-toggle-btn ${leadsView==='kanban'?'active':''}" onclick="setLeadsView('kanban')">
            <i data-lucide="kanban" width="16" height="16"></i> Kanban
          </button>
        </div>
        <button class="btn btn-primary" onclick="modalNewLead()">
          <i data-lucide="user-plus" width="16" height="16"></i> Novo Lead
        </button>
      </div>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <i data-lucide="search" width="16" height="16"></i>
        <input type="search" placeholder="Buscar leads..." id="leads-search" value="${leadsSearch}" />
      </div>
      <select class="filter-select" id="leads-status-filter">
        <option value="">Todos os status</option>
        <option value="new" ${leadsStatus==='new'?'selected':''}>Novo</option>
        <option value="contacted" ${leadsStatus==='contacted'?'selected':''}>Contatado</option>
        <option value="replied" ${leadsStatus==='replied'?'selected':''}>Respondeu</option>
        <option value="interested" ${leadsStatus==='interested'?'selected':''}>Interessado</option>
        <option value="negotiating" ${leadsStatus==='negotiating'?'selected':''}>Negociando</option>
        <option value="won" ${leadsStatus==='won'?'selected':''}>Ganho</option>
        <option value="lost" ${leadsStatus==='lost'?'selected':''}>Perdido</option>
      </select>
      <select class="filter-select" id="leads-temp-filter">
        <option value="">Todas as temperaturas</option>
        <option value="hot" ${leadsTemp==='hot'?'selected':''}>Quente</option>
        <option value="warm" ${leadsTemp==='warm'?'selected':''}>Morno</option>
        <option value="cold" ${leadsTemp==='cold'?'selected':''}>Frio</option>
      </select>
      <button class="btn-filters-toggle ${leadsShowAdvanced?'active':''}" id="btn-advanced-filters" onclick="toggleAdvancedFilters()">
        <i data-lucide="sliders-horizontal" width="14" height="14"></i>
        Filtros
        ${advancedCount > 0 ? `<span class="filter-badge">${advancedCount}</span>` : ''}
      </button>
      ${advancedCount > 0 ? `<button class="btn btn-ghost btn-sm" onclick="clearAdvancedFilters()" style="color:var(--color-danger)">
        <i data-lucide="x" width="12" height="12"></i> Limpar filtros
      </button>` : ''}
    </div>

    <div id="leads-advanced-filters" style="${leadsShowAdvanced?'':'display:none'}">
      ${renderAdvancedFiltersPanel()}
    </div>

    <div id="leads-content">
      ${skeletonTable(8, 8)}
    </div>
  `);

  lucide.createIcons();

  // Bind filtros basicos
  const dSearch = debounce(v => { leadsSearch = v; leadsPage = 1; loadLeads(); });
  document.getElementById('leads-search').addEventListener('input', e => dSearch(e.target.value));
  document.getElementById('leads-status-filter').addEventListener('change', e => { leadsStatus = e.target.value; leadsPage = 1; loadLeads(); });
  document.getElementById('leads-temp-filter').addEventListener('change', e => { leadsTemp = e.target.value; leadsPage = 1; loadLeads(); });

  // Bind filtros avancados se visiveis
  if (leadsShowAdvanced) bindAdvancedFilters();

  leadsSelected.clear();
  await loadLeads();
}

async function loadLeads() {
  console.log('[loadLeads] INICIO', {
    page: leadsPage, search: leadsSearch, status: leadsStatus,
    temp: leadsTemp, tags: leadsTagsFilter, dateFrom: leadsDateFrom, dateTo: leadsDateTo
  });

  const params = new URLSearchParams({ page: leadsPage, limit: 20 });
  if (leadsSearch) params.set('search', leadsSearch);
  if (leadsStatus) params.set('status', leadsStatus);
  if (leadsTemp) params.set('temperature', leadsTemp);
  /* Filtros avancados — tags e data */
  if (leadsTagsFilter.length > 0) params.set('tags', leadsTagsFilter.join(','));
  if (leadsDateFrom) params.set('createdFrom', leadsDateFrom);
  if (leadsDateTo) params.set('createdTo', leadsDateTo);

  const data = await http.get(`/leads?${params}`);
  let leads = data?.data?.leads || data?.data || [];
  const total = data?.data?.total || leads.length;

  /* Filtro de tags e data no cliente (caso a API nao suporte esses parametros) */
  if (leadsTagsFilter.length > 0) {
    leads = leads.filter(l => {
      const lt = parseTags(l.tags);
      return leadsTagsFilter.every(ft => lt.includes(ft));
    });
  }
  if (leadsDateFrom) {
    const from = new Date(leadsDateFrom).getTime();
    leads = leads.filter(l => new Date(l.createdAt).getTime() >= from);
  }
  if (leadsDateTo) {
    const to = new Date(leadsDateTo + 'T23:59:59').getTime();
    leads = leads.filter(l => new Date(l.createdAt).getTime() <= to);
  }

  console.log('[loadLeads] FIM', { total: leads.length });

  if (leadsView === 'kanban') {
    renderLeadsKanban(leads);
  } else {
    renderLeadsTable(leads, total);
  }
}

function renderLeadsTable(leads, total) {
  console.log('[renderLeadsTable] leads:', leads.length, 'total:', total);
  // Armazenar leads carregados para exportacao via bulkExportCSV
  window._currentLeads = leads;

  const el = document.getElementById('leads-content');
  if (!leads.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="users" width="28" height="28"></i></div>
      <h3>Nenhum lead encontrado</h3>
      <p>Tente ajustar os filtros ou crie um novo lead.</p>
      <button class="btn btn-primary mt-4" onclick="modalNewLead()">Novo Lead</button>
    </div>`;
    lucide.createIcons();
    return;
  }

  /* Feature 3: barra de bulk se tem selecao */
  const bulkBar = leadsSelected.size > 0 ? `
    <div class="bulk-bar" id="bulk-actions-bar">
      <span class="bulk-bar-count">${leadsSelected.size} selecionado${leadsSelected.size > 1 ? 's' : ''}</span>
      <div class="bulk-bar-divider"></div>
      <div class="dropdown" id="bulk-status-dropdown">
        <button class="btn btn-ghost" onclick="toggleBulkDropdown('bulk-status-dropdown')">
          <i data-lucide="git-branch" width="14" height="14"></i> Mudar Status
        </button>
        <div class="dropdown-menu" id="bulk-status-menu" style="display:none">
          ${[['new','Novo'],['contacted','Contatado'],['replied','Respondeu'],['interested','Interessado'],['negotiating','Negociando'],['won','Ganho'],['lost','Perdido']].map(([v,l]) =>
            `<button class="dropdown-item" onclick="bulkChangeStatus('${v}')">${l}</button>`).join('')}
        </div>
      </div>
      <div class="dropdown" id="bulk-temp-dropdown">
        <button class="btn btn-ghost" onclick="toggleBulkDropdown('bulk-temp-dropdown')">
          <i data-lucide="thermometer" width="14" height="14"></i> Mudar Temperatura
        </button>
        <div class="dropdown-menu" id="bulk-temp-menu" style="display:none">
          <button class="dropdown-item" onclick="bulkChangeTemp('hot')">Quente</button>
          <button class="dropdown-item" onclick="bulkChangeTemp('warm')">Morno</button>
          <button class="dropdown-item" onclick="bulkChangeTemp('cold')">Frio</button>
        </div>
      </div>
      <div class="bulk-bar-divider"></div>
      <button class="btn btn-ghost" onclick="bulkExportCSV()">
        <i data-lucide="download" width="14" height="14"></i> Exportar CSV
      </button>
      <button class="btn btn-ghost" onclick="bulkDeleteLeads()" style="color:var(--color-danger)">
        <i data-lucide="trash-2" width="14" height="14"></i> Excluir
      </button>
      <button class="btn btn-ghost btn-sm" onclick="bulkClearSelection()" style="margin-left:auto">
        <i data-lucide="x" width="12" height="12"></i>
      </button>
    </div>` : '';

  el.innerHTML = `
    ${bulkBar}
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="th-checkbox">
              <input type="checkbox" class="lead-row-checkbox" id="chk-select-all" title="Selecionar todos"
                ${leadsSelected.size === leads.length && leads.length > 0 ? 'checked' : ''} />
            </th>
            <th>Nome</th>
            <th>Empresa</th>
            <th>Contato</th>
            <th>Status</th>
            <th>Temperatura</th>
            <th>Tags</th>
            <th>Criado</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => `
            <tr class="${leadsSelected.has(String(l.id))?'row-selected':''}" id="row-${l.id}">
              <td class="td-checkbox">
                <input type="checkbox" class="lead-row-checkbox row-chk" data-id="${l.id}"
                  ${leadsSelected.has(String(l.id)) ? 'checked' : ''} />
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="avatar avatar-sm" style="background:${avatarColor(l.name)}">${initials(l.name)}</div>
                  <a href="#/leads/${l.id}" style="font-weight:500;color:var(--color-text)">${l.name || '—'}</a>
                </div>
              </td>
              <td class="text-muted">${l.company || '—'}</td>
              <td class="text-muted text-sm">${l.phone || l.email || '—'}</td>
              <td>${statusBadge(l.status)}</td>
              <td>${tempBadge(l.temperature)}</td>
              <td><div class="tags-container">${renderTags(parseTags(l.tags))}</div></td>
              <td class="text-muted text-sm">${fmtDateTime(l.createdAt)}</td>
              <td>
                <div class="td-actions">
                  <a href="#/leads/${l.id}" class="btn btn-icon btn-ghost btn-sm" data-tooltip="Ver detalhe">
                    <i data-lucide="eye" width="15" height="15"></i>
                  </a>
                  <button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Editar" onclick="modalEditLead('${l.id}')">
                    <i data-lucide="pencil" width="15" height="15"></i>
                  </button>
                  <button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Excluir" onclick="confirmDeleteLead('${l.id}', '${(l.name||'').replace(/'/g,'\\\'')}')" style="color:var(--color-danger)">
                    <i data-lucide="trash-2" width="15" height="15"></i>
                  </button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${total > 20 ? `
    <div class="pagination">
      <button class="pagination-btn" onclick="setLeadsPage(${leadsPage-1})" ${leadsPage<=1?'disabled':''}>
        <i data-lucide="chevron-left" width="16" height="16"></i>
      </button>
      <span class="pagination-info">Pagina ${leadsPage} · ${fmt(total)} leads</span>
      <button class="pagination-btn" onclick="setLeadsPage(${leadsPage+1})" ${leadsPage*20>=total?'disabled':''}>
        <i data-lucide="chevron-right" width="16" height="16"></i>
      </button>
    </div>` : `<p class="text-center text-faint text-xs mt-4">${fmt(total)} lead${total!==1?'s':''} no total</p>`}`;

  lucide.createIcons();

  /* Feature 3: bind checkboxes */
  bindTableCheckboxes(leads);
}

/* Feature 3 — Bind eventos de checkbox na tabela */
function bindTableCheckboxes(leads) {
  console.log('[bindTableCheckboxes] Iniciando bind de checkboxes', { leads: leads.length });

  const selectAll = document.getElementById('chk-select-all');
  if (selectAll) {
    selectAll.addEventListener('change', e => {
      console.log('[chk-select-all] changed', e.target.checked);
      if (e.target.checked) {
        leads.forEach(l => leadsSelected.add(String(l.id)));
      } else {
        leadsSelected.clear();
      }
      renderLeadsTable(leads, leads.length);
    });
  }

  document.querySelectorAll('.row-chk').forEach(chk => {
    chk.addEventListener('change', e => {
      const id = e.target.dataset.id;
      console.log('[row-chk] changed', { id, checked: e.target.checked });
      if (e.target.checked) {
        leadsSelected.add(String(id));
      } else {
        leadsSelected.delete(String(id));
      }
      const row = document.getElementById(`row-${id}`);
      if (row) row.classList.toggle('row-selected', leadsSelected.has(String(id)));
      /* Atualizar select-all */
      const all = document.getElementById('chk-select-all');
      if (all) all.checked = leadsSelected.size === leads.length && leads.length > 0;
      /* Re-renderizar bulk bar se necessario */
      const hasBulk = !!document.getElementById('bulk-actions-bar');
      const needBulk = leadsSelected.size > 0;
      if (hasBulk !== needBulk) {
        renderLeadsTable(leads, leads.length);
      } else if (hasBulk) {
        /* Atualizar contador sem re-renderizar a tabela toda */
        const cnt = document.querySelector('.bulk-bar-count');
        if (cnt) cnt.textContent = `${leadsSelected.size} selecionado${leadsSelected.size > 1 ? 's' : ''}`;
      }
    });
  });
}

/* Feature 3 — Toggle dropdown de bulk */
function toggleBulkDropdown(wrapperId) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  const menu = wrapper.querySelector('.dropdown-menu');
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  /* Fechar todos */
  document.querySelectorAll('.bulk-bar .dropdown-menu').forEach(m => { m.style.display = 'none'; });
  if (!isOpen) {
    menu.style.display = 'block';
    setTimeout(() => document.addEventListener('click', () => { menu.style.display = 'none'; }, { once: true }), 50);
  }
}

/* Feature 3 — Bulk: mudar status */
async function bulkChangeStatus(newStatus) {
  if (!leadsSelected.size) return;
  const ids = [...leadsSelected];
  console.log('[bulkChangeStatus] INICIO', { ids, newStatus });
  try {
    await Promise.all(ids.map(id => http.put(`/leads/${id}`, { status: newStatus })));
    Toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} atualizado${ids.length > 1 ? 's' : ''}!`);
    leadsSelected.clear();
    await loadLeads();
  } catch (e) {
    console.error('[bulkChangeStatus] ERRO', e);
    Toast.error(e.message);
  }
}

/* Feature 3 — Bulk: mudar temperatura */
async function bulkChangeTemp(newTemp) {
  if (!leadsSelected.size) return;
  const ids = [...leadsSelected];
  console.log('[bulkChangeTemp] INICIO', { ids, newTemp });
  try {
    await Promise.all(ids.map(id => http.put(`/leads/${id}`, { temperature: newTemp })));
    Toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} atualizado${ids.length > 1 ? 's' : ''}!`);
    leadsSelected.clear();
    await loadLeads();
  } catch (e) {
    console.error('[bulkChangeTemp] ERRO', e);
    Toast.error(e.message);
  }
}

/* Feature 3 — Bulk: exportar CSV */
function bulkExportCSV() {
  if (!leadsSelected.size) return;
  console.log('[bulkExportCSV] Exportando', { count: leadsSelected.size });

  // Usar leads carregados em memoria (nao depende do DOM)
  const allLeads = window._currentLeads || [];
  const selectedIds = leadsSelected;
  const rows = allLeads.filter(l => selectedIds.has(String(l.id)));

  if (!rows.length) {
    Toast.warning('Nenhum lead selecionado para exportar');
    return;
  }

  const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Empresa', 'Status', 'Temperatura', 'Tags', 'Criado em'];
  const csvLines = [
    headers.join(','),
    ...rows.map(l => {
      let tags = [];
      try { tags = Array.isArray(l.tags) ? l.tags : JSON.parse(l.tags || '[]'); } catch { tags = []; }
      return [
        l.id,
        l.name || '',
        l.email || '',
        l.phone || '',
        l.company || '',
        l.status || '',
        l.temperature || '',
        tags.join(';'),
        l.createdAt || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    })
  ];
  const csv = csvLines.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  Toast.success(`${rows.length} lead${rows.length > 1 ? 's' : ''} exportado${rows.length > 1 ? 's' : ''}!`);
  console.log('[bulkExportCSV] Exportacao concluida', { total: rows.length });
}

/* Feature 3 — Bulk: excluir */
async function bulkDeleteLeads() {
  if (!leadsSelected.size) return;
  const count = leadsSelected.size;
  Modal.confirm(
    `Excluir <strong>${count} lead${count > 1 ? 's' : ''}</strong>? Esta acao nao pode ser desfeita.`,
    async () => {
      const ids = [...leadsSelected];
      console.log('[bulkDeleteLeads] Excluindo', { ids });
      try {
        await Promise.all(ids.map(id => http.del(`/leads/${id}`)));
        Toast.success(`${count} lead${count > 1 ? 's' : ''} excluido${count > 1 ? 's' : ''}!`);
        leadsSelected.clear();
        await loadLeads();
      } catch (e) {
        console.error('[bulkDeleteLeads] ERRO', e);
        Toast.error(e.message);
      }
    },
    { title: 'Excluir Leads', confirmText: 'Excluir' }
  );
}

/* Feature 3 — Limpar selecao */
function bulkClearSelection() {
  console.log('[bulkClearSelection] Limpando selecao');
  leadsSelected.clear();
  loadLeads();
}

function renderLeadsKanban(leads) {
  console.log('[renderLeadsKanban] INICIO', { totalLeads: leads.length });

  const cols = ['new','contacted','replied','interested','negotiating','won','lost'];
  const labels = { new:'Novos', contacted:'Contatados', replied:'Responderam', interested:'Interessados', negotiating:'Negociando', won:'Ganhos', lost:'Perdidos' };
  const groups = {};
  cols.forEach(c => groups[c] = []);
  leads.forEach(l => { if (groups[l.status]) groups[l.status].push(l); else groups['new'].push(l); });

  document.getElementById('leads-content').innerHTML = `
    <div class="kanban-board">
      ${cols.map(col => `
        <div class="kanban-column kanban-col-${col}" data-col="${col}">
          <div class="kanban-column-header">
            <span class="kanban-column-title">${labels[col]}</span>
            <span class="kanban-count">${groups[col].length}</span>
          </div>
          <div class="kanban-cards" data-status="${col}">
            ${groups[col].map(l => `
              <div class="lead-card"
                draggable="true"
                data-lead-id="${l.id}"
                data-lead-status="${l.status}"
                onclick="location.hash='#/leads/${l.id}'"
              >
                <div class="lead-card-header">
                  <div class="avatar avatar-sm" style="background:${avatarColor(l.name)}">${initials(l.name)}</div>
                  <div class="lead-card-info">
                    <div class="lead-card-name">${l.name || '—'}</div>
                    <div class="lead-card-company">${l.company || '—'}</div>
                  </div>
                </div>
                <div class="lead-card-footer">
                  <div class="lead-card-tags">${renderTags(parseTags(l.tags).slice(0,2))}</div>
                  ${tempBadge(l.temperature)}
                </div>
              </div>`).join('') || '<p class="text-faint text-xs" style="padding:8px 4px">Vazio</p>'}
          </div>
        </div>`).join('')}
    </div>`;

  lucide.createIcons();
  /* Feature 1: inicializar drag and drop no kanban */
  initKanbanDragDrop();
}

/* Feature 1 — Drag and Drop no Kanban */
function initKanbanDragDrop() {
  console.log('[initKanbanDragDrop] Iniciando listeners de drag and drop');

  let dragLeadId = null;
  let dragSourceStatus = null;

  /* dragstart nos cards */
  document.querySelectorAll('.lead-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragLeadId = card.dataset.leadId;
      dragSourceStatus = card.dataset.leadStatus;
      console.log('[kanban dragstart]', { leadId: dragLeadId, sourceStatus: dragSourceStatus });
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragLeadId);
    });

    card.addEventListener('dragend', () => {
      console.log('[kanban dragend]', { leadId: dragLeadId });
      card.classList.remove('dragging');
      document.querySelectorAll('.kanban-column.drag-over').forEach(col => col.classList.remove('drag-over'));
    });
  });

  /* dragover e drop nas colunas */
  document.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', e => {
      /* so remover drag-over se saiu da coluna de verdade */
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
      }
    });

    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');

      const newStatus = col.dataset.col;
      const leadId = e.dataTransfer.getData('text/plain') || dragLeadId;

      console.log('[kanban drop]', { leadId, fromStatus: dragSourceStatus, toStatus: newStatus });

      if (!leadId || newStatus === dragSourceStatus) {
        console.log('[kanban drop] sem mudanca, ignorando');
        return;
      }

      try {
        await http.put(`/leads/${leadId}`, { status: newStatus });
        console.log('[kanban drop] status atualizado com sucesso', { leadId, newStatus });
        Toast.success('Lead movido!');
        await loadLeads();
      } catch (err) {
        console.error('[kanban drop] ERRO ao atualizar status', err);
        Toast.error(err.message || 'Erro ao mover lead');
      }
    });
  });
}

/* ─── FEATURE 4: FILTROS AVANCADOS ──────────────────────────── */

/* Renderizar painel de filtros avancados como HTML */
function renderAdvancedFiltersPanel() {
  const chipsHtml = leadsTagsFilter.map(t => `
    <span class="tag-filter-chip">
      ${t}
      <button type="button" onclick="removeTagFilter('${t.replace(/'/g,'\\\'')}')">
        <i data-lucide="x" width="10" height="10"></i>
      </button>
    </span>`).join('');

  return `
    <div class="filters-advanced">
      <div class="filters-advanced-title">
        <i data-lucide="sliders-horizontal" width="12" height="12"></i>
        Filtros Avancados
      </div>
      <div class="filters-advanced-group">
        <div class="filters-advanced-label">Filtrar por Tags</div>
        <div class="tags-filter-input-wrap">
          <input type="text" class="filter-select" id="tags-filter-input" placeholder="Digite uma tag..."
            style="width:100%;padding-right:var(--space-3)"
            autocomplete="off" />
          <div class="tags-filter-suggestions" id="tags-filter-suggestions"></div>
        </div>
        <div class="tags-filter-chips" id="tags-filter-chips">${chipsHtml}</div>
      </div>
      <div class="filters-advanced-group">
        <div class="filters-advanced-label">Data de Criacao</div>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <input type="date" class="filter-select" id="leads-date-from"
            value="${leadsDateFrom}" style="flex:1" />
          <span style="color:var(--color-text-3);font-size:var(--text-xs)">ate</span>
          <input type="date" class="filter-select" id="leads-date-to"
            value="${leadsDateTo}" style="flex:1" />
        </div>
      </div>
    </div>`;
}

/* Bind eventos dos filtros avancados apos renderizar */
function bindAdvancedFilters() {
  console.log('[bindAdvancedFilters] Iniciando bind');

  const tagsInput = document.getElementById('tags-filter-input');
  const suggestionsEl = document.getElementById('tags-filter-suggestions');

  if (tagsInput) {
    /* Carregar sugestoes de tags existentes */
    const loadTagSuggestions = debounce(async (query) => {
      console.log('[tagSuggestions] query:', query);
      try {
        const data = await http.get('/leads?limit=100');
        const allLeads = data?.data?.leads || data?.data || [];
        const allTags = new Set();
        allLeads.forEach(l => parseTags(l.tags).forEach(t => allTags.add(t)));
        const filtered = [...allTags].filter(t =>
          t.toLowerCase().includes(query.toLowerCase()) &&
          !leadsTagsFilter.includes(t)
        ).slice(0, 10);

        if (filtered.length && query.trim()) {
          suggestionsEl.innerHTML = filtered.map(t =>
            `<div class="tags-filter-suggestion-item" onclick="addTagFilter('${t.replace(/'/g,'\\\'')}')">
              ${t}
            </div>`
          ).join('');
          suggestionsEl.classList.add('open');
        } else {
          suggestionsEl.classList.remove('open');
        }
        lucide.createIcons();
      } catch (e) {
        console.error('[tagSuggestions] ERRO', e);
      }
    }, 250);

    tagsInput.addEventListener('input', e => loadTagSuggestions(e.target.value));
    tagsInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && tagsInput.value.trim()) {
        e.preventDefault();
        addTagFilter(tagsInput.value.trim());
      }
    });
    tagsInput.addEventListener('blur', () => {
      setTimeout(() => suggestionsEl.classList.remove('open'), 200);
    });
  }

  const dateFrom = document.getElementById('leads-date-from');
  const dateTo = document.getElementById('leads-date-to');
  if (dateFrom) {
    dateFrom.addEventListener('change', e => {
      leadsDateFrom = e.target.value;
      leadsPage = 1;
      console.log('[dateFrom] changed', leadsDateFrom);
      loadLeads();
    });
  }
  if (dateTo) {
    dateTo.addEventListener('change', e => {
      leadsDateTo = e.target.value;
      leadsPage = 1;
      console.log('[dateTo] changed', leadsDateTo);
      loadLeads();
    });
  }
}

/* Adicionar tag ao filtro */
function addTagFilter(tag) {
  console.log('[addTagFilter]', tag);
  if (!tag || leadsTagsFilter.includes(tag)) return;
  leadsTagsFilter.push(tag);
  leadsPage = 1;
  /* Atualizar chips e fechar sugestoes */
  const chipsEl = document.getElementById('tags-filter-chips');
  const input = document.getElementById('tags-filter-input');
  const suggestions = document.getElementById('tags-filter-suggestions');
  if (input) input.value = '';
  if (suggestions) suggestions.classList.remove('open');
  if (chipsEl) {
    chipsEl.innerHTML = leadsTagsFilter.map(t => `
      <span class="tag-filter-chip">
        ${t}
        <button type="button" onclick="removeTagFilter('${t.replace(/'/g,'\\\'')}')">
          <i data-lucide="x" width="10" height="10"></i>
        </button>
      </span>`).join('');
    lucide.createIcons();
  }
  /* Atualizar badge do botao de filtros */
  updateAdvancedFiltersBadge();
  loadLeads();
}

/* Remover tag do filtro */
function removeTagFilter(tag) {
  console.log('[removeTagFilter]', tag);
  leadsTagsFilter = leadsTagsFilter.filter(t => t !== tag);
  leadsPage = 1;
  const chipsEl = document.getElementById('tags-filter-chips');
  if (chipsEl) {
    chipsEl.innerHTML = leadsTagsFilter.map(t => `
      <span class="tag-filter-chip">
        ${t}
        <button type="button" onclick="removeTagFilter('${t.replace(/'/g,'\\\'')}')">
          <i data-lucide="x" width="10" height="10"></i>
        </button>
      </span>`).join('');
    lucide.createIcons();
  }
  updateAdvancedFiltersBadge();
  loadLeads();
}

/* Atualizar badge de contagem do botao de filtros */
function updateAdvancedFiltersBadge() {
  const count = leadsTagsFilter.length + (leadsDateFrom ? 1 : 0) + (leadsDateTo ? 1 : 0);
  const btn = document.getElementById('btn-advanced-filters');
  if (!btn) return;
  const existing = btn.querySelector('.filter-badge');
  if (count > 0) {
    if (existing) {
      existing.textContent = count;
    } else {
      btn.insertAdjacentHTML('beforeend', `<span class="filter-badge">${count}</span>`);
    }
    btn.classList.add('active');
  } else {
    if (existing) existing.remove();
    btn.classList.remove('active');
  }
}

/* Toggle painel de filtros avancados */
function toggleAdvancedFilters() {
  console.log('[toggleAdvancedFilters]', { wasOpen: leadsShowAdvanced });
  leadsShowAdvanced = !leadsShowAdvanced;
  const panel = document.getElementById('leads-advanced-filters');
  const btn = document.getElementById('btn-advanced-filters');
  if (!panel) return;
  if (leadsShowAdvanced) {
    panel.innerHTML = renderAdvancedFiltersPanel();
    panel.style.display = '';
    lucide.createIcons();
    bindAdvancedFilters();
    if (btn) btn.classList.add('active');
  } else {
    panel.style.display = 'none';
    if (btn) btn.classList.remove('active');
  }
}

/* Limpar todos filtros avancados */
function clearAdvancedFilters() {
  console.log('[clearAdvancedFilters] Limpando filtros avancados');
  leadsTagsFilter = [];
  leadsDateFrom = '';
  leadsDateTo = '';
  leadsPage = 1;
  pageLeads();
}

function setLeadsView(view) {
  leadsView = view;
  pageLeads();
}

/* ─── MODAL: NOVO/EDITAR LEAD ────────────────────────────────── */
async function modalNewLead() {
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Novo Lead</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      ${leadForm()}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-lead-btn" onclick="saveLead()">
        <i data-lucide="save" width="16" height="16"></i> Salvar
      </button>
    </div>`);
}

async function modalEditLead(id) {
  try {
    const r = await http.get(`/leads/${id}`);
    const l = r?.data || r || {};
    Modal.open(`
      <div class="modal-header">
        <h3 class="modal-title">Editar Lead</h3>
        <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="lead-id" value="${id}" />
        ${leadForm(l)}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" id="save-lead-btn" onclick="saveLead(true)">
          <i data-lucide="save" width="16" height="16"></i> Salvar
        </button>
      </div>`);
  } catch (err) {
    console.error('[modalEditLead] Erro ao carregar lead', { id, err });
    Toast.error('Erro ao carregar dados do lead: ' + (err.message || 'tente novamente'));
  }
}

function leadForm(l = {}) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome <span>*</span></label>
        <input type="text" class="form-input" id="lf-name" value="${l.name||''}" placeholder="Nome do lead" required />
      </div>
      <div class="form-group">
        <label class="form-label">Empresa</label>
        <input type="text" class="form-input" id="lf-company" value="${l.company||''}" placeholder="Empresa" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="lf-email" value="${l.email||''}" placeholder="email@exemplo.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Telefone</label>
        <input type="text" class="form-input" id="lf-phone" value="${l.phone||''}" placeholder="5554999887766" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="lf-status">
          ${[['new','Novo'],['contacted','Contatado'],['replied','Respondeu'],['interested','Interessado'],['negotiating','Negociando'],['won','Ganho'],['lost','Perdido']].map(([v,lbl]) =>
            `<option value="${v}" ${l.status===v?'selected':''}>${lbl}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Temperatura</label>
        <select class="form-select" id="lf-temperature">
          <option value="cold" ${l.temperature==='cold'?'selected':''}>❄ Frio</option>
          <option value="warm" ${l.temperature==='warm'?'selected':''}>🌡 Morno</option>
          <option value="hot" ${l.temperature==='hot'?'selected':''}>🔥 Quente</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cargo</label>
        <input type="text" class="form-input" id="lf-position" value="${l.position||''}" placeholder="CEO, Diretor..." />
      </div>
      <div class="form-group">
        <label class="form-label">Origem</label>
        <input type="text" class="form-input" id="lf-source" value="${l.source||''}" placeholder="whatsapp, instagram..." />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Tags (separadas por vírgula)</label>
      <input type="text" class="form-input" id="lf-tags" value="${parseTags(l.tags).join(', ')}" placeholder="ecommerce, shopify, trafego" />
    </div>
    <div class="form-group">
      <label class="form-label">Notas</label>
      <textarea class="form-textarea" id="lf-notes" rows="3" placeholder="Observações sobre o lead...">${l.notes||''}</textarea>
    </div>`;
}

/* Feature 2 — Helpers de validacao de formulario */
function leadFormClearErrors() {
  document.querySelectorAll('.modal .form-error').forEach(el => el.classList.remove('form-error'));
  document.querySelectorAll('.modal .form-error-msg').forEach(el => el.remove());
}

function leadFormSetError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.classList.add('form-error');
  /* Remover mensagem anterior se existir */
  const prev = input.parentNode.querySelector('.form-error-msg');
  if (prev) prev.remove();
  const msg = document.createElement('div');
  msg.className = 'form-error-msg';
  msg.textContent = message;
  input.parentNode.appendChild(msg);
}

function validateLeadForm() {
  console.log('[validateLeadForm] Iniciando validacao');
  leadFormClearErrors();
  let valid = true;

  const name = document.getElementById('lf-name')?.value?.trim() || '';
  if (!name) {
    leadFormSetError('lf-name', 'Nome e obrigatorio');
    valid = false;
    console.log('[validateLeadForm] Nome invalido');
  }

  const email = document.getElementById('lf-email')?.value?.trim() || '';
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      leadFormSetError('lf-email', 'Email invalido');
      valid = false;
      console.log('[validateLeadForm] Email invalido', { email });
    }
  }

  const phone = document.getElementById('lf-phone')?.value?.trim() || '';
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      leadFormSetError('lf-phone', 'Telefone deve ter pelo menos 10 digitos');
      valid = false;
      console.log('[validateLeadForm] Telefone invalido', { phone, digits: digits.length });
    }
  }

  console.log('[validateLeadForm] Resultado', { valid });
  return valid;
}

async function saveLead(isEdit = false) {
  console.log('[saveLead] INICIO', { isEdit });

  /* Feature 2: validar antes de submit */
  if (!validateLeadForm()) {
    console.log('[saveLead] Validacao falhou, abortando');
    return;
  }

  const btn = document.getElementById('save-lead-btn');
  btn.classList.add('btn-loading');
  btn.disabled = true;
  try {
    const body = {
      name:        document.getElementById('lf-name').value.trim(),
      company:     document.getElementById('lf-company').value.trim(),
      email:       document.getElementById('lf-email').value.trim(),
      phone:       document.getElementById('lf-phone').value.trim(),
      status:      document.getElementById('lf-status').value,
      temperature: document.getElementById('lf-temperature').value,
      position:    document.getElementById('lf-position').value.trim(),
      source:      document.getElementById('lf-source').value.trim(),
      tags:        document.getElementById('lf-tags').value.trim().split(',').map(t=>t.trim()).filter(Boolean),
      notes:       document.getElementById('lf-notes').value.trim(),
    };

    console.log('[saveLead] Dados coletados', { body, isEdit });

    if (isEdit) {
      const id = document.getElementById('lead-id').value;
      await http.put(`/leads/${id}`, body);
      console.log('[saveLead] Lead atualizado', { id });
      Toast.success('Lead atualizado!');
    } else {
      await http.post('/leads', body);
      console.log('[saveLead] Lead criado');
      Toast.success('Lead criado!');
    }
    Modal.close();
    await loadLeads();
  } catch (e) {
    console.error('[saveLead] ERRO', e);
    Toast.error(e.message);
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

function confirmDeleteLead(id, name) {
  Modal.confirm(`Excluir o lead <strong>${name}</strong>? Esta ação não pode ser desfeita.`, async () => {
    try {
      await http.del(`/leads/${id}`);
      Toast.success('Lead excluído');
      await loadLeads();
    } catch (e) {
      Toast.error(e.message || 'Erro ao excluir lead');
    }
  }, { title: 'Excluir Lead', confirmText: 'Excluir' });
}

/* ─── PAGE: LEAD DETAIL ──────────────────────────────────────── */
async function pageLeadDetail({ id }) {
  const r = await http.get(`/leads/${id}`);
  const l = r?.data || r || {};
  const [msgsResp, activitiesResp] = await Promise.allSettled([
    http.get(`/leads/${id}/messages`),
    http.get(`/dashboard/activity?leadId=${id}`).catch(() => null),
  ]);
  const messages = msgsResp.value?.data || [];
  // Atividades: tentar campo activities do lead, depois endpoint de activity, depois fallback vazio
  const activities = l.activities || activitiesResp.value?.data || [];

  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <a href="#/leads" class="btn btn-ghost btn-sm" style="margin-bottom:8px">
          <i data-lucide="arrow-left" width="16" height="16"></i> Voltar
        </a>
        <h1 class="page-title">${l.name || 'Lead'}</h1>
        <p class="page-subtitle">${l.company || ''}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="modalEditLead('${id}')">
          <i data-lucide="pencil" width="16" height="16"></i> Editar
        </button>
        <button class="btn btn-primary" onclick="modalSendMsg('${id}', '${(l.name||'').replace(/'/g,'\\\'')}')" ${!l.phone?'disabled':''}>
          <i data-lucide="send" width="16" height="16"></i> Enviar Mensagem
        </button>
      </div>
    </div>

    <div class="lead-detail">
      <div class="lead-detail-main">
        <!-- Perfil -->
        <div class="lead-profile-card">
          <div class="lead-profile-avatar" style="background:${avatarColor(l.name)}">${initials(l.name)}</div>
          <div class="lead-profile-name">${l.name || '—'}</div>
          <div class="lead-profile-company">${l.position ? l.position + ' · ' : ''}${l.company || ''}</div>
          <div class="lead-profile-badges">
            ${statusBadge(l.status)}
            ${tempBadge(l.temperature)}
          </div>
        </div>

        <!-- Informações -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Informações</h3></div>
          <div class="lead-info-grid">
            <div class="lead-info-item"><div class="lead-info-label">Email</div><div class="lead-info-value">${l.email || '—'}</div></div>
            <div class="lead-info-item"><div class="lead-info-label">Telefone</div><div class="lead-info-value">${l.phone || '—'}</div></div>
            <div class="lead-info-item"><div class="lead-info-label">Origem</div><div class="lead-info-value">${l.source || '—'}</div></div>
            <div class="lead-info-item"><div class="lead-info-label">Criado em</div><div class="lead-info-value">${fmtDateTime(l.createdAt)}</div></div>
            <div class="lead-info-item" style="grid-column:1/-1">
              <div class="lead-info-label">Tags</div>
              <div class="tags-container mt-2">${renderTags(parseTags(l.tags))}</div>
            </div>
          </div>
        </div>

        <!-- Histórico de mensagens -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="card-title">Histórico de Mensagens</h3>
            <span class="badge badge-gray">${messages.length}</span>
          </div>
          ${messages.length ? `
            <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto">
              ${messages.map(m => `
                <div style="display:flex;gap:12px;padding:10px;border-radius:8px;background:var(--color-bg-2)">
                  <span class="badge ${m.direction==='out'?'badge-blue':'badge-green'}" style="flex-shrink:0">${m.direction==='out'?'Enviado':'Recebido'}</span>
                  <div style="flex:1;min-width:0">
                    <div class="text-sm">${m.content || m.message || ''}</div>
                    <div class="text-xs text-faint mt-2">${fmtDateTime(m.createdAt)} · ${m.channel || 'whatsapp'}</div>
                  </div>
                </div>`).join('')}
            </div>` : '<p class="text-faint text-sm">Nenhuma mensagem ainda</p>'}
        </div>

        <!-- Timeline de atividades -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Timeline de Atividades</h3>
            <span class="badge badge-gray">${activities.length}</span>
          </div>
          ${renderLeadTimeline(activities)}
        </div>
      </div>

      <div class="lead-detail-side">
        <!-- Notas -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Notas</h3>
            <button class="btn btn-sm btn-secondary" onclick="modalAddNote('${id}')">
              <i data-lucide="plus" width="14" height="14"></i> Adicionar
            </button>
          </div>
          <div id="lead-notes">
            ${l.notes ? `<p class="text-sm" style="color:var(--color-text-2);line-height:1.7">${l.notes}</p>` : '<p class="text-faint text-sm">Sem notas</p>'}
          </div>
        </div>
      </div>
    </div>`);
  lucide.createIcons();
}

function modalAddNote(leadId) {
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Adicionar Nota</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nota</label>
        <textarea class="form-textarea" id="note-content" rows="5" placeholder="Escreva uma nota sobre este lead..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-note-btn" onclick="saveNote('${leadId}')">Salvar Nota</button>
    </div>`, { size: 'sm' });
}

async function saveNote(leadId) {
  const content = document.getElementById('note-content').value.trim();
  if (!content) { Toast.warning('Escreva uma nota'); return; }
  const btn = document.getElementById('save-note-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
  try {
    await http.post(`/leads/${leadId}/notes`, { content });
    Toast.success('Nota adicionada');
    Modal.close();
  } catch (e) {
    Toast.error(e.message || 'Erro ao salvar nota');
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

function modalSendMsg(leadId, leadName) {
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Enviar Mensagem — ${leadName}</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Canal</label>
        <select class="form-select" id="msg-channel">
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mensagem</label>
        <textarea class="form-textarea" id="msg-content" rows="5" placeholder="Digite sua mensagem..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="send-msg-btn" onclick="sendLeadMsg('${leadId}')">
        <i data-lucide="send" width="16" height="16"></i> Enviar
      </button>
    </div>`);
}

async function sendLeadMsg(leadId) {
  console.log('[sendLeadMsg] INICIO', { leadId });
  const content_val = document.getElementById('msg-content').value.trim();
  if (!content_val) { Toast.warning('Digite uma mensagem'); return; }
  const btn = document.getElementById('send-msg-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const channel = document.getElementById('msg-channel').value;
    let content = content_val;

    // Incluir attachment se existir
    const attachment = window._chatAttachment;
    if (attachment && attachment.leadId === leadId) {
      content = `[Arquivo: ${attachment.name}]\n${content}`;
      console.log('[sendLeadMsg] Attachment incluido', { name: attachment.name });
    }

    console.log('[sendLeadMsg] Enviando', { leadId, channel, hasAttachment: !!attachment });
    await http.post(`/messages/${channel}`, { leadId, content, message: content });
    Toast.success('Mensagem enviada!');

    // Limpar attachment apos envio
    if (attachment) {
      window._chatAttachment = null;
      document.getElementById('chat-attach-preview')?.remove();
      console.log('[sendLeadMsg] Attachment limpo apos envio');
    }

    Modal.close();
    console.log('[sendLeadMsg] FIM — Sucesso');
  } catch (e) {
    console.error('[sendLeadMsg] ERRO', e);
    Toast.error(e.message);
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

/* ─── PAGE: CONVERSAS ────────────────────────────────────────── */
async function pageConversations() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Conversas</h1>
        <p class="page-subtitle">WhatsApp, Email e todas as interacoes com leads</p>
      </div>
    </div>
    <div class="conversation-layout">
      <div class="conv-list" id="conv-list">
        <div class="conv-list-header">
          <div style="display:flex;gap:4px;margin-bottom:8px">
            <button class="btn btn-sm conv-filter-btn active" data-filter="all" onclick="filterConvChannel('all')">Todos</button>
            <button class="btn btn-sm conv-filter-btn" data-filter="whatsapp" onclick="filterConvChannel('whatsapp')">
              <i data-lucide="message-circle" width="12" height="12"></i> WhatsApp
            </button>
            <button class="btn btn-sm conv-filter-btn" data-filter="email" onclick="filterConvChannel('email')">
              <i data-lucide="mail" width="12" height="12"></i> Email
            </button>
          </div>
          <div class="search-box" style="max-width:100%">
            <i data-lucide="search" width="16" height="16"></i>
            <input type="search" placeholder="Buscar lead..." id="conv-search" />
          </div>
        </div>
        <div class="conv-list-body" id="conv-list-body">
          ${skeletonList(6)}
        </div>
      </div>
      <div class="chat-area" id="chat-area">
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="message-square" width="28" height="28"></i></div>
          <h3>Selecione uma conversa</h3>
          <p>Clique em um contato para ver WhatsApp e emails.</p>
        </div>
      </div>
    </div>`);
  lucide.createIcons();
  window._convChannelFilter = 'all';
  await loadConvList();
}

function filterConvChannel(ch) {
  window._convChannelFilter = ch;
  document.querySelectorAll('.conv-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === ch));
  loadConvList(document.getElementById('conv-search')?.value || '');
}

// Debounce de modulo para busca de conversas (evita criacao de novo timer a cada chamada)
const _convSearchDebounced = debounce(v => loadConvList(v), 300);

async function loadConvList(search = '') {
  const r = await http.get(`/leads?limit=50${search ? '&search='+encodeURIComponent(search) : ''}`);
  const leads = r?.data?.leads || r?.data || [];
  const body = document.getElementById('conv-list-body');
  if (!body) return;

  body.innerHTML = leads.map(l => {
    const hasPhone = !!l.phone;
    const hasEmail = !!l.email;
    const filter = window._convChannelFilter || 'all';
    if (filter === 'whatsapp' && !hasPhone) return '';
    if (filter === 'email' && !hasEmail) return '';
    return `
    <div class="conv-item" onclick="openConversation('${l.id}', '${(l.name||'').replace(/'/g,'\\\'')}')" id="conv-${l.id}">
      <div class="avatar avatar-sm" style="background:${avatarColor(l.name)}">${initials(l.name)}</div>
      <div class="conv-item-info">
        <div class="conv-item-name">${l.name || '—'}</div>
        <div class="conv-item-preview" style="display:flex;gap:6px;align-items:center">
          ${hasPhone ? '<i data-lucide="message-circle" width="11" height="11" style="color:#25D366"></i>' : ''}
          ${hasEmail ? '<i data-lucide="mail" width="11" height="11" style="color:#4A90D9"></i>' : ''}
          <span>${l.company || l.phone || l.email || '—'}</span>
        </div>
      </div>
      <div class="conv-item-meta">
        <span class="conv-item-time">${fmtRelative(l.updatedAt)}</span>
      </div>
    </div>`;
  }).join('') || '<p class="text-faint text-sm" style="padding:16px">Nenhum lead encontrado</p>';
  lucide.createIcons();

  // Bind unico: usar debounce de modulo (nao criar novo a cada chamada)
  const si = document.getElementById('conv-search');
  if (si && !si._bound) {
    si._bound = true;
    si.addEventListener('input', e => _convSearchDebounced(e.target.value));
  }
}

async function openConversation(leadId, leadName) {
  window._currentLeadName = leadName;
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`conv-${leadId}`)?.classList.add('active');

  const chat = document.getElementById('chat-area');
  chat.innerHTML = `<div class="chat-header">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="avatar" style="background:${avatarColor(leadName)}">${initials(leadName)}</div>
        <div>
          <div style="font-weight:600">${leadName}</div>
          <a href="#/leads/${leadId}" class="text-xs" style="color:var(--color-cyan)">Ver perfil</a>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-success" onclick="modalSendMsg('${leadId}','${leadName.replace(/'/g,'\\\'')}')" >
          <i data-lucide="message-circle" width="14" height="14"></i> WhatsApp
        </button>
        <button class="btn btn-sm btn-primary" onclick="modalSendEmail('${leadId}','${leadName.replace(/'/g,'\\\'')}')" >
          <i data-lucide="mail" width="14" height="14"></i> Email
        </button>
      </div>
    </div>
    <div style="display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid var(--color-border)">
      <button class="btn btn-sm chat-ch-filter active" data-ch="all" onclick="filterChatMsgs('all')">Todos</button>
      <button class="btn btn-sm chat-ch-filter" data-ch="whatsapp" onclick="filterChatMsgs('whatsapp')">WhatsApp</button>
      <button class="btn btn-sm chat-ch-filter" data-ch="email" onclick="filterChatMsgs('email')">Email</button>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div class="loading-state" style="min-height:200px"><div class="spinner"></div></div>
    </div>`;
  lucide.createIcons();

  const r = await http.get(`/leads/${leadId}/messages`).catch(() => ({ data: [] }));
  const msgs = r?.data || [];
  window._currentMsgs = msgs;
  window._currentLeadId = leadId;
  renderChatMsgs(msgs);

  // Inicializar drag-and-drop para esta conversa
  initChatDragDrop(leadId);
}

function filterChatMsgs(ch) {
  document.querySelectorAll('.chat-ch-filter').forEach(b => b.classList.toggle('active', b.dataset.ch === ch));
  const msgs = window._currentMsgs || [];
  const filtered = ch === 'all' ? msgs : msgs.filter(m => m.channel === ch);
  renderChatMsgs(filtered);
}

function renderChatMsgs(msgs) {
  const msgEl = document.getElementById('chat-messages');
  if (!msgEl) return;

  if (!msgs.length) {
    msgEl.innerHTML = '<div class="empty-state" style="min-height:200px"><p>Sem mensagens</p></div>';
    return;
  }

  msgEl.innerHTML = msgs.map(m => {
    const isEmail = m.channel === 'email';
    const subjectLine = isEmail && m.subject ? `<div style="font-weight:600;font-size:12px;margin-bottom:4px;opacity:.8">${m.subject}</div>` : '';
    return `
    <div class="msg ${m.direction==='out'?'msg-out':'msg-in'}" data-channel="${m.channel}">
      ${subjectLine}
      <div class="msg-bubble" style="${isEmail ? 'max-width:90%;font-size:13px' : ''}">${(m.content || m.message || '').replace(/\n/g,'<br>')}</div>
      <div class="msg-time">${fmtDateTime(m.createdAt)} · ${channelBadge(m.channel)} ${m.status ? '· <span class="text-xs">'+m.status+'</span>' : ''}</div>
    </div>`;
  }).join('');
  lucide.createIcons();
  msgEl.scrollTop = msgEl.scrollHeight;
}

function modalSendEmail(leadId, leadName) {
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title"><i data-lucide="mail" width="18" height="18"></i> Enviar Email — ${leadName}</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Assunto</label>
        <input type="text" class="form-input" id="email-subject" placeholder="Assunto do email" />
      </div>
      <div class="form-group">
        <label class="form-label">Mensagem</label>
        <textarea class="form-textarea" id="email-content" rows="8" placeholder="Conteudo do email..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="send-email-btn" onclick="sendEmailMsg('${leadId}')">
        <i data-lucide="send" width="16" height="16"></i> Enviar Email
      </button>
    </div>`);
}

async function sendEmailMsg(leadId) {
  const btn = document.getElementById('send-email-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const subject = document.getElementById('email-subject').value.trim();
    const content = document.getElementById('email-content').value.trim();
    if (!content) { Toast.warning('Digite o conteudo do email'); return; }
    await http.post('/messages/email', { leadId, subject, content, message: content });
    Toast.success('Email enviado!');
    Modal.close();
    if (window._currentLeadId === leadId) openConversation(leadId, window._currentLeadName || '');
  } catch (e) { Toast.error(e.message); }
  finally { btn.classList.remove('btn-loading'); btn.disabled = false; }
}

/* ─── PAGE: TAGS IA ──────────────────────────────────────────── */
async function pageTags() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Tags IA</h1>
        <p class="page-subtitle">Categorização inteligente de leads por comportamento e respostas</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="modalNewTagRule()">
          <i data-lucide="plus" width="16" height="16"></i> Nova Regra
        </button>
        <button class="btn btn-secondary" onclick="runTagAnalysis()">
          <i data-lucide="sparkles" width="16" height="16"></i> Analisar Leads
        </button>
      </div>
    </div>
    <div class="tags-overview" id="tags-overview">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <div style="margin-top:24px">
      <h2 style="font-size:16px;font-weight:600;margin-bottom:16px">Regras de Auto-Tagging</h2>
      <div id="tag-rules-content"><div class="loading-state"><div class="spinner"></div></div></div>
    </div>`);
  lucide.createIcons();
  await Promise.all([loadTagsOverview(), loadTagRules()]);
}

async function loadTagsOverview() {
  // Buscar leads em lotes de 100 (limite da API)
  let allLeads = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const batch = await http.get(`/leads?limit=100&page=${page}`);
    const items = batch?.data?.leads || batch?.data || [];
    allLeads = allLeads.concat(items);
    hasMore = items.length === 100;
    page++;
  }
  const r = { data: allLeads };
  const leads = r?.data?.leads || r?.data || [];
  const tagMap = {};
  leads.forEach(l => {
    let tags = [];
    try { tags = JSON.parse(l.tags || '[]'); } catch { tags = []; }
    tags.forEach(t => {
      if (!tagMap[t]) tagMap[t] = { count: 0, leads: [] };
      tagMap[t].count++;
      tagMap[t].leads.push(l.name);
    });
  });

  const el = document.getElementById('tags-overview');
  const sortedTags = Object.entries(tagMap).sort((a, b) => b[1].count - a[1].count);

  if (!sortedTags.length) {
    el.innerHTML = `<div class="empty-state" style="min-height:160px">
      <div class="empty-state-icon"><i data-lucide="tag" width="28" height="28"></i></div>
      <h3>Nenhuma tag encontrada</h3>
      <p>Tags serao criadas automaticamente conforme leads interagem.</p>
    </div>`;
    lucide.createIcons();
    return;
  }

  const tagColors = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2','#4F46E5','#BE185D','#65A30D','#0D9488'];
  el.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${sortedTags.map(([tag, info], i) => `
        <div class="tag-chip" style="background:${tagColors[i % tagColors.length]}22;border:1px solid ${tagColors[i % tagColors.length]}44;color:${tagColors[i % tagColors.length]};padding:8px 16px;border-radius:20px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:all .2s" onclick="showTagLeads('${tag.replace(/'/g,'\\\'')}')">
          <i data-lucide="tag" width="14" height="14"></i>
          ${tag}
          <span style="background:${tagColors[i % tagColors.length]}33;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${info.count}</span>
        </div>`).join('')}
    </div>
    <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
      <div class="stat-card" style="padding:16px;border-radius:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border)">
        <div style="font-size:24px;font-weight:700;color:var(--color-text)">${sortedTags.length}</div>
        <div style="font-size:12px;color:var(--color-text-faint)">Tags unicas</div>
      </div>
      <div class="stat-card" style="padding:16px;border-radius:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border)">
        <div style="font-size:24px;font-weight:700;color:var(--color-text)">${leads.length}</div>
        <div style="font-size:12px;color:var(--color-text-faint)">Total de leads</div>
      </div>
      <div class="stat-card" style="padding:16px;border-radius:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border)">
        <div style="font-size:24px;font-weight:700;color:var(--color-text)">${leads.filter(l => { try { return JSON.parse(l.tags||'[]').length > 0; } catch { return false; } }).length}</div>
        <div style="font-size:12px;color:var(--color-text-faint)">Leads com tags</div>
      </div>
    </div>`;
  lucide.createIcons();
}

function showTagLeads(tag) {
  leadsTagsFilter = [tag];
  leadsShowAdvanced = true;
  navigate('/leads');
}

// Tag rules armazenadas em settings do CRM
async function loadTagRules() {
  const el = document.getElementById('tag-rules-content');
  let rules = [];
  try {
    const r = await http.get('/settings');
    const settings = r?.data || {};
    rules = JSON.parse(settings.tag_rules || '[]');
  } catch { rules = []; }

  if (!rules.length) {
    el.innerHTML = `<div class="empty-state" style="min-height:120px">
      <div class="empty-state-icon"><i data-lucide="sparkles" width="28" height="28"></i></div>
      <h3>Sem regras configuradas</h3>
      <p>Crie regras para classificar leads automaticamente com base em palavras-chave, comportamento ou respostas.</p>
      <button class="btn btn-primary mt-4" onclick="modalNewTagRule()">Criar Regra</button>
    </div>`;
    lucide.createIcons();
    return;
  }

  const conditionLabels = {
    'message_contains': 'Mensagem contem',
    'status_is': 'Status e',
    'source_is': 'Origem e',
    'company_contains': 'Empresa contem',
    'notes_contain': 'Notas contem',
    'no_reply_days': 'Sem resposta ha (dias)',
    'ia_intent': 'IA detecta intencao',
  };
  const conditionIcons = {
    'message_contains': 'message-square', 'status_is': 'git-branch', 'source_is': 'globe',
    'company_contains': 'building', 'notes_contain': 'file-text', 'no_reply_days': 'clock',
    'ia_intent': 'sparkles',
  };

  el.innerHTML = `<div style="display:grid;gap:12px">
    ${rules.map((r, i) => {
      const isIA = r.condition === 'ia_intent';
      const iconName = conditionIcons[r.condition] || 'cpu';
      const iconColor = isIA ? '#7C3AED' : 'var(--color-primary)';
      const bgColor = isIA ? '#7C3AED' : 'var(--color-primary)';
      return `
      <div style="padding:16px;border-radius:12px;background:var(--color-bg-secondary);border:1px solid ${isIA ? '#7C3AED33' : 'var(--color-border)'};display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <div style="width:36px;height:36px;border-radius:8px;background:${bgColor}18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i data-lucide="${iconName}" width="18" height="18" style="color:${iconColor}"></i>
          </div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:600;font-size:14px">${r.name || 'Regra ' + (i+1)}</span>
              ${isIA ? '<span style="background:#7C3AED22;color:#7C3AED;padding:1px 8px;border-radius:6px;font-size:10px;font-weight:600">IA</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--color-text-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${isIA
                ? `Intencao: "<em>${r.value}</em>" → tag <span style="background:${bgColor}22;color:${bgColor};padding:2px 8px;border-radius:8px;font-weight:600">${r.tag}</span>`
                : `Se <strong>${conditionLabels[r.condition] || r.condition}</strong>: "${r.value}" → tag <span style="background:${bgColor}22;color:${bgColor};padding:2px 8px;border-radius:8px;font-weight:600">${r.tag}</span>`
              }
            </div>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-icon btn-ghost btn-sm" onclick="editTagRule(${i})"><i data-lucide="pencil" width="14" height="14"></i></button>
          <button class="btn btn-icon btn-ghost btn-sm" onclick="deleteTagRule(${i})" style="color:var(--color-danger)"><i data-lucide="trash-2" width="14" height="14"></i></button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
  lucide.createIcons();
}

function modalNewTagRule(existing = null, index = -1) {
  const r = existing || {};
  const isIA = r.condition === 'ia_intent';
  const activeTab = isIA ? 'ia' : 'manual';
  window._tagMode = activeTab;

  const presetIcons = ['heart','file-text','megaphone','globe','cpu','frown','clock','users'];

  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">${existing ? 'Editar' : 'Nova'} Regra de Tag</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="rule-index" value="${index}" />

      <!-- Tabs Manual / IA -->
      <div class="tag-mode-switcher">
        <button class="tag-mode-tab ${activeTab==='manual'?'active':''}" data-mode="manual" onclick="switchTagMode('manual')">
          <i data-lucide="settings-2" class="tab-icon"></i>
          <div>
            <span>Regra Manual</span>
            <span class="tab-desc">Condicoes simples</span>
          </div>
        </button>
        <button class="tag-mode-tab ${activeTab==='ia'?'active':''}" data-mode="ia" onclick="switchTagMode('ia')">
          <i data-lucide="sparkles" class="tab-icon"></i>
          <div>
            <span>Intencao por IA</span>
            <span class="tab-desc">Analise de conversas</span>
          </div>
        </button>
      </div>

      <!-- MODO MANUAL -->
      <div id="tag-mode-manual" class="tag-panel ${activeTab==='manual'?'active':''}">
        <div class="form-group">
          <label class="form-label">Nome da regra</label>
          <input type="text" class="form-input" id="rule-name" value="${!isIA ? r.name||'' : ''}" placeholder="Ex: Leads interessados em trafego" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Condicao</label>
            <select class="form-select" id="rule-condition">
              <option value="message_contains" ${r.condition==='message_contains'?'selected':''}>Mensagem contem</option>
              <option value="notes_contain" ${r.condition==='notes_contain'?'selected':''}>Notas contem</option>
              <option value="status_is" ${r.condition==='status_is'?'selected':''}>Status e</option>
              <option value="source_is" ${r.condition==='source_is'?'selected':''}>Origem e</option>
              <option value="company_contains" ${r.condition==='company_contains'?'selected':''}>Empresa contem</option>
              <option value="no_reply_days" ${r.condition==='no_reply_days'?'selected':''}>Sem resposta ha X dias</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valor</label>
            <input type="text" class="form-input" id="rule-value" value="${!isIA ? r.value||'' : ''}" placeholder="Ex: trafego pago" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tag a aplicar</label>
          <input type="text" class="form-input" id="rule-tag" value="${!isIA ? r.tag||'' : ''}" placeholder="Ex: trafego" />
        </div>
      </div>

      <!-- MODO IA -->
      <div id="tag-mode-ia" class="tag-panel ${activeTab==='ia'?'active':''}">
        <div class="tag-ia-infobox">
          <div class="ia-icon">
            <i data-lucide="sparkles" width="16" height="16"></i>
          </div>
          <div class="ia-text">
            <h4>Analise por Inteligencia Artificial</h4>
            <p>A IA analisa todas as conversas do lead com o agente de prospeccao e detecta a intencao automaticamente com base em padroes semanticos e palavras-chave.</p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Selecione uma intencao predefinida</label>
          <div class="intent-presets-grid" id="intent-presets">
            ${INTENT_PRESETS.map((p, i) => `
              <button type="button" class="intent-preset-btn" data-idx="${i}" onclick="selectIntentPreset(${i})">
                <div class="preset-icon"><i data-lucide="${presetIcons[i]||'zap'}"></i></div>
                <span>${p.label}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="tag-divider"><span>ou personalize</span></div>

        <div class="form-group">
          <label class="form-label">Nome da regra</label>
          <input type="text" class="form-input" id="ia-rule-name" value="${isIA ? r.name||'' : ''}" placeholder="Ex: Cliente demonstrou interesse" />
        </div>
        <div class="form-group">
          <label class="form-label">Descreva a intencao (linguagem natural)</label>
          <textarea class="form-textarea" id="ia-rule-intent" rows="3" placeholder="Ex: O lead demonstrou interesse no servico, pediu mais informacoes ou perguntou sobre funcionamento">${isIA ? r.value||'' : ''}</textarea>
          <div class="form-hint">A IA ira buscar padroes nas conversas que correspondam a esta intencao</div>
        </div>
        <div class="form-group">
          <label class="form-label">Palavras-chave associadas <span style="font-weight:400;color:var(--color-text-faint)">(separadas por |)</span></label>
          <input type="text" class="form-input" id="ia-rule-keywords" value="${isIA ? r.keywords||'' : ''}" placeholder="interesse|quero saber|como funciona|gostei" />
          <div class="form-hint">Termos que indicam essa intencao nas mensagens do lead</div>
        </div>
        <div class="form-group">
          <label class="form-label">Tag a aplicar</label>
          <input type="text" class="form-input" id="ia-rule-tag" value="${isIA ? r.tag||'' : ''}" placeholder="Ex: interesse" />
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTagRule()">Salvar</button>
    </div>`, { size: 'lg' });

  lucide.createIcons();
}

// Intent presets — constante local (nao precisa ser acessivel no window)
const INTENT_PRESETS = [
  { label: 'Demonstrou interesse no servico', name: 'Interesse no servico', value: 'O lead demonstrou interesse no servico, pediu mais informacoes ou perguntou como funciona', keywords: 'interesse|interessado|quero saber|me conta|como funciona|gostei|quero|preciso', tag: 'interesse' },
  { label: 'Pediu proposta ou orcamento', name: 'Pediu proposta', value: 'O lead pediu proposta comercial, orcamento ou perguntou sobre valores e precos', keywords: 'proposta|orcamento|orçamento|quanto custa|valor|preco|preço|investimento|tabela', tag: 'proposta' },
  { label: 'Interesse em trafego pago', name: 'Interesse em trafego', value: 'O lead demonstrou interesse em servicos de trafego pago, anuncios ou campanhas', keywords: 'trafego|tráfego|anuncio|anúncio|meta ads|facebook ads|instagram ads|google ads|campanha', tag: 'trafego' },
  { label: 'Quer site ou landing page', name: 'Interesse em website', value: 'O lead quer criar ou melhorar um site, landing page ou loja virtual', keywords: 'site|website|landing page|pagina|página|loja virtual|ecommerce', tag: 'website' },
  { label: 'Interesse em automacao/IA', name: 'Interesse em automacao', value: 'O lead tem interesse em automacao, chatbots ou inteligencia artificial', keywords: 'automacao|automação|chatbot|ia|inteligencia artificial|bot|automatizar', tag: 'automacao' },
  { label: 'Reclamou ou demonstrou insatisfacao', name: 'Insatisfacao detectada', value: 'O lead reclamou, demonstrou insatisfacao ou expressou sentimento negativo', keywords: 'reclamar|reclamacao|insatisfeito|ruim|pessimo|péssimo|horrivel|não gostei|cancelar|devolver', tag: 'insatisfacao' },
  { label: 'Disse que nao tem interesse agora', name: 'Sem interesse agora', value: 'O lead disse que nao tem interesse no momento mas pode voltar depois', keywords: 'agora nao|agora não|depois|mais tarde|nao tenho interesse|sem interesse|nao preciso|talvez', tag: 'follow-up-futuro' },
  { label: 'Mencionou concorrente', name: 'Mencionou concorrente', value: 'O lead mencionou outra empresa, agencia concorrente ou que ja tem fornecedor', keywords: 'concorrente|outra empresa|outra agencia|ja tenho|já tenho|estou com outro|cotacao|cotação', tag: 'concorrente' },
];

function selectIntentPreset(idx) {
  const p = INTENT_PRESETS[idx];
  if (!p) return;
  document.querySelectorAll('.intent-preset-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelectorAll('.intent-preset-btn')[idx];
  if (btn) btn.classList.add('selected');
  document.getElementById('ia-rule-name').value = p.name;
  document.getElementById('ia-rule-intent').value = p.value;
  document.getElementById('ia-rule-keywords').value = p.keywords;
  document.getElementById('ia-rule-tag').value = p.tag;
}

function switchTagMode(mode) {
  // Toggle panels via CSS classes
  document.getElementById('tag-mode-manual').classList.toggle('active', mode === 'manual');
  document.getElementById('tag-mode-ia').classList.toggle('active', mode === 'ia');
  // Toggle tab buttons
  document.querySelectorAll('.tag-mode-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  window._tagMode = mode;
}

async function saveTagRule() {
  const idx = parseInt(document.getElementById('rule-index').value);
  const mode = window._tagMode || (document.getElementById('tag-mode-ia')?.classList.contains('active') ? 'ia' : 'manual');
  let rule;

  if (mode === 'ia') {
    rule = {
      name: document.getElementById('ia-rule-name').value.trim(),
      condition: 'ia_intent',
      value: document.getElementById('ia-rule-intent').value.trim(),
      keywords: document.getElementById('ia-rule-keywords').value.trim(),
      tag: document.getElementById('ia-rule-tag').value.trim().toLowerCase(),
    };
    if (!rule.value || !rule.tag) { Toast.warning('Descreva a intencao e defina a tag'); return; }
  } else {
    rule = {
      name: document.getElementById('rule-name').value.trim(),
      condition: document.getElementById('rule-condition').value,
      value: document.getElementById('rule-value').value.trim(),
      tag: document.getElementById('rule-tag').value.trim().toLowerCase(),
    };
    if (!rule.value || !rule.tag) { Toast.warning('Preencha valor e tag'); return; }
  }

  let rules = [];
  try {
    const r = await http.get('/settings');
    rules = JSON.parse((r?.data || {}).tag_rules || '[]');
  } catch { rules = []; }

  if (idx >= 0) rules[idx] = rule;
  else rules.push(rule);

  await http.put('/settings', { tag_rules: JSON.stringify(rules) });
  Toast.success('Regra salva!');
  Modal.close();
  await loadTagRules();
}

async function editTagRule(index) {
  let rules = [];
  try {
    const r = await http.get('/settings');
    rules = JSON.parse((r?.data || {}).tag_rules || '[]');
  } catch { rules = []; }
  if (rules[index]) modalNewTagRule(rules[index], index);
}

async function deleteTagRule(index) {
  Modal.confirm('Excluir esta regra de tag?', async () => {
    let rules = [];
    try {
      const r = await http.get('/settings');
      rules = JSON.parse((r?.data || {}).tag_rules || '[]');
    } catch { rules = []; }
    rules.splice(index, 1);
    await http.put('/settings', { tag_rules: JSON.stringify(rules) });
    Toast.success('Regra excluida');
    await loadTagRules();
  }, { title: 'Excluir Regra', confirmText: 'Excluir' });
}

async function runTagAnalysis() {
  Toast.info('Analisando leads e aplicando regras de IA...');
  let rules = [];
  try {
    const r = await http.get('/settings');
    rules = JSON.parse((r?.data || {}).tag_rules || '[]');
  } catch { rules = []; }

  if (!rules.length) { Toast.warning('Nenhuma regra configurada. Crie regras primeiro.'); return; }

  const iaRules = rules.filter(r => r.condition === 'ia_intent');
  const manualRules = rules.filter(r => r.condition !== 'ia_intent');
  Toast.info(`${rules.length} regras (${iaRules.length} IA + ${manualRules.length} manuais)`);

  // Buscar todos os leads com paginacao — limite maximo de 100 paginas para evitar loop infinito
  let allAnalysisLeads = [];
  let pg = 1;
  const MAX_PAGES = 100;
  while (pg <= MAX_PAGES) {
    const batch = await http.get(`/leads?limit=100&page=${pg}`);
    const items = batch?.data?.leads || batch?.data || [];
    allAnalysisLeads = allAnalysisLeads.concat(items);
    if (items.length < 100) break;
    pg++;
  }
  const leads = allAnalysisLeads;
  let updated = 0;

  // Identificar regras que precisam de mensagens para evitar N+1 por lead
  const rulesNeedMsgs = rules.filter(r => r.condition === 'message_contains' || r.condition === 'ia_intent');

  for (const lead of leads) {
    let tags = [];
    try { tags = JSON.parse(lead.tags || '[]'); } catch { tags = []; }
    let changed = false;

    // Buscar mensagens uma unica vez por lead (apenas se necessario)
    let leadMsgsText = null;
    const needMsgs = rulesNeedMsgs.some(r => !tags.includes(r.tag));
    if (needMsgs) {
      try {
        const msgs = await http.get(`/leads/${lead.id}/messages`).catch(() => ({ data: [] }));
        leadMsgsText = (msgs?.data || []).map(m => (m.content || '').toLowerCase()).join(' ');
      } catch { leadMsgsText = ''; }
    }

    for (const rule of rules) {
      if (tags.includes(rule.tag)) continue;
      let match = false;
      const val = rule.value.toLowerCase();

      switch (rule.condition) {
        case 'message_contains':
          match = (leadMsgsText || '').includes(val);
          break;
        case 'notes_contain':
          match = (lead.notes || '').toLowerCase().includes(val);
          break;
        case 'status_is':
          match = lead.status === rule.value;
          break;
        case 'source_is':
          match = lead.source === rule.value;
          break;
        case 'company_contains':
          match = (lead.company || '').toLowerCase().includes(val);
          break;
        case 'no_reply_days': {
          const days = parseInt(rule.value) || 7;
          const diff = (Date.now() - new Date(lead.updatedAt).getTime()) / 86400000;
          match = diff >= days && lead.status !== 'won' && lead.status !== 'lost';
          break;
        }
        case 'ia_intent': {
          // Matching semantico por keywords nas conversas + notas
          const kws = (rule.keywords || '').toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
          if (!kws.length) break;
          const allText = [
            leadMsgsText || '',
            (lead.notes || '').toLowerCase(),
            (lead.company || '').toLowerCase(),
          ].join(' ');
          // Match se pelo menos 1 keyword encontrada (sensibilidade alta)
          match = kws.some(kw => allText.includes(kw));
          break;
        }
      }

      if (match) { tags.push(rule.tag); changed = true; }
    }

    if (changed) {
      await http.put(`/leads/${lead.id}`, { tags: JSON.stringify(tags) });
      updated++;
    }
  }

  Toast.success(`Analise concluida! ${updated} lead(s) atualizado(s).`);
  await loadTagsOverview();
}

/* ─── PAGE: CRM SETTINGS ─────────────────────────────────────── */
async function pageCrmSettings() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Configurações CRM</h1>
        <p class="page-subtitle">Perfil do agente e configurações gerais</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="save-settings-btn" onclick="saveSettings()">
          <i data-lucide="save" width="16" height="16"></i> Salvar
        </button>
      </div>
    </div>
    <div id="settings-content"><div class="loading-state"><div class="spinner"></div></div></div>`);
  lucide.createIcons();

  const r = await http.get('/settings');
  const s = r?.data || {};

  document.getElementById('settings-content').innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="user" width="18" height="18"></i></div>
        <div>
          <div class="settings-section-title">Perfil do Agente</div>
          <div class="settings-section-desc">Identidade usada nas mensagens e prospecções</div>
        </div>
      </div>
      <div class="settings-section-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nome do Agente</label>
            <input type="text" class="form-input" id="cfg-agentName" value="${s.agentName||''}" placeholder="Rafael Tondin" />
          </div>
          <div class="form-group">
            <label class="form-label">Empresa</label>
            <input type="text" class="form-input" id="cfg-agentCompany" value="${s.agentCompany||''}" placeholder="Riwer Labs" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cargo</label>
            <input type="text" class="form-input" id="cfg-agentRole" value="${s.agentRole||''}" placeholder="Especialista em Tráfego Pago" />
          </div>
          <div class="form-group">
            <label class="form-label">Tom de Voz</label>
            <select class="form-select" id="cfg-agentToneOfVoice">
              ${['casual','amigavel','profissional','formal'].map(t =>
                `<option value="${t}" ${s.agentToneOfVoice===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição do Tom</label>
          <textarea class="form-textarea" id="cfg-agentToneDescription" rows="3" placeholder="Descreva como o agente deve se comunicar...">${s.agentToneDescription||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Assinatura de Email</label>
          <textarea class="form-textarea" id="cfg-agentSignature" rows="3" placeholder="Assinatura usada nos emails...">${s.agentSignature||''}</textarea>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="building-2" width="18" height="18"></i></div>
        <div>
          <div class="settings-section-title">Sobre a Empresa</div>
        </div>
      </div>
      <div class="settings-section-body">
        <div class="form-group">
          <label class="form-label">Descrição da Empresa</label>
          <textarea class="form-textarea" id="cfg-companyDescription" rows="3" placeholder="O que sua empresa faz...">${s.companyDescription||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Serviços Oferecidos</label>
          <textarea class="form-textarea" id="cfg-companyServices" rows="3" placeholder="Gestão de tráfego, desenvolvimento web...">${s.companyServices||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Website</label>
          <input type="url" class="form-input" id="cfg-companyWebsite" value="${s.companyWebsite||''}" placeholder="https://riwerlabs.com" />
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="mail" width="18" height="18"></i></div>
        <div>
          <div class="settings-section-title">Email SMTP</div>
          <div class="settings-section-desc">Configuração do servidor de email para envio de prospecções</div>
        </div>
        <button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="testSmtpConnection()">
          <i data-lucide="wifi" width="14" height="14"></i> Testar Conexão
        </button>
      </div>
      <div class="settings-section-body">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Host SMTP</label>
            <input type="text" class="form-input" id="cfg-smtp_host" value="${s.smtp_host||''}" placeholder="smtp.gmail.com" />
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Porta</label>
            <input type="number" class="form-input" id="cfg-smtp_port" value="${s.smtp_port||'587'}" placeholder="587" />
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">SSL/TLS</label>
            <select class="form-select" id="cfg-smtp_secure">
              <option value="false" ${s.smtp_secure!=='true'?'selected':''}>STARTTLS (587)</option>
              <option value="true" ${s.smtp_secure==='true'?'selected':''}>SSL (465)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Usuário (email)</label>
            <input type="email" class="form-input" id="cfg-smtp_user" value="${s.smtp_user||''}" placeholder="seu@email.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Senha / App Password</label>
            <input type="password" class="form-input" id="cfg-smtp_pass" value="${s.smtp_pass||''}" placeholder="••••••••" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nome do Remetente</label>
            <input type="text" class="form-input" id="cfg-smtp_from_name" value="${s.smtp_from_name||''}" placeholder="Rafael Tondin" />
          </div>
          <div class="form-group">
            <label class="form-label">Email do Remetente</label>
            <input type="email" class="form-input" id="cfg-smtp_from_email" value="${s.smtp_from_email||''}" placeholder="contato@empresa.com" />
          </div>
        </div>
        <div id="smtp-test-result"></div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="message-circle" width="18" height="18"></i></div>
        <div>
          <div class="settings-section-title">WhatsApp (Evolution API)</div>
          <div class="settings-section-desc">Conexão com a Evolution API para envio de mensagens WhatsApp</div>
        </div>
        <button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="testEvolutionConnection()">
          <i data-lucide="wifi" width="14" height="14"></i> Testar Conexão
        </button>
      </div>
      <div class="settings-section-body">
        <div class="form-group">
          <label class="form-label">URL da Evolution API</label>
          <input type="url" class="form-input" id="cfg-evolution_api_url" value="${s.evolution_api_url||''}" placeholder="https://evolution.seudominio.com" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input type="password" class="form-input" id="cfg-evolution_api_key" value="${s.evolution_api_key||''}" placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label class="form-label">Nome da Instância</label>
            <input type="text" class="form-input" id="cfg-evolution_instance" value="${s.evolution_instance||''}" placeholder="minha-instancia" />
          </div>
        </div>
        <div id="evolution-test-result"></div>
      </div>
    </div>`;
  lucide.createIcons();
}

async function testSmtpConnection() {
  const el = document.getElementById('smtp-test-result');
  el.innerHTML = '<div class="alert alert-info" style="margin-top:12px"><i data-lucide="loader" width="14" height="14" class="spin"></i> Testando conexão SMTP...</div>';
  lucide.createIcons();
  try {
    await saveSettings();
    const r = await http.post('/settings/test-smtp', {});
    el.innerHTML = `<div class="alert alert-success" style="margin-top:12px"><i data-lucide="check-circle" width="14" height="14"></i> ${r.message || 'Conexão SMTP OK!'}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger" style="margin-top:12px"><i data-lucide="x-circle" width="14" height="14"></i> ${e.message}</div>`;
  }
  lucide.createIcons();
}

async function testEvolutionConnection() {
  const el = document.getElementById('evolution-test-result');
  el.innerHTML = '<div class="alert alert-info" style="margin-top:12px"><i data-lucide="loader" width="14" height="14" class="spin"></i> Testando conexão Evolution API...</div>';
  lucide.createIcons();
  try {
    await saveSettings();
    const r = await http.post('/settings/test-evolution', {});
    el.innerHTML = `<div class="alert alert-success" style="margin-top:12px"><i data-lucide="check-circle" width="14" height="14"></i> ${r.message || 'Conexão OK!'}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger" style="margin-top:12px"><i data-lucide="x-circle" width="14" height="14"></i> ${e.message}</div>`;
  }
  lucide.createIcons();
}

async function saveSettings() {
  const btn = document.getElementById('save-settings-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
  try {
    const fields = [
      'agentName','agentCompany','agentRole','agentToneOfVoice','agentToneDescription','agentSignature',
      'companyDescription','companyServices','companyWebsite',
      'smtp_host','smtp_port','smtp_secure','smtp_user','smtp_pass','smtp_from_name','smtp_from_email',
      'evolution_api_url','evolution_api_key','evolution_instance'
    ];
    const body = {};
    fields.forEach(f => { const el = document.getElementById(`cfg-${f}`); if (el) body[f] = el.tagName === 'SELECT' ? el.value : el.value; });
    await http.put('/settings', body);
    Toast.success('Configurações salvas!');
  } catch (e) { Toast.error(e.message); }
  finally { if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; } }
}

/* ─── PAGE: TASKS ────────────────────────────────────────────── */
async function pageTasks() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Tarefas</h1>
        <p class="page-subtitle">Task scheduler do ecossistema</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="pageTasks()">
          <i data-lucide="refresh-cw" width="16" height="16"></i> Atualizar
        </button>
        <button class="btn btn-primary" onclick="modalNewTask()">
          <i data-lucide="plus" width="16" height="16"></i> Nova Tarefa
        </button>
      </div>
    </div>

    <div class="tabs" id="tasks-tabs">
      <button class="tab active" onclick="filterTasksTab('pending', this)">Pendentes</button>
      <button class="tab" onclick="filterTasksTab('running', this)">Em Execução</button>
      <button class="tab" onclick="filterTasksTab('completed', this)">Concluídas</button>
      <button class="tab" onclick="filterTasksTab('all', this)">Todas</button>
    </div>

    <div id="tasks-content"><div class="loading-state"><div class="spinner"></div></div></div>`);
  lucide.createIcons();
  await loadTasks('pending');
}

let tasksFilter = 'pending';
async function filterTasksTab(status, btn) {
  if (!btn) {
    console.warn('[filterTasksTab] Botao nao encontrado para status:', status);
    return;
  }
  document.querySelectorAll('#tasks-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  tasksFilter = status;
  await loadTasks(status);
}

async function loadTasks(status) {
  const params = status === 'all' ? '' : `?status=${status}`;
  const r = await apiEco(`/tasks${params}`).catch(() => http.get(`/tasks${params}`));
  const tasks = r?.data || r?.tasks || [];
  const el = document.getElementById('tasks-content');

  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="check-square" width="28" height="28"></i></div>
      <h3>Nenhuma tarefa</h3>
      <p>Nenhuma tarefa ${status === 'all' ? '' : 'com este status'} encontrada.</p>
    </div>`;
    lucide.createIcons();
    return;
  }

  const statusColors = { pending: '#64748B', running: '#F59E0B', completed: '#22C55E', failed: '#EF4444', cancelled: '#64748B' };
  el.innerHTML = tasks.map(t => `
    <div class="task-item ${t.status === 'completed' ? 'completed' : ''}">
      <div class="task-checkbox ${t.status==='completed'?'checked':''}" onclick="toggleTask('${t.id}', '${t.status}')">
        ${t.status==='completed' ? `<i data-lucide="check" width="12" height="12"></i>` : ''}
      </div>
      <div class="task-content">
        <div class="task-title">${t.name || t.title || t.subject || '—'}</div>
        ${t.description ? `<div class="task-desc">${t.description}</div>` : ''}
        <div class="task-meta">
          <span class="badge" style="background:${statusColors[t.status]||'#888'}22;color:${statusColors[t.status]||'#888'}">${t.status}</span>
          ${t.createdAt ? `<span class="text-xs text-faint">${fmtRelative(t.createdAt)}</span>` : ''}
          ${t.scheduledFor ? `<span class="text-xs text-faint">Agendado: ${fmtDateTime(t.scheduledFor)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        ${t.status === 'running' ? `
          <button class="btn btn-sm btn-secondary" onclick="cancelTask('${t.id}')">
            <i data-lucide="square" width="12" height="12"></i>
          </button>` : ''}
        <button class="btn btn-icon btn-ghost btn-sm" onclick="confirmDeleteTask('${t.id}')" style="color:var(--color-danger)">
          <i data-lucide="trash-2" width="14" height="14"></i>
        </button>
      </div>
    </div>`).join('');
  lucide.createIcons();
}

async function toggleTask(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  await apiEco(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) }).catch(() =>
    http.put(`/tasks/${id}`, { status: newStatus }));
  await loadTasks(tasksFilter);
}

async function cancelTask(id) {
  await apiEco(`/tasks/${id}/cancel`, { method: 'POST' }).catch(() =>
    http.post(`/tasks/${id}/cancel`, {}));
  Toast.info('Tarefa cancelada');
  await loadTasks(tasksFilter);
}

function confirmDeleteTask(id) {
  Modal.confirm('Excluir esta tarefa?', async () => {
    await apiEco(`/tasks/${id}`, { method: 'DELETE' }).catch(() => http.del(`/tasks/${id}`));
    Toast.success('Tarefa excluída');
    await loadTasks(tasksFilter);
  }, { title: 'Excluir Tarefa', confirmText: 'Excluir' });
}

function modalNewTask() {
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Nova Tarefa</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome <span>*</span></label>
        <input type="text" class="form-input" id="task-name" placeholder="Nome da tarefa" />
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <textarea class="form-textarea" id="task-desc" rows="3" placeholder="Detalhes da tarefa..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="task-status">
            <option value="pending">Pendente</option>
            <option value="completed">Concluída</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Agendado para</label>
          <input type="datetime-local" class="form-input" id="task-scheduled" />
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-task-btn" onclick="saveTask()">Criar</button>
    </div>`);
}

async function saveTask() {
  const btn = document.getElementById('save-task-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const name = document.getElementById('task-name').value.trim();
    if (!name) { Toast.warning('Nome é obrigatório'); return; }
    const body = {
      name, subject: name,
      description: document.getElementById('task-desc').value.trim(),
      status: document.getElementById('task-status').value,
      scheduledFor: document.getElementById('task-scheduled').value || null,
    };
    await apiEco('/tasks', { method: 'POST', body: JSON.stringify(body) }).catch(() => http.post('/tasks', body));
    Toast.success('Tarefa criada!');
    Modal.close();
    await loadTasks(tasksFilter);
  } catch (e) { Toast.error(e.message); }
  finally { btn.classList.remove('btn-loading'); btn.disabled = false; }
}

/* ─── PAGE: KNOWLEDGE BASE ───────────────────────────────────── */
async function pageKnowledgeBase() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Base de Conhecimento</h1>
        <p class="page-subtitle">Documentação e referências do ecossistema</p>
      </div>
      <div class="page-header-actions">
        <div class="search-box">
          <i data-lucide="search" width="16" height="16"></i>
          <input type="search" id="kb-search" placeholder="Buscar documentos..." />
        </div>
      </div>
    </div>
    <div id="kb-content"><div class="loading-state"><div class="spinner"></div></div></div>`);
  lucide.createIcons();
  await loadKB();

  const dSearch = debounce(q => loadKB(q));
  document.getElementById('kb-search').addEventListener('input', e => dSearch(e.target.value));
}

async function loadKB(search = '') {
  const r = await apiEco(`/kb/documents${search ? '?search='+encodeURIComponent(search) : ''}`).catch(() => ({ documents: [] }));
  const docs = r?.documents || r?.data || r?.files || [];
  const el = document.getElementById('kb-content');

  if (!docs.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="book-open" width="28" height="28"></i></div>
      <h3>Nenhum documento</h3>
      <p>${search ? 'Nenhum resultado para "'+search+'".' : 'A base de conhecimento está vazia.'}</p>
    </div>`;
    lucide.createIcons();
    return;
  }

  el.innerHTML = `<div class="kb-grid">
    ${docs.map(d => `
      <div class="kb-card" onclick="openKBDoc('${encodeURIComponent(d.path || d.name || d.filename || d.id || '')}')">
        <div class="kb-card-icon"><i data-lucide="file-text" width="20" height="20"></i></div>
        <div class="kb-card-title">${d.title || d.name || d.filename || d.path || '—'}</div>
        <div class="kb-card-desc">${d.description || d.summary || ''}</div>
        <div class="kb-card-meta">
          <span>${d.category || 'doc'}</span>
          <span>${fmtDate(d.updatedAt || d.createdAt)}</span>
        </div>
      </div>`).join('')}
  </div>`;
  lucide.createIcons();
}

async function openKBDoc(name) {
  const r = await apiEco(`/kb/documents/${name}`).catch(() => ({ document: { content: 'Erro ao carregar documento.' } }));
  const doc = r?.document || r?.data || r || {};
  const content = doc.content || '';
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">${doc.title || decodeURIComponent(name)}</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      <pre class="code-block" style="white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.6">${content.replace(/</g,'&lt;')}</pre>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="copyToClipboard(document.querySelector('.modal pre').textContent)">
        <i data-lucide="copy" width="14" height="14"></i> Copiar
      </button>
      <button class="btn btn-primary" onclick="Modal.close()">Fechar</button>
    </div>`, { size: 'xl' });
}

/* ─── PAGE: MEMORY ───────────────────────────────────────────── */
async function pageMemory() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Memória</h1>
        <p class="page-subtitle">MEMORY.md do Claude Code</p>
      </div>
    </div>
    <div class="memory-content">
      <div class="memory-toolbar">
        <span class="text-sm text-muted">MEMORY.md</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="loadMemory()">
            <i data-lucide="refresh-cw" width="14" height="14"></i> Recarregar
          </button>
          <button class="btn btn-primary btn-sm" id="save-mem-btn" onclick="saveMemory()">
            <i data-lucide="save" width="14" height="14"></i> Salvar
          </button>
        </div>
      </div>
      <textarea class="memory-editor" id="memory-editor" placeholder="Carregando..."></textarea>
    </div>`);
  lucide.createIcons();
  await loadMemory();
}

async function loadMemory() {
  const r = await apiEco('/memory').catch(() => ({ data: { content: '' } }));
  const content = r?.data?.content || r?.content || '';
  const el = document.getElementById('memory-editor');
  if (el) el.value = content;
}

async function saveMemory() {
  const btn = document.getElementById('save-mem-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const content = document.getElementById('memory-editor').value;
    await apiEco('/memory', { method: 'PUT', body: JSON.stringify({ content }) });
    Toast.success('Memória salva!');
  } catch (e) { Toast.error(e.message); }
  finally { btn.classList.remove('btn-loading'); btn.disabled = false; }
}

/* ─── PAGE: PROMPTS ──────────────────────────────────────────── */
async function pagePrompts() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Prompts</h1>
        <p class="page-subtitle">Prompts do sistema e configurações</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="modalNewPrompt()">
          <i data-lucide="plus" width="16" height="16"></i> Novo Prompt
        </button>
      </div>
    </div>
    <div id="prompts-content"><div class="loading-state"><div class="spinner"></div></div></div>`);
  lucide.createIcons();
  await loadPrompts();
}

async function loadPrompts() {
  const r = await apiEco('/prompt-templates').catch(() => []);
  const prompts = Array.isArray(r) ? r : (r?.data || r?.prompts || []);
  const el = document.getElementById('prompts-content');

  if (!prompts.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="file-code" width="28" height="28"></i></div>
      <h3>Nenhum prompt</h3>
      <p>Crie prompts personalizados para o sistema.</p>
      <button class="btn btn-primary mt-4" onclick="modalNewPrompt()">Novo Prompt</button>
    </div>`;
    lucide.createIcons();
    return;
  }

  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
    ${prompts.map(p => `
      <div class="prompt-card">
        <div class="prompt-card-header">
          <div class="prompt-name">${p.icon||''} ${p.name || p.title || '—'}</div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-icon btn-ghost btn-sm" onclick="copyToClipboard(document.getElementById('pmt-hidden-${p.id}')?.textContent||'')" data-tooltip="Copiar">
              <i data-lucide="copy" width="14" height="14"></i>
            </button>
            <button class="btn btn-icon btn-ghost btn-sm" onclick="modalEditPrompt('${p.id}')" data-tooltip="Editar">
              <i data-lucide="pencil" width="14" height="14"></i>
            </button>
          </div>
        </div>
        <div class="prompt-preview">${(p.promptText||p.content||'').substring(0,200).replace(/</g,'&lt;')}...</div>
        <span id="pmt-hidden-${p.id}" style="display:none">${(p.promptText||p.content||'').replace(/</g,'&lt;')}</span>
        <div class="prompt-footer">
          <span class="badge badge-sm">${p.category||'geral'}</span>
          <span class="text-xs text-faint">${fmtDate(p.updatedAt)}</span>
          <button class="btn btn-sm btn-ghost" onclick="viewFullPrompt('${p.id}', '${(p.name||'').replace(/'/g,'\\\'')}')" >
            Ver completo <i data-lucide="eye" width="12" height="12"></i>
          </button>
        </div>
      </div>`).join('')}
  </div>`;
  lucide.createIcons();
}

async function viewFullPrompt(id, name) {
  const r = await apiEco(`/prompt-templates/${id}`).catch(() => null);
  const p = r?.data || r || {};
  const text = p.promptText || p.content || '';
  // Detectar variaveis {{var}} no texto
  const vars = [...new Set((text.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/[{}]/g, '')))];
  const hasVars = vars.length > 0;

  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">${p.icon||''} ${name}</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body" style="max-height:65vh;overflow-y:auto">
      ${hasVars ? `
      <div style="margin-bottom:16px;padding:16px;border-radius:12px;background:var(--color-primary)08;border:1px solid var(--color-primary)22">
        <div style="font-weight:600;font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <i data-lucide="sparkles" width="16" height="16" style="color:var(--color-primary)"></i>
          Preencher Variaveis
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
          ${vars.map(v => `
            <div class="form-group" style="margin:0">
              <label class="form-label" style="font-size:12px">{{${v}}}</label>
              <input type="text" class="form-input" id="pvar-${v}" placeholder="${v}" style="font-size:13px" oninput="updatePromptPreview()" />
            </div>`).join('')}
        </div>
      </div>` : ''}
      <pre class="code-block" id="prompt-preview-text" style="white-space:pre-wrap;font-size:13px;line-height:1.6">${text.replace(/</g,'&lt;')}</pre>
      <textarea id="prompt-raw-text" style="display:none">${text.replace(/</g,'&lt;')}</textarea>
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="copyToClipboard(document.getElementById('prompt-preview-text').textContent)">
        <i data-lucide="copy" width="14" height="14"></i> Copiar
      </button>
      ${hasVars ? `<button class="btn btn-success" onclick="executePromptWithVars()">
        <i data-lucide="play" width="14" height="14"></i> Executar
      </button>` : `<button class="btn btn-success" onclick="copyToClipboard(document.getElementById('prompt-preview-text').textContent);Toast.success('Prompt copiado! Cole no Claude.')">
        <i data-lucide="play" width="14" height="14"></i> Executar
      </button>`}
      <button class="btn btn-primary" onclick="Modal.close()">Fechar</button>
    </div>`, { size: 'xl' });
}

function updatePromptPreview() {
  const raw = document.getElementById('prompt-raw-text')?.textContent || '';
  let result = raw;
  const inputs = document.querySelectorAll('[id^="pvar-"]');
  inputs.forEach(inp => {
    const varName = inp.id.replace('pvar-', '');
    const val = inp.value || `{{${varName}}}`;
    result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), val);
  });
  const el = document.getElementById('prompt-preview-text');
  if (el) el.textContent = result;
}

function executePromptWithVars() {
  const text = document.getElementById('prompt-preview-text')?.textContent || '';
  if (text.match(/\{\{\w+\}\}/)) {
    Toast.warning('Preencha todas as variáveis antes de executar.');
    return;
  }
  // Tentar navegar para o chat React com auto-send
  try {
    Modal.close();
    // Se o frontend React está disponível, redirecionar com o prompt
    const chatUrl = `/chat?autoPrompt=${encodeURIComponent(text)}`;
    if (window.location.pathname.startsWith('/app') || document.querySelector('[data-react-root]')) {
      window.location.href = chatUrl;
    } else {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(text).then(() => {
        Toast.success('Prompt copiado! Cole no Chat IA para executar.');
      }).catch(() => {
        Toast.info('Selecione e copie o prompt manualmente.');
      });
    }
  } catch (e) {
    navigator.clipboard.writeText(text).then(() => {
      Toast.success('Prompt copiado! Cole no Chat IA para executar.');
    }).catch(() => {
      Toast.info('Selecione e copie o prompt manualmente.');
    });
  }
}

function modalNewPrompt() { modalPromptForm(); }
async function modalEditPrompt(id) {
  const r = await apiEco(`/prompt-templates/${id}`).catch(() => null);
  const p = r?.data || r || { id };
  if (p.promptText && !p.content) p.content = p.promptText;
  modalPromptForm(p);
}
function modalPromptForm(p = {}) {
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">${p.id ? 'Editar' : 'Novo'} Prompt</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      ${p.id ? `<input type="hidden" id="pmt-id" value="${p.id}" />` : ''}
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="form-input" id="pmt-name" value="${p.name||''}" placeholder="Nome do prompt" />
      </div>
      <div class="form-group">
        <label class="form-label">Conteúdo</label>
        <textarea class="form-textarea" id="pmt-content" rows="8" placeholder="System prompt...">${p.content||''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-pmt-btn" onclick="savePrompt()">Salvar</button>
    </div>`, { size: 'lg' });
}
async function savePrompt() {
  const btn = document.getElementById('save-pmt-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const id = document.getElementById('pmt-id')?.value;
    const body = { name: document.getElementById('pmt-name').value, content: document.getElementById('pmt-content').value };
    if (id) await apiEco(`/prompt-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else await apiEco('/prompt-templates', { method: 'POST', body: JSON.stringify(body) });
    Toast.success('Prompt salvo!');
    Modal.close();
    await loadPrompts();
  } catch (e) { Toast.error(e.message); }
  finally { btn.classList.remove('btn-loading'); btn.disabled = false; }
}

/* ─── PAGE: CREDENTIALS ──────────────────────────────────────── */
async function pageCredentials() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Credenciais</h1>
        <p class="page-subtitle">Cofre de credenciais do ecossistema</p>
      </div>
    </div>
    <div class="alert alert-warning mb-6">
      <i data-lucide="shield-alert" class="alert-icon" width="16" height="16"></i>
      <div class="alert-content">
        <div class="alert-title">Segurança</div>
        As credenciais são exibidas de forma mascarada. Nunca compartilhe ou exporte credenciais.
      </div>
    </div>
    <div id="creds-content"><div class="loading-state"><div class="spinner"></div></div></div>`);
  lucide.createIcons();
  await loadCredentials();
}

async function loadCredentials() {
  const r = await apiEco('/credentials').catch(() => []);
  const items = Array.isArray(r) ? r : (r?.data || []);
  const el = document.getElementById('creds-content');

  if (!items.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="key-round" width="28" height="28"></i></div>
      <h3>Nenhuma credencial</h3>
      <p>As credenciais do vault não estão disponíveis via interface.</p>
    </div>`;
    lucide.createIcons();
    return;
  }

  // Agrupar por categoria
  const grouped = {};
  items.forEach(c => {
    const cat = c.category || 'outros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  });

  const catIcons = { 'meta-ads': 'megaphone', 'shopify': 'shopping-bag', 'google': 'globe', 'evolution-api': 'message-square', 'topaz': 'video' };

  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;align-items:start">
    ${Object.entries(grouped).map(([cat, creds]) => `
      <div class="cred-card">
        <div class="cred-card-header">
          <div class="cred-icon"><i data-lucide="${catIcons[cat]||'key-round'}" width="18" height="18"></i></div>
          <div>
            <div class="cred-name">${cat.toUpperCase()}</div>
            <div class="cred-prefix">${creds.length} credencia${creds.length === 1 ? 'l' : 'is'}</div>
          </div>
        </div>
        ${creds.map(k => `
          <div class="cred-value-row" title="${k.name}: ${k.maskedValue || ''}">
            <span class="cred-value-key">${k.name}</span>
            <span class="cred-value-mask">${k.maskedValue || '•'.repeat(12)}</span>
          </div>`).join('')}
      </div>`).join('')}
  </div>`;
  lucide.createIcons();
}

/* ─── PAGE: TELEGRAM ─────────────────────────────────────────── */
async function pageTelegram() {
  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Telegram Bot</h1>
        <p class="page-subtitle">Integração com Telegram para notificações e comandos</p>
      </div>
    </div>
    <div id="tg-content"><div class="loading-state"><div class="spinner"></div></div></div>`);
  lucide.createIcons();
  await loadTelegramSettings();
}

async function loadTelegramSettings() {
  const r = await apiEco('/telegram/settings').catch(() => ({ data: {} }));
  const s = r?.data || {};
  const isActive = s.botToken && s.enabled;

  document.getElementById('tg-content').innerHTML = `
    <div class="tg-status-card">
      <div class="tg-status-icon"><i data-lucide="bot" width="28" height="28"></i></div>
      <div class="tg-status-info">
        <div class="tg-status-title">${isActive ? 'Bot Ativo' : 'Bot Inativo'}</div>
        <div class="tg-status-desc">${isActive ? `@${s.botUsername || 'bot configurado'} — conectado` : 'Configure o token do bot para ativar'}</div>
      </div>
      <span class="badge ${isActive ? 'badge-green animate-pulse' : 'badge-gray'}">${isActive ? 'Online' : 'Offline'}</span>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="settings" width="18" height="18"></i></div>
        <div><div class="settings-section-title">Configuração</div></div>
      </div>
      <div class="settings-section-body">
        <div class="form-group">
          <label class="form-label">Bot Token</label>
          <div class="input-group">
            <input type="password" class="form-input" id="tg-token" value="${s.botToken||''}" placeholder="123456789:ABCdefGHIjklMNO..." />
            <button type="button" class="input-action" onclick="togglePassVis('tg-token', this)">
              <i data-lucide="eye" width="16" height="16"></i>
            </button>
          </div>
          <div class="form-hint">Obtenha em @BotFather no Telegram</div>
        </div>
        <div class="form-group">
          <label class="form-label">Chat ID (para notificações)</label>
          <input type="text" class="form-input" id="tg-chatid" value="${s.chatId||''}" placeholder="-1001234567890" />
        </div>
        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" id="tg-enabled" ${s.enabled?'checked':''} />
            <div class="form-check-label">Bot habilitado</div>
          </label>
        </div>
        <button class="btn btn-primary" id="save-tg-btn" onclick="saveTelegramSettings()">
          <i data-lucide="save" width="16" height="16"></i> Salvar
        </button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="bell" width="18" height="18"></i></div>
        <div><div class="settings-section-title">Notificações</div></div>
      </div>
      <div class="settings-section-body">
        ${[
          ['tg-notif-new-lead','Novo lead criado'],
          ['tg-notif-lead-reply','Lead respondeu'],
          ['tg-notif-msg-sent','Mensagem enviada'],
          ['tg-notif-campaign','Campanha iniciada'],
        ].map(([id, label]) => `
          <div class="form-group">
            <label class="form-check">
              <input type="checkbox" id="${id}" ${(s.notifications||{})[id.replace('tg-notif-','')] !== false ? 'checked' : ''} />
              <div class="form-check-label">${label}</div>
            </label>
          </div>`).join('')}
      </div>
    </div>

    ${isActive ? `
    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon"><i data-lucide="terminal" width="18" height="18"></i></div>
        <div><div class="settings-section-title">Enviar Mensagem de Teste</div></div>
      </div>
      <div class="settings-section-body">
        <div class="form-group">
          <textarea class="form-textarea" id="tg-test-msg" rows="3" placeholder="Mensagem de teste...">🤖 Teste do Claude Code Ecosystem — ${new Date().toLocaleString('pt-BR')}</textarea>
        </div>
        <button class="btn btn-secondary" onclick="sendTelegramTest()">
          <i data-lucide="send" width="16" height="16"></i> Enviar Teste
        </button>
      </div>
    </div>` : ''}`;
  lucide.createIcons();
}

async function saveTelegramSettings() {
  const btn = document.getElementById('save-tg-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    const body = {
      botToken: document.getElementById('tg-token').value.trim(),
      chatId: document.getElementById('tg-chatid').value.trim(),
      enabled: document.getElementById('tg-enabled').checked,
    };
    await apiEco('/telegram/settings', { method: 'POST', body: JSON.stringify(body) });
    Toast.success('Configurações do Telegram salvas!');
    await loadTelegramSettings();
  } catch (e) { Toast.error(e.message); }
  finally { btn.classList.remove('btn-loading'); btn.disabled = false; }
}

async function sendTelegramTest() {
  const msg = document.getElementById('tg-test-msg').value.trim();
  if (!msg) return;
  await apiEco('/telegram/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
  Toast.success('Mensagem enviada!');
}

/* ─── PAGE: CAMPAIGNS ────────────────────────────────────────── */
async function pageCampaigns() {
  console.log('[pageCampaigns] INICIO');

  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Campanhas</h1>
        <p class="page-subtitle">Gerencie campanhas de prospecção</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="pageCampaigns()">
          <i data-lucide="refresh-cw" width="16" height="16"></i> Atualizar
        </button>
        <button class="btn btn-primary" onclick="modalNewCampaign()">
          <i data-lucide="plus" width="16" height="16"></i> Nova Campanha
        </button>
      </div>
    </div>
    <div id="campaigns-content">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>`);

  lucide.createIcons();
  await loadCampaigns();
}

async function loadCampaigns() {
  console.log('[loadCampaigns] Carregando campanhas');
  const el = document.getElementById('campaigns-content');
  try {
    const r = await http.get('/campaigns');
    const campaigns = r?.data || [];

    console.log('[loadCampaigns] FIM', { total: campaigns.length });

    if (!campaigns.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="megaphone" width="28" height="28"></i></div>
        <h3>Nenhuma campanha</h3>
        <p>Crie uma campanha para automatizar sua prospecção.</p>
        <button class="btn btn-primary mt-4" onclick="modalNewCampaign()">Nova Campanha</button>
      </div>`;
      lucide.createIcons();
      return;
    }

    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Canal</th>
              <th>Status</th>
              <th>Leads</th>
              <th>Criada</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            ${campaigns.map(c => `
              <tr>
                <td>
                  <a href="#/campaigns/${c.id}" style="font-weight:500;color:var(--color-text)">${c.name || '—'}</a>
                  ${c.description ? `<div class="text-xs text-muted mt-1">${c.description.substring(0, 60)}${c.description.length > 60 ? '...' : ''}</div>` : ''}
                </td>
                <td>${campaignChannelBadge(c.channel)}</td>
                <td>${campaignStatusBadge(c.status)}</td>
                <td><span class="badge badge-gray">${c._count?.leads ?? c.leadsCount ?? '—'}</span></td>
                <td class="text-muted text-sm">${fmtDate(c.createdAt)}</td>
                <td>
                  <div class="td-actions">
                    <a href="#/campaigns/${c.id}" class="btn btn-icon btn-ghost btn-sm" data-tooltip="Ver detalhe">
                      <i data-lucide="eye" width="15" height="15"></i>
                    </a>
                    <button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Editar" onclick="modalEditCampaign('${c.id}')">
                      <i data-lucide="pencil" width="15" height="15"></i>
                    </button>
                    ${c.status === 'active'
                      ? `<button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Pausar" onclick="pauseCampaign('${c.id}')">
                           <i data-lucide="pause" width="15" height="15"></i>
                         </button>`
                      : `<button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Iniciar" onclick="startCampaign('${c.id}')">
                           <i data-lucide="play" width="15" height="15"></i>
                         </button>`
                    }
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    lucide.createIcons();
  } catch (e) {
    console.error('[loadCampaigns] ERRO', e);
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="alert-triangle" width="28" height="28"></i></div>
      <h3>Erro ao carregar campanhas</h3>
      <p>${e.message}</p>
      <button class="btn btn-primary mt-4" onclick="loadCampaigns()">Tentar novamente</button>
    </div>`;
    lucide.createIcons();
  }
}

function campaignStatusBadge(status) {
  const map = {
    draft:     ['Rascunho',  'badge-gray'],
    active:    ['Ativa',     'badge-green'],
    paused:    ['Pausada',   'badge-yellow'],
    completed: ['Concluida', 'badge-blue'],
  };
  const [label, cls] = map[status] || [status || '—', 'badge-gray'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function campaignChannelBadge(channel) {
  const map = {
    whatsapp: ['<i data-lucide="message-circle" width="12" height="12"></i> WhatsApp', 'badge-green'],
    email:    ['<i data-lucide="mail" width="12" height="12"></i> Email',    'badge-blue'],
  };
  const [label, cls] = map[channel] || [channel || '—', 'badge-gray'];
  return `<span class="badge ${cls}" style="display:inline-flex;align-items:center;gap:4px">${label}</span>`;
}

function modalNewCampaign() {
  console.log('[modalNewCampaign] Abrindo modal');
  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Nova Campanha</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--color-danger)">*</span></label>
        <input type="text" class="form-input" id="camp-name" placeholder="Nome da campanha" />
      </div>
      <div class="form-group">
        <label class="form-label">Descricao</label>
        <textarea class="form-textarea" id="camp-desc" rows="3" placeholder="Descreva o objetivo desta campanha..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Canal</label>
        <select class="form-select" id="camp-channel">
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-camp-btn" onclick="saveCampaign()">
        <i data-lucide="save" width="16" height="16"></i> Criar Campanha
      </button>
    </div>`);
}

async function modalEditCampaign(id) {
  console.log('[modalEditCampaign] INICIO', { id });
  try {
    const r = await http.get(`/campaigns/${id}`);
    const c = r?.data || r || {};
    Modal.open(`
      <div class="modal-header">
        <h3 class="modal-title">Editar Campanha</h3>
        <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="camp-id" value="${id}" />
        <div class="form-group">
          <label class="form-label">Nome <span style="color:var(--color-danger)">*</span></label>
          <input type="text" class="form-input" id="camp-name" value="${c.name || ''}" placeholder="Nome da campanha" />
        </div>
        <div class="form-group">
          <label class="form-label">Descricao</label>
          <textarea class="form-textarea" id="camp-desc" rows="3" placeholder="Descreva o objetivo desta campanha...">${c.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Canal</label>
          <select class="form-select" id="camp-channel">
            <option value="whatsapp" ${c.channel === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
            <option value="email" ${c.channel === 'email' ? 'selected' : ''}>Email</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" id="save-camp-btn" onclick="saveCampaign(true)">
          <i data-lucide="save" width="16" height="16"></i> Salvar
        </button>
      </div>`);
  } catch (e) {
    console.error('[modalEditCampaign] ERRO', e);
    Toast.error(e.message);
  }
}

async function saveCampaign(isEdit = false) {
  console.log('[saveCampaign] INICIO', { isEdit });
  const btn = document.getElementById('save-camp-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
  try {
    const name = document.getElementById('camp-name')?.value?.trim();
    if (!name) { Toast.warning('Nome e obrigatorio'); return; }
    const body = {
      name,
      description: document.getElementById('camp-desc')?.value?.trim() || '',
      channel:     document.getElementById('camp-channel')?.value || 'whatsapp',
    };
    if (isEdit) {
      const id = document.getElementById('camp-id')?.value;
      await http.put(`/campaigns/${id}`, body);
      console.log('[saveCampaign] Campanha atualizada', { id });
      Toast.success('Campanha atualizada!');
    } else {
      const r = await http.post('/campaigns', body);
      console.log('[saveCampaign] Campanha criada', { id: r?.data?.id });
      Toast.success('Campanha criada!');
    }
    Modal.close();
    await loadCampaigns();
  } catch (e) {
    console.error('[saveCampaign] ERRO', e);
    Toast.error(e.message);
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

async function startCampaign(id) {
  console.log('[startCampaign] INICIO', { id });
  try {
    await http.post(`/campaigns/${id}/start`, {});
    Toast.success('Campanha iniciada!');
    console.log('[startCampaign] Campanha iniciada', { id });
    // Recarregar a pagina atual (lista ou detalhe)
    if (State.currentRoute === '/campaigns') {
      await loadCampaigns();
    } else {
      await pageCampaignDetail({ id });
    }
  } catch (e) {
    console.error('[startCampaign] ERRO', e);
    Toast.error(e.message);
  }
}

async function pauseCampaign(id) {
  console.log('[pauseCampaign] INICIO', { id });
  try {
    await http.post(`/campaigns/${id}/pause`, {});
    Toast.success('Campanha pausada!');
    console.log('[pauseCampaign] Campanha pausada', { id });
    if (State.currentRoute === '/campaigns') {
      await loadCampaigns();
    } else {
      await pageCampaignDetail({ id });
    }
  } catch (e) {
    console.error('[pauseCampaign] ERRO', e);
    Toast.error(e.message);
  }
}

/* ─── PAGE: CAMPAIGN DETAIL ───────────────────────────────────── */
async function pageCampaignDetail({ id }) {
  console.log('[pageCampaignDetail] INICIO', { id });

  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <a href="#/campaigns" class="btn btn-ghost btn-sm" style="margin-bottom:8px">
          <i data-lucide="arrow-left" width="16" height="16"></i> Voltar
        </a>
        <h1 class="page-title" id="camp-detail-title">Carregando...</h1>
        <p class="page-subtitle" id="camp-detail-sub"></p>
      </div>
      <div class="page-header-actions" id="camp-detail-actions"></div>
    </div>
    <div id="camp-detail-content">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>`);
  lucide.createIcons();

  try {
    const [campRes, statsRes] = await Promise.allSettled([
      http.get(`/campaigns/${id}`),
      http.get(`/campaigns/${id}/stats`).catch(() => ({ data: {} })),
    ]);

    const c = campRes.value?.data || campRes.value || {};
    const stats = statsRes.value?.data || {};
    const steps = c.steps || [];
    const leads = c.leads || [];
    // Armazenar steps para uso seguro nos onclicks sem JSON inline
    window._campaignSteps = steps;

    console.log('[pageCampaignDetail] Dados carregados', {
      id,
      nome: c.name,
      steps: steps.length,
      leads: leads.length,
      stats,
    });

    // Atualizar header
    const titleEl = document.getElementById('camp-detail-title');
    const subEl = document.getElementById('camp-detail-sub');
    const actionsEl = document.getElementById('camp-detail-actions');
    if (titleEl) titleEl.innerHTML = `${c.name || 'Campanha'} ${campaignStatusBadge(c.status)}`;
    if (subEl) subEl.textContent = c.description || '';
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="btn btn-secondary" onclick="modalEditCampaign('${id}')">
          <i data-lucide="pencil" width="16" height="16"></i> Editar
        </button>
        ${c.status === 'active'
          ? `<button class="btn btn-warning" onclick="pauseCampaign('${id}')">
               <i data-lucide="pause" width="16" height="16"></i> Pausar
             </button>`
          : `<button class="btn btn-success" onclick="startCampaign('${id}')">
               <i data-lucide="play" width="16" height="16"></i> Iniciar
             </button>`
        }`;
      lucide.createIcons();
    }

    // Renderizar conteudo
    const el = document.getElementById('camp-detail-content');
    el.innerHTML = `
      <div class="campaign-detail-grid">

        <!-- Stats -->
        <div class="stats-grid" style="grid-column:1/-1">
          <div class="stat-card">
            <div class="stat-icon blue"><i data-lucide="users" width="20" height="20"></i></div>
            <div class="stat-info">
              <div class="stat-value">${fmt(stats.totalLeads ?? leads.length ?? 0)}</div>
              <div class="stat-label">Leads na campanha</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i data-lucide="send" width="20" height="20"></i></div>
            <div class="stat-info">
              <div class="stat-value">${fmt(stats.messagesSent ?? 0)}</div>
              <div class="stat-label">Mensagens enviadas</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow"><i data-lucide="reply" width="20" height="20"></i></div>
            <div class="stat-info">
              <div class="stat-value">${fmt(stats.replies ?? 0)}</div>
              <div class="stat-label">Respostas</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon cyan"><i data-lucide="list-checks" width="20" height="20"></i></div>
            <div class="stat-info">
              <div class="stat-value">${steps.length}</div>
              <div class="stat-label">Steps configurados</div>
            </div>
          </div>
        </div>

        <!-- Steps -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <i data-lucide="list-ordered" width="16" height="16"></i>
              Steps da Campanha
            </h3>
            <button class="btn btn-sm btn-primary" onclick="modalAddCampaignStep('${id}')">
              <i data-lucide="plus" width="14" height="14"></i> Adicionar Step
            </button>
          </div>
          ${steps.length ? `
            <div class="steps-list">
              ${steps.map((s, i) => `
                <div class="step-item">
                  <div class="step-number">${s.order ?? i + 1}</div>
                  <div class="step-body">
                    <div class="step-header">
                      <span class="step-channel">${campaignChannelBadge(s.channel || c.channel)}</span>
                      ${s.delayDays ? `<span class="badge badge-gray"><i data-lucide="clock" width="10" height="10"></i> ${s.delayDays}d de delay</span>` : ''}
                      ${s.condition && s.condition !== 'none' ? `<span class="badge badge-yellow">${s.condition === 'replied' ? 'Se respondeu' : 'Se nao respondeu'}</span>` : ''}
                    </div>
                    ${s.subject ? `<div class="step-subject">Assunto: <em>${s.subject}</em></div>` : ''}
                    <div class="step-template">${(s.template || '').substring(0, 120)}${(s.template || '').length > 120 ? '...' : ''}</div>
                  </div>
                </div>`).join('')}
            </div>` : `
            <div class="empty-state" style="min-height:120px">
              <p class="text-faint text-sm">Nenhum step configurado. Adicione passos para automatizar o envio.</p>
            </div>`}
        </div>

        <!-- Leads -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <i data-lucide="users" width="16" height="16"></i>
              Leads
              <span class="badge badge-gray">${leads.length}</span>
            </h3>
            <button class="btn btn-sm btn-primary" onclick="modalAddCampaignLeads('${id}')">
              <i data-lucide="user-plus" width="14" height="14"></i> Adicionar Leads
            </button>
          </div>
          ${leads.length ? `
            <div class="table-wrapper" style="max-height:360px;overflow-y:auto">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Status</th>
                    <th>Step atual</th>
                    <th>Ultimo envio</th>
                  </tr>
                </thead>
                <tbody>
                  ${leads.map(l => {
                    const lead = l.lead || l;
                    const enrollment = l.currentStep !== undefined ? l : {};
                    return `
                    <tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <div class="avatar avatar-sm" style="background:${avatarColor(lead.name)}">${initials(lead.name)}</div>
                          <a href="#/leads/${lead.id}" style="color:var(--color-text);font-weight:500">${lead.name || '—'}</a>
                        </div>
                      </td>
                      <td>${statusBadge(lead.status || enrollment.status)}</td>
                      <td><span class="badge badge-gray">Step ${enrollment.currentStep ?? '—'}</span></td>
                      <td class="text-muted text-sm">${fmtRelative(enrollment.lastSentAt || lead.updatedAt)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : `
            <div class="empty-state" style="min-height:120px">
              <p class="text-faint text-sm">Nenhum lead nesta campanha.</p>
            </div>`}
        </div>

      </div>`;
    lucide.createIcons();
  } catch (e) {
    console.error('[pageCampaignDetail] ERRO', e);
    document.getElementById('camp-detail-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="alert-triangle" width="28" height="28"></i></div>
        <h3>Erro ao carregar campanha</h3>
        <p>${e.message}</p>
        <button class="btn btn-primary mt-4" onclick="pageCampaignDetail({id:'${id}'})">Tentar novamente</button>
      </div>`;
    lucide.createIcons();
  }
}

function modalAddCampaignStep(campaignId, existingSteps) {
  // Preferir valor passado por parametro; fallback para window._campaignSteps
  if (existingSteps === undefined) existingSteps = window._campaignSteps || [];
  console.log('[modalAddCampaignStep] INICIO', { campaignId, stepsCount: existingSteps.length });

  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Adicionar Step</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Canal</label>
          <select class="form-select" id="step-channel">
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Delay (dias)</label>
          <input type="number" class="form-input" id="step-delay" value="0" min="0" placeholder="0" />
        </div>
      </div>
      <div class="form-group" id="step-subject-group" style="display:none">
        <label class="form-label">Assunto (email)</label>
        <input type="text" class="form-input" id="step-subject" placeholder="Assunto do email" />
      </div>
      <div class="form-group">
        <label class="form-label">Template / Mensagem <span style="color:var(--color-danger)">*</span></label>
        <textarea class="form-textarea" id="step-template" rows="5" placeholder="Ola {{nome}}, tudo bem?&#10;&#10;Sou da empresa..."></textarea>
        <div class="form-hint">Use {{nome}}, {{empresa}}, {{telefone}} para variaveis do lead.</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Condicao</label>
          <select class="form-select" id="step-condition">
            <option value="none">Nenhuma</option>
            <option value="replied">Se respondeu</option>
            <option value="not_replied">Se nao respondeu</option>
          </select>
        </div>
        <div class="form-group" id="step-cond-value-group" style="display:none">
          <label class="form-label">Valor da condicao</label>
          <input type="text" class="form-input" id="step-cond-value" placeholder="valor..." />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Proximo step se match</label>
          <input type="number" class="form-input" id="step-next-match" placeholder="Ex: 2" min="1" />
        </div>
        <div class="form-group">
          <label class="form-label">Proximo step se no-match</label>
          <input type="number" class="form-input" id="step-next-nomatch" placeholder="Ex: 3" min="1" />
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-step-btn" onclick="saveCampaignStep('${campaignId}')">
        <i data-lucide="save" width="16" height="16"></i> Salvar Step
      </button>
    </div>`, { size: 'md' });

  // Mostrar/ocultar assunto por canal
  const channelSel = document.getElementById('step-channel');
  const subjectGrp = document.getElementById('step-subject-group');
  channelSel?.addEventListener('change', () => {
    subjectGrp.style.display = channelSel.value === 'email' ? '' : 'none';
  });

  // Mostrar valor da condicao
  const condSel = document.getElementById('step-condition');
  const condValGrp = document.getElementById('step-cond-value-group');
  condSel?.addEventListener('change', () => {
    condValGrp.style.display = condSel.value !== 'none' ? '' : 'none';
  });
}

async function saveCampaignStep(campaignId, existingSteps) {
  // Fallback para steps armazenados no estado global
  if (existingSteps === undefined) existingSteps = window._campaignSteps || [];
  console.log('[saveCampaignStep] INICIO', { campaignId });
  const btn = document.getElementById('save-step-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
  try {
    const template = document.getElementById('step-template')?.value?.trim();
    if (!template) { Toast.warning('Template e obrigatorio'); return; }

    const condition = document.getElementById('step-condition')?.value || 'none';
    const newStep = {
      order:            existingSteps.length + 1,
      channel:          document.getElementById('step-channel')?.value || 'whatsapp',
      template,
      subject:          document.getElementById('step-subject')?.value?.trim() || null,
      delayDays:        parseInt(document.getElementById('step-delay')?.value || '0') || 0,
      condition:        condition === 'none' ? null : condition,
      conditionValue:   condition !== 'none' ? (document.getElementById('step-cond-value')?.value?.trim() || null) : null,
      nextStepOnMatch:  parseInt(document.getElementById('step-next-match')?.value || '') || null,
      nextStepOnNoMatch:parseInt(document.getElementById('step-next-nomatch')?.value || '') || null,
    };
    const allSteps = [...existingSteps, newStep];

    console.log('[saveCampaignStep] Salvando steps', { total: allSteps.length, newStep });

    await http.post(`/campaigns/${campaignId}/steps`, { steps: allSteps });
    Toast.success('Step adicionado!');
    Modal.close();
    await pageCampaignDetail({ id: campaignId });
  } catch (e) {
    console.error('[saveCampaignStep] ERRO', e);
    Toast.error(e.message);
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

function modalAddCampaignLeads(campaignId) {
  console.log('[modalAddCampaignLeads] INICIO', { campaignId });

  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">Adicionar Leads a Campanha</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="search-box mb-4">
        <i data-lucide="search" width="16" height="16"></i>
        <input type="search" id="camp-lead-search" placeholder="Buscar leads..." />
      </div>
      <div id="camp-leads-list" style="max-height:320px;overflow-y:auto">
        <div class="loading-state" style="min-height:120px"><div class="spinner"></div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="add-leads-btn" onclick="addLeadsToCampaign('${campaignId}')">
        <i data-lucide="user-plus" width="16" height="16"></i> Adicionar Selecionados
      </button>
    </div>`, { size: 'md' });

  lucide.createIcons();
  window._campLeadsSelected = new Set();

  const searchInput = document.getElementById('camp-lead-search');
  const dSearch = debounce(q => loadCampaignLeadSearch(q));
  searchInput?.addEventListener('input', e => dSearch(e.target.value));

  loadCampaignLeadSearch('');
}

async function loadCampaignLeadSearch(query) {
  console.log('[loadCampaignLeadSearch] query:', query);
  const el = document.getElementById('camp-leads-list');
  if (!el) return;
  try {
    const r = await http.get(`/leads?limit=30${query ? '&search=' + encodeURIComponent(query) : ''}`);
    const leads = r?.data?.leads || r?.data || [];
    if (!leads.length) {
      el.innerHTML = '<p class="text-faint text-sm" style="padding:16px">Nenhum lead encontrado.</p>';
      return;
    }
    el.innerHTML = leads.map(l => `
      <label class="camp-lead-row" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;transition:background .15s">
        <input type="checkbox" class="camp-lead-chk" data-id="${l.id}"
          ${(window._campLeadsSelected || new Set()).has(l.id) ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--color-blue);cursor:pointer" />
        <div class="avatar avatar-sm" style="background:${avatarColor(l.name)}">${initials(l.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:14px">${l.name || '—'}</div>
          <div class="text-xs text-muted">${l.company || l.phone || l.email || '—'}</div>
        </div>
        ${statusBadge(l.status)}
      </label>`).join('');

    // Bind checkboxes
    el.querySelectorAll('.camp-lead-chk').forEach(chk => {
      chk.addEventListener('change', e => {
        if (!window._campLeadsSelected) window._campLeadsSelected = new Set();
        const lid = e.target.dataset.id;
        if (e.target.checked) window._campLeadsSelected.add(lid);
        else window._campLeadsSelected.delete(lid);
        console.log('[camp-lead-chk] changed', { lid, total: window._campLeadsSelected.size });
      });
      chk.closest('label')?.addEventListener('mouseenter', () => {
        chk.closest('label').style.background = 'var(--color-surface-2)';
      });
      chk.closest('label')?.addEventListener('mouseleave', () => {
        chk.closest('label').style.background = '';
      });
    });
  } catch (e) {
    console.error('[loadCampaignLeadSearch] ERRO', e);
    el.innerHTML = `<p class="text-faint text-sm" style="padding:16px">${e.message}</p>`;
  }
}

async function addLeadsToCampaign(campaignId) {
  const selected = window._campLeadsSelected || new Set();
  if (!selected.size) { Toast.warning('Selecione ao menos um lead'); return; }

  console.log('[addLeadsToCampaign] INICIO', { campaignId, leads: [...selected] });
  const btn = document.getElementById('add-leads-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
  try {
    await http.post(`/campaigns/${campaignId}/leads`, { leadIds: [...selected] });
    Toast.success(`${selected.size} lead${selected.size > 1 ? 's' : ''} adicionado${selected.size > 1 ? 's' : ''}!`);
    Modal.close();
    await pageCampaignDetail({ id: campaignId });
  } catch (e) {
    console.error('[addLeadsToCampaign] ERRO', e);
    Toast.error(e.message);
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

/* ─── PAGE: TEMPLATES ────────────────────────────────────────── */
async function pageTemplates() {
  console.log('[pageTemplates] INICIO');

  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Templates</h1>
        <p class="page-subtitle">Gerencie templates de mensagens para campanhas e prospecção</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="pageTemplates()">
          <i data-lucide="refresh-cw" width="16" height="16"></i> Atualizar
        </button>
        <button class="btn btn-primary" onclick="modalNewTemplate()">
          <i data-lucide="plus" width="16" height="16"></i> Novo Template
        </button>
      </div>
    </div>
    <div id="templates-content">
      ${skeletonCard(6)}
    </div>`);

  lucide.createIcons();
  await loadTemplates();
}

async function loadTemplates() {
  console.log('[loadTemplates] Carregando templates');
  const el = document.getElementById('templates-content');
  try {
    const r = await http.get('/templates');
    const templates = r?.data || [];

    console.log('[loadTemplates] FIM', { total: templates.length });

    if (!templates.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="file-text" width="28" height="28"></i></div>
        <h3>Nenhum template</h3>
        <p>Crie templates para reutilizar em campanhas e prospecções.</p>
        <button class="btn btn-primary mt-4" onclick="modalNewTemplate()">Novo Template</button>
      </div>`;
      lucide.createIcons();
      return;
    }

    el.innerHTML = `
      <div class="templates-grid">
        ${templates.map(t => `
          <div class="template-card">
            <div class="template-card-header">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                <div class="template-icon ${t.channel === 'email' ? 'email' : 'whatsapp'}">
                  <i data-lucide="${t.channel === 'email' ? 'mail' : 'message-circle'}" width="16" height="16"></i>
                </div>
                <div class="template-name">${t.name || '—'}</div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Editar" onclick="modalEditTemplate('${t.id}')">
                  <i data-lucide="pencil" width="14" height="14"></i>
                </button>
                <button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Excluir" onclick="confirmDeleteTemplate('${t.id}', '${(t.name||'').replace(/'/g,'\\\'')}')" style="color:var(--color-danger)">
                  <i data-lucide="trash-2" width="14" height="14"></i>
                </button>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:10px">
              ${campaignChannelBadge(t.channel)}
              ${t.category ? `<span class="badge badge-gray">${t.category}</span>` : ''}
            </div>
            ${t.subject ? `<div class="template-subject">Assunto: <em>${t.subject}</em></div>` : ''}
            <div class="template-preview">${(t.content || '').substring(0, 150)}${(t.content || '').length > 150 ? '...' : ''}</div>
            <div class="template-footer">
              <span class="text-xs text-faint">${fmtDate(t.updatedAt || t.createdAt)}</span>
              <button class="btn btn-xs btn-ghost" onclick="modalEditTemplate('${t.id}')">
                Ver completo <i data-lucide="eye" width="11" height="11"></i>
              </button>
            </div>
          </div>`).join('')}
      </div>`;
    lucide.createIcons();
  } catch (e) {
    console.error('[loadTemplates] ERRO', e);
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i data-lucide="alert-triangle" width="28" height="28"></i></div>
      <h3>Erro ao carregar templates</h3>
      <p>${e.message}</p>
      <button class="btn btn-primary mt-4" onclick="loadTemplates()">Tentar novamente</button>
    </div>`;
    lucide.createIcons();
  }
}

// Variaveis de exemplo para preview
const _previewVars = {
  nome:     'Joao Silva',
  empresa:  'Empresa ABC',
  telefone: '+55 11 99999-9999',
  email:    'joao@empresa.com',
  position: 'CEO',
};

function applyPreviewVars(text) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => _previewVars[key] || `{{${key}}}`);
}

function renderTemplatePreview(content, channel, subject) {
  const previewContent = applyPreviewVars(content || '');
  const previewSubject = applyPreviewVars(subject || '');
  const lines = previewContent.replace(/</g, '&lt;').replace(/\n/g, '<br>');

  if (channel === 'email') {
    return `
      <div class="tmpl-preview-email">
        ${previewSubject ? `<div class="tmpl-preview-subject"><strong>Assunto:</strong> ${previewSubject.replace(/</g,'&lt;')}</div>` : ''}
        <div class="tmpl-preview-email-body">${lines || '<span style="opacity:.4">Nenhum conteudo ainda...</span>'}</div>
      </div>`;
  }
  return `
    <div class="tmpl-preview-wpp">
      <div class="tmpl-preview-bubble">${lines || '<span style="opacity:.4">Nenhum conteudo ainda...</span>'}</div>
      <div class="tmpl-preview-time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
    </div>`;
}

function openTemplateModal(t = {}) {
  const isEdit = !!t.id;
  console.log('[openTemplateModal] INICIO', { isEdit, id: t.id });

  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">${isEdit ? 'Editar' : 'Novo'} Template</h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      ${isEdit ? `<input type="hidden" id="tmpl-id" value="${t.id}" />` : ''}
      <div class="template-split">
        <!-- Formulario -->
        <div class="template-form-col">
          <div class="form-group">
            <label class="form-label">Nome <span style="color:var(--color-danger)">*</span></label>
            <input type="text" class="form-input" id="tmpl-name" value="${t.name || ''}" placeholder="Nome do template" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Canal</label>
              <select class="form-select" id="tmpl-channel">
                <option value="whatsapp" ${t.channel === 'whatsapp' || !t.channel ? 'selected' : ''}>WhatsApp</option>
                <option value="email" ${t.channel === 'email' ? 'selected' : ''}>Email</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <input type="text" class="form-input" id="tmpl-category" value="${t.category || ''}" placeholder="prospeccao, follow-up..." />
            </div>
          </div>
          <div class="form-group" id="tmpl-subject-group" style="${t.channel === 'email' ? '' : 'display:none'}">
            <label class="form-label">Assunto (email)</label>
            <input type="text" class="form-input" id="tmpl-subject" value="${t.subject || ''}" placeholder="Assunto do email" />
          </div>
          <div class="form-group">
            <label class="form-label">Conteudo <span style="color:var(--color-danger)">*</span></label>
            <textarea class="form-textarea" id="tmpl-content" rows="10" placeholder="Ola {{nome}}, tudo bem?...">${t.content || ''}</textarea>
            <div class="form-hint">Variaveis: {{nome}} {{empresa}} {{telefone}} {{email}} {{position}}</div>
          </div>
        </div>
        <!-- Preview -->
        <div class="template-preview-col">
          <div class="template-preview-header">
            <i data-lucide="eye" width="14" height="14"></i>
            Preview ao vivo
          </div>
          <div id="tmpl-live-preview" class="tmpl-live-preview">
            ${renderTemplatePreview(t.content, t.channel, t.subject)}
          </div>
          <div class="template-vars-info">
            <div class="template-vars-title">Valores de exemplo usados:</div>
            <div class="template-vars-list">
              ${Object.entries(_previewVars).map(([k, v]) =>
                `<span class="template-var-chip"><code>{{${k}}}</code> = ${v}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-tmpl-btn" onclick="saveTemplate()">
        <i data-lucide="save" width="16" height="16"></i> Salvar
      </button>
    </div>`, { size: 'xl' });

  // Mostrar/ocultar assunto por canal
  const channelSel = document.getElementById('tmpl-channel');
  const subjectGrp = document.getElementById('tmpl-subject-group');
  channelSel?.addEventListener('change', () => {
    subjectGrp.style.display = channelSel.value === 'email' ? '' : 'none';
    updateLivePreview();
  });

  // Preview ao vivo com debounce
  const dPreview = debounce(updateLivePreview, 300);
  document.getElementById('tmpl-content')?.addEventListener('input', dPreview);
  document.getElementById('tmpl-subject')?.addEventListener('input', dPreview);
}

function updateLivePreview() {
  const content  = document.getElementById('tmpl-content')?.value || '';
  const channel  = document.getElementById('tmpl-channel')?.value || 'whatsapp';
  const subject  = document.getElementById('tmpl-subject')?.value || '';
  const previewEl = document.getElementById('tmpl-live-preview');
  if (previewEl) {
    previewEl.innerHTML = renderTemplatePreview(content, channel, subject);
    lucide.createIcons();
  }
  console.log('[updateLivePreview] Preview atualizado', {
    channel,
    contentLength: content.length,
  });
}

function modalNewTemplate() {
  openTemplateModal();
}

async function modalEditTemplate(id) {
  console.log('[modalEditTemplate] INICIO', { id });
  try {
    const r = await http.get(`/templates/${id}`);
    const t = r?.data || r || {};
    openTemplateModal(t);
  } catch (e) {
    console.error('[modalEditTemplate] ERRO', e);
    Toast.error(e.message);
  }
}

async function saveTemplate() {
  console.log('[saveTemplate] INICIO');
  const btn = document.getElementById('save-tmpl-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
  try {
    const id = document.getElementById('tmpl-id')?.value;
    const name = document.getElementById('tmpl-name')?.value?.trim();
    if (!name) { Toast.warning('Nome e obrigatorio'); return; }
    const content = document.getElementById('tmpl-content')?.value?.trim();
    if (!content) { Toast.warning('Conteudo e obrigatorio'); return; }
    const channel = document.getElementById('tmpl-channel')?.value || 'whatsapp';

    const body = {
      name,
      channel,
      category: document.getElementById('tmpl-category')?.value?.trim() || '',
      subject:  channel === 'email' ? (document.getElementById('tmpl-subject')?.value?.trim() || '') : '',
      content,
    };

    console.log('[saveTemplate] Dados coletados', { id, ...body });

    if (id) {
      await http.put(`/templates/${id}`, body);
      Toast.success('Template atualizado!');
    } else {
      await http.post('/templates', body);
      Toast.success('Template criado!');
    }
    Modal.close();
    await loadTemplates();
  } catch (e) {
    console.error('[saveTemplate] ERRO', e);
    Toast.error(e.message);
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

function confirmDeleteTemplate(id, name) {
  Modal.confirm(
    `Excluir o template <strong>${name}</strong>? Esta acao nao pode ser desfeita.`,
    async () => {
      console.log('[confirmDeleteTemplate] Excluindo', { id, name });
      try {
        await http.del(`/templates/${id}`);
        Toast.success('Template excluido!');
        await loadTemplates();
      } catch (e) {
        console.error('[confirmDeleteTemplate] ERRO', e);
        Toast.error(e.message);
      }
    },
    { title: 'Excluir Template', confirmText: 'Excluir' }
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE: SKELETON LOADERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Gera N cards skeleton para grids de cards
 * @param {number} count
 * @returns {string} HTML
 */
function skeletonCard(count = 3) {
  console.log('[skeletonCard] Gerando', count, 'skeletons');
  const cards = Array.from({ length: count }, () => `
    <div class="card" style="padding:var(--space-5)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div class="skeleton" style="width:36px;height:36px;border-radius:8px;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton skeleton-text" style="width:55%"></div>
          <div class="skeleton skeleton-text-sm" style="width:35%;margin-top:6px"></div>
        </div>
      </div>
      <div class="skeleton skeleton-text" style="width:90%"></div>
      <div class="skeleton skeleton-text" style="width:75%;margin-top:6px"></div>
      <div class="skeleton skeleton-text-sm" style="width:40%;margin-top:12px"></div>
    </div>`).join('');
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${cards}</div>`;
}

/**
 * Gera uma tabela skeleton com N linhas e C colunas
 * @param {number} rows
 * @param {number} cols
 * @returns {string} HTML
 */
function skeletonTable(rows = 5, cols = 6) {
  console.log('[skeletonTable] Gerando tabela skeleton', { rows, cols });
  const headerCells = Array.from({ length: cols }, (_, i) =>
    `<th><div class="skeleton" style="width:${i === 0 ? 24 : 60 + Math.random() * 40 | 0}px;height:12px"></div></th>`
  ).join('');
  const bodyRows = Array.from({ length: rows }, () => {
    const cells = Array.from({ length: cols }, (_, i) => {
      if (i === 0) return `<td><div class="skeleton" style="width:16px;height:16px;border-radius:3px"></div></td>`;
      if (i === 1) return `<td><div style="display:flex;align-items:center;gap:10px">
        <div class="skeleton skeleton-avatar" style="width:28px;height:28px"></div>
        <div class="skeleton skeleton-text" style="width:90px"></div>
      </div></td>`;
      return `<td><div class="skeleton skeleton-text" style="width:${50 + Math.random() * 60 | 0}px"></div></td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `
    <div class="table-wrapper">
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

/**
 * Gera N itens de lista skeleton (estilo conv-item)
 * @param {number} count
 * @returns {string} HTML
 */
function skeletonList(count = 5) {
  console.log('[skeletonList] Gerando lista skeleton', { count });
  return Array.from({ length: count }, () => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--color-border)">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1;min-width:0">
        <div class="skeleton skeleton-text" style="width:65%"></div>
        <div class="skeleton skeleton-text-sm" style="width:45%;margin-top:6px"></div>
      </div>
      <div class="skeleton skeleton-text-sm" style="width:32px"></div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE: TIMELINE DE ATIVIDADES (Lead Detail)
   ═══════════════════════════════════════════════════════════════ */

const TIMELINE_TYPE_MAP = {
  whatsapp_sent:       { color: '#25D366', icon: 'message-circle', label: 'WhatsApp enviado' },
  whatsapp_received:   { color: '#25D366', icon: 'message-circle', label: 'WhatsApp recebido' },
  email_sent:          { color: '#4A90D9', icon: 'mail',           label: 'Email enviado' },
  email_received:      { color: '#4A90D9', icon: 'mail-open',      label: 'Email recebido' },
  note_added:          { color: '#94A3B8', icon: 'sticky-note',    label: 'Nota adicionada' },
  status_changed:      { color: '#00D4FF', icon: 'git-branch',     label: 'Status alterado' },
  temperature_changed: { color: '#F59E0B', icon: 'thermometer',    label: 'Temperatura alterada' },
  nlp_analysis:        { color: '#A78BFA', icon: 'sparkles',       label: 'Análise IA' },
  message_scheduled:   { color: '#FB923C', icon: 'clock',          label: 'Mensagem agendada' },
  campaign_step:       { color: '#3B82F6', icon: 'zap',            label: 'Step de campanha' },
};

/**
 * Renderiza a secao de timeline de atividades no lead detail
 * @param {Array} activities
 * @returns {string} HTML
 */
function renderLeadTimeline(activities) {
  console.log('[renderLeadTimeline] INICIO', { total: activities.length });

  if (!activities || activities.length === 0) {
    return `<p class="text-faint text-sm">Nenhuma atividade registrada</p>`;
  }

  const items = activities.slice(0, 30).map((act, idx) => {
    const type = act.type || act.action || 'other';
    const config = TIMELINE_TYPE_MAP[type] || { color: '#64748B', icon: 'activity', label: type };
    const isLast = idx === activities.slice(0, 30).length - 1;
    const desc = act.description || act.details || act.text || '';
    return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${config.color}">
          <i data-lucide="${config.icon}" width="12" height="12" style="color:white"></i>
        </div>
        ${!isLast ? '<div class="timeline-line"></div>' : ''}
        <div class="timeline-content">
          <div class="timeline-title">${config.label}</div>
          ${desc ? `<div class="timeline-desc">${desc}</div>` : ''}
          <div class="timeline-time">${fmtRelative(act.createdAt || act.timestamp)}</div>
        </div>
      </div>`;
  }).join('');

  console.log('[renderLeadTimeline] FIM', { itemsRendered: activities.slice(0, 30).length });
  return `<div class="timeline">${items}</div>`;
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE: FOLLOW-UPS (pageFollowUps)
   ═══════════════════════════════════════════════════════════════ */

async function pageFollowUps() {
  console.log('[pageFollowUps] INICIO');

  setHTML('page-content', `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Follow-ups</h1>
        <p class="page-subtitle">Agendamentos e próximas ações com seus leads</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="loadFollowUps()">
          <i data-lucide="refresh-cw" width="16" height="16"></i> Atualizar
        </button>
        <button class="btn btn-primary" onclick="modalNewFollowUp()">
          <i data-lucide="calendar-plus" width="16" height="16"></i> Novo Follow-up
        </button>
      </div>
    </div>

    <div class="followup-stats-row" id="followup-stats">
      ${[1,2,3,4].map(() => `
        <div class="followup-stat-card">
          <div class="skeleton" style="width:36px;height:36px;border-radius:8px;margin-bottom:8px"></div>
          <div class="skeleton skeleton-text" style="width:50%;height:24px"></div>
          <div class="skeleton skeleton-text-sm" style="width:70%;margin-top:6px"></div>
        </div>`).join('')}
    </div>

    <div id="followup-content">
      ${skeletonList(5)}
    </div>
  `);

  lucide.createIcons();
  await loadFollowUps();
}

async function loadFollowUps() {
  console.log('[loadFollowUps] INICIO');

  const el = document.getElementById('followup-content');
  if (el) el.innerHTML = skeletonList(5);

  try {
    // Buscar mensagens agendadas
    let scheduled = [];
    try {
      const r = await http.get('/messages?status=scheduled&limit=50');
      scheduled = r?.data || [];
      console.log('[loadFollowUps] Mensagens agendadas', { total: scheduled.length });
    } catch (e) {
      console.log('[loadFollowUps] Endpoint /messages nao disponivel, buscando via leads', e.message);
    }

    // Fallback: buscar leads com nextActionAt via campanhas ou leads recentes
    if (scheduled.length === 0) {
      // Buscar leads relevantes para follow-up com chamadas separadas (API nao suporta multiplos status)
      const [rContacted, rInterested] = await Promise.all([
        http.get('/leads?limit=30&status=contacted').catch(() => ({ data: [] })),
        http.get('/leads?limit=20&status=interested').catch(() => ({ data: [] })),
      ]);
      const leads = [
        ...(rContacted?.data?.leads || rContacted?.data || []),
        ...(rInterested?.data?.leads || rInterested?.data || []),
      ];
      // Simular follow-ups a partir dos leads com actividades recentes
      scheduled = leads
        .filter(l => l.updatedAt || l.nextActionAt)
        .map(l => ({
          id: `fu-${l.id}`,
          leadId: l.id,
          leadName: l.name,
          leadPhone: l.phone,
          leadEmail: l.email,
          channel: l.phone ? 'whatsapp' : 'email',
          content: '',
          scheduledFor: l.nextActionAt || l.updatedAt,
          status: 'pending',
          _isSimulated: true,
        }));
      console.log('[loadFollowUps] Fallback com leads', { total: scheduled.length });
    }

    // Calcular stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const weekEnd = new Date(today.getTime() + 7 * 86400000);

    const overdueCount  = scheduled.filter(s => new Date(s.scheduledFor) < today).length;
    const todayCount    = scheduled.filter(s => { const d = new Date(s.scheduledFor); return d >= today && d < tomorrow; }).length;
    const tomorrowCount = scheduled.filter(s => { const d = new Date(s.scheduledFor); return d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000); }).length;
    const weekCount     = scheduled.filter(s => { const d = new Date(s.scheduledFor); return d >= today && d < weekEnd; }).length;

    const statsEl = document.getElementById('followup-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="followup-stat-card">
          <div class="followup-stat-icon red"><i data-lucide="alert-circle" width="18" height="18"></i></div>
          <div class="followup-stat-value" style="color:var(--color-danger)">${overdueCount}</div>
          <div class="followup-stat-label">Atrasados</div>
        </div>
        <div class="followup-stat-card">
          <div class="followup-stat-icon yellow"><i data-lucide="clock" width="18" height="18"></i></div>
          <div class="followup-stat-value">${todayCount}</div>
          <div class="followup-stat-label">Hoje</div>
        </div>
        <div class="followup-stat-card">
          <div class="followup-stat-icon blue"><i data-lucide="calendar" width="18" height="18"></i></div>
          <div class="followup-stat-value">${tomorrowCount}</div>
          <div class="followup-stat-label">Amanhã</div>
        </div>
        <div class="followup-stat-card">
          <div class="followup-stat-icon cyan"><i data-lucide="calendar-range" width="18" height="18"></i></div>
          <div class="followup-stat-value">${weekCount}</div>
          <div class="followup-stat-label">Esta Semana</div>
        </div>`;
      lucide.createIcons();
    }

    if (!scheduled.length) {
      if (el) el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="calendar-check" width="28" height="28"></i></div>
          <h3>Nenhum follow-up agendado</h3>
          <p>Agende follow-ups para não perder oportunidades.</p>
          <button class="btn btn-primary mt-4" onclick="modalNewFollowUp()">
            <i data-lucide="calendar-plus" width="16" height="16"></i> Novo Follow-up
          </button>
        </div>`;
      lucide.createIcons();
      return;
    }

    // Ordenar por data
    scheduled.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    function followUpBadge(scheduledFor) {
      const d = new Date(scheduledFor);
      if (isNaN(d.getTime())) return '<span class="badge badge-gray">Sem data</span>';
      if (d < today) return '<span class="badge badge-red" style="background:rgba(239,68,68,0.15);color:#EF4444">Atrasado</span>';
      if (d < tomorrow) return '<span class="badge badge-yellow">Hoje</span>';
      if (d < new Date(tomorrow.getTime() + 86400000)) return '<span class="badge badge-blue">Amanhã</span>';
      if (d < weekEnd) return '<span class="badge badge-cyan">Esta Semana</span>';
      return '<span class="badge badge-gray">Futuro</span>';
    }

    const channelIcon = { whatsapp: 'message-circle', email: 'mail', phone: 'phone' };

    if (el) el.innerHTML = `
      <div class="followup-list">
        ${scheduled.map(fu => {
          const name = fu.leadName || fu.lead?.name || 'Lead';
          const color = avatarColor(name);
          const ch    = fu.channel || 'whatsapp';
          return `
          <div class="followup-item">
            <div class="followup-avatar">
              <div class="avatar avatar-sm" style="background:${color}">${initials(name)}</div>
            </div>
            <div class="followup-info">
              <div class="followup-name">
                <a href="#/leads/${fu.leadId}" style="color:var(--color-text);font-weight:500">${name}</a>
                ${followUpBadge(fu.scheduledFor)}
              </div>
              <div class="followup-meta">
                <span style="display:flex;align-items:center;gap:4px;color:var(--color-text-2);font-size:12px">
                  <i data-lucide="${channelIcon[ch] || 'send'}" width="12" height="12"></i>
                  ${ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : ch}
                </span>
                <span style="font-size:12px;color:var(--color-text-3)">
                  ${fmtDateTime(fu.scheduledFor)}
                </span>
              </div>
              ${fu.content ? `<div class="followup-preview">${fu.content.substring(0, 80)}${fu.content.length > 80 ? '...' : ''}</div>` : ''}
            </div>
            <div class="followup-actions">
              ${!fu._isSimulated ? `
                <button class="btn btn-icon btn-ghost btn-sm" data-tooltip="Cancelar" onclick="cancelFollowUp('${fu.id}')" style="color:var(--color-danger)">
                  <i data-lucide="x" width="14" height="14"></i>
                </button>` : ''}
              <a href="#/leads/${fu.leadId}" class="btn btn-icon btn-ghost btn-sm" data-tooltip="Ver lead">
                <i data-lucide="eye" width="14" height="14"></i>
              </a>
            </div>
          </div>`;
        }).join('')}
      </div>`;

    lucide.createIcons();
    console.log('[loadFollowUps] FIM', { total: scheduled.length });

  } catch (e) {
    console.error('[loadFollowUps] ERRO', e);
    if (el) el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="alert-triangle" width="28" height="28"></i></div>
        <h3>Erro ao carregar follow-ups</h3>
        <p>${e.message}</p>
        <button class="btn btn-primary mt-4" onclick="loadFollowUps()">Tentar novamente</button>
      </div>`;
    lucide.createIcons();
  }
}

async function cancelFollowUp(id) {
  console.log('[cancelFollowUp] INICIO', { id });
  try {
    await http.patch(`/messages/${id}`, { status: 'cancelled' });
    Toast.success('Follow-up cancelado');
    await loadFollowUps();
  } catch (e) {
    console.error('[cancelFollowUp] ERRO', e);
    Toast.error(e.message || 'Erro ao cancelar');
  }
}

function modalNewFollowUp() {
  console.log('[modalNewFollowUp] Abrindo modal');

  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 5);
  const minDateStr = minDate.toISOString().slice(0, 16);

  Modal.open(`
    <div class="modal-header">
      <h3 class="modal-title">
        <i data-lucide="calendar-plus" width="18" height="18"></i>
        Agendar Follow-up
      </h3>
      <button class="modal-close-btn" onclick="Modal.close()"><i data-lucide="x" width="16" height="16"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Lead <span style="color:var(--color-danger)">*</span></label>
        <div style="position:relative">
          <input type="text" class="form-input" id="fu-lead-search" placeholder="Buscar lead pelo nome..." autocomplete="off" />
          <div id="fu-lead-suggestions" class="tags-filter-suggestions"></div>
        </div>
        <input type="hidden" id="fu-lead-id" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Canal <span style="color:var(--color-danger)">*</span></label>
          <select class="form-select" id="fu-channel">
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Data e Hora <span style="color:var(--color-danger)">*</span></label>
          <input type="datetime-local" class="form-input" id="fu-date" min="${minDateStr}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mensagem</label>
        <textarea class="form-textarea" id="fu-message" rows="4" placeholder="Olá {{nome}}, tudo bem? Queria dar um retorno sobre..."></textarea>
        <div class="form-hint">Opcional. Use {{nome}}, {{empresa}} como variáveis.</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="save-fu-btn" onclick="saveFollowUp()">
        <i data-lucide="calendar-check" width="16" height="16"></i> Agendar
      </button>
    </div>`, { size: 'md' });

  // Busca de lead com autocomplete
  const searchInput = document.getElementById('fu-lead-search');
  const suggestionsEl = document.getElementById('fu-lead-suggestions');
  const leadIdInput = document.getElementById('fu-lead-id');

  const dSearch = debounce(async (q) => {
    console.log('[fu-lead-search] query:', q);
    if (!q.trim()) { suggestionsEl.classList.remove('open'); return; }
    try {
      const r = await http.get(`/leads?search=${encodeURIComponent(q)}&limit=8`);
      const leads = r?.data?.leads || r?.data || [];
      if (!leads.length) { suggestionsEl.classList.remove('open'); return; }
      suggestionsEl.innerHTML = leads.map(l => `
        <div class="tags-filter-suggestion-item" style="display:flex;align-items:center;gap:8px"
          onclick="selectFollowUpLead('${l.id}', '${(l.name||'').replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')">
          <div class="avatar avatar-sm" style="background:${avatarColor(l.name)};flex-shrink:0">${initials(l.name)}</div>
          <div>
            <div style="font-size:13px;font-weight:500">${l.name}</div>
            <div style="font-size:11px;color:var(--color-text-3)">${l.company || l.phone || l.email || ''}</div>
          </div>
        </div>`).join('');
      suggestionsEl.classList.add('open');
      lucide.createIcons();
    } catch (e) {
      console.error('[fu-lead-search] ERRO', e);
    }
  }, 250);

  searchInput?.addEventListener('input', e => dSearch(e.target.value));
  searchInput?.addEventListener('blur', () => {
    setTimeout(() => suggestionsEl.classList.remove('open'), 200);
  });
}

function selectFollowUpLead(id, name) {
  console.log('[selectFollowUpLead]', { id, name });
  const searchInput = document.getElementById('fu-lead-search');
  const leadIdInput = document.getElementById('fu-lead-id');
  if (searchInput) searchInput.value = name;
  if (leadIdInput) leadIdInput.value = id;
  const suggestionsEl = document.getElementById('fu-lead-suggestions');
  if (suggestionsEl) suggestionsEl.classList.remove('open');
}

async function saveFollowUp() {
  console.log('[saveFollowUp] INICIO');
  const btn = document.getElementById('save-fu-btn');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }

  try {
    const leadId = document.getElementById('fu-lead-id')?.value;
    if (!leadId) { Toast.warning('Selecione um lead'); return; }

    const scheduledFor = document.getElementById('fu-date')?.value;
    if (!scheduledFor) { Toast.warning('Informe a data e hora'); return; }

    const channel = document.getElementById('fu-channel')?.value || 'whatsapp';
    const content = document.getElementById('fu-message')?.value?.trim() || '';

    const body = { leadId, channel, content, scheduledFor: new Date(scheduledFor).toISOString() };
    console.log('[saveFollowUp] Dados', body);

    await http.post('/messages/schedule', body);
    Toast.success('Follow-up agendado!');
    Modal.close();
    await loadFollowUps();
  } catch (e) {
    console.error('[saveFollowUp] ERRO', e);
    Toast.error(e.message || 'Erro ao agendar');
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

/* ─── SSE — NOTIFICACOES REAL-TIME ──────────────────────────── */
let _sseRetries = 0;
function initSSE() {
  console.log('[SSE] Inicializando cliente SSE...');

  // Fechar conexao anterior se existir
  if (window._sseSource) {
    console.log('[SSE] Fechando conexao anterior');
    window._sseSource.close();
    window._sseSource = null;
  }

  const url = `${CFG.API}/events/stream`;
  console.log('[SSE] Conectando em:', url);

  let es;
  try {
    es = new EventSource(url);
  } catch (err) {
    console.error('[SSE] Falha ao criar EventSource', err);
    return;
  }

  window._sseSource = es;

  function setSSEStatus(connected) {
    const dot   = document.getElementById('sse-dot');
    const label = document.getElementById('sse-label');
    if (dot) {
      dot.className = `sse-dot ${connected ? 'connected' : 'disconnected'}`;
    }
    if (label) {
      label.textContent = connected ? 'Online' : 'SSE';
    }
    console.log('[SSE] Status atualizado:', connected ? 'conectado' : 'desconectado');
  }

  es.addEventListener('open', () => {
    console.log('[SSE] Conexao estabelecida');
    setSSEStatus(true);
  });

  es.addEventListener('connected', (e) => {
    console.log('[SSE] Evento connected recebido', e.data);
    _sseRetries = 0;
    setSSEStatus(true);
  });

  es.addEventListener('heartbeat', () => {
    console.log('[SSE] Heartbeat recebido');
    setSSEStatus(true);
  });

  es.addEventListener('new_message', (e) => {
    console.log('[SSE] new_message recebido', e.data);
    try {
      const data = JSON.parse(e.data);
      const preview = data.preview || data.channel || 'lead';
      Toast.info(`Nova mensagem de ${preview}`, 'Nova Mensagem');

      // Se estiver na pagina de conversas, recarregar lista
      if (State.currentRoute === '/conversations') {
        console.log('[SSE] Recarregando lista de conversas');
        loadConvList(document.getElementById('conv-search')?.value || '');
      }

      // Se estiver no detalhe do lead correspondente, recarregar mensagens
      if (data.leadId && State.currentRoute === `/leads/${data.leadId}`) {
        console.log('[SSE] Recarregando detalhe do lead', { leadId: data.leadId });
        pageLeadDetail({ id: data.leadId });
      }

      // Se estiver na conversa aberta desse lead, recarregar chat
      if (data.leadId && window._currentLeadId === data.leadId) {
        console.log('[SSE] Recarregando mensagens do chat aberto');
        // Recarregar mensagens do chat — variavel de retorno descartada intencionalmente
        http.get(`/leads/${data.leadId}/messages`).then(resp => {
          const msgs = resp?.data || [];
          window._currentMsgs = msgs;
          renderChatMsgs(msgs);
        }).catch(err => {
          console.error('[SSE] Erro ao recarregar mensagens', err);
        });
      }
    } catch (err) {
      console.error('[SSE] Erro ao processar new_message', err, e.data);
    }
  });

  es.addEventListener('lead_created', (e) => {
    console.log('[SSE] lead_created recebido', e.data);
    try {
      const data = JSON.parse(e.data);
      // Se na pagina de leads, recarregar silenciosamente
      if (State.currentRoute === '/leads') {
        console.log('[SSE] Recarregando lista de leads (lead_created)');
        loadLeads();
      }
    } catch (err) {
      console.error('[SSE] Erro ao processar lead_created', err);
    }
  });

  es.addEventListener('lead_updated', (e) => {
    console.log('[SSE] lead_updated recebido', e.data);
    try {
      const data = JSON.parse(e.data);
      if (State.currentRoute === '/leads') {
        console.log('[SSE] Recarregando lista de leads (lead_updated)');
        loadLeads();
      }
    } catch (err) {
      console.error('[SSE] Erro ao processar lead_updated', err);
    }
  });

  es.addEventListener('message_status', (e) => {
    console.log('[SSE] message_status recebido', e.data);
    // Silencioso — apenas logar, nao notificar o usuario
  });

  es.onerror = (err) => {
    console.warn('[SSE] Erro na conexao, readyState:', es.readyState, err);
    setSSEStatus(false);

    // Tentar reconectar com backoff exponencial se a conexao foi fechada
    if (es.readyState === EventSource.CLOSED) {
      _sseRetries++;
      if (_sseRetries > 15) {
        console.warn('[SSE] Maximo de tentativas atingido, encerrando reconexao');
        return;
      }
      const delay = Math.min(5000 * Math.pow(1.5, _sseRetries), 60000);
      console.log(`[SSE] Conexao fechada, reconectando em ${Math.round(delay/1000)}s (tentativa ${_sseRetries})...`);
      setTimeout(() => {
        console.log('[SSE] Reconectando...');
        initSSE();
      }, delay);
    }
  };

  console.log('[SSE] Handlers registrados');
}

/* ─── CHAT DRAG-AND-DROP ─────────────────────────────────────── */
function initChatDragDrop(leadId) {
  const chatArea = document.getElementById('chat-area');
  if (!chatArea) {
    console.warn('[DragDrop] chat-area nao encontrado');
    return;
  }

  // Remover listeners antigos para evitar acumulo
  if (chatArea._dragCleanup) {
    chatArea._dragCleanup();
    chatArea._dragCleanup = null;
  }

  // Garantir que a area tem position:relative para o dropzone absoluto
  chatArea.style.position = 'relative';

  // Criar o dropzone se ainda nao existe
  if (!document.getElementById('chat-dropzone')) {
    const dz = document.createElement('div');
    dz.id = 'chat-dropzone';
    dz.className = 'chat-dropzone';
    dz.innerHTML = `
      <i data-lucide="upload-cloud" width="32" height="32"></i>
      <p>Arraste arquivos aqui</p>
      <span class="chat-dropzone-hint">Imagens, PDFs, documentos</span>`;
    chatArea.appendChild(dz);
    lucide.createIcons();
  }

  // Limpar attachment anterior
  window._chatAttachment = null;
  const existingPreview = document.getElementById('chat-attach-preview');
  if (existingPreview) existingPreview.remove();

  let dragCounter = 0;

  const onDragEnter = (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      console.log('[DragDrop] Arquivo entrou na area do chat');
      document.getElementById('chat-dropzone')?.classList.add('active');
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (e) => {
    dragCounter--;
    if (dragCounter === 0) {
      console.log('[DragDrop] Arquivo saiu da area do chat');
      document.getElementById('chat-dropzone')?.classList.remove('active');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    dragCounter = 0;
    document.getElementById('chat-dropzone')?.classList.remove('active');

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) {
      console.warn('[DragDrop] Nenhum arquivo solto');
      return;
    }

    const file = files[0]; // Processar apenas o primeiro arquivo
    console.log('[DragDrop] Arquivo solto', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    processDroppedFile(file, leadId);
  };

  chatArea.addEventListener('dragenter', onDragEnter);
  chatArea.addEventListener('dragover', onDragOver);
  chatArea.addEventListener('dragleave', onDragLeave);
  chatArea.addEventListener('drop', onDrop);

  chatArea._dragCleanup = () => {
    chatArea.removeEventListener('dragenter', onDragEnter);
    chatArea.removeEventListener('dragover', onDragOver);
    chatArea.removeEventListener('dragleave', onDragLeave);
    chatArea.removeEventListener('drop', onDrop);
  };

  console.log('[DragDrop] Handlers de drag-and-drop registrados para lead', leadId);
}

function processDroppedFile(file, leadId) {
  console.log('[processDroppedFile] INICIO', { name: file.name, type: file.type, size: file.size });

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    Toast.warning(`Arquivo muito grande (max 10MB): ${file.name}`);
    console.warn('[processDroppedFile] Arquivo excede 10MB', { size: file.size });
    return;
  }

  const isImage = file.type.startsWith('image/');
  const reader = new FileReader();

  reader.onload = (e) => {
    const base64 = e.target.result;

    // Armazenar attachment no estado temporario
    window._chatAttachment = {
      name: file.name,
      type: file.type,
      size: file.size,
      base64,
      isImage,
      leadId,
    };

    console.log('[processDroppedFile] Attachment armazenado', {
      name: file.name,
      isImage,
      base64Length: base64.length,
    });

    showAttachmentPreview(file, base64, isImage);
    Toast.info(`Arquivo pronto: ${file.name}`, 'Anexo');
  };

  reader.onerror = (err) => {
    console.error('[processDroppedFile] Erro ao ler arquivo', err);
    Toast.error(`Erro ao ler arquivo: ${file.name}`);
  };

  reader.readAsDataURL(file);
}

function showAttachmentPreview(file, base64, isImage) {
  console.log('[showAttachmentPreview] Exibindo preview', { name: file.name, isImage });

  // Remover preview anterior se existir
  const existing = document.getElementById('chat-attach-preview');
  if (existing) existing.remove();

  const chatMsgs = document.getElementById('chat-messages');
  if (!chatMsgs) {
    console.warn('[showAttachmentPreview] chat-messages nao encontrado');
    return;
  }

  const preview = document.createElement('div');
  preview.id = 'chat-attach-preview';
  preview.className = 'chat-attachment-preview';

  if (isImage) {
    preview.innerHTML = `
      <img src="${base64}" alt="${file.name}" />
      <div class="chat-attach-info">
        <div class="chat-attach-name">${file.name}</div>
        <div class="chat-attach-size">${(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button class="chat-attach-remove" onclick="removeChatAttachment()" title="Remover anexo">
        <i data-lucide="x" width="14" height="14"></i>
      </button>`;
  } else {
    const icon = file.type.includes('pdf') ? 'file-text' : 'file';
    preview.innerHTML = `
      <div class="chat-attach-icon">
        <i data-lucide="${icon}" width="20" height="20"></i>
      </div>
      <div class="chat-attach-info">
        <div class="chat-attach-name">${file.name}</div>
        <div class="chat-attach-size">${(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button class="chat-attach-remove" onclick="removeChatAttachment()" title="Remover anexo">
        <i data-lucide="x" width="14" height="14"></i>
      </button>`;
  }

  // Inserir antes da primeira mensagem ou no fim da area
  chatMsgs.insertBefore(preview, chatMsgs.firstChild);
  lucide.createIcons();
  console.log('[showAttachmentPreview] Preview inserido');
}

function removeChatAttachment() {
  console.log('[removeChatAttachment] Removendo attachment');
  window._chatAttachment = null;
  const preview = document.getElementById('chat-attach-preview');
  if (preview) preview.remove();
  Toast.info('Anexo removido');
}

/* ─── SIDEBAR & TOPBAR INTERAÇÕES ────────────────────────────── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('topbar-menu-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  menuBtn?.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  });
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }

  // Fechar ao navegar em mobile
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

function initTopbarUser() {
  const btn = document.getElementById('topbar-user-btn');
  const username = document.getElementById('topbar-username');
  if (username && State.user) username.textContent = State.user.name || State.user.email || 'Usuário';

  btn?.addEventListener('click', e => {
    e.stopPropagation();
    const existing = document.getElementById('user-dropdown');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('div');
    menu.id = 'user-dropdown';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${btn.getBoundingClientRect().bottom+4}px;right:${window.innerWidth - btn.getBoundingClientRect().right}px`;
    menu.innerHTML = `
      <div class="dropdown-item" style="cursor:default;opacity:.6">
        <i data-lucide="user" width="16" height="16"></i>
        ${State.user?.name || State.user?.email || 'Usuário'}
      </div>
      <div class="dropdown-divider"></div>
      <button class="dropdown-item" onclick="authLogout()">
        <i data-lucide="log-out" width="16" height="16"></i>
        Sair
      </button>`;
    document.body.appendChild(menu);
    lucide.createIcons();
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 50);
  });
}

/* ─── HASH ROUTER ────────────────────────────────────────────── */
function initRouter() {
  const getPath = () => {
    const h = location.hash.slice(1) || '/';
    return h.startsWith('/') ? h : '/' + h;
  };
  window.addEventListener('hashchange', () => navigate(getPath()));
  navigate(getPath());
}

/* ─── INIT APP ───────────────────────────────────────────────── */
function initApp() {
  console.log('[initApp] INICIO', {
    timestamp: new Date().toISOString(),
    user: State.user?.email || 'desconhecido',
  });

  const usernameEl = document.getElementById('topbar-username');
  if (usernameEl && State.user) usernameEl.textContent = State.user.name || State.user.email || 'Usuário';

  initSidebar();
  initTopbarUser();
  initRouter();
  checkStatus();
  setInterval(checkStatus, 30000);

  // Iniciar cliente SSE para notificacoes em tempo real
  initSSE();

  console.log('[initApp] FIM — App inicializado');
}

/* ─── BOOTSTRAP ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  authLoad();
  lucide.createIcons();

  if (State.token) {
    initApp();
  } else {
    showLogin();
  }
});

/* Expor funcoes globais para onclick handlers */
Object.assign(window, {
  navigate, Toast, Modal,
  setLeadsView, loadLeads, leadsPage, setLeadsPage,
  modalNewLead, modalEditLead, saveLead, confirmDeleteLead,
  pageLeads, pageDashboard,
  pageLeadDetail, modalAddNote, saveNote, modalSendMsg, sendLeadMsg,
  openConversation, filterConvChannel, filterChatMsgs, renderChatMsgs, modalSendEmail, sendEmailMsg,
  loadTagsOverview, loadTagRules, modalNewTagRule, saveTagRule, editTagRule, deleteTagRule, runTagAnalysis, showTagLeads, selectIntentPreset, switchTagMode,
  saveSettings, testSmtpConnection, testEvolutionConnection,
  filterTasksTab, toggleTask, cancelTask, confirmDeleteTask, modalNewTask, saveTask,
  loadKB, openKBDoc,
  loadMemory, saveMemory,
  loadPrompts, modalNewPrompt, modalEditPrompt, modalPromptForm, savePrompt, viewFullPrompt, updatePromptPreview, executePromptWithVars,
  loadCredentials,
  loadTelegramSettings, saveTelegramSettings, sendTelegramTest,
  togglePassVis, copyToClipboard, showRegister, showLogin, authLogout,
  /* Feature 1: Kanban D&D */
  initKanbanDragDrop,
  /* Feature 2: Validacao */
  validateLeadForm, leadFormClearErrors, leadFormSetError,
  /* Feature 3: Bulk actions */
  bulkChangeStatus, bulkChangeTemp, bulkExportCSV, bulkDeleteLeads, bulkClearSelection,
  toggleBulkDropdown, bindTableCheckboxes,
  /* Feature 4: Filtros avancados */
  toggleAdvancedFilters, clearAdvancedFilters, addTagFilter, removeTagFilter, updateAdvancedFiltersBadge,
  renderAdvancedFiltersPanel, bindAdvancedFilters,
  /* Campanhas */
  pageCampaigns, pageCampaignDetail, loadCampaigns, modalNewCampaign, modalEditCampaign, saveCampaign,
  startCampaign, pauseCampaign, campaignStatusBadge, campaignChannelBadge,
  modalAddCampaignStep, saveCampaignStep, modalAddCampaignLeads, addLeadsToCampaign,
  /* Templates */
  pageTemplates, loadTemplates, modalNewTemplate, modalEditTemplate, saveTemplate, confirmDeleteTemplate,
  openTemplateModal, updateLivePreview, renderTemplatePreview, applyPreviewVars,
  /* Skeleton Loaders */
  skeletonCard, skeletonTable, skeletonList,
  /* Dashboard Charts */
  renderDashboardCharts,
  /* Timeline */
  renderLeadTimeline,
  /* Follow-ups */
  pageFollowUps, loadFollowUps, modalNewFollowUp, saveFollowUp, cancelFollowUp, selectFollowUpLead,
  /* SSE */
  initSSE,
  /* Chat Drag-and-Drop */
  initChatDragDrop, processDroppedFile, showAttachmentPreview, removeChatAttachment,
});
