import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.scryptSync(env.APP_SECRET, 'crm-salt', 32);

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(plaintext: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

export function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
