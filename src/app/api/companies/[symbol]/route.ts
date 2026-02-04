import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { CompanyDiagnostic } from '@/types';

/**
 * GET /api/companies/:symbol
 * 获取单个公司的诊断数据
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { symbol: string } }
) {
    try {
        const { symbol } = params;

        if (!symbol) {
            return NextResponse.json(
                { success: false, error: '缺少股票代码' },
                { status: 400 }
            );
        }

        const supabase = getSupabase();
        if (!supabase) {
            return NextResponse.json(
                { success: false, error: 'Supabase 未配置' },
                { status: 500 }
            );
        }

        const { data, error } = await supabase
            .from('company_diagnostics')
            .select('*')
            .eq('symbol', symbol.toUpperCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: '未找到该公司' },
                    { status: 404 }
                );
            }
            console.error('获取公司数据失败:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data as CompanyDiagnostic,
        });
    } catch (error: any) {
        console.error('获取公司 API 错误:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
