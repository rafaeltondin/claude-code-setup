/**
 * Credential Vault — Armazenamento seguro AES-256-GCM.
 * Chave derivada de hostname+username via PBKDF2.
 * Referência no prompt: {{secret:NAME}}
 */

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('./utils/logger');

const log = createLogger('Vault');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const VAULT_FILE = path.join(DATA_DIR, 'credentials.encrypted.json');
const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT_LEN = 32;
const PBKDF2_ITER = 100000;

let cache = null;

// ─── Crypto ─────────────────────────────────────────────────────
function machineSecret() {
  return `${os.hostname()}::${os.userInfo().username}::credential-vault-v1`;
}

function deriveKey(salt) {
  return crypto.pbkdf2Sync(machineSecret(), salt, PBKDF2_ITER, KEY_LEN, 'sha512');
}

function encrypt(text) {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  return { salt: salt.toString('hex'), iv: iv.toString('hex'), encrypted: enc, authTag: cipher.getAuthTag().toString('hex') };
}

function decrypt(data) {
  const key = deriveKey(Buffer.from(data.salt, 'hex'));
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
  let dec = decipher.update(data.encrypted, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

// ─── Storage ────────────────────────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readVault() {
  if (cache) return cache;
  try {
    if (fs.existsSync(VAULT_FILE)) {
      cache = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
      return cache;
    }
  } catch (e) { log.error('Falha ao ler vault', { error: e.message }); }
  cache = { credentials: [], metadata: { version: 1, createdAt: new Date().toISOString() } };
  return cache;
}

function writeVault(vault) {
  try {
    ensureDir();
    if (fs.existsSync(VAULT_FILE)) fs.copyFileSync(VAULT_FILE, VAULT_FILE + '.backup');
    vault.metadata = vault.metadata || {};
    vault.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8');
    cache = vault;
    return true;
  } catch (e) { log.error('Falha ao escrever vault', { error: e.message }); return false; }
}

function decryptValue(cred) {
  try { return decrypt(cred.encryptedValue); }
  catch (e) { log.error(`Decrypt falhou: ${cred.name}`, { error: e.message }); return '[DECRYPT_ERROR]'; }
}

function maskValue(name, value) {
  if (!value || value === '[DECRYPT_ERROR]') return '********';
  if (value.length <= 8) return '*'.repeat(value.length);
  return value.substring(0, 4) + '*'.repeat(Math.min(value.length - 8, 20)) + value.substring(value.length - 4);
}

// ─── CRUD ───────────────────────────────────────────────────────
function getAll() {
  return readVault().credentials.map(c => ({
    id: c.id, name: c.name, category: c.category, description: c.description,
    source: c.source, maskedValue: maskValue(c.name, decryptValue(c)),
    hasValue: !!decryptValue(c)?.trim(), createdAt: c.createdAt, updatedAt: c.updatedAt
  }));
}

function getById(id) {
  const c = readVault().credentials.find(x => x.id === id);
  if (!c) return null;
  return { id: c.id, name: c.name, category: c.category, description: c.description,
    maskedValue: maskValue(c.name, decryptValue(c)), createdAt: c.createdAt, updatedAt: c.updatedAt };
}

function create({ name, value, category, description, source }) {
  if (!name || !value) throw new Error('name e value são obrigatórios');
  const normalized = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const vault = readVault();
  if (vault.credentials.some(c => c.name === normalized)) throw new Error(`"${normalized}" já existe`);
  const cred = {
    id: uuidv4(), name: normalized, category: category || 'general',
    description: description || '', source: source || 'manual',
    encryptedValue: encrypt(value),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastUsedAt: null
  };
  vault.credentials.push(cred);
  writeVault(vault);
  log.info('Credencial criada', { name: normalized });
  return { id: cred.id, name: cred.name, category: cred.category, maskedValue: maskValue(normalized, value) };
}

function update(id, updates) {
  const vault = readVault();
  const idx = vault.credentials.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const c = vault.credentials[idx];
  if (updates.name) {
    const n = updates.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (vault.credentials.some(x => x.name === n && x.id !== id)) throw new Error(`"${n}" já existe`);
    c.name = n;
  }
  if (updates.value) c.encryptedValue = encrypt(updates.value);
  if (updates.category !== undefined) c.category = updates.category;
  if (updates.description !== undefined) c.description = updates.description;
  c.updatedAt = new Date().toISOString();
  writeVault(vault);
  return getById(id);
}

function remove(id) {
  const vault = readVault();
  const idx = vault.credentials.findIndex(c => c.id === id);
  if (idx === -1) return false;
  vault.credentials.splice(idx, 1);
  writeVault(vault);
  return true;
}

function reveal(id) {
  const vault = readVault();
  const c = vault.credentials.find(x => x.id === id);
  if (!c) return null;
  c.lastUsedAt = new Date().toISOString();
  writeVault(vault);
  return { id: c.id, name: c.name, value: decryptValue(c) };
}

function resolve(text) {
  if (!text) return text;
  const vault = readVault();
  let count = 0;
  const resolved = text.replace(/\{\{secret:([A-Z0-9_]+)\}\}/g, (match, name) => {
    const c = vault.credentials.find(x => x.name === name);
    if (!c) return match;
    count++;
    c.lastUsedAt = new Date().toISOString();
    return decryptValue(c);
  });
  if (count > 0) writeVault(vault);
  return resolved;
}

function getEnvVars() {
  const env = {};
  for (const c of readVault().credentials) {
    try { env[c.name] = decryptValue(c); } catch (_) {}
  }
  return env;
}

function clearCache() { cache = null; }

module.exports = { getAll, getById, create, update, remove, reveal, resolve, getEnvVars, clearCache };
