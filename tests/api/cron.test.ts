import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { GET } from '@/app/api/cron/worker/route';
import { getMessageStore } from '@/lib/db';

const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'whisperpost-cron-'));
process.env.DATA_DIR = temporaryDirectory;
process.env.CRON_SECRET = 'cron-test-secret';
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_FROM = 'WhisperPost <relay@example.test>';
process.env.PUBLIC_BASE_URL = 'https://whisperpost.example.test';

after(() => {
  getMessageStore().close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('cron endpoint requires its bearer secret', async () => {
  const response = await GET(new Request('http://localhost/api/cron/worker'));
  assert.equal(response.status, 401);
});

test('cron endpoint processes due queue with valid bearer secret', async () => {
  const response = await GET(new Request('http://localhost/api/cron/worker', {
    headers: { authorization: 'Bearer cron-test-secret' }
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { processed: 0 });
});
