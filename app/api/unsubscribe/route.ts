import { NextRequest, NextResponse } from 'next/server';
import { getMessageStore } from '@/lib/db';
import { getEncryptionKey } from '@/lib/security/encryption';
import { verifyUnsubscribeToken } from '@/lib/security/opt-out';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  let token = requestUrl.searchParams.get('t') ?? '';

  if (contentType === 'application/x-www-form-urlencoded') {
    let body: URLSearchParams;
    try {
      body = new URLSearchParams(await request.text());
    } catch {
      return NextResponse.json({ error: 'Invalid unsubscribe request.' }, { status: 400 });
    }
    if (body.get('List-Unsubscribe') !== 'One-Click') {
      return NextResponse.json({ error: 'Invalid unsubscribe request.' }, { status: 400 });
    }
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid unsubscribe request.' }, { status: 400 });
    }
    if (body && typeof body === 'object' && 'token' in body && typeof body.token === 'string') {
      token = body.token;
    }
  }

  try {
    const emailHash = verifyUnsubscribeToken(token, getEncryptionKey());
    if (!emailHash) return NextResponse.json({ error: 'This unsubscribe link is invalid.' }, { status: 400 });
    await getMessageStore().block(emailHash);
    return NextResponse.json({ status: 'unsubscribed' });
  } catch (error) {
    console.error('Could not process unsubscribe:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unsubscribe is temporarily unavailable.' }, { status: 503 });
  }
}
