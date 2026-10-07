import type { EmailTheme, MessagePayload } from '../validation/message';

interface ThemeStyle {
  page: string;
  card: string;
  header: string;
  headerText: string;
  accent: string;
  accentText: string;
  text: string;
  muted: string;
  border: string;
}

const themeStyles: Record<EmailTheme, ThemeStyle> = {
  midnight: {
    page: '#f3f0ff',
    card: '#171329',
    header: '#211a3b',
    headerText: '#f5f1ff',
    accent: '#c4a7ff',
    accentText: '#251443',
    text: '#f5f1ff',
    muted: '#d0c8e6',
    border: '#51416f'
  },
  neon: {
    page: '#e9fbff',
    card: '#071923',
    header: '#0b2633',
    headerText: '#ecfeff',
    accent: '#67e8f9',
    accentText: '#04242b',
    text: '#ecfeff',
    muted: '#b4dce2',
    border: '#176174'
  },
  golden: {
    page: '#fff8e8',
    card: '#fffdf7',
    header: '#553414',
    headerText: '#fff7e8',
    accent: '#f4c66a',
    accentText: '#3c260a',
    text: '#332515',
    muted: '#63523b',
    border: '#ead8b2'
  },
  minimal: {
    page: '#f1f3f5',
    card: '#ffffff',
    header: '#252a31',
    headerText: '#ffffff',
    accent: '#dfe3e8',
    accentText: '#242a31',
    text: '#242a31',
    muted: '#505862',
    border: '#d7dce2'
  }
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
  const safeCategory = escapeHtml(payload.category);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const deletionNotice = payload.deleteAfterDelivery
    ? `<tr><td style="padding:0 28px 22px"><p style="margin:0;padding:12px 14px;border-left:3px solid ${theme.accent};background-color:${theme.header};color:${theme.headerText};font:13px/1.6 Arial,Helvetica,sans-serif">WhisperPost deletes its stored copy after sending. This does not remove the delivered email.</p></td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(payload.subject)}</title></head>
<body style="margin:0;padding:0;background-color:${theme.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.page}" style="width:100%;background-color:${theme.page};">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.card}" style="width:100%;max-width:600px;background-color:${theme.card};border:1px solid ${theme.border};border-radius:14px;overflow:hidden;">
        <tr>
          <td bgcolor="${theme.header}" style="padding:21px 28px;background-color:${theme.header};border-bottom:3px solid ${theme.accent};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="42" style="width:42px;padding-right:11px;">
                  <table role="presentation" width="38" height="38" cellpadding="0" cellspacing="0" border="0" bgcolor="#8b5cf6" style="width:38px;height:38px;border-radius:11px;background-color:#8b5cf6;">
                    <tr><td align="center" valign="middle" style="color:#ffffff;font:700 13px/1 Arial,Helvetica,sans-serif;letter-spacing:-.05em;">W<span style="color:#ffd6f2;">P</span></td></tr>
                  </table>
                </td>
                <td style="color:${theme.headerText};font:700 16px/1.3 Arial,Helvetica,sans-serif;letter-spacing:-.03em;">WhisperPost<br><span style="color:${theme.muted};font:10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;">A note, without a signature</span></td>
                <td align="right" style="color:${theme.accent};font:700 10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;">A note for you</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:28px 28px 10px;">
          <span style="display:inline-block;padding:6px 10px;border-radius:20px;background-color:${theme.accent};color:${theme.accentText};font:700 11px/1.2 Arial,Helvetica,sans-serif;letter-spacing:.04em;">${safeCategory}</span>
        </td></tr>
        <tr><td style="padding:12px 28px 26px;color:${theme.text};font:16px/1.8 Arial,Helvetica,sans-serif;overflow-wrap:anywhere;word-wrap:break-word;">${safeBody}</td></tr>
        ${deletionNotice}
        <tr><td style="padding:0 28px;"><div style="height:1px;background-color:${theme.border};font-size:1px;line-height:1px;">&nbsp;</div></td></tr>
        <tr><td style="padding:18px 28px 24px;color:${theme.muted};font:12px/1.7 Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 6px;color:${theme.text};font-weight:700;">Sent via WhisperPost</p>
          <p style="margin:0;">The sender's address is not included. To block future messages to this address, <a href="${safeUnsubscribeUrl}" style="color:${theme.accent};font-weight:700;text-decoration:underline;">unsubscribe</a>.</p>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;color:${theme.muted};font:11px/1.5 Arial,Helvetica,sans-serif;">A thoughtful note, delivered quietly.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    text: `${payload.body}\n\nSent via WhisperPost. Stop future messages: ${unsubscribeUrl}`,
    html
  };
}
