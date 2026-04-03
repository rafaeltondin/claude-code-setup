/**
 * Chrome Profile Scanner
 *
 * Detecta perfis Chrome instalados no computador e extrai
 * informacoes das contas Google associadas a cada perfil.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Retorna o caminho do diretorio User Data do Chrome
 * baseado no sistema operacional
 */
function getChromeUserDataDir() {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  } else {
    // Linux
    return path.join(os.homedir(), '.config', 'google-chrome');
  }
}

/**
 * Le o arquivo Preferences de um perfil Chrome e extrai
 * informacoes da conta Google
 *
 * @param {string} profilePath - Caminho absoluto do diretorio do perfil
 * @returns {object|null} Dados da conta Google ou null
 */
function readProfilePreferences(profilePath) {
  const prefsPath = path.join(profilePath, 'Preferences');

  if (!existsSync(prefsPath)) {
    return null;
  }

  try {
    const content = readFileSync(prefsPath, 'utf-8');
    const prefs = JSON.parse(content);
    return prefs;
  } catch (error) {
    console.error(`[ProfileScanner] Erro ao ler Preferences de ${profilePath}: ${error.message}`);
    return null;
  }
}

/**
 * Extrai informacoes da conta Google de um objeto Preferences
 *
 * @param {object} prefs - Objeto Preferences do Chrome
 * @returns {object} Informacoes da conta Google
 */
function extractGoogleAccountInfo(prefs) {
  const accountInfo = {
    email: null,
    name: null,
    givenName: null,
    picture: null,
    locale: null,
    hostedDomain: null,
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
    accountInfo.hostedDomain = account.hosted_domain || null;
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
 * Extrai informacoes do perfil (nome, avatar, etc)
 *
 * @param {object} prefs - Objeto Preferences do Chrome
 * @param {string} dirName - Nome do diretorio do perfil
 * @returns {object} Informacoes do perfil
 */
function extractProfileInfo(prefs, dirName) {
  const profileInfo = {
    name: prefs?.profile?.name || dirName,
    avatarIndex: prefs?.profile?.avatar_index ?? -1,
    isUsingDefaultName: prefs?.profile?.using_default_name ?? true,
    isEphemeral: prefs?.profile?.ephemeral_mode ?? false,
    createdByVersion: prefs?.profile?.created_by_version || 'desconhecida',
    themColor: prefs?.profile?.managed_user_id || null
  };

  return profileInfo;
}

/**
 * Escaneia todos os perfis Chrome instalados no computador
 *
 * @returns {Promise<object>} Resultado do scan com perfis encontrados
 */
export async function scanChromeProfiles() {
  const startTime = Date.now();
  const userDataDir = getChromeUserDataDir();

  console.log(`[ProfileScanner] Escaneando perfis Chrome em: ${userDataDir}`);

  if (!existsSync(userDataDir)) {
    console.error(`[ProfileScanner] Diretorio Chrome User Data nao encontrado: ${userDataDir}`);
    return {
      success: false,
      error: 'Diretorio Chrome User Data nao encontrado',
      userDataDir,
      profiles: []
    };
  }

  const profiles = [];

  try {
    const entries = readdirSync(userDataDir);

    // Perfis Chrome sao armazenados como "Default", "Profile 1", "Profile 2", etc.
    const profileDirs = entries.filter(entry => {
      const fullPath = path.join(userDataDir, entry);
      if (!statSync(fullPath).isDirectory()) return false;

      // Verificar se e um diretorio de perfil valido
      return entry === 'Default' || entry.startsWith('Profile ');
    });

    console.log(`[ProfileScanner] Encontrados ${profileDirs.length} diretorios de perfil`);

    for (const dirName of profileDirs) {
      const profilePath = path.join(userDataDir, dirName);
      const prefs = readProfilePreferences(profilePath);

      if (!prefs) {
        console.log(`[ProfileScanner] Sem Preferences para ${dirName}, pulando...`);
        continue;
      }

      const profileInfo = extractProfileInfo(prefs, dirName);
      const googleAccount = extractGoogleAccountInfo(prefs);

      profiles.push({
        id: dirName,
        directory: dirName,
        path: profilePath,
        profile: profileInfo,
        googleAccount,
        hasGoogleAccount: googleAccount.isSignedIn && !!googleAccount.email
      });

      const accountLabel = googleAccount.email
        ? `${googleAccount.name || 'Sem nome'} (${googleAccount.email})`
        : 'Sem conta Google';

      console.log(`[ProfileScanner]   ${dirName}: "${profileInfo.name}" - ${accountLabel}`);
    }

  } catch (error) {
    console.error(`[ProfileScanner] Erro ao escanear perfis: ${error.message}`);
    return {
      success: false,
      error: error.message,
      userDataDir,
      profiles: []
    };
  }

  const duration = Date.now() - startTime;
  console.log(`[ProfileScanner] Scan concluido em ${duration}ms - ${profiles.length} perfis encontrados`);

  return {
    success: true,
    userDataDir,
    totalProfiles: profiles.length,
    profilesWithGoogle: profiles.filter(p => p.hasGoogleAccount).length,
    profiles,
    scanDuration: duration
  };
}

/**
 * Busca um perfil especifico por ID ou email
 *
 * @param {string} identifier - ID do perfil (ex: "Default", "Profile 1") ou email Google
 * @returns {Promise<object|null>} Perfil encontrado ou null
 */
export async function findProfile(identifier) {
  const result = await scanChromeProfiles();

  if (!result.success) return null;

  // Buscar por ID do diretorio
  let profile = result.profiles.find(p => p.id === identifier);
  if (profile) return profile;

  // Buscar por email Google
  profile = result.profiles.find(p =>
    p.googleAccount.email && p.googleAccount.email.toLowerCase() === identifier.toLowerCase()
  );
  if (profile) return profile;

  // Buscar por nome do perfil
  profile = result.profiles.find(p =>
    p.profile.name && p.profile.name.toLowerCase() === identifier.toLowerCase()
  );

  return profile || null;
}

export { getChromeUserDataDir };
