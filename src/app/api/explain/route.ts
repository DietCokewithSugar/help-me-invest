import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: '请提供有效的文本' }, { status: 400 });
        }

        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (!googleApiKey) {
            return NextResponse.json({ error: 'Google API 密钥未配置' }, { status: 500 });
        }

        const gemini = new GeminiClient(googleApiKey);

        // 限制文本长度，防止滥用
        const limitedText = text.trim().slice(0, 1000);

        const explanation = await gemini.explainText(limitedText);

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
