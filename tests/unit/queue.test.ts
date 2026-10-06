import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { createMessageStore } from '@/lib/db';
import { deliverOneDueMessage } from '@/lib/queue/deliver';
import { decryptPayload, encryptPayload } from '@/lib/security/encryption';
import type { MessagePayload } from '@/lib/validation/message';
import type { MailConfiguration } from '@/lib/mail/transport';

const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'whisperpost-'));
const databasePath = path.join(temporaryDirectory, 'messages.sqlite');
const store = createMessageStore(databasePath);
const key = randomBytes(32);
process.env.APP_ENCRYPTION_KEY = key.toString('base64');

after(() => {
  store.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

const payload: MessagePayload = {
  recipient: 'friend@example.com',
  subject: 'A small note',
  body: 'Thanks for being kind.',
  category: 'Positivity Boost',
  theme: 'golden',
  deleteAfterDelivery: true
};

test('stores encrypted content, claims due items atomically, and deletes copy after delivery', async () => {
  const id = 'message-delivery-test';
  const encrypted = encryptPayload(payload, key, id);
  assert.deepEqual(decryptPayload({ id, ...encrypted }, key), payload);
  store.enqueue(id, encrypted, Date.now(), true);
  const inspector = new DatabaseSync(databasePath);
  const queued = inspector.prepare('SELECT payload FROM messages WHERE id = ?').get(id) as { payload: Uint8Array };
  assert.equal(Buffer.from(queued.payload).includes(Buffer.from(payload.body)), false);
  inspector.close();

  const sent: { to: string }[] = [];
  const mail: MailConfiguration = {
    from: 'WhisperPost <relay@example.com>',
    transport: { async sendMail(message) { sent.push({ to: message.to }); } }
  };
  assert.equal(await deliverOneDueMessage({ store, mail }), true);
  assert.deepEqual(sent, [{ to: 'friend@example.com' }]);
  assert.equal(store.getStatus(id)?.status, 'sent');
  const afterDelivery = new DatabaseSync(databasePath);
  const delivered = afterDelivery.prepare('SELECT payload FROM messages WHERE id = ?').get(id) as { payload: null };
  assert.equal(delivered.payload, null);
  afterDelivery.close();
});

test('does not claim messages before their scheduled time and retries failed delivery', async () => {
  const futureId = 'message-future-test';
  store.enqueue(futureId, encryptPayload(payload, key, futureId), Date.now() + 60_000, false);
  assert.equal(store.claimDue(), null);

  const retryId = 'message-retry-test';
  store.enqueue(retryId, encryptPayload(payload, key, retryId), Date.now(), false);
  const row = store.claimDue();
  assert.ok(row);
  assert.equal(store.markRetry(retryId, 1), true);
  assert.equal(store.getStatus(retryId)?.status, 'queued');
});
