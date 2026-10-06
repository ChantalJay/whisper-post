export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_SUBJECT_LENGTH = 120;
export const MAX_SCHEDULE_DAYS = 365;

export const themes = ['midnight', 'neon', 'golden', 'minimal'] as const;
export type EmailTheme = (typeof themes)[number];

export interface MessagePayload {
  recipient: string;
  subject: string;
  body: string;
  category: string;
  theme: EmailTheme;
  deleteAfterDelivery: boolean;
}

export interface CreateMessageInput {
  recipient: string;
  subject: string;
  body: string;
  category: string;
  theme: string;
  scheduledAt?: string | null;
  deleteAfterDelivery?: boolean;
  humanConfirmed: boolean;
}

export type ValidationResult =
  | { ok: true; payload: MessagePayload; scheduledAt: number }
  | { ok: false; error: string };

export function validateMessage(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const value = input as Partial<CreateMessageInput>;
  const recipient = typeof value.recipient === 'string' ? value.recipient.trim() : '';
  if (recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { ok: false, error: 'Enter a valid recipient email address.' };
  }

  const body = typeof value.body === 'string' ? value.body.trim() : '';
  if (!body || body.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must contain 1 to ${MAX_MESSAGE_LENGTH} characters.` };
  }

  const subject = typeof value.subject === 'string' ? value.subject.trim() : '';
  if (!subject || subject.length > MAX_SUBJECT_LENGTH || /[\r\n]/.test(subject)) {
    return { ok: false, error: `Subject must contain 1 to ${MAX_SUBJECT_LENGTH} characters.` };
  }

  const category = typeof value.category === 'string' ? value.category.trim() : '';
  if (!category || category.length > 60 || /[\u0000-\u001f\u007f]/.test(category)) {
    return { ok: false, error: 'Choose a valid message category.' };
  }

  if (!themes.includes(value.theme as EmailTheme)) {
    return { ok: false, error: 'Choose a valid email theme.' };
  }

  if (value.humanConfirmed !== true) {
    return { ok: false, error: 'Confirm that you will use the service respectfully.' };
  }

  let scheduledAt = Date.now();
  if (value.scheduledAt !== null && value.scheduledAt !== undefined) {
    if (typeof value.scheduledAt !== 'string') {
      return { ok: false, error: 'Choose a valid delivery time.' };
    }
    scheduledAt = Date.parse(value.scheduledAt);
    const maxSchedule = Date.now() + MAX_SCHEDULE_DAYS * 24 * 60 * 60_000;
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now() || scheduledAt > maxSchedule) {
      return { ok: false, error: 'Scheduled delivery must be in the future and within one year.' };
    }
  }

  return {
    ok: true,
    payload: {
      recipient: recipient.toLowerCase(),
      subject,
      body,
      category,
      theme: value.theme as EmailTheme,
      deleteAfterDelivery: value.deleteAfterDelivery === true
    },
    scheduledAt
  };
}
