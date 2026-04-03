/**
 * Frontend Analyzer Dashboard - JavaScript
 *
 * Gerencia a interface do dashboard para selecao de
 * perfis Chrome, controle de sessao e configuracao.
 */

// Estado da aplicacao
const state = {
  profiles: [],
  selectedProfileId: null,
  session: null,
  config: null
};

// Elementos DOM
const els = {};

// Inicializacao
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  init();
});

/**
 * Cacheia referencias dos elementos DOM
 */
function cacheElements() {
  els.profilesGrid = document.getElementById('profiles-grid');
  els.profilesLoading = document.getElementById('profiles-loading');
  els.profilesError = document.getElementById('profiles-error');
  els.noProfiles = document.getElementById('no-profiles');
  els.btnRefresh = document.getElementById('btn-refresh-profiles');

  els.configDefaultProfile = document.getElementById('config-default-profile');
  els.configHeadless = document.getElementById('config-headless');
  els.configPort = document.getElementById('config-port');
  els.configWidth = document.getElementById('config-width');
  els.configHeight = document.getElementById('config-height');
  els.btnSaveConfig = document.getElementById('btn-save-config');
  els.configSavedMsg = document.getElementById('config-saved-msg');

  els.sessionIndicator = document.getElementById('session-indicator');
  els.sessionInactive = document.getElementById('session-inactive');
  els.sessionActive = document.getElementById('session-active');
  els.sessionProfileName = document.getElementById('session-profile-name');
  els.sessionGoogleEmail = document.getElementById('session-google-email');
  els.sessionPid = document.getElementById('session-pid');
  els.sessionPort = document.getElementById('session-port');
  els.sessionStarted = document.getElementById('session-started');

  els.navigateUrl = document.getElementById('navigate-url');
  els.btnNavigate = document.getElementById('btn-navigate');
  els.btnScreenshot = document.getElementById('btn-screenshot');
  els.btnCloseSession = document.getElementById('btn-close-session');

  els.screenshotModal = document.getElementById('screenshot-modal');
  els.screenshotImg = document.getElementById('screenshot-img');
  els.btnCloseModal = document.getElementById('btn-close-modal');

  els.toastContainer = document.getElementById('toast-container');
}

/**
 * Bind de eventos
 */
function bindEvents() {
  els.btnRefresh.addEventListener('click', loadProfiles);
  els.btnSaveConfig.addEventListener('click', saveConfig);
  els.btnNavigate.addEventListener('click', navigateToUrl);
  els.btnScreenshot.addEventListener('click', takeScreenshot);
  els.btnCloseSession.addEventListener('click', closeSession);
  els.btnCloseModal.addEventListener('click', () => {
    els.screenshotModal.style.display = 'none';
  });

  // Fechar modal com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.screenshotModal.style.display = 'none';
    }
  });

  // Enter no campo URL
  els.navigateUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateToUrl();
  });
}

/**
 * Inicializacao da aplicacao
 */
async function init() {
  console.log('[Dashboard] Inicializando...');

  // Carregar dados em paralelo
  await Promise.all([
    loadProfiles(),
    loadConfig(),
    checkSession()
  ]);

  console.log('[Dashboard] Inicializacao concluida');
}

// === API HELPERS ===

/**
 * Faz requisicao HTTP para a API
 */
