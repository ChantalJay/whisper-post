import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/messages/route';

test('message API reports server-side validation errors and enforces request size', async () => {
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_FROM = 'WhisperPost <relay@example.test>';

  const invalid = await POST(new NextRequest('http://localhost/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.21' },
    body: JSON.stringify({
      recipient: 'person@example.com',
      subject: 'Subject\r\nBcc: attacker@example.com',
      body: 'Hello',
      category: 'Secret Confession',
      theme: 'midnight',
      humanConfirmed: true
    })
  }));
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /Subject/);

  const oversized = await POST(new NextRequest('http://localhost/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.22' },
    body: JSON.stringify({ body: 'x'.repeat(12_100) })
  }));
  assert.equal(oversized.status, 413);
});
