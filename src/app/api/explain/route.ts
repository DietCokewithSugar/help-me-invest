import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { withRetryAndTimeout } from '@/lib/api-utils';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const { text, language = 'zh' } = await request.json();

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: '请提供有效的文本' }, { status: 400 });
        }

        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        if (!deepseekApiKey) {
            return NextResponse.json({ error: 'DeepSeek API 密钥未配置' }, { status: 500 });
        }

        const gemini = new GeminiClient(deepseekApiKey);

        const limitedText = text.trim().slice(0, 1000);

        const explanation = await withRetryAndTimeout(
            () => gemini.explainText(limitedText, language),
            { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000, label: 'explainText' },
            ''
        );

        return NextResponse.json({
            explanation,
        });
    } catch (error: any) {
        console.error('Explanation API error:', error);
        return NextResponse.json(
            { error: error.message || '解释失败，请稍后重试' },
            { status: 500 }
        );
    }
}
