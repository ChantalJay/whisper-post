import { NextRequest, NextResponse } from 'next/server';
import { getMessageStore } from '@/lib/db';
import { enqueueMessage } from '@/lib/queue/enqueue';
import { allowMessageSubmission } from '@/lib/security/rate-limit';
import { getEncryptionKey } from '@/lib/security/encryption';
import { hashEmail } from '@/lib/security/opt-out';
import { validateMessage } from '@/lib/validation/message';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    return NextResponse.json(
      { error: 'Email delivery is not configured. Please try again later.' },
      { status: 503 }
    );
  }
  if (process.env.VERCEL && !process.env.PUBLIC_BASE_URL) {
    return NextResponse.json(
      { error: 'The public application URL is not configured.' },
      { status: 503 }
    );
  }

  let allowed: boolean;
  try {
    allowed = await allowMessageSubmission(request);
  } catch (error) {
    console.error('Could not check submission rate limit:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Message submission is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Request body contains invalid JSON.' }, { status: 400 });
  }
  if (Buffer.byteLength(rawBody, 'utf8') > 12_000) {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'Request body contains invalid JSON.' }, { status: 400 });
  }

  const result = validateMessage(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const key = getEncryptionKey();
    const store = getMessageStore();
    if (await store.isBlocked(hashEmail(result.payload.recipient))) {
      return NextResponse.json(
        { error: 'This recipient has opted out of future WhisperPost messages.' },
        { status: 403 }
      );
    }
    const id = await enqueueMessage(result.payload, result.scheduledAt);
    return NextResponse.json({
      id,
      status: 'queued',
      scheduledAt: new Date(result.scheduledAt).toISOString()
    }, { status: 202 });
  } catch (error) {
    console.error('Could not queue message:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Message delivery is not configured or the message could not be queued.' },
      { status: 503 }
    );
  }
}
