import { NextRequest, NextResponse } from 'next/server';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, Bucket>();

export class ApiSecurityError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiSecurityError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function pruneExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size < 5000) return;

  rateLimitBuckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  });
}

export function enforceRateLimit(request: NextRequest, options: RateLimitOptions): void {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const clientKey = `${options.key}:${getClientIp(request)}`;
  const bucket = rateLimitBuckets.get(clientKey);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(clientKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  bucket.count += 1;
  if (bucket.count > options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new ApiSecurityError(429, '请求过于频繁，请稍后再试', retryAfterSeconds);
  }
}

export async function readJsonWithLimit<T>(request: NextRequest, maxBytes: number): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    throw new ApiSecurityError(413, '请求体过大');
  }

  const raw = await request.text();
  const byteLength = new TextEncoder().encode(raw).length;
  if (byteLength > maxBytes) {
    throw new ApiSecurityError(413, '请求体过大');
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiSecurityError(400, 'Invalid JSON');
  }
}

export function truncateText(value: unknown, maxChars: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxChars);
}

export function requireInternalApiKey(request: NextRequest): void {
  const expected = process.env.AI_INTERNAL_API_KEY;
  if (!expected) {
    throw new ApiSecurityError(404, 'Not found');
  }

  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.replace(/^Bearer\s+/i, '').trim();
  const provided = bearer || request.headers.get('x-internal-api-key') || '';

  if (provided !== expected) {
    throw new ApiSecurityError(404, 'Not found');
  }
}

export function apiErrorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 500): NextResponse {
  if (error instanceof ApiSecurityError) {
    const headers = error.retryAfterSeconds
      ? { 'Retry-After': String(error.retryAfterSeconds) }
      : undefined;
    return NextResponse.json({ error: error.message }, { status: error.status, headers });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}
