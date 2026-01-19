import { NextRequest, NextResponse } from 'next/server';
import { getTrendingStocks, getAllTimeTrending } from '@/lib/supabase';

/**
 * GET /api/trending
 * 获取热门搜索榜单
 * 
 * Query params:
 * - period: 'week' (默认) 或 'all'
 * - limit: 数量限制，默认 8
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20);

    let trending;
    if (period === 'all') {
      trending = await getAllTimeTrending(limit);
    } else {
      trending = await getTrendingStocks(limit);
    }

    return NextResponse.json({
      success: true,
      data: trending,
      period,
      cachedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('热门榜单 API 错误:', error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 }
    );
  }
}
