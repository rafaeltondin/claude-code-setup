/**
 * CREDENTIAL VAULT MODULE - Armazenamento seguro de credenciais
 *
 * Criptografia AES-256-GCM com chave derivada de hostname+username (PBKDF2).
 * O LLM referencia credenciais por {{secret:NAME}} sem ver os valores reais.
 */

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const VAULT_FILE = path.join(DATA_DIR, 'credentials.encrypted.json');
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

// Cache em memoria
let vaultCache = null;

const logger = {
  info: (msg, data = null) => {
    const ts = new Date().toISOString();
    console.log(`[CredentialVault][${ts}] INFO: ${msg}`, data ? JSON.stringify(data) : '');
  },
  warn: (msg, data = null) => {
    const ts = new Date().toISOString();
    console.warn(`[CredentialVault][${ts}] WARN: ${msg}`, data ? JSON.stringify(data) : '');
  },
  error: (msg, err = null) => {
    const ts = new Date().toISOString();
    console.error(`[CredentialVault][${ts}] ERROR: ${msg}`, err?.message || err || '');
  }
};

// ============ CRYPTO HELPERS ============

function getMachineSecret() {
  return `${os.hostname()}::${os.userInfo().username}::credential-vault-v1`;
}

function deriveKey(salt) {
  const secret = getMachineSecret();
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

function encrypt(plainText) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag
  };
}

function decrypt(encryptedData) {
  const salt = Buffer.from(encryptedData.salt, 'hex');
  const key = deriveKey(salt);
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============ STORAGE ============

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info('Data directory created');
  }
}

function readVault() {
  if (vaultCache !== null) return vaultCache;
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const data = fs.readFileSync(VAULT_FILE, 'utf8');
      vaultCache = JSON.parse(data);
      return vaultCache;
    }
    return { credentials: [], metadata: { version: 1, createdAt: new Date().toISOString() } };
  } catch (error) {
    logger.error('Failed to read vault file', error);
    return { credentials: [], metadata: { version: 1, createdAt: new Date().toISOString() } };
  }
}

function writeVault(vault) {
  try {
    ensureDataDir();
    if (fs.existsSync(VAULT_FILE)) {
      const backupPath = VAULT_FILE + '.backup';
      fs.copyFileSync(VAULT_FILE, backupPath);
    }
    vault.metadata = vault.metadata || {};
    vault.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8');
    vaultCache = vault;
    return true;
  } catch (error) {
    logger.error('Failed to write vault file', error);
    return false;
  }
}

// ============ CRUD ============

function getAll() {
  const vault = readVault();
  return vault.credentials.map(cred => {
    const decrypted = decryptValue(cred);
    return {
      id: cred.id,
      name: cred.name,
      category: cred.category,
      description: cred.description,
      source: cred.source,
      maskedValue: maskValue(cred.name, decrypted),
      hasValue: decrypted !== null && decrypted !== undefined && decrypted.trim() !== '',
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
      lastUsedAt: cred.lastUsedAt
    };
  });
}

function getById(id) {
  const vault = readVault();
  const cred = vault.credentials.find(c => c.id === id);
  if (!cred) return null;
  return {
    id: cred.id,
    name: cred.name,
    category: cred.category,
    description: cred.description,
    source: cred.source,
    maskedValue: maskValue(cred.name, decryptValue(cred)),
    createdAt: cred.createdAt,
    updatedAt: cred.updatedAt,
    lastUsedAt: cred.lastUsedAt
  };
}

function create({ name, value, category, description, source }) {
  if (!name || !value) {
    throw new Error('Name and value are required');
  }

  // Normalize name to uppercase with underscores
  const normalizedName = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  const vault = readVault();

  // Check for duplicate name
  if (vault.credentials.some(c => c.name === normalizedName)) {
    throw new Error(`Credential "${normalizedName}" already exists`);
  }

  const encryptedValue = encrypt(value);
  const credential = {
    id: uuidv4(),
    name: normalizedName,
    category: category || 'general',
    description: description || '',
    source: source || 'manual',
    encryptedValue,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastUsedAt: null
  };

  vault.credentials.push(credential);
  writeVault(vault);
  logger.info('Credential created', { id: credential.id, name: normalizedName });

  return {
    id: credential.id,
    name: credential.name,
    category: credential.category,
    description: credential.description,
    source: credential.source,
    maskedValue: maskValue(normalizedName, value),
    createdAt: credential.createdAt
  };
}

