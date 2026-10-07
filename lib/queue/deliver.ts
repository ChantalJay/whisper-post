import { getMessageStore, type MessageStore } from '../db';
import { createMailConfiguration, type MailConfiguration } from '../mail/transport';
import { renderEmail } from '../mail/template';
import { decryptPayload, getEncryptionKey } from '../security/encryption';
import { createUnsubscribeToken } from '../security/opt-out';

export async function deliverOneDueMessage(
  options: { store?: MessageStore; mail?: MailConfiguration } = {}
): Promise<boolean> {
  const store = options.store ?? getMessageStore();
  const { transport, from } = options.mail ?? createMailConfiguration();
  if (!transport || !from) return false;

  const row = await store.claimDue();
  if (!row) return false;

  try {
    const key = getEncryptionKey();
    const payload = decryptPayload(row, key);
    const token = createUnsubscribeToken(payload.recipient, key);
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const unsubscribeUrl = `${normalizedBaseUrl}/unsubscribe?t=${encodeURIComponent(token)}`;
    const oneClickUnsubscribeUrl = `${normalizedBaseUrl}/api/unsubscribe?t=${encodeURIComponent(token)}`;
    const messageIdDomain = new URL(baseUrl).hostname;
    const content = renderEmail(payload, unsubscribeUrl);
    await transport.sendMail({
      from,
      to: payload.recipient,
      subject: payload.subject,
      text: content.text,
      html: content.html,
      messageId: `<${row.id}@${messageIdDomain}>`,
      headers: {
        'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    });
    await store.markSent(row.id, payload.deleteAfterDelivery);
  } catch (error) {
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code.replace(/[^A-Z0-9_]/gi, '').slice(0, 30) || 'DELIVERY_ERROR'
      : 'DELIVERY_ERROR';
    const retry = await store.markRetry(row.id, row.attempts);
    console.error(`Email delivery failed: id=${row.id} attempt=${row.attempts} code=${code} retry=${retry}`);
  }

  return true;
}
