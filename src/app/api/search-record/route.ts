import { NextRequest, NextResponse } from 'next/server';
import { recordSearch, markSearchInvalid } from '@/lib/supabase';

/**
 * POST /api/search-record
 * 记录用户搜索或标记搜索为无效
 */
export async function POST(request: NextRequest) {
  try {
    const { symbol, companyName, action } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: '缺少股票代码' },
        { status: 400 }
      );
    }

    // action: 'record' (默认) 或 'invalidate'
    if (action === 'invalidate') {
      // 标记为无效（当 AI 返回"这不是股票"错误时）
      const success = await markSearchInvalid(symbol);
      return NextResponse.json({ success });
    }

    // 默认：记录搜索
    const result = await recordSearch(symbol, companyName);
    
    if (!result.success) {
      // 即使记录失败，也不应该阻止用户的主要搜索流程
      console.error('记录搜索失败，但不影响主流程:', result.error);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('搜索记录 API 错误:', error);
    // 返回成功，避免影响用户体验
    return NextResponse.json({ success: false, error: error.message });
  }
}
