import Link from 'next/link';

export const metadata = { title: 'Privacy | WhisperPost' };

export default function PrivacyPage() {
  return (
    <main className="document-page">
      <Link className="back-link" href="/">← Back to WhisperPost</Link>
      <span className="eyebrow">The short version, without the fine print</span>
      <h1>Privacy & delivery</h1>
      <p className="document-lead">WhisperPost is a small anonymous-message relay. “Anonymous” describes what the recipient sees; it is not a promise that every service involved is unable to identify a sender.</p>
      <section><h2>What the relay handles</h2><p>The recipient email address, subject, message, category, and email theme are encrypted with AES-256-GCM while queued in the local SQLite database. They are decrypted by the delivery worker to send the email. Scheduled times and delivery status are stored separately.</p></section>
      <section><h2>Delivery providers and logs</h2><p>The operator's hosting provider and SMTP/email provider process network and delivery data. Providers can log IP addresses, recipient addresses, message content, bounces, and delivery metadata according to their own policies. The app does not store the sender IP in the message database, but the hosting platform or a proxy may log it.</p></section>
      <section><h2>Retention and delete-after-delivery</h2><p>Successful delivery records and old pending/failed messages are removed after 30 days. “Delete our copy after delivery” removes the encrypted app copy when the SMTP server accepts the email. It does not erase or recall the delivered message or provider copies.</p></section>
      <section><h2>Opt out</h2><p>Each message includes an unsubscribe link. After confirmation, the recipient's normalized email address is stored as a one-way SHA-256 hash to block future submissions.</p></section>
      <section><h2>Use thoughtfully</h2><p>Do not send threatening, harassing, or unlawful content. Do not include information you would not want the recipient or service providers to see. This MVP has basic rate limiting but no AI moderation or guaranteed abuse prevention.</p></section>
      <p className="document-updated">WhisperPost MVP privacy notes. The site operator should replace these notes with contact information and any legally required notices before public launch.</p>
    </main>
  );
}
