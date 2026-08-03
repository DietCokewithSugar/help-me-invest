import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekClient } from '@/lib/deepseek';
import { withRetryAndTimeout } from '@/lib/api-utils';
import { apiErrorResponse, enforceRateLimit, readJsonWithLimit } from '@/lib/api-security';

export const maxDuration = 30;

const MAX_INPUT_LENGTH = 8000;
const MAX_REQUEST_BYTES = 16 * 1024;

/**
 * POST /api/feedback/translate
 * Body: { text, targetLang: 'zh'|'en', sourceLang? }
 *
 * Uses the existing AI client to translate user-generated feedback for
 * display only — the row in the DB is never modified. If the API key is
 * missing or the call fails, we fall back to the original text and mark the
 * response as `skipped` so the client can hide the "translated" badge.
 */
export async function POST(request: NextRequest) {
  let payload: any;
  try {
    enforceRateLimit(request, { key: 'feedback-translate', limit: 20, windowMs: 60_000 });
    payload = await readJsonWithLimit<any>(request, MAX_REQUEST_BYTES);
  } catch (error) {
    return apiErrorResponse(error, 'Invalid JSON', 400);
  }

  const text = String(payload?.text || '').slice(0, MAX_INPUT_LENGTH);
  const rawTarget = String(payload?.targetLang || 'en');
  const targetLang: 'zh' | 'en' = rawTarget === 'zh' ? 'zh' : 'en';
  const sourceLang = payload?.sourceLang ? String(payload.sourceLang) : 'auto';

  if (!text.trim()) {
    return NextResponse.json({ success: true, translated: '' });
  }
  if (targetLang === sourceLang) {
    return NextResponse.json({ success: true, translated: text, skipped: true });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: true, translated: text, skipped: true });
  }

  try {
    const client = new DeepSeekClient(apiKey);
    const translated = await withRetryAndTimeout(
      (signal) => client.translateText(text, targetLang, sourceLang, signal),
      { maxRetries: 2, retryDelayMs: 500, timeoutMs: 12000, label: 'feedback-translate' },
      text,
    );
    return NextResponse.json({ success: true, translated: translated || text });
  } catch (error: any) {
    console.error('Feedback translate route error:', error?.message || error);
    return NextResponse.json({ success: true, translated: text, error: 'translate-failed' });
  }
}
