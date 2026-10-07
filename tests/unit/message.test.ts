import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promptCategories } from '@/lib/prompts';
import { renderEmail } from '@/lib/mail/template';
import { validateMessage } from '@/lib/validation/message';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/security/opt-out';

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    recipient: 'friend@example.com',
    subject: 'A quiet note',
    body: 'A kind message.',
    category: 'Secret Confession 💌',
    theme: 'midnight',
    scheduledAt: null,
    deleteAfterDelivery: false,
    humanConfirmed: true,
    ...overrides
  };
}

test('validates input and rejects bad schedules and unconfirmed submissions', () => {
  const result = validateMessage(validInput());
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.payload.recipient, 'friend@example.com');

  assert.equal(validateMessage(validInput({ recipient: 'not-an-email' })).ok, false);
  assert.equal(validateMessage(validInput({ body: 'x'.repeat(2001) })).ok, false);
  assert.equal(validateMessage(validInput({ humanConfirmed: false })).ok, false);
  assert.equal(validateMessage(validInput({ scheduledAt: '2000-01-01T00:00:00.000Z' })).ok, false);
});

test('HTML email output escapes message content and includes an opt-out link', () => {
  const category = promptCategories[0];
  const payload = {
    recipient: 'friend@example.com',
    subject: 'A note',
    body: '<script>alert("no")</script>',
    category: category.label,
    theme: 'midnight' as const,
    deleteAfterDelivery: true
  };
  const rendered = renderEmail(payload, 'https://example.com/unsubscribe?t=token');
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /unsubscribe/);
  assert.match(rendered.html, /deletes its stored copy/);
  assert.match(rendered.html, /role="presentation"/);
  assert.match(rendered.html, /bgcolor="#171329"/);
  assert.match(rendered.html, /A note, without a signature/);
  assert.match(rendered.html, /W<span style="color:#ffd6f2;">P<\/span>/);
});

test('each email theme has a distinct, readable email-safe layout', () => {
  const themes = ['midnight', 'neon', 'golden', 'minimal'] as const;
  const html = themes.map((theme) => renderEmail({
    recipient: 'friend@example.com',
    subject: 'A note',
    body: 'A kind message.',
    category: 'Secret Confession 💌',
    theme,
    deleteAfterDelivery: false
  }, 'https://example.com/unsubscribe?t=token').html);

  assert.equal(new Set(html).size, themes.length);
  for (const rendered of html) {
    assert.match(rendered, /<table role="presentation"/);
    assert.match(rendered, /A kind message\./);
    assert.match(rendered, /href="https:\/\/example\.com\/unsubscribe\?t=token"/);
  }
});

test('unsubscribe tokens are signed and recipient-specific', () => {
  const key = Buffer.alloc(32, 7);
  const token = createUnsubscribeToken('Friend@Example.com', key);
  assert.ok(verifyUnsubscribeToken(token, key));
  assert.equal(verifyUnsubscribeToken(token, Buffer.alloc(32, 8)), null);
  assert.equal(verifyUnsubscribeToken(`${token}x`, key), null);
});
