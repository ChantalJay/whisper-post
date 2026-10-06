import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { EncryptedPayload, EncryptedRow } from '../security/encryption';

export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed';

interface StoredMessage {
  id: string;
  payload: Uint8Array;
  iv: Uint8Array;
  auth_tag: Uint8Array;
  attempts: number;
  delete_after_delivery: number;
}

export interface DeliveryMessage extends EncryptedRow {
  attempts: number;
  deleteAfterDelivery: boolean;
}

export interface MessageStore {
  enqueue(id: string, encrypted: EncryptedPayload, scheduledAt: number, deleteAfterDelivery: boolean): void;
  isBlocked(emailHash: string): boolean;
  block(emailHash: string): void;
  getStatus(id: string): { status: MessageStatus; scheduledAt: number } | null;
  claimDue(now?: number): DeliveryMessage | null;
  markSent(id: string, deleteAfterDelivery: boolean): void;
  markRetry(id: string, attempts: number): boolean;
  recoverStaleClaims(): void;
  pruneExpired(now?: number): void;
}

const RETENTION_MS = 30 * 24 * 60 * 60_000;
let singleton: MessageStore | undefined;

export function createMessageStore(databasePath: string): MessageStore & { close(): void } {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const migration = readFileSync(path.join(process.cwd(), 'db/migrations/001_initial.sql'), 'utf8');
  db.exec(migration);

  const insertMessage = db.prepare(`
    INSERT INTO messages
      (id, payload, iv, auth_tag, scheduled_at, available_at, status, created_at, delete_after_delivery)
    VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)
  `);
  const claimDue = db.prepare(`
    UPDATE messages
    SET status = 'sending', attempts = attempts + 1
    WHERE id = (
      SELECT id FROM messages
      WHERE status = 'queued' AND scheduled_at <= ? AND available_at <= ?
      ORDER BY scheduled_at ASC
      LIMIT 1
    )
    RETURNING id, payload, iv, auth_tag, attempts, delete_after_delivery
  `);

  return {
    enqueue(id, encrypted, scheduledAt, deleteAfterDelivery) {
      const now = Date.now();
      insertMessage.run(id, encrypted.ciphertext, encrypted.iv, encrypted.authTag, scheduledAt, now, now, Number(deleteAfterDelivery));
    },
    isBlocked(emailHash) {
      return Boolean(db.prepare('SELECT 1 FROM blocked_recipients WHERE email_hash = ?').get(emailHash));
    },
    block(emailHash) {
      db.prepare('INSERT OR IGNORE INTO blocked_recipients (email_hash, blocked_at) VALUES (?, ?)').run(emailHash, Date.now());
    },
    getStatus(id) {
      const row = db.prepare('SELECT status, scheduled_at FROM messages WHERE id = ?').get(id) as
        | { status: MessageStatus; scheduled_at: number }
        | undefined;
      return row ? { status: row.status, scheduledAt: row.scheduled_at } : null;
    },
    claimDue(now = Date.now()) {
      const row = claimDue.get(now, now) as unknown as StoredMessage | undefined;
      if (!row) return null;
      return {
        id: row.id,
        ciphertext: Buffer.from(row.payload),
        iv: Buffer.from(row.iv),
        authTag: Buffer.from(row.auth_tag),
        attempts: row.attempts,
        deleteAfterDelivery: Boolean(row.delete_after_delivery)
      };
    },
    markSent(id, deleteAfterDelivery) {
      db.prepare(`
        UPDATE messages
        SET status = 'sent', sent_at = ?,
            payload = CASE WHEN ? = 1 THEN NULL ELSE payload END,
            iv = CASE WHEN ? = 1 THEN NULL ELSE iv END,
            auth_tag = CASE WHEN ? = 1 THEN NULL ELSE auth_tag END
        WHERE id = ?
      `).run(Date.now(), Number(deleteAfterDelivery), Number(deleteAfterDelivery), Number(deleteAfterDelivery), id);
    },
    markRetry(id, attempts) {
      if (attempts >= 5) {
        db.prepare("UPDATE messages SET status = 'failed' WHERE id = ?").run(id);
        return false;
      }
      const delay = Math.min(60_000 * (2 ** (attempts - 1)), 60 * 60_000);
      db.prepare("UPDATE messages SET status = 'queued', available_at = ? WHERE id = ?").run(Date.now() + delay, id);
      return true;
    },
    recoverStaleClaims() {
      db.prepare(`
        UPDATE messages SET status = 'queued', available_at = ?
        WHERE status = 'sending' AND created_at < ?
      `).run(Date.now(), Date.now() - 10 * 60_000);
    },
    pruneExpired(now = Date.now()) {
      db.prepare(`
        DELETE FROM messages
        WHERE (status = 'sent' AND sent_at < ?)
           OR (status IN ('queued', 'sending', 'failed') AND created_at < ?)
      `).run(now - RETENTION_MS, now - RETENTION_MS);
    },
    close() {
      db.close();
    }
  };
}

export function getMessageStore(): MessageStore {
  if (!singleton) {
    const databasePath = process.env.DATA_DIR
      ? path.join(process.env.DATA_DIR, 'whisperpost.sqlite')
      : path.join(process.cwd(), 'data', 'whisperpost.sqlite');
    singleton = createMessageStore(databasePath);
  }
  return singleton;
}