function update(id, updates) {
  const vault = readVault();
  const index = vault.credentials.findIndex(c => c.id === id);
  if (index === -1) return null;

  const cred = vault.credentials[index];

  if (updates.name) {
    const normalizedName = updates.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const duplicate = vault.credentials.some(c => c.name === normalizedName && c.id !== id);
    if (duplicate) throw new Error(`Credential "${normalizedName}" already exists`);
    cred.name = normalizedName;
  }

  if (updates.value) {
    cred.encryptedValue = encrypt(updates.value);
  }

  if (updates.category !== undefined) cred.category = updates.category;
  if (updates.description !== undefined) cred.description = updates.description;
  cred.updatedAt = new Date().toISOString();

  vault.credentials[index] = cred;
  writeVault(vault);
  logger.info('Credential updated', { id, name: cred.name });

  return getById(id);
}

function remove(id) {
  const vault = readVault();
  const index = vault.credentials.findIndex(c => c.id === id);
  if (index === -1) return false;

  const name = vault.credentials[index].name;
  vault.credentials.splice(index, 1);
  writeVault(vault);
  logger.info('Credential deleted', { id, name });
  return true;
}

function reveal(id) {
  const vault = readVault();
  const cred = vault.credentials.find(c => c.id === id);
  if (!cred) return null;

  // Update last used timestamp
  cred.lastUsedAt = new Date().toISOString();
  writeVault(vault);

  return {
    id: cred.id,
    name: cred.name,
    value: decryptValue(cred)
  };
}

// ============ RESOLVE & ENV ============

function resolve(text) {
  if (!text) return text;
  const vault = readVault();
  let resolved = text;
  let count = 0;

  resolved = resolved.replace(/\{\{secret:([A-Z0-9_]+)\}\}/g, (match, name) => {
    const cred = vault.credentials.find(c => c.name === name);
    if (cred) {
      count++;
      cred.lastUsedAt = new Date().toISOString();
      if (!cred.usageLog) cred.usageLog = [];
      cred.usageLog.push({ at: cred.lastUsedAt, context: 'resolve' });
      if (cred.usageLog.length > 50) cred.usageLog = cred.usageLog.slice(-50);
      return decryptValue(cred);
    }
    logger.warn(`Credential not found: ${name}`);
    return match;
  });

  if (count > 0) {
    writeVault(vault);
    logger.info(`Resolved ${count} credential references`);
  }

  return resolved;
}

function getEnvVars() {
  const vault = readVault();
  const envVars = {};
  for (const cred of vault.credentials) {
    try {
      envVars[cred.name] = decryptValue(cred);
    } catch (err) {
      logger.error(`Failed to decrypt credential for env: ${cred.name}`, err);
    }
  }
  return envVars;
}

// ============ IMPORT FROM KB ============

