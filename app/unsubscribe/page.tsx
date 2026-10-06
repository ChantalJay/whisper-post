import Link from 'next/link';
import { OptOutForm } from '@/components/OptOutForm';

export const metadata = { title: 'Stop future messages | WhisperPost' };

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t = '' } = await searchParams;
  return (
    <main className="document-page optout-page">
      <Link className="back-link" href="/">← WhisperPost</Link>
      <span className="eyebrow">Recipient preferences</span>
      <h1>Stop future messages</h1>
      <p className="document-lead">Confirm below to block future WhisperPost messages sent to this address.</p>
      <OptOutForm token={t} />
    </main>
  );
}
