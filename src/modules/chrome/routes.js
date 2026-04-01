/**
 * Módulo: Chrome — Gerenciamento de perfis e debug
 */
const { Router } = require('express');
const { JsonStore } = require('../../shared/utils/json-store');
const fs = require('fs');
const path = require('path');

const router = Router();
const chromeConfig = new JsonStore('chrome-config', { selectedProfile: null, port: 9333 });

// Listar perfis Chrome instalados
router.get('/profiles', (req, res) => {
  try {
    const userDataDir = process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data')
      : path.join(process.env.HOME || '', '.config', 'google-chrome');

    const localStatePath = path.join(userDataDir, 'Local State');
    if (!fs.existsSync(localStatePath)) return res.json([]);

    const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    const profiles = localState.profile?.info_cache || {};

    const result = Object.entries(profiles).map(([dir, info]) => ({
      directory: dir,
      name: info.name || dir,
      shortcutName: info.shortcut_name || '',
      isUsingDefaultName: info.is_using_default_name
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/selected-profile', (req, res) => res.json(chromeConfig.read()));

router.put('/selected-profile', (req, res) => {
  const config = { ...chromeConfig.read(), ...req.body };
  chromeConfig.write(config);
  res.json(config);
});

module.exports = { prefix: '/api/chrome', router };
