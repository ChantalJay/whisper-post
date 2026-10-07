'use client';

import { useState, type FormEvent } from 'react';
import { CategoryPicker } from '@/components/CategoryPicker';
import { IdeaVault } from '@/components/IdeaVault';
import { PreviewDialog, type MessageDraft } from '@/components/PreviewDialog';
import { SchedulePicker } from '@/components/SchedulePicker';
import { ThemePicker } from '@/components/ThemePicker';
import { promptCategories, type Prompt, type PromptCategory } from '@/lib/prompts';
import type { EmailTheme } from '@/lib/validation/message';

const emojiShortcuts = ['💌', '🌹', '✨', '💡', '🤫'];

export function MessageComposer() {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(promptCategories[0]);
  const [theme, setTheme] = useState<EmailTheme>('midnight');
  const [scheduled, setScheduled] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');
  const [deleteAfterDelivery, setDeleteAfterDelivery] = useState(false);
  const [humanConfirmed, setHumanConfirmed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [queuedId, setQueuedId] = useState('');
  const [queuedAt, setQueuedAt] = useState('');

  function applyPrompt(nextCategory: PromptCategory, prompt: Prompt) {
    setCategory(nextCategory);
    setSubject(prompt.subject);
    setMessage(prompt.body);
  }

  function randomizePrompt() {
    const prompt = category.prompts[Math.floor(Math.random() * category.prompts.length)];
    applyPrompt(category, prompt);
  }

  function reset() {
    setRecipient('');
    setSubject('');
    setMessage('');
    setCategory(promptCategories[0]);
    setTheme('midnight');
    setScheduled(false);
    setScheduleValue('');
    setDeleteAfterDelivery(false);
    setHumanConfirmed(false);
    setError('');
  }

  function openPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPreviewOpen(true);
  }

  async function submitMessage() {
    setBusy(true);
    setError('');
    try {
      const scheduledAt = scheduled ? new Date(scheduleValue).toISOString() : null;
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          subject: subject.trim() || category.prompts[0].subject,
          body: message,
          category: `${category.emoji} ${category.label}`,
          theme,
          scheduledAt,
          deleteAfterDelivery,
          humanConfirmed
        })
      });
      const result = await response.json() as { id?: string; scheduledAt?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'The message could not be queued.');
      setQueuedId(result.id ?? '');
      setQueuedAt(result.scheduledAt ?? '');
      setPreviewOpen(false);
      reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The message could not be queued.');
    } finally {
      setBusy(false);
    }
  }

  const draft: MessageDraft = {
    recipient: recipient.trim(),
    subject: subject.trim() || category.prompts[0].subject,
    body: message.trim(),
    category: `${category.emoji} ${category.label}`,
    scheduledAt: scheduled && scheduleValue ? new Date(scheduleValue).toISOString() : null,
    theme,
    deleteAfterDelivery
  };

  return (
    <>
      <section className="composer-card" id="composer">
        <div className="composer-heading">
          <div>
            <span className="eyebrow">A note, without a signature</span>
            <h2>Compose a whisper</h2>
            <p>Write something thoughtful. The email relay does not ask for your name or email address.</p>
          </div>
          <button aria-label="Reset message form" className="text-button" onClick={reset} type="button"><span aria-hidden="true">↺</span> Reset</button>
        </div>

        <form
          className="composer-form"
          onChangeCapture={() => setError('')}
          onInvalidCapture={() => setError('Please complete the required fields before reviewing your message.')}
          onSubmit={openPreview}
        >
          <label className="field-group">
            <span className="field-label">Recipient email <span className="required-mark">*</span></span>
            <input autoComplete="email" maxLength={254} onChange={(event) => setRecipient(event.target.value)} placeholder="friend@example.com" required type="email" value={recipient} />
          </label>

          <CategoryPicker categories={promptCategories} onSelect={setCategory} selected={category} />

          <div className="inspiration-bar">
            <div><span className="inspiration-icon">✦</span><span><strong>Need a starting point?</strong><small>Use a prompt or explore the idea vault.</small></span></div>
            <div className="inspiration-actions">
              <button className="button-subtle" onClick={randomizePrompt} type="button">Shuffle idea</button>
              <IdeaVault categories={promptCategories} onChoose={applyPrompt} />
            </div>
          </div>

          <label className="field-group">
            <span className="field-label">Subject line <span className="field-note">Optional</span></span>
            <input maxLength={120} onChange={(event) => setSubject(event.target.value)} placeholder="A little note for you..." value={subject} />
          </label>

          <label className="field-group">
            <span className="field-label">Your message <span className="required-mark">*</span><span className="character-count">{message.length} / 2000</span></span>
            <textarea maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="Write your message here..." required rows={7} value={message} />
          </label>
          <div aria-label="Add an emoji" className="emoji-row">
            {emojiShortcuts.map((emoji) => (
              <button aria-label={`Add ${emoji}`} key={emoji} onClick={() => setMessage((current) => `${current}${emoji}`.slice(0, 2000))} type="button">{emoji}</button>
            ))}
          </div>

          <SchedulePicker onScheduledChange={setScheduled} onValueChange={setScheduleValue} scheduled={scheduled} value={scheduleValue} />
          <ThemePicker onChange={setTheme} value={theme} />

          <label className="privacy-toggle">
            <input checked={deleteAfterDelivery} onChange={(event) => setDeleteAfterDelivery(event.target.checked)} type="checkbox" />
            <span><strong>Delete our copy after delivery</strong><small>This cannot delete or recall the email from the recipient's inbox.</small></span>
          </label>

          <label className="consent-row">
            <input checked={humanConfirmed} onChange={(event) => setHumanConfirmed(event.target.checked)} required type="checkbox" />
            <span>I will use WhisperPost respectfully. <span className="required-mark">Required</span></span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button-subtle" onClick={() => {
              const form = document.querySelector<HTMLFormElement>('.composer-form');
              if (form?.reportValidity()) {
                setError('');
                setPreviewOpen(true);
              }
            }} type="button">Preview</button>
            <button className="button-primary" type="submit">{scheduled ? 'Review scheduled message' : 'Review before sending'} <span aria-hidden="true">→</span></button>
          </div>
          <p className="field-note">Next, review your message and confirm to queue it for delivery.</p>
        </form>
      </section>

      {previewOpen && (
        <PreviewDialog
          busy={busy}
          draft={draft}
          error={error}
          onClose={() => { if (!busy) setPreviewOpen(false); }}
          onConfirm={submitMessage}
        />
      )}
      {queuedId && (
        <div className="dialog-backdrop">
          <section aria-labelledby="success-title" aria-modal="true" className="dialog-card success-card" role="dialog">
            <span className="success-icon">✓</span>
            <span className="eyebrow">Accepted by the relay</span>
            <h2 id="success-title">{queuedAt && new Date(queuedAt).getTime() > Date.now() + 30_000 ? 'Your whisper is scheduled' : 'Your whisper is queued'}</h2>
            <p>Email delivery depends on the site's configured provider. A queued message is not proof it reached the inbox.</p>
            <p className="status-code">Message ID <code>{queuedId}</code></p>
            <button className="button-primary" onClick={() => setQueuedId('')} type="button">Compose another</button>
          </section>
        </div>
      )}
    </>
  );
}
