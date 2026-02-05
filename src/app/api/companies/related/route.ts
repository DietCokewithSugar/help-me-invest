import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { CompanyFilterRequest, CompanyDiagnostic } from '@/types';

interface RelatedCompaniesRequest {
    symbol: string;
    filters?: CompanyFilterRequest;
    limit?: number;
}

/**
 * POST /api/companies/related
 * 获取相关公司推荐
 * 
 * 逻辑：
 * 1. 如果有筛选条件，返回符合相同筛选条件的其他公司
 * 2. 如果没有筛选条件，返回同行业/同板块的公司
 */
export async function POST(request: NextRequest) {
    try {
        const body: RelatedCompaniesRequest = await request.json();
        const { symbol, filters, limit = 5 } = body;

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

        // 首先获取当前公司信息
        const { data: currentCompany, error: companyError } = await supabase
            .from('company_diagnostics')
            .select('*')
            .eq('symbol', symbol.toUpperCase())
            .single();

        if (companyError || !currentCompany) {
            return NextResponse.json(
                { success: false, error: '未找到该公司' },
                { status: 404 }
            );
        }

        // 构建相关公司查询
        let query = supabase
            .from('company_diagnostics')
            .select('*')
            .neq('symbol', symbol.toUpperCase()); // 排除当前公司

        // 如果有筛选条件，使用相同的筛选条件
        if (filters) {
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
            } = filters;

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
        } else {
            // 如果没有筛选条件，使用当前公司的特征进行匹配
            // 优先匹配：同行业 > 同板块 > 同战略定位
            if (currentCompany.industry) {
                query = query.eq('industry', currentCompany.industry);
            } else if (currentCompany.sector) {
                query = query.eq('sector', currentCompany.sector);
            }

            // 同时匹配市场体量
            if (currentCompany.market_cap_size) {
                query = query.eq('market_cap_size', currentCompany.market_cap_size);
            }
        }

        // 只返回活跃交易的股票
        query = query.eq('is_actively_trading', true);

        // 排除 ETF 和基金
        query = query.eq('is_etf', false);
        query = query.eq('is_fund', false);

        // 限制数量并按市值排序
        query = query
            .order('market_cap', { ascending: false, nullsFirst: false })
            .limit(limit);

        const { data, error } = await query;

        if (error) {
            console.error('获取相关公司失败:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: (data || []) as CompanyDiagnostic[],
        });
    } catch (error: any) {
        console.error('获取相关公司 API 错误:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
