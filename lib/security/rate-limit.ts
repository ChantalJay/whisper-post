import type { NextRequest } from 'next/server';

const WINDOW_MS = 15 * 60_000;
const MAX_REQUESTS = 5;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

export function allowMessageSubmission(request: NextRequest): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const address = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const bucket = requestBuckets.get(address);

  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    requestBuckets.set(address, { startedAt: now, count: 1 });
    if (requestBuckets.size > 5000) {
      for (const [key, value] of requestBuckets) {
        if (now - value.startedAt >= WINDOW_MS) requestBuckets.delete(key);
      }
    }
    return true;
  }

  bucket.count += 1;
  return bucket.count <= MAX_REQUESTS;
}
