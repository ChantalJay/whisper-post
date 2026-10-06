import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { MessagePayload } from '@/lib/validation/message';

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export interface EncryptedRow extends EncryptedPayload {
  id: string;
}

export function getEncryptionKey(): Buffer {
  const encoded = process.env.APP_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error('APP_ENCRYPTION_KEY is required. Generate one with: openssl rand -base64 32');
  }
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw new Error('APP_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte key.');
  }
  return key;
}

export function encryptPayload(payload: MessagePayload, key: Buffer, id: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptPayload(row: EncryptedRow, key: Buffer): MessagePayload {
  const decipher = createDecipheriv('aes-256-gcm', key, row.iv);
  decipher.setAAD(Buffer.from(row.id));
  decipher.setAuthTag(row.authTag);
  const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as MessagePayload;
}
