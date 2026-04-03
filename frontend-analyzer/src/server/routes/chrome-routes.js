/**
 * Rotas da API para gerenciamento de perfis Chrome e sessoes
 *
 * Endpoints:
 *   GET  /api/chrome/profiles        - Listar perfis Chrome com contas Google
 *   GET  /api/chrome/session/status   - Status da sessao ativa
 *   POST /api/chrome/session/start    - Iniciar sessao com perfil especifico
 *   POST /api/chrome/session/close    - Fechar sessao ativa
 *   POST /api/chrome/session/navigate - Navegar para URL na sessao ativa
 *   POST /api/chrome/session/screenshot - Capturar screenshot
 *   GET  /api/chrome/config           - Obter configuracao atual
 *   PUT  /api/chrome/config           - Atualizar configuracao
 */

import { Router } from 'express';
import { scanChromeProfiles, findProfile } from '../../chrome/profile-scanner.js';
import {
  startSession,
  closeSession,
  getSessionStatus,
  navigateTo,
  takeScreenshot,
  getConfig,
  updateConfig
} from '../../chrome/session-manager.js';

const router = Router();

/**
 * GET /api/chrome/profiles
 * Lista todos os perfis Chrome com contas Google associadas
 */
router.get('/profiles', async (req, res) => {
  const startTime = Date.now();
  console.log(`[ChromeRoutes] GET /profiles - Listando perfis Chrome`);

  try {
    const result = await scanChromeProfiles();

    if (!result.success) {
      console.error(`[ChromeRoutes] Erro ao listar perfis: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    console.log(`[ChromeRoutes] ${result.totalProfiles} perfis encontrados (${result.profilesWithGoogle} com Google)`);

    res.json({
      success: true,
      data: {
        totalProfiles: result.totalProfiles,
        profilesWithGoogle: result.profilesWithGoogle,
        userDataDir: result.userDataDir,
        profiles: result.profiles.map(p => ({
          id: p.id,
          directory: p.directory,
          name: p.profile.name,
          hasGoogleAccount: p.hasGoogleAccount,
          googleAccount: p.hasGoogleAccount ? {
            email: p.googleAccount.email,
            name: p.googleAccount.name,
            picture: p.googleAccount.picture
          } : null
        })),
        scanDuration: result.scanDuration
      },
      duration: Date.now() - startTime
    });

  } catch (error) {
    console.error(`[ChromeRoutes] Erro inesperado: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/chrome/session/status
 * Retorna status da sessao Chrome ativa
 */
router.get('/session/status', (req, res) => {
  console.log(`[ChromeRoutes] GET /session/status`);

  const status = getSessionStatus();
  res.json({
    success: true,
    data: status
  });
});

/**
 * POST /api/chrome/session/start
 * Inicia uma sessao Chrome com perfil especifico
 *
 * Body: { profileId: "Default", headless: false, port: 9222 }
 */
router.post('/session/start', async (req, res) => {
  const startTime = Date.now();
  const { profileId, headless, port, windowSize } = req.body;

  console.log(`[ChromeRoutes] POST /session/start - Perfil: ${profileId || 'Default'}`);

  if (!profileId) {
    return res.status(400).json({
      success: false,
      error: 'profileId e obrigatorio. Envie o ID do perfil (ex: "Default", "Profile 1") ou email Google.'
    });
  }

  try {
    const result = await startSession({ profileId, headless, port, windowSize });

    if (!result.success) {
      console.error(`[ChromeRoutes] Erro ao iniciar sessao: ${result.error}`);
      return res.status(500).json(result);
    }

    console.log(`[ChromeRoutes] Sessao iniciada com sucesso (PID: ${result.session.pid})`);

    res.json({
      success: true,
      data: result.session,
      duration: Date.now() - startTime
    });

  } catch (error) {
    console.error(`[ChromeRoutes] Erro inesperado: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chrome/session/close
 * Fecha a sessao Chrome ativa
 */
router.post('/session/close', async (req, res) => {
  console.log(`[ChromeRoutes] POST /session/close`);

  try {
    const result = await closeSession();

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(`[ChromeRoutes] Erro ao fechar sessao: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chrome/session/navigate
 * Navega para uma URL na sessao ativa
 *
 * Body: { url: "https://exemplo.com", waitUntil: "networkidle2" }
 */
router.post('/session/navigate', async (req, res) => {
  const { url, waitUntil, timeout } = req.body;

  console.log(`[ChromeRoutes] POST /session/navigate - URL: ${url}`);

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'url e obrigatorio'
    });
  }

  try {
    const result = await navigateTo(url, { waitUntil, timeout });
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chrome/session/screenshot
 * Captura screenshot da sessao ativa
 */
router.post('/session/screenshot', async (req, res) => {
  const { fullPage, type } = req.body;

  console.log(`[ChromeRoutes] POST /session/screenshot`);

  try {
    const result = await takeScreenshot({ fullPage, type });
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/chrome/config
 * Retorna configuracao atual
 */
router.get('/config', (req, res) => {
  console.log(`[ChromeRoutes] GET /config`);
  const config = getConfig();
  res.json({
    success: true,
    data: config
  });
});

/**
 * PUT /api/chrome/config
 * Atualiza configuracao
 *
 * Body: { defaultProfile: "Profile 1", preferences: { headless: false } }
 */
router.put('/config', (req, res) => {
  console.log(`[ChromeRoutes] PUT /config`);
  const updates = req.body;

  try {
    const config = updateConfig(updates);
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
