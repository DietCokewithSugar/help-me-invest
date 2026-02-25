import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { CompanyFilterRequest, CompanyDiagnostic } from '@/types';

/**
 * POST /api/companies/filter
 * 筛选公司诊断数据
 * 
 * Request body: CompanyFilterRequest
 */
export async function POST(request: NextRequest) {
    try {
        const body: CompanyFilterRequest = await request.json();

        const {
            strategicPositioning,
            marketCapSize,
            cyclicalNature,
            cashFlowStatus,
            debtStructure,
            externalSensitivity,
            profitModel,
            sectors,
            industries,
            marketCapMin,
            marketCapMax,
            searchQuery,
            page = 1,
            limit = 50,
        } = body;

        const supabase = getSupabase();
        if (!supabase) {
            return NextResponse.json(
                { success: false, error: 'Supabase 未配置' },
                { status: 500 }
            );
        }

        // 构建查询
        let query = supabase
            .from('company_diagnostics')
            .select('*', { count: 'exact' });

        // 应用筛选条件
        if (strategicPositioning && strategicPositioning.length > 0) {
            query = query.in('strategic_positioning', strategicPositioning);
        }

        if (marketCapSize && marketCapSize.length > 0) {
            query = query.in('market_cap_size', marketCapSize);
        }

        if (cyclicalNature && cyclicalNature.length > 0) {
            query = query.in('cyclical_nature', cyclicalNature);
        }

        if (cashFlowStatus && cashFlowStatus.length > 0) {
            query = query.in('cash_flow_status', cashFlowStatus);
        }

        if (debtStructure && debtStructure.length > 0) {
            query = query.in('debt_structure', debtStructure);
        }

        if (externalSensitivity && externalSensitivity.length > 0) {
            query = query.in('external_sensitivity', externalSensitivity);
        }

        if (profitModel && profitModel.length > 0) {
            query = query.in('profit_model', profitModel);
        }

        if (sectors && sectors.length > 0) {
            query = query.in('sector', sectors);
        }

        if (industries && industries.length > 0) {
            query = query.in('industry', industries);
        }

        if (marketCapMin !== undefined) {
            query = query.gte('market_cap', marketCapMin);
        }

        if (marketCapMax !== undefined) {
            query = query.lte('market_cap', marketCapMax);
        }

        // 搜索：按股票代码或公司名称模糊匹配
        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim();
            query = query.or(`symbol.ilike.%${q}%,company_name.ilike.%${q}%`);
        }

        // 只返回活跃交易的股票
        query = query.eq('is_actively_trading', true);

        // 排除 ETF 和基金
        query = query.eq('is_etf', false);
        query = query.eq('is_fund', false);

        // 分页
        const pageLimit = Math.min(limit, 100); // 最多返回 100 条
        const offset = (page - 1) * pageLimit;
        query = query.range(offset, offset + pageLimit - 1);

        // 排序：按市值降序
        query = query.order('market_cap', { ascending: false, nullsFirst: false });

        const { data, error, count } = await query;

        if (error) {
            console.error('筛选公司失败:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data as CompanyDiagnostic[],
            total: count || 0,
            page,
            limit: pageLimit,
        });
    } catch (error: any) {
        console.error('筛选公司 API 错误:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
