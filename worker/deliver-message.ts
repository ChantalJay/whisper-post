import path from 'node:path';
import { createMessageStore } from '../lib/db';
import { createMailConfiguration } from '../lib/mail/transport';
import { deliverOneDueMessage } from '../lib/queue/deliver';
import { getEncryptionKey } from '../lib/security/encryption';

const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const store = createMessageStore(path.join(dataDirectory, 'whisperpost.sqlite'));
const mail = createMailConfiguration();
getEncryptionKey();
if (!mail.transport || !mail.from) {
  throw new Error('SMTP_HOST and SMTP_FROM must be configured before starting the delivery worker.');
}
let stopping = false;
let processing = false;

store.recoverStaleClaims();
console.log('WhisperPost delivery worker started.');

const deliveryTimer = setInterval(async () => {
  if (processing || stopping) return;
  processing = true;
  try {
    while (!stopping && await deliverOneDueMessage({ store, mail })) {
      // Drain due messages sequentially to avoid parallel sends from this worker.
    }
  } catch (error) {
    console.error('Delivery worker failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    processing = false;
  }
}, 1000);

const cleanupTimer = setInterval(() => store.pruneExpired(), 24 * 60 * 60_000);

function shutdown() {
  stopping = true;
  clearInterval(deliveryTimer);
  clearInterval(cleanupTimer);
  const waitForDelivery = setInterval(() => {
    if (processing) return;
    clearInterval(waitForDelivery);
    store.close();
    process.exit(0);
  }, 50);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