function importFromKB(kbDir) {
  if (!kbDir) {
    kbDir = path.join(__dirname, '..', 'knowledge-base');
  }

  if (!fs.existsSync(kbDir)) {
    logger.error('KB directory not found', { kbDir });
    return { imported: 0, skipped: 0, errors: [] };
  }

  const patterns = [
    // Meta Ads
    { regex: /\*\*FB_ACCESS_TOKEN\*\*\s*\|\s*`([^`]+)`/i, name: 'FB_ACCESS_TOKEN', category: 'meta-ads', source: 'FIBER-META-ADS-CREDENCIAIS.md' },
    { regex: /\*\*FB_APP_ID\*\*\s*\|\s*`([^`]+)`/i, name: 'FB_APP_ID', category: 'meta-ads', source: 'FIBER-META-ADS-CREDENCIAIS.md' },
    { regex: /\*\*FB_APP_SECRET\*\*\s*\|\s*`([^`]+)`/i, name: 'FB_APP_SECRET', category: 'meta-ads', source: 'FIBER-META-ADS-CREDENCIAIS.md' },
    { regex: /\*\*FB_AD_ACCOUNT_ID\*\*\s*\|\s*`([^`]+)`/i, name: 'FB_AD_ACCOUNT_ID', category: 'meta-ads', source: 'FIBER-META-ADS-CREDENCIAIS.md' },

    // Shopify
    { regex: /\*\*Access Token\*\*\s*\|\s*`(shpat_[a-f0-9]+)`/i, name: 'SHOPIFY_ACCESS_TOKEN', category: 'shopify', source: 'FIBER-SHOPIFY-API-CREDENCIAIS.md' },

    // Evolution API
    { regex: /\*\*API Key Global\*\*\s*\|\s*`([^`]+)`/i, name: 'EVOLUTION_API_KEY', category: 'evolution-api', source: 'MEU-WHATSAPP-EVOLUTION-API-GUIA-INTERACAO.md' },
    { regex: /\*\*Token da Inst[aâ]ncia\*\*\s*\|\s*`([^`]+)`/i, name: 'EVOLUTION_INSTANCE_TOKEN', category: 'evolution-api', source: 'MEU-WHATSAPP-EVOLUTION-API-GUIA-INTERACAO.md' },

    // Easypanel / Server
    { regex: /\*\*Senha VNC\*\*\s*\|\s*`([^`]+)`/i, name: 'VNC_PASSWORD', category: 'server', source: 'MEU-SERVIDOR-EASYPANEL.md' },
    { regex: /\*\*IP do Servidor\*\*\s*\|\s*`([^`]+)`/i, name: 'SERVER_IP', category: 'server', source: 'MEU-SERVIDOR-EASYPANEL.md' }
  ];

  const results = { imported: 0, skipped: 0, errors: [], details: [] };
  const vault = readVault();

  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));

  for (const pattern of patterns) {
    const sourceFile = path.join(kbDir, pattern.source);
    if (!fs.existsSync(sourceFile)) {
      results.errors.push(`File not found: ${pattern.source}`);
      continue;
    }

    try {
      const content = fs.readFileSync(sourceFile, 'utf8');
      const match = content.match(pattern.regex);

      if (match && match[1]) {
        const value = match[1];

        // Skip if already exists
        if (vault.credentials.some(c => c.name === pattern.name)) {
          results.skipped++;
          results.details.push({ name: pattern.name, status: 'skipped', reason: 'already exists' });
          continue;
        }

        const encryptedValue = encrypt(value);
        vault.credentials.push({
          id: uuidv4(),
          name: pattern.name,
          category: pattern.category,
          description: `Imported from KB: ${pattern.source}`,
          source: pattern.source,
          encryptedValue,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUsedAt: null
        });

        results.imported++;
        results.details.push({ name: pattern.name, status: 'imported', source: pattern.source });
      } else {
        results.errors.push(`Pattern not matched for ${pattern.name} in ${pattern.source}`);
      }
    } catch (err) {
      results.errors.push(`Error processing ${pattern.source}: ${err.message}`);
    }
  }

  if (results.imported > 0) {
    writeVault(vault);
    logger.info(`Imported ${results.imported} credentials from KB`, { skipped: results.skipped });
  }

  return results;
}

// ============ HELPERS ============

function decryptValue(cred) {
  try {
    return decrypt(cred.encryptedValue);
  } catch (err) {
    logger.error(`Failed to decrypt credential: ${cred.name}`, err);
    return '[DECRYPT_ERROR]';
  }
}

function maskValue(name, value) {
  if (!value || value === '[DECRYPT_ERROR]') return '********';
  if (value.length <= 8) return '*'.repeat(value.length);
  return value.substring(0, 4) + '*'.repeat(Math.min(value.length - 8, 20)) + value.substring(value.length - 4);
}

function clearCache() {
  vaultCache = null;
  logger.info('Vault cache cleared');
}

function getUsageLog(credName) {
  const vault = readVault();
  const cred = vault.credentials.find(c => c.name === credName);
  if (!cred) return null;
  return {
    name: cred.name,
    category: cred.category,
    lastUsedAt: cred.lastUsedAt || null,
    usageLog: cred.usageLog || []
  };
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  reveal,
  resolve,
  getEnvVars,
  importFromKB,
  clearCache,
  getUsageLog
};
