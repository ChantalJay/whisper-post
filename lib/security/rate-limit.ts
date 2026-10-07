import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const WINDOW_MS = 15 * 60_000;
const MAX_REQUESTS = 5;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();
let distributedLimiter: Ratelimit | undefined;

function allowLocally(address: string): boolean {
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

export async function allowMessageSubmission(request: NextRequest): Promise<boolean> {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const address = forwardedFor?.split(',')[0]?.trim() || 'unknown';

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url && !token && !process.env.VERCEL) return allowLocally(address);
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for distributed rate limiting.');
  }

  distributedLimiter ??= new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '15 m'),
    prefix: 'whisperpost:message-submission'
  });
  const result = await distributedLimiter.limit(address);
  return result.success;
}
