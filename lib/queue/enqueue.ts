import { randomUUID } from 'node:crypto';
import { getMessageStore } from '../db';
import { encryptPayload, getEncryptionKey } from '../security/encryption';
import type { MessagePayload } from '../validation/message';

export async function enqueueMessage(payload: MessagePayload, scheduledAt: number): Promise<string> {
  const id = randomUUID();
  const encryptionKey = getEncryptionKey();
  const encrypted = encryptPayload(payload, encryptionKey, id);
  await getMessageStore().enqueue(id, encrypted, scheduledAt, payload.deleteAfterDelivery);
  return id;
}
