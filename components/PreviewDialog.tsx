import type { EmailTheme } from '@/lib/validation/message';

export interface MessageDraft {
  recipient: string;
  subject: string;
  body: string;
  category: string;
  scheduledAt: string | null;
  theme: EmailTheme;
  deleteAfterDelivery: boolean;
}

export function PreviewDialog({
  draft,
  busy,
  error,
  onClose,
  onConfirm
}: {
  draft: MessageDraft;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const scheduledLabel = draft.scheduledAt
    ? new Date(draft.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Send immediately';

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="preview-title" aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-heading">
          <div><span className="eyebrow">Before it leaves the relay</span><h2 id="preview-title">Message preview</h2></div>
          <button aria-label="Close preview" className="icon-button" onClick={onClose} type="button">×</button>
        </div>
        <div className={`email-preview email-${draft.theme}`}>
          <div className="mail-meta">
            <p><span>From</span> WhisperPost relay</p>
            <p><span>To</span> {draft.recipient}</p>
            <p><span>Subject</span> {draft.subject}</p>
            <p><span>Delivery</span> {scheduledLabel}</p>
          </div>
          <div className="mail-body">
            <p className="mail-category">{draft.category}</p>
            <p className="message-copy">{draft.body}</p>
            {draft.deleteAfterDelivery && <p className="destruct-note">WhisperPost deletes its stored copy after the provider accepts delivery. This cannot recall the delivered email.</p>}
            <p className="mail-footer">The sender address is not included. Providers may process delivery metadata.</p>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="button-subtle" disabled={busy} onClick={onClose} type="button">Back to edit</button>
          <button className="button-primary" disabled={busy} onClick={onConfirm} type="button">
            {busy ? 'Queuing…' : draft.scheduledAt ? 'Confirm schedule' : 'Confirm & send'}
          </button>
        </div>
      </section>
    </div>
  );
}
