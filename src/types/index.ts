export interface CompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  description: string;
  ceo: string;
  website: string;
  country: string;
  fullTimeEmployees: string;
  image: string;
  ipoDate: string;
  // 新 API 格式字段
  marketCap: number;
  price: number;
  change: number;
  changePercentage: number;
  exchange: string;
  exchangeFullName: string;
  // 旧 API 兼容字段
  mktCap?: number;
  changes?: number;
  changesPercentage?: string;
  exchangeShortName?: string;
}

export interface IncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export interface StockNews {
  symbol: string;
  publishedDate: string;
  title: string;
  text: string;
  url: string;
  site: string;
  image?: string;
}

export interface AIAnalysis {
  companyOverview: string;
  industryAnalysis: string;
  industryPainPoints: string;
  competitors: string;
  competitiveAdvantage: string;
  moat: string;
  recentDevelopments: string;
  investmentConclusion: string;
}

export interface SankeyData {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
}

export interface ReportData {
  profile: CompanyProfile;
  incomeStatements: IncomeStatement[];
  peers: string[];
  news: StockNews[];
  aiAnalysis: AIAnalysis;
  searchResults?: string;
  sankeyData: SankeyData;
}
