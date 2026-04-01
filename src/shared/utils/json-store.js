/**
 * JSON Store — Persistência genérica em arquivos JSON com cache em memória.
 * Substitui o monolítico storage.js por stores independentes.
 *
 * Uso:
 *   const store = new JsonStore('tasks', [], { backup: true });
 *   store.read();
 *   store.write(data);
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const log = createLogger('JsonStore');

class JsonStore {
  constructor(name, defaultValue = [], options = {}) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.defaultValue = defaultValue;
    this.backup = options.backup !== false;
    this._cache = null;
  }

  _ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  read() {
    if (this._cache !== null) return this._cache;
    try {
      if (fs.existsSync(this.filePath)) {
        this._cache = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        return this._cache;
      }
    } catch (err) {
      log.error(`Falha ao ler ${this.name}`, { error: err.message });
    }
    this._cache = typeof this.defaultValue === 'function' ? this.defaultValue() : structuredClone(this.defaultValue);
    return this._cache;
  }

  write(data) {
    try {
      this._ensureDir();
      if (this.backup && fs.existsSync(this.filePath)) {
        fs.copyFileSync(this.filePath, this.filePath + '.backup');
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      this._cache = data;
      return true;
    } catch (err) {
      log.error(`Falha ao escrever ${this.name}`, { error: err.message });
      return false;
    }
  }

  update(fn) {
    const data = this.read();
    const updated = fn(data);
    return this.write(updated);
  }

  clear() {
    this._cache = null;
  }
}

module.exports = { JsonStore, DATA_DIR };
