/**
 * Chrome Session Manager
 *
 * Gerencia sessoes do Chrome com perfis especificos.
 * Lanca o Chrome com o perfil selecionado e conecta via CDP
 * (Chrome DevTools Protocol) para automacao.
 */

import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import { getChromeUserDataDir, findProfile } from './profile-scanner.js';
import path from 'path';
import os from 'os';
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'fs';
import { execSync } from 'child_process';

// Sessao ativa (singleton)
let activeSession = null;

// Caminho do arquivo de configuracao
const CONFIG_PATH = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
  '..',
  '..',
  'chrome-config.json'
);

/**
 * Carrega a configuracao salva
 */
function loadConfig() {
  try {
    const configPath = CONFIG_PATH.replace(/\\/g, '/');
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    console.error(`[SessionManager] Erro ao carregar config: ${error.message}`);
  }

  return {
    defaultProfile: null,
    lastUsedProfile: null,
    preferences: {
      headless: false,
      windowSize: { width: 1280, height: 900 },
      devtoolsPort: 9222
    }
  };
}

/**
 * Salva a configuracao
 */
function saveConfig(config) {
  try {
    const configPath = CONFIG_PATH.replace(/\\/g, '/');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[SessionManager] Configuracao salva em: ${configPath}`);
  } catch (error) {
    console.error(`[SessionManager] Erro ao salvar config: ${error.message}`);
  }
}

/**
 * Retorna a configuracao atual
 */
export function getConfig() {
  return loadConfig();
}

/**
 * Atualiza a configuracao
 *
 * @param {object} updates - Campos a atualizar
 */
export function updateConfig(updates) {
  const config = loadConfig();
  Object.assign(config, updates);
  saveConfig(config);
  return config;
}

/**
 * Inicia uma sessao Chrome com um perfil especifico
 *
 * @param {object} options - Opcoes da sessao
 * @param {string} options.profileId - ID do perfil Chrome (ex: "Default", "Profile 1")
 * @param {boolean} options.headless - Modo headless (padrao: false)
 * @param {number} options.port - Porta do DevTools (padrao: 9222)
 * @param {object} options.windowSize - Tamanho da janela {width, height}
 * @returns {Promise<object>} Dados da sessao iniciada
 */
export async function startSession(options = {}) {
  const startTime = Date.now();
  const config = loadConfig();

  const {
    profileId = config.defaultProfile || 'Default',
    headless = config.preferences?.headless ?? false,
    port = config.preferences?.devtoolsPort ?? 9222,
    windowSize = config.preferences?.windowSize ?? { width: 1280, height: 900 }
  } = options;

  console.log(`[SessionManager] Iniciando sessao com perfil: ${profileId}`);

  // Verificar se ja existe sessao ativa
  if (activeSession) {
    console.log(`[SessionManager] Sessao ativa encontrada, fechando antes de iniciar nova...`);
    await closeSession();
  }

  // Buscar informacoes do perfil
  const profile = await findProfile(profileId);
  if (!profile) {
    console.error(`[SessionManager] Perfil nao encontrado: ${profileId}`);
    return {
      success: false,
      error: `Perfil nao encontrado: ${profileId}`
    };
  }

  console.log(`[SessionManager] Perfil encontrado: "${profile.profile.name}"`);
  if (profile.hasGoogleAccount) {
    console.log(`[SessionManager] Conta Google: ${profile.googleAccount.email}`);
  }

  try {
    // Criar diretorio temporario para evitar conflito com Chrome ja rodando
    // O Chrome nao permite dois processos usando o mesmo user-data-dir
    const originalUserDataDir = getChromeUserDataDir();
    const tempUserDataDir = path.join(os.tmpdir(), `chrome-analyzer-${Date.now()}`);

    console.log(`[SessionManager] Criando diretorio temporario: ${tempUserDataDir}`);
    mkdirSync(tempUserDataDir, { recursive: true });

    // Copiar arquivos essenciais do perfil (cookies, login state, etc)
    const profileSrcDir = path.join(originalUserDataDir, profile.directory);
    const profileDestDir = path.join(tempUserDataDir, profile.directory);

    // Copiar Local State (necessario para o Chrome funcionar)
    const localStateSrc = path.join(originalUserDataDir, 'Local State');
    if (existsSync(localStateSrc)) {
      writeFileSync(
        path.join(tempUserDataDir, 'Local State'),
        readFileSync(localStateSrc)
      );
    }

    // Copiar perfil selecionado (contem cookies, login state da conta Google)
    if (existsSync(profileSrcDir)) {
      console.log(`[SessionManager] Copiando perfil ${profile.directory}...`);
      cpSync(profileSrcDir, profileDestDir, {
        recursive: true,
        filter: (src) => {
          // Pular arquivos grandes/desnecessarios para acelerar a copia
          const name = path.basename(src);
          const skip = ['Cache', 'Code Cache', 'Service Worker', 'GPUCache',
                        'GCM Store', 'BudgetDatabase', 'blob_storage',
                        'File System', 'IndexedDB', 'Session Storage'];
          return !skip.includes(name);
        }
      });
      console.log(`[SessionManager] Perfil copiado com sucesso`);
    }

    // Lancar Chrome com o perfil no diretorio temporario
    const chromeFlags = [
      `--remote-debugging-port=${port}`,
      `--window-size=${windowSize.width},${windowSize.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      `--profile-directory=${profile.directory}`
    ];

    if (headless) {
      chromeFlags.push('--headless=new');
    }

    console.log(`[SessionManager] Lancando Chrome com perfil temporario...`);

    const chrome = await chromeLauncher.launch({
      chromeFlags,
      userDataDir: tempUserDataDir,
      port,
      handleSIGINT: true,
      connectionPollInterval: 500,
      maxConnectionRetries: 20
    });

    console.log(`[SessionManager] Chrome lancado na porta ${chrome.port} (PID: ${chrome.pid})`);

    // Conectar Puppeteer ao Chrome lancado
    const browserURL = `http://127.0.0.1:${chrome.port}`;
    console.log(`[SessionManager] Conectando Puppeteer a ${browserURL}...`);

    // Aguardar um pouco para o Chrome estabilizar
    await new Promise(resolve => setTimeout(resolve, 1500));

    const browser = await puppeteer.connect({
      browserURL,
      defaultViewport: {
        width: windowSize.width,
        height: windowSize.height
      }
    });

    console.log(`[SessionManager] Puppeteer conectado com sucesso`);

    // Armazenar sessao ativa
    activeSession = {
      chrome,
      browser,
      profile,
      port: chrome.port,
      pid: chrome.pid,
      startedAt: new Date().toISOString(),
      tempUserDataDir,
      options: { profileId, headless, port, windowSize }
    };

    // Atualizar config com ultimo perfil usado
    updateConfig({ lastUsedProfile: profileId });

    const duration = Date.now() - startTime;
    console.log(`[SessionManager] Sessao iniciada em ${duration}ms`);

    return {
      success: true,
      session: {
        pid: chrome.pid,
        port: chrome.port,
        profileId: profile.id,
        profileName: profile.profile.name,
        googleAccount: profile.hasGoogleAccount ? {
          email: profile.googleAccount.email,
          name: profile.googleAccount.name
        } : null,
        startedAt: activeSession.startedAt,
        browserURL
      },
      duration
    };

  } catch (error) {
    console.error(`[SessionManager] Erro ao iniciar sessao: ${error.message}`);
    console.error(`[SessionManager] Stack: ${error.stack}`);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Fecha a sessao Chrome ativa
 *
 * @returns {Promise<object>} Resultado do fechamento
 */
export async function closeSession() {
  if (!activeSession) {
    console.log(`[SessionManager] Nenhuma sessao ativa para fechar`);
    return {
      success: true,
      message: 'Nenhuma sessao ativa'
    };
  }

  console.log(`[SessionManager] Fechando sessao (PID: ${activeSession.pid})...`);

  try {
    // Desconectar Puppeteer
    if (activeSession.browser) {
      try {
        activeSession.browser.disconnect();
        console.log(`[SessionManager] Puppeteer desconectado`);
      } catch (e) {
        console.log(`[SessionManager] Puppeteer ja desconectado: ${e.message}`);
      }
    }

    // Matar processo Chrome
    if (activeSession.chrome) {
      await activeSession.chrome.kill();
      console.log(`[SessionManager] Chrome encerrado`);
    }

    // Limpar diretorio temporario
    if (activeSession.tempUserDataDir && existsSync(activeSession.tempUserDataDir)) {
      try {
        rmSync(activeSession.tempUserDataDir, { recursive: true, force: true });
        console.log(`[SessionManager] Diretorio temporario removido`);
      } catch (cleanError) {
        console.log(`[SessionManager] Aviso: nao foi possivel remover dir temporario: ${cleanError.message}`);
      }
    }

    const sessionInfo = {
      pid: activeSession.pid,
      profileId: activeSession.profile.id,
      duration: Date.now() - new Date(activeSession.startedAt).getTime()
    };

    activeSession = null;

    console.log(`[SessionManager] Sessao fechada com sucesso`);

    return {
      success: true,
      closedSession: sessionInfo
    };

  } catch (error) {
    console.error(`[SessionManager] Erro ao fechar sessao: ${error.message}`);
    activeSession = null;
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Retorna informacoes da sessao ativa
 *
 * @returns {object} Status da sessao
 */
export function getSessionStatus() {
  if (!activeSession) {
    return {
      active: false,
      session: null
    };
  }

  return {
    active: true,
    session: {
      pid: activeSession.pid,
      port: activeSession.port,
      profileId: activeSession.profile.id,
      profileName: activeSession.profile.profile.name,
      googleAccount: activeSession.profile.hasGoogleAccount ? {
        email: activeSession.profile.googleAccount.email,
        name: activeSession.profile.googleAccount.name
      } : null,
      startedAt: activeSession.startedAt,
      uptime: Date.now() - new Date(activeSession.startedAt).getTime()
    }
  };
}

/**
 * Navega para uma URL na sessao ativa
 *
 * @param {string} url - URL para navegar
 * @param {object} options - Opcoes de navegacao
 * @returns {Promise<object>} Resultado da navegacao
 */
export async function navigateTo(url, options = {}) {
  if (!activeSession || !activeSession.browser) {
    return {
      success: false,
      error: 'Nenhuma sessao ativa. Inicie uma sessao primeiro.'
    };
  }

  const { waitUntil = 'networkidle2', timeout = 30000 } = options;

  console.log(`[SessionManager] Navegando para: ${url}`);

  try {
    const pages = await activeSession.browser.pages();
    const page = pages[0] || await activeSession.browser.newPage();

    await page.goto(url, { waitUntil, timeout });

    const title = await page.title();
    const finalUrl = page.url();

    console.log(`[SessionManager] Navegacao concluida: "${title}"`);

    return {
      success: true,
      url: finalUrl,
      title,
      redirected: finalUrl !== url
    };

  } catch (error) {
    console.error(`[SessionManager] Erro na navegacao: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Captura screenshot da pagina atual
 *
 * @param {object} options - Opcoes do screenshot
 * @returns {Promise<object>} Resultado com screenshot em base64
 */
export async function takeScreenshot(options = {}) {
  if (!activeSession || !activeSession.browser) {
    return {
      success: false,
      error: 'Nenhuma sessao ativa'
    };
  }

  const { fullPage = false, type = 'png' } = options;

  try {
    const pages = await activeSession.browser.pages();
    const page = pages[0];

    if (!page) {
      return { success: false, error: 'Nenhuma pagina aberta' };
    }

    const screenshot = await page.screenshot({
      fullPage,
      type,
      encoding: 'base64'
    });

    return {
      success: true,
      screenshot,
      type,
      fullPage
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Retorna o objeto browser do Puppeteer (uso interno)
 */
export function getBrowser() {
  return activeSession?.browser || null;
}
