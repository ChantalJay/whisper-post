import nodemailer from 'nodemailer';

export interface MailTransport {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    messageId: string;
    headers: Record<string, string>;
  }): Promise<unknown>;
}

export interface MailConfiguration {
  transport: MailTransport | null;
  from: string | null;
}

export function createMailConfiguration(): MailConfiguration {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return { transport: null, from: null };

  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('Set both SMTP_USER and SMTP_PASS, or leave both empty.');
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_SECURE !== 'true',
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: user && pass ? { user, pass } : undefined
  });
  return { transport, from };
}
