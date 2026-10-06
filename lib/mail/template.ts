import type { EmailTheme, MessagePayload } from '../validation/message';

const themeStyles: Record<EmailTheme, { background: string; border: string; color: string; accent: string }> = {
  midnight: { background: '#0f172a', border: '#a855f7', color: '#f1f5f9', accent: '#c4b5fd' },
  neon: { background: '#020617', border: '#22d3ee', color: '#cffafe', accent: '#67e8f9' },
  golden: { background: '#1c1917', border: '#f59e0b', color: '#fef3c7', accent: '#fcd34d' },
  minimal: { background: '#0f172a', border: '#475569', color: '#f1f5f9', accent: '#cbd5e1' }
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] as string);
}

export function renderEmail(payload: MessagePayload, unsubscribeUrl: string) {
  const theme = themeStyles[payload.theme];
  const safeBody = escapeHtml(payload.body).replace(/\r?\n/g, '<br>');
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const deletionNotice = payload.deleteAfterDelivery
    ? '<p style="color:#cbd5e1">WhisperPost deletes its stored copy after sending. This does not remove the delivered email.</p>'
    : '';

  return {
    text: `${payload.body}\n\nSent via WhisperPost. Stop future messages: ${unsubscribeUrl}`,
    html: `<main style="font:16px/1.6 system-ui,sans-serif;max-width:38rem;margin:2rem auto;padding:1.5rem;background:${theme.background};border:1px solid ${theme.border};border-radius:16px;color:${theme.color}"><p style="color:${theme.accent};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(payload.category)}</p><p style="white-space:pre-wrap">${safeBody}</p>${deletionNotice}<hr style="border:0;border-top:1px solid #64748b"><p style="font-size:12px;color:#cbd5e1">Sent via WhisperPost. The sender's address is not included. To block future messages to this address, <a style="color:${theme.accent}" href="${safeUnsubscribeUrl}">unsubscribe</a>.</p></main>`
  };
}
