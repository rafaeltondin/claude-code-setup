"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("./env");
const ALGORITHM = 'aes-256-gcm';
const KEY = crypto_1.default.scryptSync(env_1.env.APP_SECRET, 'crm-salt', 32);
function encrypt(plaintext) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
        encrypted,
        iv: iv.toString('hex'),
        tag,
    };
}
function decrypt(encrypted, iv, tag) {
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
//# sourceMappingURL=crypto.js.map