import { NextResponse } from 'next/server';
import { getMessageStore } from '@/lib/db';
import { deliverOneDueMessage } from '@/lib/queue/deliver';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_MESSAGES_PER_RUN = 3;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 });
  }
  if (!process.env.PUBLIC_BASE_URL) {
    return NextResponse.json({ error: 'The public application URL is not configured.' }, { status: 503 });
  }

  try {
    const store = getMessageStore();
    await store.recoverStaleClaims();
    await store.pruneExpired();

    let processed = 0;
    while (processed < MAX_MESSAGES_PER_RUN && await deliverOneDueMessage({ store })) {
      processed += 1;
    }
    return NextResponse.json({ processed });
  } catch (error) {
    console.error('Could not process delivery queue:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Delivery queue processing failed.' }, { status: 500 });
  }
}
