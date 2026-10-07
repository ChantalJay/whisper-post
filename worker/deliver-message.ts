import { createMessageStore, getDatabaseUrl } from '../lib/db';
import { createMailConfiguration } from '../lib/mail/transport';
import { deliverOneDueMessage } from '../lib/queue/deliver';
import { getEncryptionKey } from '../lib/security/encryption';

const store = createMessageStore(getDatabaseUrl());
const mail = createMailConfiguration();
let stopping = false;
let processing = false;

let deliveryTimer: NodeJS.Timeout;
let cleanupTimer: NodeJS.Timeout;

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

async function start() {
  getEncryptionKey();
  if (!mail.transport || !mail.from) {
    throw new Error('SMTP_HOST and SMTP_FROM must be configured before starting the delivery worker.');
  }
  await store.recoverStaleClaims();
  console.log('WhisperPost delivery worker started.');

  deliveryTimer = setInterval(async () => {
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

  cleanupTimer = setInterval(() => {
    void store.pruneExpired().catch((error: unknown) => {
      console.error('Message cleanup failed:', error instanceof Error ? error.message : 'Unknown error');
    });
  }, 24 * 60 * 60_000);
}

void start().catch((error: unknown) => {
  console.error('Could not start delivery worker:', error instanceof Error ? error.message : 'Unknown error');
  store.close();
  process.exitCode = 1;
});
