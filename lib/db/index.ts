import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { EncryptedPayload, EncryptedRow } from '../security/encryption';

export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface DeliveryMessage extends EncryptedRow {
  attempts: number;
  deleteAfterDelivery: boolean;
}

export interface MessageStore {
  close(): void;
  enqueue(id: string, encrypted: EncryptedPayload, scheduledAt: number, deleteAfterDelivery: boolean): Promise<void>;
  isBlocked(emailHash: string): Promise<boolean>;
  block(emailHash: string): Promise<void>;
  getStatus(id: string): Promise<{ status: MessageStatus; scheduledAt: number } | null>;
  claimDue(now?: number): Promise<DeliveryMessage | null>;
  markSent(id: string, deleteAfterDelivery: boolean): Promise<void>;
  markRetry(id: string, attempts: number): Promise<boolean>;
  recoverStaleClaims(): Promise<void>;
  pruneExpired(now?: number): Promise<void>;
}

const RETENTION_MS = 30 * 24 * 60 * 60_000;
const MIGRATION = `
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    payload BLOB,
    iv BLOB,
    auth_tag BLOB,
    scheduled_at INTEGER NOT NULL,
    available_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    sent_at INTEGER,
    delete_after_delivery INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS messages_due_idx
    ON messages(status, scheduled_at, available_at);
  CREATE INDEX IF NOT EXISTS messages_retention_idx
    ON messages(status, sent_at, created_at);
  CREATE TABLE IF NOT EXISTS blocked_recipients (
    email_hash TEXT PRIMARY KEY,
    blocked_at INTEGER NOT NULL
  );
`;

let singleton: MessageStore | undefined;

function asNumber(value: unknown, field: string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  throw new Error(`Database returned an invalid ${field}.`);
}

function asString(value: unknown, field: string): string {
  if (typeof value === 'string') return value;
  throw new Error(`Database returned an invalid ${field}.`);
}

function asBytes(value: unknown, field: string): Buffer {
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  throw new Error(`Database returned invalid ${field} data.`);
}

function asStatus(value: unknown): MessageStatus {
  if (value === 'queued' || value === 'sending' || value === 'sent' || value === 'failed') return value;
  throw new Error('Database returned an invalid message status.');
}

function databaseUrl(location: string): string {
  if (/^(file|libsql|https?):/.test(location)) return location;
  return pathToFileURL(location).href;
}

export function getDatabaseUrl(): string {
  const configuredUrl = process.env.TURSO_DATABASE_URL;
  if (configuredUrl) return configuredUrl;
  if (process.env.VERCEL) {
    throw new Error('TURSO_DATABASE_URL must be configured on Vercel; local file storage is not persistent there.');
  }
  const databasePath = process.env.DATA_DIR
    ? path.join(process.env.DATA_DIR, 'whisperpost.sqlite')
    : path.join(process.cwd(), 'data', 'whisperpost.sqlite');
  return pathToFileURL(databasePath).href;
}

export function createMessageStore(location: string): MessageStore & { close(): void } {
  const url = databaseUrl(location);
  const localFile = url.startsWith('file:');
  if (localFile) mkdirSync(path.dirname(fileURLToPath(url)), { recursive: true });

  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!localFile && !authToken) {
    throw new Error('TURSO_AUTH_TOKEN is required when using a remote Turso database.');
  }

  const db = createClient({ url, authToken: localFile ? undefined : authToken });
  const initialized = db.executeMultiple(MIGRATION);

  return {
    async enqueue(id, encrypted, scheduledAt, deleteAfterDelivery) {
      await initialized;
      const now = Date.now();
      await db.execute({
        sql: `INSERT INTO messages
          (id, payload, iv, auth_tag, scheduled_at, available_at, status, created_at, delete_after_delivery)
          VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)`,
        args: [id, encrypted.ciphertext, encrypted.iv, encrypted.authTag, scheduledAt, now, now, Number(deleteAfterDelivery)]
      });
    },
    async isBlocked(emailHash) {
      await initialized;
      const result = await db.execute({
        sql: 'SELECT 1 FROM blocked_recipients WHERE email_hash = ?',
        args: [emailHash]
      });
      return result.rows.length > 0;
    },
    async block(emailHash) {
      await initialized;
      await db.execute({
        sql: 'INSERT OR IGNORE INTO blocked_recipients (email_hash, blocked_at) VALUES (?, ?)',
        args: [emailHash, Date.now()]
      });
    },
    async getStatus(id) {
      await initialized;
      const result = await db.execute({
        sql: 'SELECT status, scheduled_at FROM messages WHERE id = ?',
        args: [id]
      });
      const row = result.rows[0];
      return row
        ? { status: asStatus(row.status), scheduledAt: asNumber(row.scheduled_at, 'scheduled time') }
        : null;
    },
    async claimDue(now = Date.now()) {
      await initialized;
      const result = await db.execute({
        sql: `UPDATE messages
          SET status = 'sending', attempts = attempts + 1, available_at = ?
          WHERE id = (
            SELECT id FROM messages
            WHERE status = 'queued' AND scheduled_at <= ? AND available_at <= ?
            ORDER BY scheduled_at ASC
            LIMIT 1
          )
          RETURNING id, payload, iv, auth_tag, attempts, delete_after_delivery`,
        args: [now, now, now]
      });
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: asString(row.id, 'message id'),
        ciphertext: asBytes(row.payload, 'message payload'),
        iv: asBytes(row.iv, 'message IV'),
        authTag: asBytes(row.auth_tag, 'message authentication tag'),
        attempts: asNumber(row.attempts, 'delivery attempts'),
        deleteAfterDelivery: Boolean(asNumber(row.delete_after_delivery, 'delete-after-delivery flag'))
      };
    },
    async markSent(id, deleteAfterDelivery) {
      await initialized;
      const deletionFlag = Number(deleteAfterDelivery);
      await db.execute({
        sql: `UPDATE messages
          SET status = 'sent', sent_at = ?,
              payload = CASE WHEN ? = 1 THEN NULL ELSE payload END,
              iv = CASE WHEN ? = 1 THEN NULL ELSE iv END,
              auth_tag = CASE WHEN ? = 1 THEN NULL ELSE auth_tag END
          WHERE id = ?`,
        args: [Date.now(), deletionFlag, deletionFlag, deletionFlag, id]
      });
    },
    async markRetry(id, attempts) {
      await initialized;
      if (attempts >= 5) {
        await db.execute({ sql: "UPDATE messages SET status = 'failed' WHERE id = ?", args: [id] });
        return false;
      }
      const delay = Math.min(60_000 * (2 ** (attempts - 1)), 60 * 60_000);
      await db.execute({
        sql: "UPDATE messages SET status = 'queued', available_at = ? WHERE id = ?",
        args: [Date.now() + delay, id]
      });
      return true;
    },
    async recoverStaleClaims() {
      await initialized;
      await db.execute({
        sql: `UPDATE messages SET status = 'queued', available_at = ?
          WHERE status = 'sending' AND available_at < ?`,
        args: [Date.now(), Date.now() - 10 * 60_000]
      });
    },
    async pruneExpired(now = Date.now()) {
      await initialized;
      await db.execute({
        sql: `DELETE FROM messages
          WHERE (status = 'sent' AND sent_at < ?)
             OR (status IN ('queued', 'sending', 'failed') AND created_at < ?)`,
        args: [now - RETENTION_MS, now - RETENTION_MS]
      });
    },
    close() {
      db.close();
    }
  };
}

export function getMessageStore(): MessageStore {
  if (!singleton) singleton = createMessageStore(getDatabaseUrl());
  return singleton;
}