async function api(endpoint, options = {}) {
  const { method = 'GET', body = null } = options;

  const fetchOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${endpoint}`, fetchOptions);
  return response.json();
}

// === PERFIS CHROME ===

/**
 * Carrega perfis Chrome do backend
 */
async function loadProfiles() {
  console.log('[Dashboard] Carregando perfis Chrome...');

  els.profilesLoading.style.display = 'flex';
  els.profilesGrid.innerHTML = '';
  els.profilesError.style.display = 'none';
  els.noProfiles.style.display = 'none';

  try {
    const result = await api('/chrome/profiles');

    els.profilesLoading.style.display = 'none';

    if (!result.success) {
      els.profilesError.textContent = result.error || 'Erro ao carregar perfis';
      els.profilesError.style.display = 'block';
      return;
    }

    state.profiles = result.data.profiles;

    if (state.profiles.length === 0) {
      els.noProfiles.style.display = 'block';
      return;
    }

    renderProfiles();
    updateProfileSelect();

    showToast(`${state.profiles.length} perfis encontrados (${result.data.profilesWithGoogle} com Google)`, 'success');

  } catch (error) {
    console.error('[Dashboard] Erro ao carregar perfis:', error);
    els.profilesLoading.style.display = 'none';
    els.profilesError.textContent = `Erro de conexao: ${error.message}`;
    els.profilesError.style.display = 'block';
  }
}

/**
 * Renderiza cards de perfis no grid
 */
function renderProfiles() {
  els.profilesGrid.innerHTML = '';

  state.profiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = `profile-card${state.selectedProfileId === profile.id ? ' selected' : ''}`;
    card.dataset.profileId = profile.id;

    const initial = (profile.googleAccount?.name || profile.name || '?')[0].toUpperCase();
    const avatarContent = profile.googleAccount?.picture
      ? `<img src="${profile.googleAccount.picture}" alt="${profile.name}" onerror="this.parentElement.textContent='${initial}'">`
      : initial;

    const googleSection = profile.hasGoogleAccount
      ? `<div class="profile-google-info">
           <div class="google-label">Conta Google</div>
           <div class="google-email">${profile.googleAccount.email}</div>
           ${profile.googleAccount.name ? `<div class="google-name">${profile.googleAccount.name}</div>` : ''}
         </div>`
      : `<div class="profile-no-google">Sem conta Google conectada</div>`;

    card.innerHTML = `
      <div class="profile-card-header">
        <div class="profile-avatar">${avatarContent}</div>
        <div>
          <div class="profile-name">${profile.name}</div>
          <div class="profile-id">${profile.id}</div>
        </div>
      </div>
      ${googleSection}
      <div class="profile-actions">
        <button class="btn btn-primary btn-sm btn-block btn-start-session" data-profile="${profile.id}">
          Iniciar Sessao
        </button>
      </div>
    `;

    // Click no card seleciona o perfil
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-start-session')) return;
      selectProfile(profile.id);
    });

    // Click no botao inicia sessao
    const btnStart = card.querySelector('.btn-start-session');
    btnStart.addEventListener('click', () => startSession(profile.id));

    els.profilesGrid.appendChild(card);
  });
}

/**
 * Seleciona um perfil
 */
function selectProfile(profileId) {
  state.selectedProfileId = profileId;

  // Atualizar visual
  document.querySelectorAll('.profile-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.profileId === profileId);
  });

  const profile = state.profiles.find(p => p.id === profileId);
  if (profile) {
    const label = profile.hasGoogleAccount
      ? `${profile.name} (${profile.googleAccount.email})`
      : profile.name;
    showToast(`Perfil selecionado: ${label}`, 'info');
  }
}

/**
 * Atualiza o select de perfil padrao na configuracao
 */
function updateProfileSelect() {
  const select = els.configDefaultProfile;
  // Limpar opcoes existentes (manter a primeira)
  while (select.options.length > 1) {
    select.remove(1);
  }

  state.profiles.forEach(profile => {
    const option = document.createElement('option');
    option.value = profile.id;
    const label = profile.hasGoogleAccount
      ? `${profile.name} (${profile.googleAccount.email})`
      : profile.name;
    option.textContent = label;
    select.appendChild(option);
  });

  // Selecionar perfil padrao da config
  if (state.config?.defaultProfile) {
    select.value = state.config.defaultProfile;
  }
}

// === SESSAO CHROME ===

/**
 * Inicia sessao Chrome com perfil especifico
 */
async function startSession(profileId) {
  console.log(`[Dashboard] Iniciando sessao com perfil: ${profileId}`);

  showToast('Iniciando sessao Chrome...', 'info');

  try {
    const result = await api('/chrome/session/start', {
      method: 'POST',
      body: {
        profileId,
        headless: els.configHeadless.checked,
        port: parseInt(els.configPort.value) || 9222,
        windowSize: {
          width: parseInt(els.configWidth.value) || 1280,
          height: parseInt(els.configHeight.value) || 900
        }
      }
    });

    if (!result.success) {
      showToast(`Erro: ${result.error}`, 'error');
      return;
    }

    state.session = result.data;
    updateSessionUI();
    selectProfile(profileId);

    const accountInfo = result.data.googleAccount
      ? ` (${result.data.googleAccount.email})`
      : '';
    showToast(`Sessao iniciada: ${result.data.profileName}${accountInfo}`, 'success');

  } catch (error) {
    console.error('[Dashboard] Erro ao iniciar sessao:', error);
    showToast(`Erro de conexao: ${error.message}`, 'error');
  }
}

/**
 * Fecha sessao Chrome ativa
 */
async function closeSession() {
  console.log('[Dashboard] Fechando sessao...');

  try {
    const result = await api('/chrome/session/close', { method: 'POST' });

    state.session = null;
    updateSessionUI();

    showToast('Sessao fechada', 'success');

  } catch (error) {
    console.error('[Dashboard] Erro ao fechar sessao:', error);
    showToast(`Erro: ${error.message}`, 'error');
  }
}

/**
 * Verifica status da sessao
 */
async function checkSession() {
  try {
    const result = await api('/chrome/session/status');

    if (result.success && result.data.active) {
      state.session = result.data.session;
    } else {
      state.session = null;
    }

    updateSessionUI();

  } catch (error) {
    console.error('[Dashboard] Erro ao verificar sessao:', error);
  }
}

/**
 * Atualiza UI da sessao
 */
function updateSessionUI() {
  if (state.session) {
    els.sessionInactive.style.display = 'none';
    els.sessionActive.style.display = 'block';
    els.sessionIndicator.textContent = 'Sessao ativa';
    els.sessionIndicator.className = 'status-badge status-running';

    els.sessionProfileName.textContent = state.session.profileName || state.session.profileId;
    els.sessionGoogleEmail.textContent = state.session.googleAccount?.email || 'Sem conta Google';
    els.sessionPid.textContent = state.session.pid;
    els.sessionPort.textContent = state.session.port;

    const started = new Date(state.session.startedAt);
    els.sessionStarted.textContent = started.toLocaleString('pt-BR');
  } else {
    els.sessionInactive.style.display = 'block';
    els.sessionActive.style.display = 'none';
    els.sessionIndicator.textContent = 'Sem sessao';
    els.sessionIndicator.className = 'status-badge status-inactive';
  }
}

/**
 * Navega para URL na sessao ativa
 */
async function navigateToUrl() {
  const url = els.navigateUrl.value.trim();
  if (!url) {
    showToast('Digite uma URL para navegar', 'error');
    return;
  }

  console.log(`[Dashboard] Navegando para: ${url}`);
  showToast('Navegando...', 'info');

  try {
    const result = await api('/chrome/session/navigate', {
      method: 'POST',
      body: { url }
    });

    if (result.success && result.data.success) {
      showToast(`Navegou para: ${result.data.title || url}`, 'success');
    } else {
      showToast(`Erro: ${result.data?.error || result.error}`, 'error');
    }

  } catch (error) {
    showToast(`Erro: ${error.message}`, 'error');
  }
}

/**
 * Captura screenshot
 */
async function takeScreenshot() {
  console.log('[Dashboard] Capturando screenshot...');
  showToast('Capturando screenshot...', 'info');

  try {
    const result = await api('/chrome/session/screenshot', {
      method: 'POST',
      body: { fullPage: false, type: 'png' }
    });

    if (result.success && result.data.success) {
      els.screenshotImg.src = `data:image/png;base64,${result.data.screenshot}`;
      els.screenshotModal.style.display = 'flex';
      showToast('Screenshot capturado', 'success');
    } else {
      showToast(`Erro: ${result.data?.error || result.error}`, 'error');
    }

  } catch (error) {
    showToast(`Erro: ${error.message}`, 'error');
  }
}

// === CONFIGURACAO ===

/**
 * Carrega configuracao do backend
 */
async function loadConfig() {
  try {
    const result = await api('/chrome/config');

    if (result.success) {
      state.config = result.data;
      applyConfigToUI();
    }
  } catch (error) {
    console.error('[Dashboard] Erro ao carregar config:', error);
  }
}

/**
 * Aplica configuracao carregada na UI
 */
function applyConfigToUI() {
  if (!state.config) return;

  if (state.config.defaultProfile) {
    els.configDefaultProfile.value = state.config.defaultProfile;
  }

  const prefs = state.config.preferences || {};
  els.configHeadless.checked = prefs.headless || false;
  els.configPort.value = prefs.devtoolsPort || 9222;
  els.configWidth.value = prefs.windowSize?.width || 1280;
  els.configHeight.value = prefs.windowSize?.height || 900;
}

/**
 * Salva configuracao no backend
 */
async function saveConfig() {
  const config = {
    defaultProfile: els.configDefaultProfile.value || null,
    preferences: {
      headless: els.configHeadless.checked,
      devtoolsPort: parseInt(els.configPort.value) || 9222,
      windowSize: {
        width: parseInt(els.configWidth.value) || 1280,
        height: parseInt(els.configHeight.value) || 900
      }
    }
  };

  try {
    const result = await api('/chrome/config', {
      method: 'PUT',
      body: config
    });

    if (result.success) {
      state.config = result.data;
      els.configSavedMsg.style.display = 'inline';
      setTimeout(() => {
        els.configSavedMsg.style.display = 'none';
      }, 3000);
      showToast('Configuracao salva', 'success');
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`Erro: ${error.message}`, 'error');
  }
}

// === TOAST ===

/**
 * Mostra notificacao toast
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
