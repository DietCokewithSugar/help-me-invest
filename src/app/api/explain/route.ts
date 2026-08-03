import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekClient } from '@/lib/deepseek';
import { withRetryAndTimeout } from '@/lib/api-utils';
import { apiErrorResponse, enforceRateLimit, readJsonWithLimit, truncateText } from '@/lib/api-security';

export const maxDuration = 60;
const MAX_REQUEST_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
    try {
        enforceRateLimit(request, { key: 'explain', limit: 20, windowMs: 60_000 });

        const { text, language = 'zh' } = await readJsonWithLimit<any>(request, MAX_REQUEST_BYTES);

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: '请提供有效的文本' }, { status: 400 });
        }

        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        if (!deepseekApiKey) {
            return NextResponse.json({ error: 'DeepSeek API 密钥未配置' }, { status: 500 });
        }

        const deepseek = new DeepSeekClient(deepseekApiKey);

        const limitedText = truncateText(text, 1000);

        const explanation = await withRetryAndTimeout(
            (signal) => deepseek.explainText(limitedText, language, signal),
            { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000, label: 'explainText' },
            ''
        );

        return NextResponse.json({
            explanation,
        });
    } catch (error: any) {
        console.error('Explanation API error:', error);
        return apiErrorResponse(error, '解释失败，请稍后重试');
    }
}
