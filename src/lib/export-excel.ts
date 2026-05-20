import * as XLSX from 'xlsx';
import type { ReportData } from '@/types';

type ExcelTranslations = { excel: Record<string, string> };


function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}

export function exportReportToExcel(data: ReportData, t: ExcelTranslations) {
  const wb = XLSX.utils.book_new();
  const { profile } = data;
  const txt = t.excel;

  // --- Sheet 1: Company Overview ---
  const overviewData = [
    [txt.field, txt.value],
    [txt.companyName, profile.companyName],
    [txt.symbol, profile.symbol],
    [txt.sector, profile.sector || 'N/A'],
    [txt.industry, profile.industry || 'N/A'],
    [txt.country, profile.country || 'N/A'],
    [txt.exchange, profile.exchange || profile.exchangeShortName || 'N/A'],
    [txt.marketCap, profile.marketCap || profile.mktCap || 0],
    [txt.price, profile.price || 0],
    [txt.employees, profile.fullTimeEmployees || 'N/A'],
    [txt.ipoDate, profile.ipoDate || 'N/A'],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, txt.companyOverview);

  // --- Sheet 2: Income Statement ---
  if (data.incomeStatements && data.incomeStatements.length > 0) {
    const years = data.incomeStatements.map(s => s.calendarYear || s.date?.split('-')[0] || '');
    const incomeHeader = [txt.field, ...years];
    const incomeFields: [string, keyof typeof data.incomeStatements[0]][] = [
      [txt.revenue, 'revenue'],
      [txt.costOfRevenue, 'costOfRevenue'],
      [txt.grossProfit, 'grossProfit'],
      [txt.grossProfitMargin, 'grossProfitRatio'],
      [txt.rAndD, 'researchAndDevelopmentExpenses'],
      [txt.sgAndA, 'sellingGeneralAndAdministrativeExpenses'],
      [txt.operatingExpenses, 'operatingExpenses'],
      [txt.operatingIncome, 'operatingIncome'],
      [txt.operatingMargin, 'operatingIncomeRatio'],
      [txt.interestExpense, 'interestExpense'],
      [txt.incomeTax, 'incomeTaxExpense'],
      [txt.netIncome, 'netIncome'],
      [txt.netMargin, 'netIncomeRatio'],
      [txt.ebitda, 'ebitda'],
      [txt.eps, 'eps'],
      [txt.epsDiluted, 'epsdiluted'],
    ];
    const incomeRows = [incomeHeader, ...incomeFields.map(([label, key]) =>
      [label, ...data.incomeStatements.map(s => (s as unknown as Record<string, unknown>)[key] ?? '')]
    )];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeRows);
    wsIncome['!cols'] = [{ wch: 28 }, ...years.map(() => ({ wch: 18 }))];
    XLSX.utils.book_append_sheet(wb, wsIncome, txt.incomeStatement);
  }

  // --- Sheet 3: Balance Sheet ---
  if (data.balanceSheets && data.balanceSheets.length > 0) {
    const years = data.balanceSheets.map(s => s.calendarYear || s.date?.split('-')[0] || '');
    const bsHeader = [txt.field, ...years];
    const bsFields: [string, keyof typeof data.balanceSheets[0]][] = [
      [txt.cashAndEquivalents, 'cashAndCashEquivalents'],
      [txt.shortTermInvestments, 'shortTermInvestments'],
      [txt.netReceivables, 'netReceivables'],
      [txt.inventory, 'inventory'],
      [txt.totalCurrentAssets, 'totalCurrentAssets'],
      [txt.totalAssets, 'totalAssets'],
      [txt.totalCurrentLiabilities, 'totalCurrentLiabilities'],
      [txt.longTermDebt, 'longTermDebt'],
      [txt.totalLiabilities, 'totalLiabilities'],
      [txt.retainedEarnings, 'retainedEarnings'],
      [txt.totalEquity, 'totalStockholdersEquity'],
      [txt.totalDebt, 'totalDebt'],
      [txt.netDebt, 'netDebt'],
    ];
    const bsRows = [bsHeader, ...bsFields.map(([label, key]) =>
      [label, ...data.balanceSheets.map(s => (s as unknown as Record<string, unknown>)[key] ?? '')]
    )];
    const wsBs = XLSX.utils.aoa_to_sheet(bsRows);
    wsBs['!cols'] = [{ wch: 28 }, ...years.map(() => ({ wch: 18 }))];
    XLSX.utils.book_append_sheet(wb, wsBs, txt.balanceSheet);
  }

  // --- Sheet 4: Cash Flow ---
  if (data.cashFlowStatements && data.cashFlowStatements.length > 0) {
    const years = data.cashFlowStatements.map(s => s.calendarYear || s.date?.split('-')[0] || '');
    const cfHeader = [txt.field, ...years];
    const cfFields: [string, keyof typeof data.cashFlowStatements[0]][] = [
      [txt.operatingCashFlow, 'operatingCashFlow'],
      [txt.capex, 'capitalExpenditure'],
      [txt.freeCashFlow, 'freeCashFlow'],
      [txt.netCashFromOperating, 'netCashProvidedByOperatingActivities'],
      [txt.netCashFromInvesting, 'netCashUsedForInvestingActivites'],
      [txt.netCashFromFinancing, 'netCashUsedProvidedByFinancingActivities'],
      [txt.dividendsPaid, 'dividendsPaid'],
      [txt.stockRepurchased, 'commonStockRepurchased'],
      [txt.netChangeInCash, 'netChangeInCash'],
    ];
    const cfRows = [cfHeader, ...cfFields.map(([label, key]) =>
      [label, ...data.cashFlowStatements.map(s => (s as unknown as Record<string, unknown>)[key] ?? '')]
    )];
    const wsCf = XLSX.utils.aoa_to_sheet(cfRows);
    wsCf['!cols'] = [{ wch: 28 }, ...years.map(() => ({ wch: 18 }))];
    XLSX.utils.book_append_sheet(wb, wsCf, txt.cashFlow);
  }

  // --- Sheet 5: AI Analysis ---
  const aiSections: [string, string][] = [];
  if (data.beginnerAiAnalysis) {
    const ba = data.beginnerAiAnalysis;
    if (ba.beginnerVerdict) aiSections.push(['Verdict', stripMarkdown(ba.beginnerVerdict)]);
    if (ba.beginnerCompanyIntro) aiSections.push(['Company Intro', stripMarkdown(ba.beginnerCompanyIntro)]);
    if (ba.beginnerRiskReward) aiSections.push(['Risk & Reward', stripMarkdown(ba.beginnerRiskReward)]);
    if (ba.beginnerActionPlan) aiSections.push(['Action Plan', stripMarkdown(ba.beginnerActionPlan)]);
  }
  if (data.aiAnalysis) {
    const ai = data.aiAnalysis;
    if (ai.companyOverview) aiSections.push(['Company Overview', stripMarkdown(ai.companyOverview)]);
    if (ai.industryAnalysis) aiSections.push(['Industry Analysis', stripMarkdown(ai.industryAnalysis)]);
    if (ai.industryPainPoints) aiSections.push(['Industry Pain Points', stripMarkdown(ai.industryPainPoints)]);
    if (ai.competitors) aiSections.push(['Competitors', stripMarkdown(ai.competitors)]);
    if (ai.competitiveAdvantage) aiSections.push(['Competitive Advantage', stripMarkdown(ai.competitiveAdvantage)]);
    if (ai.moat) aiSections.push(['Moat', stripMarkdown(ai.moat)]);
    if (ai.recentDevelopments) aiSections.push(['Recent Developments', stripMarkdown(ai.recentDevelopments)]);
    if (ai.investmentConclusion) aiSections.push(['Investment Conclusion', stripMarkdown(ai.investmentConclusion)]);
  }
  if (data.proAiAnalysis) {
    const pro = data.proAiAnalysis;
    if (pro.proBusinessModel) aiSections.push(['Business Model', stripMarkdown(pro.proBusinessModel)]);
    if (pro.proOperatingModel) aiSections.push(['Operating Model', stripMarkdown(pro.proOperatingModel)]);
    if (pro.proIndustryOutlook) aiSections.push(['Industry Outlook', stripMarkdown(pro.proIndustryOutlook)]);
    if (pro.proMoatAnalysis) aiSections.push(['Moat Analysis', stripMarkdown(pro.proMoatAnalysis)]);
    if (pro.proFinancialHealth) aiSections.push(['Financial Health', stripMarkdown(pro.proFinancialHealth)]);
    if (pro.proValuation) aiSections.push(['Valuation', stripMarkdown(pro.proValuation)]);
    if (pro.proInvestmentConclusion) aiSections.push(['Investment Conclusion', stripMarkdown(pro.proInvestmentConclusion)]);
  }

  if (aiSections.length > 0) {
    const aiRows: (string | number)[][] = [[txt.section, txt.content], ...aiSections];
    aiRows.push([]);
    aiRows.push([txt.generatedByAi]);
    const wsAi = XLSX.utils.aoa_to_sheet(aiRows);
    wsAi['!cols'] = [{ wch: 24 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsAi, txt.aiAnalysis);
  }

  const fileName = `${profile.symbol}_${profile.companyName}_Report.xlsx`;
  XLSX.writeFile(wb, fileName);
}
