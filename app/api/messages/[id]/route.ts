import { NextResponse } from 'next/server';
import { getMessageStore } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Message was not found.' }, { status: 404 });
  }

  try {
    const message = await getMessageStore().getStatus(id);
    if (!message) return NextResponse.json({ error: 'Message was not found.' }, { status: 404 });
    return NextResponse.json({
      id,
      status: message.status,
      scheduledAt: new Date(message.scheduledAt).toISOString()
    });
  } catch (error) {
    console.error('Could not read message status:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Message status is unavailable.' }, { status: 503 });
  }
}
