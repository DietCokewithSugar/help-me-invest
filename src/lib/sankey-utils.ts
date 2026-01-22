import type { SankeyData } from '@/types';

export function buildSankeyData(income: any): SankeyData {
  if (!income) return { nodes: [], links: [] };

  const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);
  const revenueRaw = safeNumber(income.revenue);
  const otherRevenueRaw = safeNumber(
    income.otherRevenue ?? income.otherIncome ?? income.otherOperatingIncome
  );
  const costRaw = safeNumber(income.costOfRevenue);
  const revenue = Math.max(0, revenueRaw);
  const otherRevenue = Math.max(0, Math.min(otherRevenueRaw, revenue));
  const mainRevenue = Math.max(0, revenue - otherRevenue);
  const costOfRevenue = Math.max(0, Math.min(costRaw, revenue));
  const grossProfit = Math.max(0, revenue - costOfRevenue);
  const rdRaw = Math.max(0, safeNumber(income.researchAndDevelopmentExpenses));
  const sgaRaw = Math.max(0, safeNumber(income.sellingGeneralAndAdministrativeExpenses));
  let rdExpenses = rdRaw;
  let sgaExpenses = sgaRaw;

  const totalOperatingCosts = rdExpenses + sgaExpenses;
  if (totalOperatingCosts > grossProfit && totalOperatingCosts > 0) {
    const scale = grossProfit / totalOperatingCosts;
    rdExpenses *= scale;
    sgaExpenses *= scale;
  }

  const operatingIncome = Math.max(0, grossProfit - rdExpenses - sgaExpenses);
  let netIncome = Math.max(0, safeNumber(income.netIncome));
  if (netIncome > operatingIncome) {
    netIncome = operatingIncome;
  }
  const taxAndOther = Math.max(0, operatingIncome - netIncome);

  const nodes = [
    { name: '主营业务收入' },
    ...(otherRevenue > 0 ? [{ name: '其他收入' }] : []),
    { name: '总营收' },
    { name: '营业成本' },
    { name: '毛利润' },
    { name: '研发费用' },
    { name: '销售及管理费用' },
    { name: '营业利润' },
    { name: '税费及其他' },
    { name: '净利润' },
  ];

  const links = [
    { source: '主营业务收入', target: '总营收', value: mainRevenue },
    ...(otherRevenue > 0 ? [{ source: '其他收入', target: '总营收', value: otherRevenue }] : []),
    { source: '总营收', target: '营业成本', value: costOfRevenue },
    { source: '总营收', target: '毛利润', value: grossProfit },
    { source: '毛利润', target: '研发费用', value: rdExpenses },
    { source: '毛利润', target: '销售及管理费用', value: sgaExpenses },
    { source: '毛利润', target: '营业利润', value: operatingIncome },
    { source: '营业利润', target: '税费及其他', value: taxAndOther },
    { source: '营业利润', target: '净利润', value: netIncome },
  ].filter(link => link.value > 0);

  return { nodes, links };
}
