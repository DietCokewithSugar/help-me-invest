import { NextResponse } from 'next/server';
import { getTotalReportCount } from '@/lib/supabase';

/**
 * GET /api/report-count
 * 获取研报总数（全量有效记录数）
 */
export async function GET() {
  try {
    const count = await getTotalReportCount();
    return NextResponse.json({
      success: true,
      count,
      cachedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('研报总数 API 错误:', error);
    return NextResponse.json(
      { success: false, count: 0, error: error.message },
      { status: 500 }
    );
  }
}
