import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export function createUnsubscribeToken(email: string, key: Buffer): string {
  const emailHash = hashEmail(email);
  const signature = createHmac('sha256', key).update(emailHash).digest('base64url');
  return `${emailHash}.${signature}`;
}

export function verifyUnsubscribeToken(token: string, key: Buffer): string | null {
  const [emailHash, signature, extra] = token.split('.');
  if (
    extra !== undefined ||
    !/^[a-f0-9]{64}$/.test(emailHash ?? '') ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature ?? '')
  ) {
    return null;
  }

  const expected = createHmac('sha256', key).update(emailHash).digest();
  const actual = Buffer.from(signature, 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? emailHash : null;
}
