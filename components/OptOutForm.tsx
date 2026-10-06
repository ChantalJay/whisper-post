'use client';

import { useState } from 'react';

export function OptOutForm({ token }: { token: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function unsubscribe() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unsubscribe could not be completed.');
      setMessage('This address is now blocked from future WhisperPost messages.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unsubscribe could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <p className="form-error" role="alert">This unsubscribe link is incomplete.</p>;

  return (
    <div className="optout-action">
      <button className="button-primary" disabled={busy} onClick={unsubscribe} type="button">
        {busy ? 'Saving…' : 'Block future messages'}
      </button>
      {message && <p aria-live="polite" className={message.startsWith('This address') ? 'success-message' : 'form-error'}>{message}</p>}
    </div>
  );
}
