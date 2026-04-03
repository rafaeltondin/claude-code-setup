/**
 * Chrome Profile Scanner - CommonJS
 *
 * Detecta perfis Chrome instalados no computador e extrai
 * informacoes das contas Google associadas a cada perfil.
 *
 * Uso no Ecosystem Dashboard para selecao de perfil Chrome/Google
 * na secao de configuracoes do Chrome DevTools MCP.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Retorna o caminho do diretorio User Data do Chrome
 */
function getChromeUserDataDir() {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  } else {
    return path.join(os.homedir(), '.config', 'google-chrome');
  }
}

/**
 * Le o arquivo Preferences de um perfil Chrome
 */
function readProfilePreferences(profilePath) {
  const prefsPath = path.join(profilePath, 'Preferences');

  if (!fs.existsSync(prefsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(prefsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[ChromeProfileScanner] Erro ao ler Preferences de ${profilePath}: ${error.message}`);
    return null;
  }
}

/**
 * Extrai informacoes da conta Google de um objeto Preferences
 */
function extractGoogleAccountInfo(prefs) {
  const accountInfo = {
    email: null,
    name: null,
    givenName: null,
    picture: null,
    locale: null,
    isSignedIn: false
  };

  // Metodo 1: account_info (mais confiavel)
  if (prefs?.account_info && Array.isArray(prefs.account_info) && prefs.account_info.length > 0) {
    const account = prefs.account_info[0];
    accountInfo.email = account.email || null;
    accountInfo.name = account.full_name || account.given_name || null;
    accountInfo.givenName = account.given_name || null;
    accountInfo.picture = account.picture_url || null;
    accountInfo.locale = account.locale || null;
    accountInfo.isSignedIn = true;
  }

  // Metodo 2: signin (fallback)
  if (!accountInfo.email && prefs?.signin?.allowed !== undefined) {
    accountInfo.isSignedIn = prefs.signin.allowed === true;
  }

  // Metodo 3: google.services (fallback)
  if (!accountInfo.email && prefs?.google?.services) {
    const services = prefs.google.services;
    if (services.signin) {
      accountInfo.email = services.signin.email || null;
      accountInfo.isSignedIn = services.signin.allowed !== false;
    }
    if (services.last_username) {
      accountInfo.email = accountInfo.email || services.last_username;
    }
  }

  // Metodo 4: profile.gaia_info_picture_url (backup)
  if (!accountInfo.picture && prefs?.profile?.gaia_info_picture_url) {
    accountInfo.picture = prefs.profile.gaia_info_picture_url;
  }

  return accountInfo;
}

/**
 * Escaneia todos os perfis Chrome instalados
 */
function scanChromeProfiles() {
  const startTime = Date.now();
  const userDataDir = getChromeUserDataDir();

  console.log(`[ChromeProfileScanner] Escaneando perfis em: ${userDataDir}`);

  if (!fs.existsSync(userDataDir)) {
    console.error(`[ChromeProfileScanner] Diretorio Chrome User Data nao encontrado: ${userDataDir}`);
    return {
      success: false,
      error: 'Diretorio Chrome User Data nao encontrado',
      userDataDir,
      profiles: []
    };
  }

  const profiles = [];

  try {
    const entries = fs.readdirSync(userDataDir);

    const profileDirs = entries.filter(entry => {
      const fullPath = path.join(userDataDir, entry);
      try {
        if (!fs.statSync(fullPath).isDirectory()) return false;
      } catch { return false; }
      return entry === 'Default' || entry.startsWith('Profile ');
    });

    for (const dirName of profileDirs) {
      const profilePath = path.join(userDataDir, dirName);
      const prefs = readProfilePreferences(profilePath);

      if (!prefs) continue;

      const profileName = prefs?.profile?.name || dirName;
      const googleAccount = extractGoogleAccountInfo(prefs);
      const hasGoogleAccount = googleAccount.isSignedIn && !!googleAccount.email;

      profiles.push({
        id: dirName,
        directory: dirName,
        name: profileName,
        hasGoogleAccount,
        googleAccount: hasGoogleAccount ? {
          email: googleAccount.email,
          name: googleAccount.name,
          picture: googleAccount.picture
        } : null
      });
    }
  } catch (error) {
    console.error(`[ChromeProfileScanner] Erro ao escanear: ${error.message}`);
    return {
      success: false,
      error: error.message,
      userDataDir,
      profiles: []
    };
  }

  const duration = Date.now() - startTime;
  console.log(`[ChromeProfileScanner] ${profiles.length} perfis encontrados (${profiles.filter(p => p.hasGoogleAccount).length} com Google) em ${duration}ms`);

  return {
    success: true,
    userDataDir,
    totalProfiles: profiles.length,
    profilesWithGoogle: profiles.filter(p => p.hasGoogleAccount).length,
    profiles,
    scanDuration: duration
  };
}

module.exports = { scanChromeProfiles, getChromeUserDataDir };
