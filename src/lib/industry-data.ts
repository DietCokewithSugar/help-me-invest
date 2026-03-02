export interface SupplyChainNode {
  id: string;
  name: { zh: string; en: string };
  companies: { symbol: string; name: string; share: 'large' | 'medium' | 'small' }[];
}

export interface SupplyChainData {
  upstream: SupplyChainNode[];
  midstream: SupplyChainNode[];
  downstream: SupplyChainNode[];
  layerLabels?: {
    upstream: { zh: string; en: string };
    midstream: { zh: string; en: string };
    downstream: { zh: string; en: string };
  };
}

export const SECTOR_SUPPLY_CHAINS: Record<string, SupplyChainData> = {
  Technology: {
    layerLabels: {
      upstream: { zh: '半导体与半导体设备', en: 'Semiconductors & Equipment' },
      midstream: { zh: '软件与服务', en: 'Software & Services' },
      downstream: { zh: '技术硬件与设备', en: 'Tech Hardware & Equipment' },
    },
    upstream: [
      {
        id: 'eda-ip',
        name: { zh: 'EDA软件与IP授权', en: 'EDA Software & IP Licensing' },
        companies: [
          { symbol: 'SNPS', name: 'Synopsys', share: 'large' },
          { symbol: 'CDNS', name: 'Cadence Design', share: 'large' },
          { symbol: 'ARM', name: 'ARM Holdings', share: 'large' },
        ],
      },
      {
        id: 'semi-equipment',
        name: { zh: '半导体设备与材料', en: 'Semiconductor Equipment & Materials' },
        companies: [
          { symbol: 'ASML', name: 'ASML', share: 'large' },
          { symbol: 'AMAT', name: 'Applied Materials', share: 'large' },
          { symbol: 'LRCX', name: 'Lam Research', share: 'medium' },
          { symbol: 'KLAC', name: 'KLA Corp', share: 'medium' },
        ],
      },
      {
        id: 'chip-design',
        name: { zh: '芯片设计 (Fabless)', en: 'Chip Design (Fabless)' },
        companies: [
          { symbol: 'NVDA', name: 'NVIDIA', share: 'large' },
          { symbol: 'AMD', name: 'AMD', share: 'large' },
          { symbol: 'QCOM', name: 'Qualcomm', share: 'medium' },
          { symbol: 'AVGO', name: 'Broadcom', share: 'large' },
        ],
      },
      {
        id: 'analog-mixed-signal',
        name: { zh: '模拟与混合信号芯片', en: 'Analog & Mixed-Signal ICs' },
        companies: [
          { symbol: 'TXN', name: 'Texas Instruments', share: 'large' },
          { symbol: 'ADI', name: 'Analog Devices', share: 'large' },
          { symbol: 'MCHP', name: 'Microchip Technology', share: 'medium' },
        ],
      },
      {
        id: 'memory',
        name: { zh: '存储芯片', en: 'Memory & Storage ICs' },
        companies: [
          { symbol: 'MU', name: 'Micron Technology', share: 'large' },
          { symbol: 'WDC', name: 'Western Digital', share: 'medium' },
        ],
      },
      {
        id: 'foundry-idm',
        name: { zh: '晶圆代工与IDM', en: 'Foundry & IDM' },
        companies: [
          { symbol: 'TSM', name: 'TSMC', share: 'large' },
          { symbol: 'INTC', name: 'Intel', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'cybersecurity',
        name: { zh: '网络安全', en: 'Cybersecurity' },
        companies: [
          { symbol: 'PANW', name: 'Palo Alto Networks', share: 'large' },
          { symbol: 'CRWD', name: 'CrowdStrike', share: 'large' },
          { symbol: 'FTNT', name: 'Fortinet', share: 'medium' },
          { symbol: 'NET', name: 'Cloudflare', share: 'medium' },
        ],
      },
      {
        id: 'system-infra-software',
        name: { zh: '系统与基础设施软件', en: 'System & Infrastructure Software' },
        companies: [
          { symbol: 'MSFT', name: 'Microsoft', share: 'large' },
          { symbol: 'ORCL', name: 'Oracle', share: 'large' },
          { symbol: 'DDOG', name: 'Datadog', share: 'medium' },
        ],
      },
      {
        id: 'application-saas',
        name: { zh: '应用软件 (SaaS)', en: 'Application Software (SaaS)' },
        companies: [
          { symbol: 'CRM', name: 'Salesforce', share: 'large' },
          { symbol: 'ADBE', name: 'Adobe', share: 'large' },
          { symbol: 'INTU', name: 'Intuit', share: 'medium' },
          { symbol: 'NOW', name: 'ServiceNow', share: 'large' },
        ],
      },
      {
        id: 'it-consulting-data',
        name: { zh: 'IT咨询与数据服务', en: 'IT Consulting & Data Services' },
        companies: [
          { symbol: 'ACN', name: 'Accenture', share: 'large' },
          { symbol: 'IBM', name: 'IBM', share: 'medium' },
          { symbol: 'IT', name: 'Gartner', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'networking-equipment',
        name: { zh: '通信与网络设备', en: 'Communications & Networking Equipment' },
        companies: [
          { symbol: 'CSCO', name: 'Cisco Systems', share: 'large' },
          { symbol: 'ANET', name: 'Arista Networks', share: 'large' },
        ],
      },
      {
        id: 'computing-hardware',
        name: { zh: '计算硬件、存储与外设', en: 'Computing Hardware, Storage & Peripherals' },
        companies: [
          { symbol: 'AAPL', name: 'Apple', share: 'large' },
          { symbol: 'DELL', name: 'Dell Technologies', share: 'medium' },
          { symbol: 'HPQ', name: 'HP Inc', share: 'medium' },
          { symbol: 'SMCI', name: 'Super Micro Computer', share: 'medium' },
        ],
      },
      {
        id: 'electronic-components',
        name: { zh: '电子设备与元器件', en: 'Electronic Devices & Components' },
        companies: [
          { symbol: 'APH', name: 'Amphenol', share: 'large' },
          { symbol: 'TEL', name: 'TE Connectivity', share: 'large' },
        ],
      },
    ],
  },
  Healthcare: {
    layerLabels: {
      upstream: { zh: '研发与生物技术', en: 'R&D & Biotechnology' },
      midstream: { zh: '制药与器械', en: 'Pharma & Devices' },
      downstream: { zh: '医疗服务与流通', en: 'Services & Distribution' },
    },
    upstream: [
      {
        id: 'pharma-rd',
        name: { zh: '药物研发与原料', en: 'Drug Discovery & Raw Materials' },
        companies: [
          { symbol: 'TMO', name: 'Thermo Fisher', share: 'large' },
          { symbol: 'DHR', name: 'Danaher', share: 'large' },
          { symbol: 'A', name: 'Agilent', share: 'medium' },
        ],
      },
      {
        id: 'biotech-platform',
        name: { zh: '生物技术平台', en: 'Biotech Platform' },
        companies: [
          { symbol: 'AMGN', name: 'Amgen', share: 'large' },
          { symbol: 'GILD', name: 'Gilead Sciences', share: 'medium' },
          { symbol: 'ILMN', name: 'Illumina', share: 'medium' },
          { symbol: 'CRSP', name: 'CRISPR Therapeutics', share: 'small' },
        ],
      },
    ],
    midstream: [
      {
        id: 'pharma-mfg',
        name: { zh: '制药生产', en: 'Pharmaceutical Manufacturing' },
        companies: [
          { symbol: 'LLY', name: 'Eli Lilly', share: 'large' },
          { symbol: 'JNJ', name: 'Johnson & Johnson', share: 'large' },
          { symbol: 'ABBV', name: 'AbbVie', share: 'large' },
          { symbol: 'MRK', name: 'Merck', share: 'large' },
          { symbol: 'PFE', name: 'Pfizer', share: 'medium' },
          { symbol: 'AZN', name: 'AstraZeneca', share: 'large' },
        ],
      },
      {
        id: 'medtech',
        name: { zh: '医疗器械', en: 'Medical Devices' },
        companies: [
          { symbol: 'ABT', name: 'Abbott', share: 'large' },
          { symbol: 'MDT', name: 'Medtronic', share: 'large' },
          { symbol: 'SYK', name: 'Stryker', share: 'medium' },
          { symbol: 'ISRG', name: 'Intuitive Surgical', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'healthcare-services',
        name: { zh: '医疗服务', en: 'Healthcare Services' },
        companies: [
          { symbol: 'UNH', name: 'UnitedHealth', share: 'large' },
          { symbol: 'ELV', name: 'Elevance Health', share: 'medium' },
          { symbol: 'HCA', name: 'HCA Healthcare', share: 'medium' },
        ],
      },
      {
        id: 'pharma-distribution',
        name: { zh: '医药流通', en: 'Pharma Distribution' },
        companies: [
          { symbol: 'MCK', name: 'McKesson', share: 'large' },
          { symbol: 'CVS', name: 'CVS Health', share: 'large' },
          { symbol: 'CAH', name: 'Cardinal Health', share: 'medium' },
        ],
      },
    ],
  },
  'Financial Services': {
    layerLabels: {
      upstream: { zh: '金融基础设施与支付', en: 'Infrastructure & Payments' },
      midstream: { zh: '银行与保险', en: 'Banking & Insurance' },
      downstream: { zh: '资管与金融科技', en: 'Asset Mgmt & Fintech' },
    },
    upstream: [
      {
        id: 'fintech-infra',
        name: { zh: '金融基础设施', en: 'Financial Infrastructure' },
        companies: [
          { symbol: 'ICE', name: 'Intercontinental Exchange', share: 'large' },
          { symbol: 'CME', name: 'CME Group', share: 'large' },
          { symbol: 'NDAQ', name: 'Nasdaq Inc', share: 'medium' },
        ],
      },
      {
        id: 'payment-networks',
        name: { zh: '支付网络', en: 'Payment Networks' },
        companies: [
          { symbol: 'V', name: 'Visa', share: 'large' },
          { symbol: 'MA', name: 'Mastercard', share: 'large' },
          { symbol: 'PYPL', name: 'PayPal', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'banking',
        name: { zh: '银行业', en: 'Banking' },
        companies: [
          { symbol: 'JPM', name: 'JPMorgan Chase', share: 'large' },
          { symbol: 'BAC', name: 'Bank of America', share: 'large' },
          { symbol: 'WFC', name: 'Wells Fargo', share: 'medium' },
          { symbol: 'GS', name: 'Goldman Sachs', share: 'medium' },
        ],
      },
      {
        id: 'insurance',
        name: { zh: '保险业', en: 'Insurance' },
        companies: [
          { symbol: 'BRK-B', name: 'Berkshire Hathaway', share: 'large' },
          { symbol: 'PGR', name: 'Progressive', share: 'medium' },
          { symbol: 'MET', name: 'MetLife', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'asset-management',
        name: { zh: '资产管理', en: 'Asset Management' },
        companies: [
          { symbol: 'BLK', name: 'BlackRock', share: 'large' },
          { symbol: 'SCHW', name: 'Charles Schwab', share: 'medium' },
          { symbol: 'BX', name: 'Blackstone', share: 'medium' },
        ],
      },
      {
        id: 'fintech-apps',
        name: { zh: '金融科技应用', en: 'Fintech Applications' },
        companies: [
          { symbol: 'SQ', name: 'Block Inc', share: 'medium' },
          { symbol: 'COIN', name: 'Coinbase', share: 'small' },
          { symbol: 'SOFI', name: 'SoFi', share: 'small' },
        ],
      },
    ],
  },
  Energy: {
    layerLabels: {
      upstream: { zh: '勘探与服务', en: 'Exploration & Services' },
      midstream: { zh: '管道运输与储存', en: 'Pipeline & Storage' },
      downstream: { zh: '炼化与新能源', en: 'Refining & Renewables' },
    },
    upstream: [
      {
        id: 'exploration',
        name: { zh: '油气勘探开采', en: 'Exploration & Production' },
        companies: [
          { symbol: 'XOM', name: 'ExxonMobil', share: 'large' },
          { symbol: 'CVX', name: 'Chevron', share: 'large' },
          { symbol: 'SHEL', name: 'Shell', share: 'large' },
          { symbol: 'COP', name: 'ConocoPhillips', share: 'medium' },
        ],
      },
      {
        id: 'oilfield-services',
        name: { zh: '油田服务', en: 'Oilfield Services' },
        companies: [
          { symbol: 'SLB', name: 'Schlumberger', share: 'large' },
          { symbol: 'HAL', name: 'Halliburton', share: 'medium' },
          { symbol: 'BKR', name: 'Baker Hughes', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'pipeline-transport',
        name: { zh: '管道运输与储存', en: 'Pipeline & Storage' },
        companies: [
          { symbol: 'ENB', name: 'Enbridge', share: 'large' },
          { symbol: 'WMB', name: 'Williams Companies', share: 'large' },
          { symbol: 'KMI', name: 'Kinder Morgan', share: 'medium' },
          { symbol: 'ET', name: 'Energy Transfer', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'refining',
        name: { zh: '炼化与销售', en: 'Refining & Marketing' },
        companies: [
          { symbol: 'VLO', name: 'Valero Energy', share: 'large' },
          { symbol: 'MPC', name: 'Marathon Petroleum', share: 'medium' },
          { symbol: 'PSX', name: 'Phillips 66', share: 'medium' },
        ],
      },
      {
        id: 'renewable-energy',
        name: { zh: '新能源', en: 'Renewable Energy' },
        companies: [
          { symbol: 'FSLR', name: 'First Solar', share: 'small' },
          { symbol: 'ENPH', name: 'Enphase', share: 'small' },
        ],
      },
    ],
  },
  'Consumer Cyclical': {
    layerLabels: {
      upstream: { zh: '原材料与零部件', en: 'Raw Materials & Parts' },
      midstream: { zh: '制造与品牌', en: 'Manufacturing & Brands' },
      downstream: { zh: '零售与服务', en: 'Retail & Services' },
    },
    upstream: [
      {
        id: 'auto-parts',
        name: { zh: '汽车零部件', en: 'Auto Parts & Suppliers' },
        companies: [
          { symbol: 'IP', name: 'International Paper', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'auto-manufacturing',
        name: { zh: '汽车制造', en: 'Auto Manufacturing' },
        companies: [
          { symbol: 'TSLA', name: 'Tesla', share: 'large' },
          { symbol: 'TM', name: 'Toyota', share: 'large' },
          { symbol: 'GM', name: 'General Motors', share: 'medium' },
          { symbol: 'F', name: 'Ford', share: 'medium' },
        ],
      },
      {
        id: 'consumer-brands',
        name: { zh: '消费品牌与餐饮', en: 'Consumer Brands & Restaurants' },
        companies: [
          { symbol: 'MCD', name: "McDonald's", share: 'large' },
          { symbol: 'NKE', name: 'Nike', share: 'large' },
          { symbol: 'SBUX', name: 'Starbucks', share: 'medium' },
          { symbol: 'TJX', name: 'TJX Companies', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'ecommerce-retail',
        name: { zh: '电商与零售', en: 'E-commerce & Retail' },
        companies: [
          { symbol: 'AMZN', name: 'Amazon', share: 'large' },
          { symbol: 'BABA', name: 'Alibaba', share: 'large' },
          { symbol: 'HD', name: 'Home Depot', share: 'large' },
          { symbol: 'LOW', name: "Lowe's", share: 'medium' },
          { symbol: 'TGT', name: 'Target', share: 'medium' },
        ],
      },
      {
        id: 'travel-leisure',
        name: { zh: '旅游休闲', en: 'Travel & Leisure' },
        companies: [
          { symbol: 'BKNG', name: 'Booking Holdings', share: 'large' },
          { symbol: 'ABNB', name: 'Airbnb', share: 'medium' },
          { symbol: 'MAR', name: 'Marriott', share: 'medium' },
        ],
      },
    ],
  },
  'Consumer Defensive': {
    layerLabels: {
      upstream: { zh: '农业与原料', en: 'Agriculture & Materials' },
      midstream: { zh: '消费品制造', en: 'Consumer Goods Manufacturing' },
      downstream: { zh: '商超零售', en: 'Grocery & Retail' },
    },
    upstream: [
      {
        id: 'agriculture',
        name: { zh: '农业原料', en: 'Agricultural Materials' },
        companies: [
          { symbol: 'ADM', name: 'Archer-Daniels-Midland', share: 'large' },
          { symbol: 'BG', name: 'Bunge', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'food-beverage-mfg',
        name: { zh: '食品饮料制造', en: 'Food & Beverage Mfg' },
        companies: [
          { symbol: 'KO', name: 'Coca-Cola', share: 'large' },
          { symbol: 'PEP', name: 'PepsiCo', share: 'large' },
          { symbol: 'MDLZ', name: 'Mondelez', share: 'medium' },
        ],
      },
      {
        id: 'household-personal',
        name: { zh: '家居日用品', en: 'Household & Personal' },
        companies: [
          { symbol: 'PG', name: 'Procter & Gamble', share: 'large' },
          { symbol: 'CL', name: 'Colgate-Palmolive', share: 'medium' },
          { symbol: 'UL', name: 'Unilever', share: 'medium' },
        ],
      },
      {
        id: 'tobacco',
        name: { zh: '烟草', en: 'Tobacco' },
        companies: [
          { symbol: 'PM', name: 'Philip Morris', share: 'large' },
          { symbol: 'MO', name: 'Altria', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'grocery-retail',
        name: { zh: '商超零售', en: 'Grocery & Retail' },
        companies: [
          { symbol: 'WMT', name: 'Walmart', share: 'large' },
          { symbol: 'COST', name: 'Costco', share: 'large' },
          { symbol: 'KR', name: 'Kroger', share: 'medium' },
        ],
      },
    ],
  },
  'Communication Services': {
    layerLabels: {
      upstream: { zh: '通信基础设施', en: 'Telecom Infrastructure' },
      midstream: { zh: '内容与平台', en: 'Content & Platforms' },
      downstream: { zh: '分发与变现', en: 'Distribution & Monetization' },
    },
    upstream: [
      {
        id: 'telecom-infra',
        name: { zh: '通信基础设施', en: 'Telecom Infrastructure' },
        companies: [
          { symbol: 'AMT', name: 'American Tower', share: 'large' },
          { symbol: 'CCI', name: 'Crown Castle', share: 'medium' },
        ],
      },
      {
        id: 'telecom-operators',
        name: { zh: '电信运营商', en: 'Telecom Operators' },
        companies: [
          { symbol: 'TMUS', name: 'T-Mobile', share: 'large' },
          { symbol: 'VZ', name: 'Verizon', share: 'large' },
          { symbol: 'T', name: 'AT&T', share: 'large' },
          { symbol: 'CMCSA', name: 'Comcast', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'media-entertainment',
        name: { zh: '媒体与娱乐', en: 'Media & Entertainment' },
        companies: [
          { symbol: 'GOOGL', name: 'Alphabet', share: 'large' },
          { symbol: 'META', name: 'Meta', share: 'large' },
          { symbol: 'DIS', name: 'Disney', share: 'large' },
          { symbol: 'NFLX', name: 'Netflix', share: 'large' },
        ],
      },
      {
        id: 'streaming-audio',
        name: { zh: '流媒体与音频', en: 'Streaming & Audio' },
        companies: [
          { symbol: 'NFLX', name: 'Netflix', share: 'large' },
          { symbol: 'SPOT', name: 'Spotify', share: 'medium' },
          { symbol: 'DIS', name: 'Disney', share: 'large' },
        ],
      },
    ],
    downstream: [
      {
        id: 'digital-advertising',
        name: { zh: '数字广告', en: 'Digital Advertising' },
        companies: [
          { symbol: 'GOOGL', name: 'Alphabet', share: 'large' },
          { symbol: 'META', name: 'Meta', share: 'large' },
          { symbol: 'TTD', name: 'Trade Desk', share: 'small' },
        ],
      },
      {
        id: 'gaming',
        name: { zh: '游戏', en: 'Gaming' },
        companies: [
          { symbol: 'EA', name: 'Electronic Arts', share: 'medium' },
          { symbol: 'TTWO', name: 'Take-Two Interactive', share: 'medium' },
        ],
      },
      {
        id: 'social-local',
        name: { zh: '社交与本地服务', en: 'Social & Local Services' },
        companies: [
          { symbol: 'META', name: 'Meta', share: 'large' },
          { symbol: 'DASH', name: 'DoorDash', share: 'medium' },
        ],
      },
    ],
  },
  Industrials: {
    layerLabels: {
      upstream: { zh: '工业材料与零部件', en: 'Materials & Components' },
      midstream: { zh: '制造与装备', en: 'Manufacturing & Equipment' },
      downstream: { zh: '物流与服务', en: 'Logistics & Services' },
    },
    upstream: [
      {
        id: 'industrial-materials',
        name: { zh: '工业材料与零部件', en: 'Industrial Materials & Parts' },
        companies: [
          { symbol: 'HON', name: 'Honeywell', share: 'large' },
          { symbol: 'EMR', name: 'Emerson Electric', share: 'medium' },
          { symbol: 'ETN', name: 'Eaton Corporation', share: 'medium' },
        ],
      },
      {
        id: 'industrial-machinery',
        name: { zh: '工业机械', en: 'Industrial Machinery' },
        companies: [
          { symbol: 'PH', name: 'Parker-Hannifin', share: 'medium' },
          { symbol: 'ROK', name: 'Rockwell Automation', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'aerospace-defense',
        name: { zh: '航空航天与国防', en: 'Aerospace & Defense' },
        companies: [
          { symbol: 'GE', name: 'GE Aerospace', share: 'large' },
          { symbol: 'RTX', name: 'RTX Corp', share: 'large' },
          { symbol: 'BA', name: 'Boeing', share: 'large' },
          { symbol: 'LMT', name: 'Lockheed Martin', share: 'large' },
        ],
      },
      {
        id: 'machinery',
        name: { zh: '工程机械与农机', en: 'Construction & Agricultural Machinery' },
        companies: [
          { symbol: 'CAT', name: 'Caterpillar', share: 'large' },
          { symbol: 'DE', name: 'Deere & Co', share: 'large' },
        ],
      },
    ],
    downstream: [
      {
        id: 'logistics',
        name: { zh: '物流运输', en: 'Logistics & Transport' },
        companies: [
          { symbol: 'UNP', name: 'Union Pacific', share: 'large' },
          { symbol: 'UPS', name: 'UPS', share: 'large' },
          { symbol: 'FDX', name: 'FedEx', share: 'medium' },
        ],
      },
      {
        id: 'waste-mgmt',
        name: { zh: '环保服务', en: 'Waste Management' },
        companies: [
          { symbol: 'WM', name: 'Waste Management', share: 'large' },
          { symbol: 'RSG', name: 'Republic Services', share: 'medium' },
        ],
      },
    ],
  },
  'Basic Materials': {
    layerLabels: {
      upstream: { zh: '矿业与原材料', en: 'Mining & Raw Materials' },
      midstream: { zh: '化工与加工', en: 'Chemicals & Processing' },
      downstream: { zh: '特种材料与应用', en: 'Specialty Materials & Applications' },
    },
    upstream: [
      {
        id: 'mining',
        name: { zh: '矿业', en: 'Mining' },
        companies: [
          { symbol: 'BHP', name: 'BHP Group', share: 'large' },
          { symbol: 'RIO', name: 'Rio Tinto', share: 'large' },
          { symbol: 'NEM', name: 'Newmont', share: 'large' },
          { symbol: 'FCX', name: 'Freeport-McMoRan', share: 'large' },
          { symbol: 'SCCO', name: 'Southern Copper', share: 'medium' },
        ],
      },
      {
        id: 'precious-metals',
        name: { zh: '贵金属', en: 'Precious Metals' },
        companies: [
          { symbol: 'NEM', name: 'Newmont', share: 'large' },
          { symbol: 'AEM', name: 'Agnico Eagle', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'chemicals',
        name: { zh: '化工', en: 'Chemicals' },
        companies: [
          { symbol: 'LIN', name: 'Linde', share: 'large' },
          { symbol: 'APD', name: 'Air Products', share: 'medium' },
          { symbol: 'SHW', name: 'Sherwin-Williams', share: 'medium' },
          { symbol: 'DD', name: 'DuPont', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'specialty-materials',
        name: { zh: '特种材料', en: 'Specialty Materials' },
        companies: [
          { symbol: 'ECL', name: 'Ecolab', share: 'medium' },
          { symbol: 'PPG', name: 'PPG Industries', share: 'medium' },
        ],
      },
    ],
  },
  'Real Estate': {
    layerLabels: {
      upstream: { zh: '建设开发', en: 'Construction & Development' },
      midstream: { zh: '不动产投资信托', en: 'REITs' },
      downstream: { zh: '物业管理与服务', en: 'Property Management' },
    },
    upstream: [
      {
        id: 'construction-dev',
        name: { zh: '建设开发', en: 'Construction & Development' },
        companies: [
          { symbol: 'DHI', name: 'D.R. Horton', share: 'medium' },
          { symbol: 'LEN', name: 'Lennar', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'reits-industrial',
        name: { zh: '产业与物流REITs', en: 'Industrial & Logistics REITs' },
        companies: [
          { symbol: 'PLD', name: 'Prologis', share: 'large' },
          { symbol: 'PSA', name: 'Public Storage', share: 'medium' },
        ],
      },
      {
        id: 'reits-digital',
        name: { zh: '数据中心与通信REITs', en: 'Data Center & Telecom REITs' },
        companies: [
          { symbol: 'EQIX', name: 'Equinix', share: 'large' },
          { symbol: 'AMT', name: 'American Tower', share: 'large' },
          { symbol: 'DLR', name: 'Digital Realty', share: 'medium' },
        ],
      },
      {
        id: 'reits-healthcare',
        name: { zh: '医疗REITs', en: 'Healthcare REITs' },
        companies: [
          { symbol: 'WELL', name: 'Welltower', share: 'large' },
        ],
      },
      {
        id: 'reits-retail',
        name: { zh: '零售REITs', en: 'Retail REITs' },
        companies: [
          { symbol: 'SPG', name: 'Simon Property', share: 'medium' },
          { symbol: 'O', name: 'Realty Income', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'property-mgmt',
        name: { zh: '物业管理与服务', en: 'Property Management' },
        companies: [
          { symbol: 'CBRE', name: 'CBRE Group', share: 'large' },
          { symbol: 'JLL', name: 'Jones Lang LaSalle', share: 'medium' },
        ],
      },
    ],
  },
  Utilities: {
    layerLabels: {
      upstream: { zh: '发电与能源转换', en: 'Power Generation' },
      midstream: { zh: '电网与输配', en: 'Grid & Transmission' },
      downstream: { zh: '公用事业配送', en: 'Utility Distribution' },
    },
    upstream: [
      {
        id: 'power-generation',
        name: { zh: '传统发电', en: 'Conventional Power Generation' },
        companies: [
          { symbol: 'NEE', name: 'NextEra Energy', share: 'large' },
          { symbol: 'DUK', name: 'Duke Energy', share: 'large' },
          { symbol: 'SO', name: 'Southern Co', share: 'large' },
        ],
      },
      {
        id: 'renewable-generation',
        name: { zh: '可再生能源发电', en: 'Renewable Power Generation' },
        companies: [
          { symbol: 'GEV', name: 'GE Vernova', share: 'large' },
          { symbol: 'CEG', name: 'Constellation Energy', share: 'large' },
          { symbol: 'VST', name: 'Vistra Corp', share: 'medium' },
        ],
      },
    ],
    midstream: [
      {
        id: 'grid-transmission',
        name: { zh: '电网与输配', en: 'Grid & Transmission' },
        companies: [
          { symbol: 'AEP', name: 'American Electric Power', share: 'medium' },
          { symbol: 'EXC', name: 'Exelon', share: 'medium' },
        ],
      },
    ],
    downstream: [
      {
        id: 'utility-distribution',
        name: { zh: '电力与天然气配送', en: 'Electric & Gas Distribution' },
        companies: [
          { symbol: 'SRE', name: 'Sempra', share: 'medium' },
          { symbol: 'D', name: 'Dominion Energy', share: 'medium' },
        ],
      },
      {
        id: 'water-utilities',
        name: { zh: '水务', en: 'Water Utilities' },
        companies: [
          { symbol: 'AWK', name: 'American Water', share: 'small' },
        ],
      },
    ],
  },
};

export function getTrendCategory(cagr: number): 'fastGrowth' | 'slowGrowth' | 'stagnant' | 'decline' | 'severeDecline' {
  if (cagr >= 15) return 'fastGrowth';
  if (cagr >= 5) return 'slowGrowth';
  if (cagr >= -2) return 'stagnant';
  if (cagr >= -10) return 'decline';
  return 'severeDecline';
}

export function getTrendColor(trend: string, theme: 'dark' | 'light' = 'dark'): string {
  const colors: Record<string, Record<string, string>> = {
    dark: {
      fastGrowth: '#10B981',
      slowGrowth: '#6EE7B7',
      stagnant: '#94A3B8',
      decline: '#F87171',
      severeDecline: '#EF4444',
    },
    light: {
      fastGrowth: '#059669',
      slowGrowth: '#34D399',
      stagnant: '#64748B',
      decline: '#EF4444',
      severeDecline: '#DC2626',
    },
  };
  return colors[theme]?.[trend] || colors.dark.stagnant;
}

export function getSentimentLabel(score: number): 'veryBullish' | 'bullish' | 'neutral' | 'bearish' | 'veryBearish' {
  if (score >= 80) return 'veryBullish';
  if (score >= 60) return 'bullish';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'bearish';
  return 'veryBearish';
}

export function formatMarketCap(value: number, locale: 'zh' | 'en' = 'en'): string {
  if (locale === 'zh') {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}万亿`;
    if (value >= 1e8) return `${(value / 1e8).toFixed(0)}亿`;
    return `${(value / 1e4).toFixed(0)}万`;
  }
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}
