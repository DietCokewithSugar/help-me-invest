/**
 * US equity sector structure — segment-level decomposition with representative companies.
 *
 * Replaces the legacy upstream/midstream/downstream supply-chain model. Each sector is
 * broken into the natural sub-industries that actually drive earnings and capital flows
 * in the US market, with an optional value-chain position tag where it applies.
 */

export type ValueChainPosition =
  | 'upstream'
  | 'midstream'
  | 'downstream'
  | 'platform'
  | 'service'
  | 'infrastructure';

export interface IndustryCompany {
  symbol: string;
  name: string;
  /** Short positioning note: why this company sits in this segment. */
  note?: { zh: string; en: string };
}

export interface IndustrySegment {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  /** Optional — only meaningful for sectors with a real value chain. */
  position?: ValueChainPosition;
  /** Catalysts, risks, or structural themes — 2 to 4 short bullet points. */
  themes?: { zh: string[]; en: string[] };
  companies: IndustryCompany[];
}

export interface SectorStructure {
  sector: string;
  overview: { zh: string; en: string };
  segments: IndustrySegment[];
}

// ---------------------------------------------------------------------------
// Position label dictionary (for the segment chip).
// ---------------------------------------------------------------------------

export const POSITION_LABELS: Record<ValueChainPosition, { zh: string; en: string }> = {
  upstream: { zh: '上游', en: 'Upstream' },
  midstream: { zh: '中游', en: 'Midstream' },
  downstream: { zh: '下游', en: 'Downstream' },
  platform: { zh: '平台', en: 'Platform' },
  service: { zh: '服务', en: 'Service' },
  infrastructure: { zh: '基础设施', en: 'Infrastructure' },
};

// ---------------------------------------------------------------------------
// Sector data
// ---------------------------------------------------------------------------

export const SECTOR_STRUCTURE: Record<string, SectorStructure> = {
  Technology: {
    sector: 'Technology',
    overview: {
      zh: '美国科技板块是全球资本市场最重要的成长引擎，分为半导体、硬件、软件、IT服务四大维度。半导体链由EDA→设备→晶圆代工/IDM→Fabless→存储/模拟构成，AI算力需求重塑了整个产业利润分布；软件端云原生与SaaS持续渗透，生成式AI推动数据/可观测/安全/数据库重新洗牌；硬件端AI服务器、网络交换、组件成为新的高增长口。',
      en: 'The US Technology sector is the global market\'s primary growth engine. It spans semiconductors (EDA → equipment → foundry/IDM → fabless → memory/analog), where AI compute has redistributed profit pools; software, where SaaS, observability, security, databases and AI platforms are being re-stacked by generative AI; and hardware, where AI servers, networking, and high-speed interconnect are the new growth pockets.',
    },
    segments: [
      {
        id: 'eda-ip',
        name: { zh: 'EDA与半导体IP', en: 'EDA & Semiconductor IP' },
        description: {
          zh: '芯片设计软件与可授权IP核，是整个半导体产业的"工具母机"，受益于设计复杂度持续上升与AI芯片定制化浪潮。',
          en: 'Chip design software and licensable IP cores — the "machine tools" of the entire semiconductor industry, benefiting from rising design complexity and the custom AI silicon wave.',
        },
        position: 'upstream',
        themes: {
          zh: ['寡头格局稳定', 'AI/Chiplet推动单价上行', 'ARM架构在数据中心放量'],
          en: ['Stable oligopoly', 'AI / chiplets drive ASP up', 'ARM expanding in data center'],
        },
        companies: [
          { symbol: 'SNPS', name: 'Synopsys' },
          { symbol: 'CDNS', name: 'Cadence Design Systems' },
          { symbol: 'ARM', name: 'Arm Holdings' },
        ],
      },
      {
        id: 'semi-equipment',
        name: { zh: '半导体设备与材料', en: 'Semiconductor Equipment & Materials' },
        description: {
          zh: '光刻、刻蚀、薄膜沉积、量测、CMP、电子特气与硅片，是建厂资本开支的核心承接方，与全球晶圆厂资本开支周期强绑定。',
          en: 'Lithography, etch, deposition, metrology, CMP, specialty gases and wafers. Direct beneficiaries of global fab capex cycles.',
        },
        position: 'upstream',
        themes: {
          zh: ['EUV/High-NA独占供应', '先进制程持续投资', 'HBM/3D封装拉动后段设备'],
          en: ['EUV / High-NA monopoly', 'Sustained leading-edge capex', 'HBM / 3D packaging boosts back-end'],
        },
        companies: [
          { symbol: 'ASML', name: 'ASML Holding' },
          { symbol: 'AMAT', name: 'Applied Materials' },
          { symbol: 'LRCX', name: 'Lam Research' },
          { symbol: 'KLAC', name: 'KLA Corp' },
          { symbol: 'TER', name: 'Teradyne' },
          { symbol: 'ENTG', name: 'Entegris' },
          { symbol: 'ACLS', name: 'Axcelis Technologies' },
        ],
      },
      {
        id: 'foundry-idm',
        name: { zh: '晶圆代工与IDM', en: 'Foundry & IDM' },
        description: {
          zh: '负责把芯片设计真正流片量产。台积电几乎独占先进制程，英特尔正在重构代工业务，GlobalFoundries聚焦特种工艺。',
          en: 'Where chip designs are physically manufactured. TSMC dominates leading-edge, Intel is rebuilding a foundry business, GlobalFoundries focuses on specialty nodes.',
        },
        position: 'upstream',
        themes: {
          zh: ['先进制程定价权', '美国本土产能扩张(CHIPS法案)', 'AI HBM紧缺'],
          en: ['Leading-edge pricing power', 'US onshore capacity (CHIPS Act)', 'AI HBM supply tightness'],
        },
        companies: [
          { symbol: 'TSM', name: 'Taiwan Semiconductor' },
          { symbol: 'INTC', name: 'Intel' },
          { symbol: 'GFS', name: 'GlobalFoundries' },
          { symbol: 'UMC', name: 'United Microelectronics' },
        ],
      },
      {
        id: 'fabless-compute',
        name: { zh: '算力与通信Fabless芯片', en: 'Compute & Connectivity Fabless' },
        description: {
          zh: 'GPU/AI加速器、CPU、网络/Switch ASIC、5G基带、连接芯片。AI是当前最确定性的需求引擎，超大规模数据中心资本开支决定景气。',
          en: 'GPUs / AI accelerators, CPUs, networking and switch ASICs, 5G basebands, connectivity. AI demand and hyperscaler capex are the dominant drivers.',
        },
        position: 'upstream',
        themes: {
          zh: ['AI加速器寡头', '定制ASIC增长', '5G/连接周期'],
          en: ['AI accelerator oligopoly', 'Custom ASIC ramp', '5G / connectivity cycle'],
        },
        companies: [
          { symbol: 'NVDA', name: 'NVIDIA' },
          { symbol: 'AMD', name: 'Advanced Micro Devices' },
          { symbol: 'AVGO', name: 'Broadcom' },
          { symbol: 'QCOM', name: 'Qualcomm' },
          { symbol: 'MRVL', name: 'Marvell Technology' },
          { symbol: 'CRDO', name: 'Credo Technology' },
        ],
      },
      {
        id: 'analog-memory',
        name: { zh: '模拟/存储/特种芯片', en: 'Analog, Memory & Specialty ICs' },
        description: {
          zh: '模拟与混合信号芯片、电源管理、DRAM/NAND/HBM存储、MCU与汽车电子，工业/汽车/AI服务器三条主线驱动。',
          en: 'Analog and mixed-signal, power management, DRAM/NAND/HBM memory, MCUs and auto silicon. Industrial, auto, and AI-server end-markets drive the cycle.',
        },
        position: 'upstream',
        themes: {
          zh: ['HBM供需紧', '汽车半导体内容量提升', '工业库存周期'],
          en: ['HBM supply tight', 'Auto silicon content rising', 'Industrial inventory cycle'],
        },
        companies: [
          { symbol: 'TXN', name: 'Texas Instruments' },
          { symbol: 'ADI', name: 'Analog Devices' },
          { symbol: 'NXPI', name: 'NXP Semiconductors' },
          { symbol: 'MCHP', name: 'Microchip Technology' },
          { symbol: 'ON', name: 'ON Semiconductor' },
          { symbol: 'MPWR', name: 'Monolithic Power Systems' },
          { symbol: 'MU', name: 'Micron Technology' },
          { symbol: 'WDC', name: 'Western Digital' },
          { symbol: 'STX', name: 'Seagate Technology' },
        ],
      },
      {
        id: 'networking-equipment',
        name: { zh: '网络与通信设备', en: 'Networking & Communications Equipment' },
        description: {
          zh: '交换机、路由器、AI数据中心光模块/互联、企业WAN与无线接入。AI东西向流量爆发推动高速以太网与光器件升级。',
          en: 'Switches, routers, AI data-center optics and interconnect, enterprise WAN and Wi-Fi. East-west AI traffic is forcing a high-speed Ethernet and optics upgrade.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'CSCO', name: 'Cisco Systems' },
          { symbol: 'ANET', name: 'Arista Networks' },
          { symbol: 'JNPR', name: 'Juniper Networks' },
          { symbol: 'HPE', name: 'Hewlett Packard Enterprise' },
          { symbol: 'CIEN', name: 'Ciena' },
        ],
      },
      {
        id: 'computing-hardware',
        name: { zh: 'AI服务器与计算硬件', en: 'AI Servers & Computing Hardware' },
        description: {
          zh: 'AI服务器、企业服务器、PC、智能手机、存储阵列、外设。AI服务器是当前最强成长口，PC/手机进入温和复苏周期。',
          en: 'AI servers, enterprise servers, PCs, smartphones, storage arrays, peripherals. AI servers are the standout growth pocket; PC/handset cycles moderately recovering.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'AAPL', name: 'Apple' },
          { symbol: 'DELL', name: 'Dell Technologies' },
          { symbol: 'SMCI', name: 'Super Micro Computer' },
          { symbol: 'HPQ', name: 'HP Inc' },
          { symbol: 'NTAP', name: 'NetApp' },
          { symbol: 'PSTG', name: 'Pure Storage' },
        ],
      },
      {
        id: 'electronic-components',
        name: { zh: '电子元器件与EMS', en: 'Electronic Components & EMS' },
        description: {
          zh: '高速连接器、被动元件、特种光纤/玻璃、合约制造。AI硬件升级、汽车电气化提升单台用量。',
          en: 'High-speed connectors, passives, specialty glass/fiber, contract manufacturing. AI hardware and auto electrification raise per-unit content.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'APH', name: 'Amphenol' },
          { symbol: 'TEL', name: 'TE Connectivity' },
          { symbol: 'GLW', name: 'Corning' },
          { symbol: 'FLEX', name: 'Flex Ltd' },
          { symbol: 'JBL', name: 'Jabil' },
        ],
      },
      {
        id: 'cybersecurity',
        name: { zh: '网络安全', en: 'Cybersecurity' },
        description: {
          zh: '端点检测、SASE/零信任、云安全、身份、SIEM/SOAR。攻击面爆发与平台化整合并行，强者愈强。',
          en: 'Endpoint, SASE/zero-trust, cloud, identity, SIEM/SOAR. Expanding attack surface plus platform consolidation favor scale leaders.',
        },
        position: 'platform',
        themes: {
          zh: ['平台整合(Palo Alto/CrowdStrike)', '云安全持续高增', '身份/数据安全新需求'],
          en: ['Platform consolidation (PANW/CRWD)', 'Cloud security keeps growing', 'Identity / data security tailwind'],
        },
        companies: [
          { symbol: 'PANW', name: 'Palo Alto Networks' },
          { symbol: 'CRWD', name: 'CrowdStrike' },
          { symbol: 'FTNT', name: 'Fortinet' },
          { symbol: 'ZS', name: 'Zscaler' },
          { symbol: 'NET', name: 'Cloudflare' },
          { symbol: 'OKTA', name: 'Okta' },
          { symbol: 'S', name: 'SentinelOne' },
          { symbol: 'CYBR', name: 'CyberArk' },
          { symbol: 'RBRK', name: 'Rubrik' },
          { symbol: 'TENB', name: 'Tenable' },
        ],
      },
      {
        id: 'infra-software',
        name: { zh: '基础设施与数据库软件', en: 'Infrastructure & Database Software' },
        description: {
          zh: '操作系统、超大规模云、数据库、可观测、数据湖、开发者平台。生成式AI驱动数据/算力消费，云厂商三巨头主导。',
          en: 'OS, hyperscale cloud, databases, observability, data lakes, developer platforms. Generative AI is driving data and compute consumption; cloud Big Three dominate.',
        },
        position: 'platform',
        companies: [
          { symbol: 'MSFT', name: 'Microsoft' },
          { symbol: 'ORCL', name: 'Oracle' },
          { symbol: 'IBM', name: 'IBM' },
          { symbol: 'SNOW', name: 'Snowflake' },
          { symbol: 'MDB', name: 'MongoDB' },
          { symbol: 'DDOG', name: 'Datadog' },
          { symbol: 'ESTC', name: 'Elastic' },
          { symbol: 'GTLB', name: 'GitLab' },
          { symbol: 'CFLT', name: 'Confluent' },
        ],
      },
      {
        id: 'application-saas',
        name: { zh: '应用软件 (SaaS)', en: 'Application Software (SaaS)' },
        description: {
          zh: '销售/服务/创意/HR/财务/IT服务管理等垂直SaaS。AI Copilot嵌入与按使用付费正在改写收费模型。',
          en: 'Sales, service, creative, HR, finance and ITSM SaaS. AI copilots and consumption pricing are rewriting the monetization model.',
        },
        position: 'platform',
        companies: [
          { symbol: 'CRM', name: 'Salesforce' },
          { symbol: 'ADBE', name: 'Adobe' },
          { symbol: 'INTU', name: 'Intuit' },
          { symbol: 'NOW', name: 'ServiceNow' },
          { symbol: 'WDAY', name: 'Workday' },
          { symbol: 'TEAM', name: 'Atlassian' },
          { symbol: 'HUBS', name: 'HubSpot' },
          { symbol: 'ADSK', name: 'Autodesk' },
        ],
      },
      {
        id: 'ai-data-platforms',
        name: { zh: 'AI与数据应用平台', en: 'AI & Data Application Platforms' },
        description: {
          zh: '面向政府/企业的AI决策、数据挖掘、流程自动化、垂直AI。商业化路径分化，估值波动大。',
          en: 'AI decisioning, data mining, process automation, vertical AI for government and enterprise. Wide dispersion in monetization paths.',
        },
        position: 'platform',
        companies: [
          { symbol: 'PLTR', name: 'Palantir Technologies' },
          { symbol: 'AI', name: 'C3.ai' },
          { symbol: 'PATH', name: 'UiPath' },
        ],
      },
      {
        id: 'it-services',
        name: { zh: 'IT服务与咨询', en: 'IT Services & Consulting' },
        description: {
          zh: '数字化转型、AI落地、外包与系统集成、IT研究咨询。短期受企业IT预算趋紧拖累，长期受AI项目化需求支撑。',
          en: 'Digital transformation, AI implementation, outsourcing, system integration, IT research. Near-term pressure from tight IT budgets, long-term lift from AI engagements.',
        },
        position: 'service',
        companies: [
          { symbol: 'ACN', name: 'Accenture' },
          { symbol: 'IT', name: 'Gartner' },
          { symbol: 'CTSH', name: 'Cognizant Technology' },
          { symbol: 'INFY', name: 'Infosys' },
          { symbol: 'WIT', name: 'Wipro' },
        ],
      },
    ],
  },

  Healthcare: {
    sector: 'Healthcare',
    overview: {
      zh: '医疗健康在美股属于稳健成长赛道，由制药、生物科技、医疗器械、医疗服务、生命科学工具、支付方与流通组成。GLP-1（减重/糖尿病）和肿瘤是当前两条最强主线，AI驱动药物发现、医保政策与药品定价（IRA）是关键变量。',
      en: 'US Healthcare is a stable-growth complex spanning pharma, biotech, devices, providers, life-science tools, payers, and distribution. GLP-1 (obesity/diabetes) and oncology are the dominant therapeutic narratives; AI-driven drug discovery and US drug pricing (IRA) are the key swing variables.',
    },
    segments: [
      {
        id: 'life-science-tools',
        name: { zh: '生命科学工具与诊断', en: 'Life Science Tools & Diagnostics' },
        description: {
          zh: '为制药/生物科技/医院提供仪器、耗材、CRO/CDMO服务和体外诊断。生物制药资本支出与新药研发管线决定景气。',
          en: 'Instruments, consumables, CRO/CDMO services and IVD for pharma/biotech and hospitals. Driven by biopharma capex and pipeline activity.',
        },
        position: 'upstream',
        themes: {
          zh: ['生物制药融资回暖', 'GLP-1拉动耗材', 'CRO定价压力'],
          en: ['Biopharma funding recovering', 'GLP-1 lifts consumables', 'Pricing pressure for CROs'],
        },
        companies: [
          { symbol: 'TMO', name: 'Thermo Fisher Scientific' },
          { symbol: 'DHR', name: 'Danaher' },
          { symbol: 'A', name: 'Agilent Technologies' },
          { symbol: 'IQV', name: 'IQVIA Holdings' },
          { symbol: 'MTD', name: 'Mettler-Toledo' },
          { symbol: 'WAT', name: 'Waters' },
          { symbol: 'BIO', name: 'Bio-Rad Laboratories' },
        ],
      },
      {
        id: 'genomics',
        name: { zh: '基因组学与精准诊断', en: 'Genomics & Precision Diagnostics' },
        description: {
          zh: '测序仪器、液体活检、伴随诊断和基因数据。测序成本下降推动应用扩张，但商业化节奏分化。',
          en: 'Sequencing platforms, liquid biopsy, companion diagnostics, genomic data. Falling sequencing cost drives adoption; monetization timing varies widely.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'ILMN', name: 'Illumina' },
          { symbol: 'EXAS', name: 'Exact Sciences' },
          { symbol: 'NTRA', name: 'Natera' },
          { symbol: 'GH', name: 'Guardant Health' },
        ],
      },
      {
        id: 'biotech-mature',
        name: { zh: '成熟生物科技', en: 'Profitable Biotech' },
        description: {
          zh: '已上市核心产品并实现盈利的生物制药，代表性管线覆盖罕见病、HIV、肿瘤、自免与神经科学。',
          en: 'Biopharma with commercialized franchises and profitability, spanning rare disease, HIV, oncology, immunology and neuroscience.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'VRTX', name: 'Vertex Pharmaceuticals' },
          { symbol: 'REGN', name: 'Regeneron Pharmaceuticals' },
          { symbol: 'AMGN', name: 'Amgen' },
          { symbol: 'GILD', name: 'Gilead Sciences' },
          { symbol: 'BIIB', name: 'Biogen' },
          { symbol: 'ALNY', name: 'Alnylam Pharmaceuticals' },
          { symbol: 'INCY', name: 'Incyte' },
        ],
      },
      {
        id: 'biotech-emerging',
        name: { zh: '新兴模态生物科技', en: 'Emerging Modality Biotech' },
        description: {
          zh: 'mRNA、基因编辑、ADC、细胞治疗、AI药物发现。多数尚未稳定盈利，估值波动来自临床数据与监管事件。',
          en: 'mRNA, gene editing, ADC, cell therapy, AI-driven drug discovery. Mostly pre-profit; valuations swing with clinical readouts and regulatory milestones.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'MRNA', name: 'Moderna' },
          { symbol: 'BNTX', name: 'BioNTech' },
          { symbol: 'CRSP', name: 'CRISPR Therapeutics' },
          { symbol: 'NTLA', name: 'Intellia Therapeutics' },
          { symbol: 'BEAM', name: 'Beam Therapeutics' },
          { symbol: 'RXRX', name: 'Recursion Pharmaceuticals' },
        ],
      },
      {
        id: 'big-pharma',
        name: { zh: '跨国制药龙头', en: 'Big Pharma' },
        description: {
          zh: '全球化大型制药企业，组合化销售网络+多管线。GLP-1（LLY/NVO）改变行业利润结构，IRA定价谈判与专利悬崖是核心变量。',
          en: 'Global pharma majors with diversified pipelines and worldwide commercial reach. GLP-1 (LLY/NVO) is reshaping profit pools; IRA price negotiation and patent cliffs are central risks.',
        },
        position: 'midstream',
        themes: {
          zh: ['GLP-1产能竞赛', 'IRA定价谈判', '专利悬崖与并购应对'],
          en: ['GLP-1 capacity race', 'IRA price negotiation', 'Patent cliffs & M&A response'],
        },
        companies: [
          { symbol: 'LLY', name: 'Eli Lilly' },
          { symbol: 'JNJ', name: 'Johnson & Johnson' },
          { symbol: 'ABBV', name: 'AbbVie' },
          { symbol: 'MRK', name: 'Merck' },
          { symbol: 'PFE', name: 'Pfizer' },
          { symbol: 'BMY', name: 'Bristol-Myers Squibb' },
          { symbol: 'AZN', name: 'AstraZeneca' },
          { symbol: 'NVO', name: 'Novo Nordisk' },
          { symbol: 'NVS', name: 'Novartis' },
          { symbol: 'GSK', name: 'GSK' },
          { symbol: 'SNY', name: 'Sanofi' },
        ],
      },
      {
        id: 'specialty-animal',
        name: { zh: '专科与动物保健药', en: 'Specialty & Animal Health' },
        description: {
          zh: '仿制药、专科药与动物保健。动物保健（ZTS/ELAN）受益于宠物消费长期渗透。',
          en: 'Generics, specialty pharma and animal health. Animal health (ZTS/ELAN) benefits from secular pet humanization.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'ZTS', name: 'Zoetis' },
          { symbol: 'ELAN', name: 'Elanco Animal Health' },
          { symbol: 'VTRS', name: 'Viatris' },
          { symbol: 'TEVA', name: 'Teva Pharmaceutical' },
        ],
      },
      {
        id: 'medtech',
        name: { zh: '医疗器械与MedTech', en: 'Medical Devices & MedTech' },
        description: {
          zh: '心血管、骨科、糖尿病管理、手术机器人、内镜。GLP-1对部分手术量影响是近期关键争议，但创新器械龙头表现仍稳健。',
          en: 'Cardiovascular, orthopedic, diabetes management, surgical robotics, endoscopy. GLP-1 spillover on surgical volumes is a near-term debate; innovation leaders remain resilient.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'ABT', name: 'Abbott Laboratories' },
          { symbol: 'MDT', name: 'Medtronic' },
          { symbol: 'SYK', name: 'Stryker' },
          { symbol: 'BSX', name: 'Boston Scientific' },
          { symbol: 'ISRG', name: 'Intuitive Surgical' },
          { symbol: 'EW', name: 'Edwards Lifesciences' },
          { symbol: 'BDX', name: 'Becton Dickinson' },
          { symbol: 'DXCM', name: 'DexCom' },
          { symbol: 'PODD', name: 'Insulet' },
          { symbol: 'BAX', name: 'Baxter International' },
        ],
      },
      {
        id: 'managed-care',
        name: { zh: '医保支付方（管理式医疗）', en: 'Managed Care / Payers' },
        description: {
          zh: '商业医保+Medicare Advantage+Medicaid，是美国医疗体系的"现金结算层"。Medicare Advantage费率与医疗利用率（MLR）是关键变量。',
          en: 'Commercial insurance plus Medicare Advantage and Medicaid — the cash settlement layer of US healthcare. MA rates and medical loss ratio (MLR) are the key drivers.',
        },
        position: 'downstream',
        themes: {
          zh: ['MA费率与MLR', 'GLP-1赔付压力', '政策与诉讼风险'],
          en: ['MA rates & MLR', 'GLP-1 reimbursement pressure', 'Policy & litigation risk'],
        },
        companies: [
          { symbol: 'UNH', name: 'UnitedHealth Group' },
          { symbol: 'ELV', name: 'Elevance Health' },
          { symbol: 'CI', name: 'Cigna' },
          { symbol: 'HUM', name: 'Humana' },
          { symbol: 'CNC', name: 'Centene' },
          { symbol: 'MOH', name: 'Molina Healthcare' },
        ],
      },
      {
        id: 'providers',
        name: { zh: '医疗服务与医院', en: 'Healthcare Providers & Hospitals' },
        description: {
          zh: '医院系统、连锁实验室、影像中心、康复护理。劳动力成本与医保报销节奏是利润关键。',
          en: 'Hospital systems, reference labs, imaging, post-acute care. Labor cost and reimbursement cadence drive margins.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'HCA', name: 'HCA Healthcare' },
          { symbol: 'THC', name: 'Tenet Healthcare' },
          { symbol: 'UHS', name: 'Universal Health Services' },
          { symbol: 'DGX', name: 'Quest Diagnostics' },
          { symbol: 'LH', name: 'Labcorp' },
        ],
      },
      {
        id: 'distribution-pbm',
        name: { zh: '医药流通与PBM', en: 'Pharma Distribution & PBM' },
        description: {
          zh: '药品分销三巨头+连锁药房+PBM。GLP-1高单价药与专科药提高了周转规模，PBM受政策审查持续。',
          en: 'Big-Three drug distributors, chain pharmacies and PBMs. High-priced GLP-1 and specialty drugs raise throughput; PBMs face ongoing political scrutiny.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'MCK', name: 'McKesson' },
          { symbol: 'COR', name: 'Cencora' },
          { symbol: 'CAH', name: 'Cardinal Health' },
          { symbol: 'CVS', name: 'CVS Health' },
          { symbol: 'WBA', name: 'Walgreens Boots Alliance' },
        ],
      },
      {
        id: 'healthcare-it',
        name: { zh: '医疗信息化与平台', en: 'Healthcare IT & Platforms' },
        description: {
          zh: '云生命科学CRM、医生社交、远程医疗、医院IT。生物制药数字化转型与GLP-1长期管理需求是增长点。',
          en: 'Cloud life-sciences CRM, physician networks, telehealth, hospital IT. Biopharma digital transformation and GLP-1 long-term management drive growth.',
        },
        position: 'platform',
        companies: [
          { symbol: 'VEEV', name: 'Veeva Systems' },
          { symbol: 'DOCS', name: 'Doximity' },
          { symbol: 'HIMS', name: 'Hims & Hers Health' },
          { symbol: 'TDOC', name: 'Teladoc Health' },
        ],
      },
    ],
  },

  'Financial Services': {
    sector: 'Financial Services',
    overview: {
      zh: '美国金融服务是经济周期的"晴雨表"，由银行（综合大行、地区银行、托管行、投行）、保险（财险、寿险、再保、经纪）、资管（传统/另类）、支付（卡组织/收单）、消费金融与新兴金融科技六大块组成。利率曲线、信用周期、并购活动与监管资本规则是核心变量。',
      en: 'US Financials is the economy\'s barometer: universal banks, regionals, custody banks, investment banks; P&C / life / reinsurance / brokers in insurance; traditional and alternative asset managers; card networks and acquirers; consumer finance; and fintech. Yield curve, credit cycle, M&A activity and capital rules drive earnings.',
    },
    segments: [
      {
        id: 'universal-banks',
        name: { zh: '综合大行（货币中心银行）', en: 'Universal / Money-Center Banks' },
        description: {
          zh: '存贷+投行+资管+财富一体化，资本市场和零售两端都强。受益于高利率净息差扩张和投行/交易复苏。',
          en: 'Integrated lending, investment banking, asset/wealth franchises. Benefit from elevated NIM plus a rebound in IB and trading.',
        },
        position: 'infrastructure',
        themes: {
          zh: ['NIM拐点', '投行复苏', '巴塞尔III终局规则'],
          en: ['NIM inflection', 'IB recovery', 'Basel III endgame rules'],
        },
        companies: [
          { symbol: 'JPM', name: 'JPMorgan Chase' },
          { symbol: 'BAC', name: 'Bank of America' },
          { symbol: 'WFC', name: 'Wells Fargo' },
          { symbol: 'C', name: 'Citigroup' },
        ],
      },
      {
        id: 'investment-banks',
        name: { zh: '投资银行与资本市场', en: 'Investment Banks & Capital Markets' },
        description: {
          zh: '并购顾问、承销、做市与交易、机构经纪。与并购周期、IPO窗口和波动率高度相关。',
          en: 'M&A advisory, underwriting, market-making, prime brokerage. Highly geared to deal cycles, IPO windows and volatility.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'GS', name: 'Goldman Sachs' },
          { symbol: 'MS', name: 'Morgan Stanley' },
          { symbol: 'EVR', name: 'Evercore' },
          { symbol: 'LAZ', name: 'Lazard' },
          { symbol: 'HLI', name: 'Houlihan Lokey' },
          { symbol: 'PJT', name: 'PJT Partners' },
        ],
      },
      {
        id: 'regional-banks',
        name: { zh: '地区性银行', en: 'Regional Banks' },
        description: {
          zh: '聚焦本地存贷、商业地产和中小企业。CRE资产质量、存款成本与监管资本是利润决定项。',
          en: 'Local deposit-taking, CRE and middle-market lending. CRE credit quality, deposit beta and capital rules determine earnings.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'USB', name: 'U.S. Bancorp' },
          { symbol: 'PNC', name: 'PNC Financial' },
          { symbol: 'TFC', name: 'Truist Financial' },
          { symbol: 'FITB', name: 'Fifth Third Bancorp' },
          { symbol: 'MTB', name: 'M&T Bank' },
          { symbol: 'KEY', name: 'KeyCorp' },
          { symbol: 'RF', name: 'Regions Financial' },
          { symbol: 'HBAN', name: 'Huntington Bancshares' },
          { symbol: 'CFG', name: 'Citizens Financial' },
        ],
      },
      {
        id: 'custody-trust',
        name: { zh: '托管与信托银行', en: 'Custody & Trust Banks' },
        description: {
          zh: '为机构资金提供托管、清算、外汇与证券服务。AUC/A规模与短端利率敏感。',
          en: 'Provide custody, clearing, FX and securities services to institutional capital. Sensitive to AUC/A growth and short-rate environment.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'BK', name: 'BNY Mellon' },
          { symbol: 'STT', name: 'State Street' },
          { symbol: 'NTRS', name: 'Northern Trust' },
        ],
      },
      {
        id: 'exchanges',
        name: { zh: '交易所与市场基础设施', en: 'Exchanges & Market Infrastructure' },
        description: {
          zh: '股票/期货/期权/固定收益/数据交易所及清算所。高ROIC、强护城河，受益于波动率与衍生品扩容。',
          en: 'Equity, futures, options, fixed-income and data exchanges plus clearing. High ROIC moats benefiting from volatility and derivatives expansion.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'ICE', name: 'Intercontinental Exchange' },
          { symbol: 'CME', name: 'CME Group' },
          { symbol: 'NDAQ', name: 'Nasdaq' },
          { symbol: 'CBOE', name: 'Cboe Global Markets' },
          { symbol: 'MKTX', name: 'MarketAxess' },
          { symbol: 'TW', name: 'Tradeweb Markets' },
        ],
      },
      {
        id: 'card-networks',
        name: { zh: '卡组织与支付网络', en: 'Card Networks' },
        description: {
          zh: '全球开放支付网络+企业旅行卡。受益于现金电子化、跨境消费回升，监管费率压力周期性。',
          en: 'Global open-loop networks and corporate card franchises. Cash-to-electronic conversion and cross-border tailwinds; periodic interchange regulation risk.',
        },
        position: 'platform',
        companies: [
          { symbol: 'V', name: 'Visa' },
          { symbol: 'MA', name: 'Mastercard' },
          { symbol: 'AXP', name: 'American Express' },
        ],
      },
      {
        id: 'payment-processors',
        name: { zh: '支付处理与收单', en: 'Payment Processors & Acquirers' },
        description: {
          zh: '商户收单、银行核心系统、电商网关。受软件化竞争与中型并购挤压，估值整体压制。',
          en: 'Merchant acquiring, bank core systems, e-commerce gateways. Compressed by software-led competitors and consolidation overhang.',
        },
        position: 'platform',
        companies: [
          { symbol: 'FIS', name: 'Fidelity National Information' },
          { symbol: 'FI', name: 'Fiserv' },
          { symbol: 'GPN', name: 'Global Payments' },
          { symbol: 'WU', name: 'Western Union' },
        ],
      },
      {
        id: 'pc-insurance',
        name: { zh: '财产与意外险', en: 'P&C Insurance' },
        description: {
          zh: '车险/家财险/商业险/再保。承保周期、巨灾损失、利率与投资收益共同决定盈利。',
          en: 'Auto, home, commercial, reinsurance. Underwriting cycle, cat losses, rates and investment income drive results.',
        },
        position: 'service',
        themes: {
          zh: ['硬市场延续', '巨灾再保涨价', '车险费率周期顶部'],
          en: ['Hard market persists', 'Reinsurance price hikes', 'Auto pricing cycle peaking'],
        },
        companies: [
          { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
          { symbol: 'PGR', name: 'Progressive' },
          { symbol: 'CB', name: 'Chubb' },
          { symbol: 'TRV', name: 'Travelers Companies' },
          { symbol: 'ALL', name: 'Allstate' },
          { symbol: 'AIG', name: 'American International Group' },
          { symbol: 'HIG', name: 'Hartford Financial' },
          { symbol: 'EG', name: 'Everest Group' },
          { symbol: 'RNR', name: 'RenaissanceRe' },
        ],
      },
      {
        id: 'life-insurance',
        name: { zh: '寿险与年金', en: 'Life Insurance & Annuities' },
        description: {
          zh: '寿险、养老年金、团险。利率水平与权益市场决定准备金与投资收益。',
          en: 'Life, annuity, group. Rates and equity markets drive reserves and investment income.',
        },
        position: 'service',
        companies: [
          { symbol: 'MET', name: 'MetLife' },
          { symbol: 'PRU', name: 'Prudential Financial' },
          { symbol: 'AFL', name: 'Aflac' },
          { symbol: 'PFG', name: 'Principal Financial' },
          { symbol: 'LNC', name: 'Lincoln National' },
          { symbol: 'GL', name: 'Globe Life' },
        ],
      },
      {
        id: 'insurance-brokers',
        name: { zh: '保险经纪与咨询', en: 'Insurance Brokers' },
        description: {
          zh: '商业保险经纪、再保经纪、福利咨询。轻资产+续保收入，估值长期看高。',
          en: 'Commercial broking, reinsurance broking, benefits consulting. Asset-light, recurring revenue — structurally premium-valued.',
        },
        position: 'service',
        companies: [
          { symbol: 'MMC', name: 'Marsh & McLennan' },
          { symbol: 'AON', name: 'Aon' },
          { symbol: 'AJG', name: 'Arthur J. Gallagher' },
          { symbol: 'WTW', name: 'Willis Towers Watson' },
          { symbol: 'BRO', name: 'Brown & Brown' },
        ],
      },
      {
        id: 'traditional-asset-mgmt',
        name: { zh: '传统资产管理', en: 'Traditional Asset Managers' },
        description: {
          zh: '主动+被动公募/养老/保险委外。AUM随市值波动，被动化趋势侵蚀主动费率。',
          en: 'Active + passive funds, pension, insurance mandates. AUM tracks markets; passive shift compresses active fees.',
        },
        position: 'platform',
        companies: [
          { symbol: 'BLK', name: 'BlackRock' },
          { symbol: 'TROW', name: 'T. Rowe Price' },
          { symbol: 'BEN', name: 'Franklin Resources' },
          { symbol: 'IVZ', name: 'Invesco' },
          { symbol: 'AMG', name: 'Affiliated Managers' },
          { symbol: 'BAM', name: 'Brookfield Asset Management' },
          { symbol: 'BN', name: 'Brookfield Corporation' },
        ],
      },
      {
        id: 'alternative-asset-mgmt',
        name: { zh: '另类资产管理', en: 'Alternative Asset Managers' },
        description: {
          zh: '私募股权、私募信贷、基础设施、地产、对冲基金。永续资本+管理费+业绩报酬，估值溢价显著。',
          en: 'PE, private credit, infrastructure, real estate, hedge funds. Permanent capital + management fees + carry justify premium valuations.',
        },
        position: 'platform',
        themes: {
          zh: ['私募信贷扩张', '保险资金渠道', '估值/退出周期'],
          en: ['Private credit growth', 'Insurance balance-sheet partnership', 'Valuation / exit cycle'],
        },
        companies: [
          { symbol: 'BX', name: 'Blackstone' },
          { symbol: 'KKR', name: 'KKR & Co' },
          { symbol: 'APO', name: 'Apollo Global Management' },
          { symbol: 'ARES', name: 'Ares Management' },
          { symbol: 'OWL', name: 'Blue Owl Capital' },
          { symbol: 'TPG', name: 'TPG Inc' },
          { symbol: 'CG', name: 'Carlyle Group' },
        ],
      },
      {
        id: 'brokerage-wealth',
        name: { zh: '券商与财富管理', en: 'Brokers & Wealth Platforms' },
        description: {
          zh: '零售券商+财富管理+清算。受息差+交易量+顾问招募驱动。',
          en: 'Retail brokerage, wealth management, clearing. Driven by spread income, transaction volume and advisor recruiting.',
        },
        position: 'platform',
        companies: [
          { symbol: 'SCHW', name: 'Charles Schwab' },
          { symbol: 'IBKR', name: 'Interactive Brokers' },
          { symbol: 'LPLA', name: 'LPL Financial' },
          { symbol: 'RJF', name: 'Raymond James' },
          { symbol: 'HOOD', name: 'Robinhood Markets' },
        ],
      },
      {
        id: 'consumer-finance',
        name: { zh: '消费金融与信用卡', en: 'Consumer Finance & Cards' },
        description: {
          zh: '信用卡发行、汽车金融、个人贷款。信用质量与失业率高度相关。',
          en: 'Card issuers, auto finance, personal lending. Credit quality tracks the unemployment cycle.',
        },
        position: 'service',
        companies: [
          { symbol: 'COF', name: 'Capital One Financial' },
          { symbol: 'DFS', name: 'Discover Financial' },
          { symbol: 'SYF', name: 'Synchrony Financial' },
          { symbol: 'ALLY', name: 'Ally Financial' },
        ],
      },
      {
        id: 'fintech',
        name: { zh: '金融科技与数字金融', en: 'Fintech & Digital Finance' },
        description: {
          zh: '数字钱包、BNPL、加密交易、消费数字银行。利率/合规/竞争三重压力，盈利路径分化。',
          en: 'Digital wallets, BNPL, crypto exchanges, neo-banks. Rate, compliance, and competitive pressures push wide dispersion in profit trajectory.',
        },
        position: 'platform',
        companies: [
          { symbol: 'PYPL', name: 'PayPal Holdings' },
          { symbol: 'SQ', name: 'Block Inc' },
          { symbol: 'AFRM', name: 'Affirm Holdings' },
          { symbol: 'SOFI', name: 'SoFi Technologies' },
          { symbol: 'COIN', name: 'Coinbase Global' },
          { symbol: 'NU', name: 'Nu Holdings' },
        ],
      },
    ],
  },

  Energy: {
    sector: 'Energy',
    overview: {
      zh: '美国能源板块以油气为绝对主体，覆盖勘探开采（E&P）、综合石油、油服与设备、中游管输与LNG、炼化、煤炭，以及可再生设备制造和铀。WTI/Brent油价、Henry Hub天然气价、LNG出口、页岩资本开支自律和OPEC+决策是核心变量。',
      en: 'US Energy is dominated by oil & gas — integrated majors, pure-play E&P, oilfield services and equipment, midstream pipelines, LNG, refining, and coal — plus renewable equipment makers and uranium. WTI/Brent, Henry Hub, LNG exports, shale capital discipline, and OPEC+ policy are the swing factors.',
    },
    segments: [
      {
        id: 'integrated-majors',
        name: { zh: '综合石油巨头', en: 'Integrated Oil Majors' },
        description: {
          zh: '上中下游一体化，全球化油气资产+炼化+化工+低碳投资。强自由现金流、回购+股息为主要回报。',
          en: 'Fully integrated upstream-to-downstream with global oil & gas, refining, chemicals and low-carbon investments. Strong free cash flow funds buybacks and dividends.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'XOM', name: 'ExxonMobil' },
          { symbol: 'CVX', name: 'Chevron' },
          { symbol: 'SHEL', name: 'Shell' },
          { symbol: 'BP', name: 'BP' },
          { symbol: 'TTE', name: 'TotalEnergies' },
          { symbol: 'EQNR', name: 'Equinor' },
        ],
      },
      {
        id: 'ep-shale',
        name: { zh: '油气勘探与开采(E&P)', en: 'Exploration & Production (E&P)' },
        description: {
          zh: '纯上游页岩与常规油气生产商，二叠盆地资源整合是结构性主题。资本纪律+回购成为常态。',
          en: 'Pure upstream shale and conventional producers. Permian consolidation is the structural theme; capital discipline and buybacks are now baseline.',
        },
        position: 'upstream',
        themes: {
          zh: ['二叠盆地并购整合', '产量增长放缓+回购', '天然气出口长协'],
          en: ['Permian consolidation', 'Slower growth + buybacks', 'Long-term LNG offtake'],
        },
        companies: [
          { symbol: 'COP', name: 'ConocoPhillips' },
          { symbol: 'EOG', name: 'EOG Resources' },
          { symbol: 'OXY', name: 'Occidental Petroleum' },
          { symbol: 'FANG', name: 'Diamondback Energy' },
          { symbol: 'DVN', name: 'Devon Energy' },
          { symbol: 'HES', name: 'Hess' },
          { symbol: 'CTRA', name: 'Coterra Energy' },
          { symbol: 'EXE', name: 'Expand Energy' },
        ],
      },
      {
        id: 'oilfield-services',
        name: { zh: '油田服务', en: 'Oilfield Services' },
        description: {
          zh: '钻完井服务、压裂、定向钻井、生产化学品、数字油田。国际市场比北美更稳，海上深水复苏。',
          en: 'Drilling and completion services, frac, directional drilling, production chemistry, digital oilfield. International more resilient than North America; deepwater recovering.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'SLB', name: 'Schlumberger' },
          { symbol: 'HAL', name: 'Halliburton' },
          { symbol: 'BKR', name: 'Baker Hughes' },
          { symbol: 'NOV', name: 'NOV Inc' },
          { symbol: 'WFRD', name: 'Weatherford International' },
          { symbol: 'CHX', name: 'ChampionX' },
        ],
      },
      {
        id: 'drilling-equipment',
        name: { zh: '钻井平台与设备', en: 'Drilling Rigs & Equipment' },
        description: {
          zh: '海上钻井平台与陆上钻机租赁。强周期，海上日费上行。',
          en: 'Offshore rigs and onshore rig rentals. Deeply cyclical; offshore dayrates rising.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'RIG', name: 'Transocean' },
          { symbol: 'VAL', name: 'Valaris' },
          { symbol: 'NE', name: 'Noble Corporation' },
          { symbol: 'BORR', name: 'Borr Drilling' },
        ],
      },
      {
        id: 'midstream-pipelines',
        name: { zh: '管道与中游(MLPs)', en: 'Pipelines & Midstream (MLPs)' },
        description: {
          zh: '原油/天然气/NGL管输、储存、加工与LNG出口。类公用事业现金流+高分派，受益于LNG出口扩张和数据中心电力需求。',
          en: 'Crude, gas and NGL pipelines, storage, processing and LNG export. Utility-like cash flows and distributions; tailwinds from LNG export build-out and data-center power demand.',
        },
        position: 'midstream',
        themes: {
          zh: ['LNG出口扩产', '数据中心天然气需求', 'NGL/乙烷国际化'],
          en: ['LNG export expansion', 'Data-center gas demand', 'NGL / ethane export growth'],
        },
        companies: [
          { symbol: 'ENB', name: 'Enbridge' },
          { symbol: 'KMI', name: 'Kinder Morgan' },
          { symbol: 'WMB', name: 'Williams Companies' },
          { symbol: 'OKE', name: 'ONEOK' },
          { symbol: 'TRGP', name: 'Targa Resources' },
          { symbol: 'ET', name: 'Energy Transfer' },
          { symbol: 'EPD', name: 'Enterprise Products Partners' },
          { symbol: 'MPLX', name: 'MPLX' },
          { symbol: 'PAA', name: 'Plains All American' },
        ],
      },
      {
        id: 'refining',
        name: { zh: '炼化与销售', en: 'Refining & Marketing' },
        description: {
          zh: '汽油/柴油/航煤炼厂+零售加油，强裂解价差周期。',
          en: 'Gasoline, diesel and jet refining plus retail fuel. Strong cyclicality around crack spreads.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'VLO', name: 'Valero Energy' },
          { symbol: 'MPC', name: 'Marathon Petroleum' },
          { symbol: 'PSX', name: 'Phillips 66' },
          { symbol: 'DINO', name: 'HF Sinclair' },
          { symbol: 'PBF', name: 'PBF Energy' },
        ],
      },
      {
        id: 'lng',
        name: { zh: 'LNG液化与出口', en: 'LNG Liquefaction & Export' },
        description: {
          zh: '美国本土LNG液化装置和外销长协。受欧亚替代需求+数据中心拉动，是结构性增长口。',
          en: 'US LNG liquefaction facilities and long-term offtake. Structural growth from EU/Asia demand and AI-driven gas needs.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'LNG', name: 'Cheniere Energy' },
          { symbol: 'CQP', name: 'Cheniere Energy Partners' },
          { symbol: 'NFE', name: 'New Fortress Energy' },
        ],
      },
      {
        id: 'renewable-equipment',
        name: { zh: '光伏与可再生设备', en: 'Solar & Renewable Equipment' },
        description: {
          zh: '光伏组件、微逆变器、电池储能、住宅光伏。IRA补贴+利率敏感，估值波动大。',
          en: 'Solar modules, microinverters, battery storage, residential solar. IRA-subsidy and rate-sensitive; high valuation volatility.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'FSLR', name: 'First Solar' },
          { symbol: 'ENPH', name: 'Enphase Energy' },
          { symbol: 'RUN', name: 'Sunrun' },
          { symbol: 'ARRY', name: 'Array Technologies' },
          { symbol: 'NOVA', name: 'Sunnova Energy' },
        ],
      },
      {
        id: 'uranium-coal',
        name: { zh: '铀与煤炭', en: 'Uranium & Coal' },
        description: {
          zh: '核燃料供应商与冶金/动力煤生产商。AI数据中心+核电复苏带动铀价上行。',
          en: 'Nuclear fuel suppliers and met/thermal coal. AI data-center demand and nuclear renaissance lift uranium.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'CCJ', name: 'Cameco' },
          { symbol: 'UEC', name: 'Uranium Energy' },
          { symbol: 'LEU', name: 'Centrus Energy' },
          { symbol: 'BTU', name: 'Peabody Energy' },
          { symbol: 'ARCH', name: 'Arch Resources' },
        ],
      },
    ],
  },

  'Consumer Cyclical': {
    sector: 'Consumer Cyclical',
    overview: {
      zh: '可选消费板块覆盖汽车、服装、餐饮、家居、旅游酒店、博彩、电商和住宅建造，整体高度顺周期。利率水平、就业市场、消费者实际收入与气候节令决定景气。AI 与会员制零售、GLP-1 对消费习惯的二阶影响是近两年新主题。',
      en: 'Consumer Cyclical spans autos, apparel, restaurants, home improvement, travel & lodging, gaming, e-commerce, and homebuilders — broadly procyclical. Rates, employment, real income and seasonal weather drive demand. AI-personalization, membership retail, and the second-order impact of GLP-1 on consumer behavior are the new structural themes.',
    },
    segments: [
      {
        id: 'auto-mfg',
        name: { zh: '汽车整车', en: 'Auto Manufacturers' },
        description: {
          zh: '传统车厂+EV原生车厂+中日韩外资。电动化进度、产能利用率、激励促销与劳工成本是关键。',
          en: 'Legacy OEMs, EV-native makers and foreign nameplates. EV pace, utilization, incentives and labor costs are the main earnings drivers.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'TSLA', name: 'Tesla' },
          { symbol: 'GM', name: 'General Motors' },
          { symbol: 'F', name: 'Ford Motor' },
          { symbol: 'TM', name: 'Toyota Motor' },
          { symbol: 'HMC', name: 'Honda Motor' },
          { symbol: 'STLA', name: 'Stellantis' },
          { symbol: 'RIVN', name: 'Rivian Automotive' },
          { symbol: 'LCID', name: 'Lucid Group' },
        ],
      },
      {
        id: 'auto-parts',
        name: { zh: '汽车零部件与售后', en: 'Auto Parts & Aftermarket' },
        description: {
          zh: '动力总成、内外饰、ADAS与EV零部件，以及连锁汽配零售。新车销量+车龄+EV转型决定结构。',
          en: 'Powertrain, interior/exterior, ADAS and EV parts plus aftermarket retail. New-car volumes, parc age and EV transition shape the mix.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'APTV', name: 'Aptiv' },
          { symbol: 'MGA', name: 'Magna International' },
          { symbol: 'LEA', name: 'Lear' },
          { symbol: 'GT', name: 'Goodyear Tire & Rubber' },
          { symbol: 'AZO', name: 'AutoZone' },
          { symbol: 'ORLY', name: "O'Reilly Automotive" },
          { symbol: 'AAP', name: 'Advance Auto Parts' },
        ],
      },
      {
        id: 'apparel-footwear',
        name: { zh: '服装鞋履品牌', en: 'Apparel & Footwear Brands' },
        description: {
          zh: '运动+功能性+轻奢+大众。中国市场敏感+DTC比例上升+库存周期是关键。',
          en: 'Athletic, performance, premium and mass. Exposed to China, DTC mix, and inventory cycles.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'NKE', name: 'Nike' },
          { symbol: 'LULU', name: 'Lululemon Athletica' },
          { symbol: 'ONON', name: 'On Holding' },
          { symbol: 'DECK', name: 'Deckers Outdoor' },
          { symbol: 'VFC', name: 'VF Corp' },
          { symbol: 'RL', name: 'Ralph Lauren' },
          { symbol: 'CROX', name: 'Crocs' },
        ],
      },
      {
        id: 'restaurants',
        name: { zh: '连锁餐饮', en: 'Restaurants' },
        description: {
          zh: 'QSR、Fast-Casual与休闲正餐。劳动力成本+客单价+同店增长决定盈利节奏。',
          en: 'QSR, fast-casual and casual dining. Labor cost, ticket and SSS comp drive earnings cadence.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'MCD', name: "McDonald's" },
          { symbol: 'SBUX', name: 'Starbucks' },
          { symbol: 'CMG', name: 'Chipotle Mexican Grill' },
          { symbol: 'YUM', name: 'Yum! Brands' },
          { symbol: 'QSR', name: 'Restaurant Brands' },
          { symbol: 'DPZ', name: "Domino's Pizza" },
          { symbol: 'WING', name: 'Wingstop' },
          { symbol: 'CAVA', name: 'CAVA Group' },
          { symbol: 'DRI', name: 'Darden Restaurants' },
        ],
      },
      {
        id: 'home-improvement',
        name: { zh: '家居建材零售', en: 'Home Improvement Retail' },
        description: {
          zh: 'DIY+专业承包商两端。住房成交量、二手房翻新、利率高度相关。',
          en: 'DIY and pro-contractor channels. Tied to existing-home turnover, remodel cycles and rates.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'HD', name: 'Home Depot' },
          { symbol: 'LOW', name: "Lowe's Companies" },
          { symbol: 'FND', name: 'Floor & Decor' },
          { symbol: 'TSCO', name: 'Tractor Supply' },
          { symbol: 'BLDR', name: 'Builders FirstSource' },
        ],
      },
      {
        id: 'off-price-discount',
        name: { zh: '折扣与品牌折扣零售', en: 'Off-Price & Discount Retail' },
        description: {
          zh: '品牌过季折扣+一元店+仓储俱乐部低价转化。消费降级周期典型受益方。',
          en: 'Off-price branded apparel, dollar stores and value retail. Classic beneficiaries of trade-down cycles.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'TJX', name: 'TJX Companies' },
          { symbol: 'ROST', name: 'Ross Stores' },
          { symbol: 'BURL', name: 'Burlington Stores' },
          { symbol: 'FIVE', name: 'Five Below' },
        ],
      },
      {
        id: 'broadline-specialty',
        name: { zh: '综合与专业零售', en: 'Broadline & Specialty Retail' },
        description: {
          zh: '百货、家居、3C、汽车、二手车与美妆专业。AI 个性化+全渠道是分化主线。',
          en: 'Department stores, home goods, consumer electronics, autos, used-car retail, beauty specialty. AI personalization and omnichannel separate the winners.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'TGT', name: 'Target' },
          { symbol: 'BBY', name: 'Best Buy' },
          { symbol: 'ULTA', name: 'Ulta Beauty' },
          { symbol: 'CVNA', name: 'Carvana' },
          { symbol: 'KMX', name: 'CarMax' },
          { symbol: 'GPS', name: 'Gap' },
        ],
      },
      {
        id: 'ecommerce',
        name: { zh: '电商平台', en: 'E-commerce Platforms' },
        description: {
          zh: '一站式电商、宠物/二手车/家居等垂直电商以及拉美/亚洲跨境平台。规模效应+物流仓储+广告变现是护城河。',
          en: 'General and vertical e-commerce plus LatAm/Asia cross-border platforms. Scale, logistics, and ad monetization form the moat.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'AMZN', name: 'Amazon' },
          { symbol: 'BABA', name: 'Alibaba' },
          { symbol: 'PDD', name: 'PDD Holdings' },
          { symbol: 'JD', name: 'JD.com' },
          { symbol: 'MELI', name: 'MercadoLibre' },
          { symbol: 'EBAY', name: 'eBay' },
          { symbol: 'ETSY', name: 'Etsy' },
          { symbol: 'CHWY', name: 'Chewy' },
          { symbol: 'W', name: 'Wayfair' },
        ],
      },
      {
        id: 'travel-lodging',
        name: { zh: '旅游与住宿', en: 'Travel & Lodging' },
        description: {
          zh: '在线旅游OTA+全球连锁酒店+短租。商旅恢复+全球出境游+忠诚会员体系是关键。',
          en: 'OTAs, global hotel chains, short-term rentals. Business travel recovery, outbound travel and loyalty programs are central drivers.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'BKNG', name: 'Booking Holdings' },
          { symbol: 'ABNB', name: 'Airbnb' },
          { symbol: 'EXPE', name: 'Expedia Group' },
          { symbol: 'MAR', name: 'Marriott International' },
          { symbol: 'HLT', name: 'Hilton Worldwide' },
          { symbol: 'H', name: 'Hyatt Hotels' },
          { symbol: 'IHG', name: 'InterContinental Hotels' },
        ],
      },
      {
        id: 'cruise-casino',
        name: { zh: '邮轮、博彩与体育', en: 'Cruises, Casinos & Sports Betting' },
        description: {
          zh: '邮轮三巨头+拉斯/澳门博彩+数字博彩。债务结构+中国/澳门重启+合法博彩州数扩张是变量。',
          en: 'Three cruise leaders, Las Vegas/Macau gaming, online sports betting. Balance-sheet repair, China/Macau reopening and US state legalization are key swings.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'CCL', name: 'Carnival' },
          { symbol: 'RCL', name: 'Royal Caribbean Group' },
          { symbol: 'NCLH', name: 'Norwegian Cruise Line' },
          { symbol: 'LVS', name: 'Las Vegas Sands' },
          { symbol: 'WYNN', name: 'Wynn Resorts' },
          { symbol: 'MGM', name: 'MGM Resorts' },
          { symbol: 'DKNG', name: 'DraftKings' },
          { symbol: 'FLUT', name: 'Flutter Entertainment' },
        ],
      },
      {
        id: 'homebuilders',
        name: { zh: '住宅建造', en: 'Homebuilders' },
        description: {
          zh: '美国新房建造商，受按揭利率+人口结构+土地库存驱动。供给紧+按揭利率回落是核心多头逻辑。',
          en: 'US single-family builders. Driven by mortgage rates, demographics and land inventory. Tight supply plus easing rates is the bull case.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'DHI', name: 'D.R. Horton' },
          { symbol: 'LEN', name: 'Lennar' },
          { symbol: 'NVR', name: 'NVR' },
          { symbol: 'PHM', name: 'PulteGroup' },
          { symbol: 'TOL', name: 'Toll Brothers' },
        ],
      },
    ],
  },

  'Consumer Defensive': {
    sector: 'Consumer Defensive',
    overview: {
      zh: '必需消费聚焦食品饮料、日用化、烟草、零售商超、农业和折扣店，整体抗周期+稳定现金流。GLP-1 对零食/酒精/含糖饮料长期消费量的影响、自有品牌渗透、农业商品价格是当下关键。',
      en: 'Consumer Defensive covers food & beverage, household goods, tobacco, grocery and mass retail, agriculture, and discount stores — anti-cyclical with stable cash flow. The long-term impact of GLP-1 on snacks/alcohol/sugary drinks, private-label penetration, and ag commodity prices are key themes.',
    },
    segments: [
      {
        id: 'mass-warehouse',
        name: { zh: '大众零售与仓储会员', en: 'Mass Retail & Warehouse Clubs' },
        description: {
          zh: '沃尔玛+Costco为代表，强会员体系+供应链规模。受益于消费降级与中产稳定消费。',
          en: 'Walmart and Costco lead — membership + supply-chain scale. Benefit from trade-down and steady middle-class consumption.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'WMT', name: 'Walmart' },
          { symbol: 'COST', name: 'Costco Wholesale' },
          { symbol: 'BJ', name: 'BJ\'s Wholesale Club' },
        ],
      },
      {
        id: 'grocery',
        name: { zh: '连锁超市', en: 'Grocery Chains' },
        description: {
          zh: '区域+全国性传统超市。规模整合、自有品牌渗透与电商/快递是竞争主线。',
          en: 'Regional and national grocers. Consolidation, private-label penetration and digital fulfillment are competitive battlegrounds.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'KR', name: 'Kroger' },
          { symbol: 'ACI', name: 'Albertsons Companies' },
          { symbol: 'SFM', name: 'Sprouts Farmers Market' },
        ],
      },
      {
        id: 'beverages-nonalc',
        name: { zh: '非酒精饮料', en: 'Non-Alcoholic Beverages' },
        description: {
          zh: '可乐/百事系统+功能饮料+能量饮料。健康化趋势+海外市场扩张是结构变量。',
          en: 'Cola majors, functional and energy drinks. Health/wellness shift and international expansion drive the mix.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'KO', name: 'Coca-Cola' },
          { symbol: 'PEP', name: 'PepsiCo' },
          { symbol: 'KDP', name: 'Keurig Dr Pepper' },
          { symbol: 'MNST', name: 'Monster Beverage' },
          { symbol: 'CELH', name: 'Celsius Holdings' },
        ],
      },
      {
        id: 'beverages-alc',
        name: { zh: '酒精饮料', en: 'Alcoholic Beverages' },
        description: {
          zh: '啤酒+烈酒+葡萄酒。GLP-1 对长期消费量的影响是新增逆风，高端化与新兴市场扩张是对冲。',
          en: 'Beer, spirits and wine. GLP-1 is a new long-term volume headwind; premiumization and emerging-market growth are offsets.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'BUD', name: 'Anheuser-Busch InBev' },
          { symbol: 'STZ', name: 'Constellation Brands' },
          { symbol: 'DEO', name: 'Diageo' },
          { symbol: 'TAP', name: 'Molson Coors Beverage' },
          { symbol: 'SAM', name: 'Boston Beer' },
        ],
      },
      {
        id: 'tobacco',
        name: { zh: '烟草', en: 'Tobacco' },
        description: {
          zh: '传统卷烟+无烟产品（电子烟/口含烟）+加热不燃烧。监管周期+减害产品组合是估值关键。',
          en: 'Combustibles plus smoke-free products (vape, oral, heat-not-burn). Regulation and reduced-risk product mix drive the multiple.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'PM', name: 'Philip Morris International' },
          { symbol: 'MO', name: 'Altria Group' },
          { symbol: 'BTI', name: 'British American Tobacco' },
        ],
      },
      {
        id: 'packaged-food',
        name: { zh: '包装食品', en: 'Packaged Food' },
        description: {
          zh: '主食+休闲食品+宠物食品+冷链。原材料价格回落但销量承压，GLP-1是长期争议。',
          en: 'Center-of-store, snacks, pet food, frozen. Commodity costs are easing but volumes are soft; GLP-1 remains a long-term overhang.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'KHC', name: 'Kraft Heinz' },
          { symbol: 'GIS', name: 'General Mills' },
          { symbol: 'K', name: 'Kellanova' },
          { symbol: 'HSY', name: 'Hershey' },
          { symbol: 'MDLZ', name: 'Mondelez International' },
          { symbol: 'CAG', name: 'Conagra Brands' },
          { symbol: 'HRL', name: 'Hormel Foods' },
          { symbol: 'CPB', name: 'Campbell Soup' },
        ],
      },
      {
        id: 'household',
        name: { zh: '家居日用品', en: 'Household Products' },
        description: {
          zh: '清洁、纸品、口腔、纤维。提价能力+原材料成本+新兴市场是核心变量。',
          en: 'Cleaning, paper, oral care, fabric care. Pricing power, input costs and EM growth are the main drivers.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'PG', name: 'Procter & Gamble' },
          { symbol: 'CL', name: 'Colgate-Palmolive' },
          { symbol: 'CLX', name: 'Clorox' },
          { symbol: 'CHD', name: 'Church & Dwight' },
          { symbol: 'KMB', name: 'Kimberly-Clark' },
          { symbol: 'UL', name: 'Unilever' },
        ],
      },
      {
        id: 'personal-care-beauty',
        name: { zh: '个人护理与美妆', en: 'Personal Care & Beauty' },
        description: {
          zh: '高端+药妆+大众美妆。中国免税复苏与新兴品牌（ELF）是主要变量。',
          en: 'Prestige, derma, and mass beauty. China travel-retail recovery and emerging brands (ELF) are key swings.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'EL', name: 'Estée Lauder' },
          { symbol: 'COTY', name: 'Coty' },
          { symbol: 'ELF', name: 'e.l.f. Beauty' },
          { symbol: 'BBWI', name: 'Bath & Body Works' },
        ],
      },
      {
        id: 'agriculture',
        name: { zh: '农产品贸易与蛋白', en: 'Agribusiness & Protein' },
        description: {
          zh: '粮油贸易商+大型禽肉/猪肉/牛肉生产。农产品价格周期+饲料成本+疫情是变量。',
          en: 'Grain trading and poultry/pork/beef processors. Commodity cycle, feed cost and disease are the swing factors.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'ADM', name: 'Archer-Daniels-Midland' },
          { symbol: 'BG', name: 'Bunge Global' },
          { symbol: 'TSN', name: 'Tyson Foods' },
          { symbol: 'PPC', name: 'Pilgrim\'s Pride' },
        ],
      },
      {
        id: 'discount-dollar',
        name: { zh: '一元店与折扣零售', en: 'Dollar Stores' },
        description: {
          zh: '低收入家庭日用品+食品折扣店。消费走弱时短期受益，但近年面临高基数与窃损问题。',
          en: 'Value-priced staples for lower-income households. Trade-down beneficiaries but pressured by tough comps and shrink in recent years.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'DG', name: 'Dollar General' },
          { symbol: 'DLTR', name: 'Dollar Tree' },
        ],
      },
    ],
  },

  'Communication Services': {
    sector: 'Communication Services',
    overview: {
      zh: '通信服务在 GICS 改版后涵盖电信运营商、电缆、互联网平台（搜索/社交/视频）、流媒体、游戏、广告与传统媒体。AI 重新分配数字广告池子、流媒体行业洗牌、5G/光纤资本开支退潮是当前主线。',
      en: 'Post-GICS-revamp Communication Services spans telecoms, cable, internet platforms (search/social/video), streaming, gaming, advertising, and legacy media. AI is reshuffling digital ad share, streaming is consolidating, and 5G/fiber capex is rolling off.',
    },
    segments: [
      {
        id: 'wireless-carriers',
        name: { zh: '无线运营商', en: 'Wireless Carriers' },
        description: {
          zh: '美国三大无线运营商。5G 资本开支高点已过，FWA 宽带和后付费净增是亮点。',
          en: 'Big-three US wireless carriers. 5G capex past peak; FWA broadband and postpaid net adds are the standouts.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'TMUS', name: 'T-Mobile US' },
          { symbol: 'VZ', name: 'Verizon Communications' },
          { symbol: 'T', name: 'AT&T' },
        ],
      },
      {
        id: 'cable-broadband',
        name: { zh: '有线电视与宽带', en: 'Cable & Broadband' },
        description: {
          zh: '宽带+流媒体内容+主题公园（康卡斯特）。宽带受 FWA/光纤双重竞争，内容侧押注 Peacock/Max。',
          en: 'Broadband + streaming content (+ parks for CMCSA). Broadband faces FWA/fiber competition; content side bets on Peacock/Max.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'CMCSA', name: 'Comcast' },
          { symbol: 'CHTR', name: 'Charter Communications' },
        ],
      },
      {
        id: 'comm-infrastructure',
        name: { zh: '通信基础设施(铁塔/卫星)', en: 'Communication Infrastructure (Towers/Satellite)' },
        description: {
          zh: '铁塔 REITs+小基站+低轨卫星运营。资本结构+利率敏感，AI/数据需求拉动光纤回程。',
          en: 'Tower REITs, small cells, and LEO satellite operators. Rate-sensitive balance sheets; AI/data demand boosts fiber backhaul.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'AMT', name: 'American Tower' },
          { symbol: 'CCI', name: 'Crown Castle' },
          { symbol: 'SBAC', name: 'SBA Communications' },
          { symbol: 'IRDM', name: 'Iridium Communications' },
        ],
      },
      {
        id: 'internet-platforms',
        name: { zh: '互联网搜索与社交平台', en: 'Search & Social Internet Platforms' },
        description: {
          zh: '搜索+视频+社交三大入口。生成式 AI 既是机会（更优广告）也是威胁（替代搜索路径）。',
          en: 'Search, video and social mega-platforms. Generative AI is both opportunity (better ads) and threat (alternate search paths).',
        },
        position: 'platform',
        themes: {
          zh: ['AI改写搜索范式', '短视频广告增长', '隐私/反垄断监管'],
          en: ['AI reshaping search', 'Short-form video monetization', 'Privacy / antitrust pressure'],
        },
        companies: [
          { symbol: 'GOOGL', name: 'Alphabet (Class A)' },
          { symbol: 'META', name: 'Meta Platforms' },
          { symbol: 'PINS', name: 'Pinterest' },
          { symbol: 'SNAP', name: 'Snap' },
          { symbol: 'RDDT', name: 'Reddit' },
        ],
      },
      {
        id: 'streaming-video',
        name: { zh: '流媒体视频', en: 'Streaming & Video' },
        description: {
          zh: 'Netflix 一家独大+其他玩家分化。打击共享密码、广告层、体育版权是利润主线。',
          en: 'Netflix leads; others diverge. Password-sharing crackdown, ad-tier and sports rights drive earnings.',
        },
        position: 'platform',
        companies: [
          { symbol: 'NFLX', name: 'Netflix' },
          { symbol: 'DIS', name: 'Walt Disney' },
          { symbol: 'WBD', name: 'Warner Bros. Discovery' },
          { symbol: 'PARA', name: 'Paramount Global' },
          { symbol: 'FOXA', name: 'Fox' },
          { symbol: 'ROKU', name: 'Roku' },
        ],
      },
      {
        id: 'audio-streaming',
        name: { zh: '音频流媒体', en: 'Audio Streaming' },
        description: {
          zh: '音乐+播客+卫星电台。提价能力+音乐版权成本+广告变现是关键。',
          en: 'Music, podcasts, satellite radio. Pricing, music royalty cost and ad monetization are the drivers.',
        },
        position: 'platform',
        companies: [
          { symbol: 'SPOT', name: 'Spotify Technology' },
          { symbol: 'SIRI', name: 'SiriusXM Holdings' },
        ],
      },
      {
        id: 'gaming-interactive',
        name: { zh: '互动游戏', en: 'Interactive Gaming' },
        description: {
          zh: '主机/PC游戏发行商+UGC平台+引擎。AI生成内容、长青游戏(GaaS)、移动化是结构变量。',
          en: 'Console/PC publishers, UGC platforms, engines. AI-generated content, GaaS longevity and mobilization are the structural shifts.',
        },
        position: 'platform',
        companies: [
          { symbol: 'EA', name: 'Electronic Arts' },
          { symbol: 'TTWO', name: 'Take-Two Interactive' },
          { symbol: 'RBLX', name: 'Roblox' },
          { symbol: 'U', name: 'Unity Software' },
        ],
      },
      {
        id: 'ad-tech',
        name: { zh: '广告科技', en: 'Ad Tech' },
        description: {
          zh: '独立 DSP/SSP+CTV 广告+移动应用买量。CTV 是结构增长口，cookie 退场加速 ID 标识竞争。',
          en: 'Independent DSP/SSP, CTV advertising, mobile UA. CTV is the structural growth pocket; cookie deprecation accelerates the identity race.',
        },
        position: 'platform',
        companies: [
          { symbol: 'TTD', name: 'The Trade Desk' },
          { symbol: 'APP', name: 'AppLovin' },
          { symbol: 'MGNI', name: 'Magnite' },
          { symbol: 'PUBM', name: 'PubMatic' },
          { symbol: 'CRTO', name: 'Criteo' },
        ],
      },
      {
        id: 'telecom-equipment',
        name: { zh: '电信设备', en: 'Telecom Equipment' },
        description: {
          zh: 'RAN/光网设备+企业通信。运营商资本开支退潮+海外项目波动是当前压力。',
          en: 'RAN/optical and enterprise comms gear. Carrier capex easing and lumpy international projects are the near-term pressure.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'ERIC', name: 'Ericsson' },
          { symbol: 'NOK', name: 'Nokia' },
          { symbol: 'COMM', name: 'CommScope Holding' },
        ],
      },
      {
        id: 'media-publishing',
        name: { zh: '传统媒体与出版', en: 'Traditional Media & Publishing' },
        description: {
          zh: '出版+广告代理+地方电视。数字订阅化和AI对内容版权博弈是焦点。',
          en: 'Publishers, ad agencies, local TV. Digital subscription transition and AI content-rights battles are in focus.',
        },
        position: 'service',
        companies: [
          { symbol: 'NYT', name: 'New York Times' },
          { symbol: 'NWSA', name: 'News Corp (Class A)' },
          { symbol: 'OMC', name: 'Omnicom Group' },
          { symbol: 'IPG', name: 'Interpublic Group' },
        ],
      },
    ],
  },

  Industrials: {
    sector: 'Industrials',
    overview: {
      zh: '工业板块是宏观周期最直接的载体，覆盖航空航天与国防、电力/自动化、工程机械、运输（铁路/航空/卡车）、物流快递、废物管理、建材建筑、专业服务、租赁。再工业化、电网投资、AI数据中心建设、国防开支扩张是当前结构性主题。',
      en: 'Industrials are the most direct macro proxy: aerospace & defense, electrification/automation, machinery, transport (rail/air/trucking), logistics, waste management, building products, professional services, and rentals. Reshoring, grid capex, AI data-center build-out, and defense spending are the structural themes.',
    },
    segments: [
      {
        id: 'aerospace',
        name: { zh: '航空航天', en: 'Aerospace' },
        description: {
          zh: '商用飞机OEM+发动机+核心航电与零部件。波音质量危机+空客交付+服务后市场是关键。',
          en: 'Commercial airframers, engines, avionics and aftermarket. Boeing quality, Airbus deliveries and services aftermarket are the central themes.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'BA', name: 'Boeing' },
          { symbol: 'RTX', name: 'RTX Corp' },
          { symbol: 'GE', name: 'GE Aerospace' },
          { symbol: 'TDG', name: 'TransDigm Group' },
          { symbol: 'HEI', name: 'HEICO' },
          { symbol: 'TXT', name: 'Textron' },
        ],
      },
      {
        id: 'defense',
        name: { zh: '国防与军工', en: 'Defense' },
        description: {
          zh: '战斗机/导弹/舰艇/电子战。国防预算上行+俄乌/中东补充需求支撑订单可见度。',
          en: 'Fighters, missiles, ships, electronic warfare. Rising defense budgets plus replenishment from Ukraine/Middle East support backlog visibility.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'LMT', name: 'Lockheed Martin' },
          { symbol: 'NOC', name: 'Northrop Grumman' },
          { symbol: 'GD', name: 'General Dynamics' },
          { symbol: 'LHX', name: "L3Harris Technologies" },
          { symbol: 'HII', name: 'Huntington Ingalls' },
        ],
      },
      {
        id: 'automation-electrical',
        name: { zh: '工业自动化与电气设备', en: 'Industrial Automation & Electrical' },
        description: {
          zh: '工厂自动化、PLC/HMI、伺服、配电与电网设备。AI数据中心+电网升级+回流投资三重共振。',
          en: 'Factory automation, PLC/HMI, servos, switchgear and grid gear. AI data-center demand, grid upgrade and reshoring all converge.',
        },
        position: 'midstream',
        themes: {
          zh: ['AI数据中心电力', '电网十年投资周期', '再工业化资本支出'],
          en: ['AI data-center power', 'Decade-long grid capex', 'Reshoring capex'],
        },
        companies: [
          { symbol: 'GEV', name: 'GE Vernova' },
          { symbol: 'ETN', name: 'Eaton' },
          { symbol: 'EMR', name: 'Emerson Electric' },
          { symbol: 'ROK', name: 'Rockwell Automation' },
          { symbol: 'HON', name: 'Honeywell' },
          { symbol: 'PH', name: 'Parker-Hannifin' },
          { symbol: 'AME', name: 'AMETEK' },
          { symbol: 'IR', name: 'Ingersoll Rand' },
          { symbol: 'DOV', name: 'Dover' },
        ],
      },
      {
        id: 'construction-engineering',
        name: { zh: '工程与建筑服务', en: 'Construction & Engineering Services' },
        description: {
          zh: '电力工程、市政工程、数据中心、半导体厂建设。IRA/CHIPS+电网+AI 是订单主驱动。',
          en: 'Power, civil, data-center and fab construction. IRA/CHIPS, grid and AI build-out drive backlogs.',
        },
        position: 'service',
        companies: [
          { symbol: 'PWR', name: 'Quanta Services' },
          { symbol: 'MTZ', name: 'MasTec' },
          { symbol: 'J', name: 'Jacobs Solutions' },
          { symbol: 'ACM', name: 'AECOM' },
          { symbol: 'FIX', name: 'Comfort Systems USA' },
        ],
      },
      {
        id: 'machinery',
        name: { zh: '工程与农业机械', en: 'Construction & Agricultural Machinery' },
        description: {
          zh: '土方机械、矿山、农业机械、卡车制造。北美基建+大宗周期+农产品价格是关键。',
          en: 'Earthmoving, mining, ag machinery, truck OEMs. NA infrastructure, commodity cycle and farm income drive demand.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'CAT', name: 'Caterpillar' },
          { symbol: 'DE', name: 'Deere & Co' },
          { symbol: 'AGCO', name: 'AGCO' },
          { symbol: 'OSK', name: 'Oshkosh' },
          { symbol: 'PCAR', name: 'PACCAR' },
        ],
      },
      {
        id: 'rail',
        name: { zh: '铁路', en: 'Railroads' },
        description: {
          zh: '北美一类铁路+加拿大铁路。准点率+劳工合同+大宗运输量是利润核心。',
          en: 'NA Class I railroads + Canadian rails. Service metrics, labor and bulk volumes drive results.',
        },
        position: 'service',
        companies: [
          { symbol: 'UNP', name: 'Union Pacific' },
          { symbol: 'CSX', name: 'CSX' },
          { symbol: 'NSC', name: 'Norfolk Southern' },
          { symbol: 'CP', name: 'Canadian Pacific Kansas City' },
          { symbol: 'CNI', name: 'Canadian National Railway' },
        ],
      },
      {
        id: 'trucking-logistics',
        name: { zh: '卡车运输与第三方物流', en: 'Trucking & Third-Party Logistics' },
        description: {
          zh: 'LTL、整车（TL）、多式联运、第三方物流。运价周期+二手卡车价格+回程率决定盈利。',
          en: 'LTL, TL, intermodal, 3PL. Freight rates, used-truck prices and load factor drive earnings.',
        },
        position: 'service',
        companies: [
          { symbol: 'ODFL', name: 'Old Dominion Freight Line' },
          { symbol: 'JBHT', name: 'J.B. Hunt Transport' },
          { symbol: 'XPO', name: 'XPO' },
          { symbol: 'SAIA', name: 'Saia' },
          { symbol: 'KNX', name: 'Knight-Swift Transportation' },
          { symbol: 'CHRW', name: 'C.H. Robinson Worldwide' },
          { symbol: 'GXO', name: 'GXO Logistics' },
        ],
      },
      {
        id: 'parcel-delivery',
        name: { zh: '快递包裹', en: 'Parcel & Express' },
        description: {
          zh: '全球小包+B2B及电商物流。结构性 e-commerce 增量+成本控制是焦点。',
          en: 'Global parcel plus B2B and e-commerce fulfillment. Secular e-com volume plus cost discipline.',
        },
        position: 'service',
        companies: [
          { symbol: 'UPS', name: 'United Parcel Service' },
          { symbol: 'FDX', name: 'FedEx' },
        ],
      },
      {
        id: 'airlines',
        name: { zh: '航空公司', en: 'Airlines' },
        description: {
          zh: '美国全国性+低成本航司。运力管控+票价+商旅恢复+油价是变量。',
          en: 'US network and low-cost carriers. Capacity discipline, fares, business-travel recovery and fuel drive earnings.',
        },
        position: 'service',
        companies: [
          { symbol: 'DAL', name: 'Delta Air Lines' },
          { symbol: 'UAL', name: 'United Airlines' },
          { symbol: 'AAL', name: 'American Airlines' },
          { symbol: 'LUV', name: 'Southwest Airlines' },
          { symbol: 'ALK', name: 'Alaska Air' },
        ],
      },
      {
        id: 'ride-hail-delivery',
        name: { zh: '出行与即时配送', en: 'Ride-Hail & On-Demand Delivery' },
        description: {
          zh: '网约车+外卖+众包配送。规模效应+广告变现+自动驾驶布局是估值锚点。',
          en: 'Ride-hailing, food delivery, gig logistics. Scale, ad monetization and autonomy roadmap anchor valuation.',
        },
        position: 'platform',
        companies: [
          { symbol: 'UBER', name: 'Uber Technologies' },
          { symbol: 'LYFT', name: 'Lyft' },
          { symbol: 'DASH', name: 'DoorDash' },
        ],
      },
      {
        id: 'waste-environmental',
        name: { zh: '环保与废物管理', en: 'Waste & Environmental Services' },
        description: {
          zh: '固废收集+处置+回收。提价能力强、自由现金流稳定，是高质量复利型资产。',
          en: 'Solid-waste collection, disposal, recycling. Strong pricing and stable FCF — high-quality compounders.',
        },
        position: 'service',
        companies: [
          { symbol: 'WM', name: 'Waste Management' },
          { symbol: 'RSG', name: 'Republic Services' },
          { symbol: 'WCN', name: 'Waste Connections' },
          { symbol: 'GFL', name: 'GFL Environmental' },
          { symbol: 'CWST', name: 'Casella Waste Systems' },
        ],
      },
      {
        id: 'industrial-distribution',
        name: { zh: '工业品分销与租赁', en: 'Industrial Distribution & Rentals' },
        description: {
          zh: 'MRO供应、紧固件、空调暖通分销+建筑机械租赁。北美再工业化与基建是结构受益方。',
          en: 'MRO supply, fasteners, HVAC distribution, equipment rental. Beneficiaries of NA reshoring and infra build-out.',
        },
        position: 'service',
        companies: [
          { symbol: 'FAST', name: 'Fastenal' },
          { symbol: 'GWW', name: 'W.W. Grainger' },
          { symbol: 'WSO', name: 'Watsco' },
          { symbol: 'URI', name: 'United Rentals' },
        ],
      },
      {
        id: 'building-products',
        name: { zh: '建筑产品', en: 'Building Products' },
        description: {
          zh: '门窗、HVAC、屋顶、卫浴。住宅新建+翻新双轮驱动，受按揭利率影响大。',
          en: 'Doors/windows, HVAC, roofing, plumbing. New construction + remodel; rate-sensitive.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'TT', name: 'Trane Technologies' },
          { symbol: 'CARR', name: 'Carrier Global' },
          { symbol: 'JCI', name: 'Johnson Controls International' },
          { symbol: 'AOS', name: 'A.O. Smith' },
          { symbol: 'MAS', name: 'Masco' },
          { symbol: 'BLD', name: 'TopBuild' },
        ],
      },
    ],
  },

  'Basic Materials': {
    sector: 'Basic Materials',
    overview: {
      zh: '基础材料板块由金属矿业（多金属/黄金/铜/铁）、钢铁、铝、工业气体、综合化工、农化（化肥）、特种化工/涂料、包装、建材（水泥/骨料）、锂电材料和林纸构成，强周期。大宗商品价格、中国需求、能源转型用矿与美国基建是当前关键变量。',
      en: 'Basic Materials = metals & mining (diversified, gold, copper, iron), steel, aluminum, industrial gases, diversified chemicals, fertilizers, specialty/coatings, packaging, construction materials (cement/aggregates), lithium and forest products. Deeply cyclical. Commodity prices, China demand, energy-transition metals and US infra are the key swing factors.',
    },
    segments: [
      {
        id: 'diversified-mining',
        name: { zh: '多金属与铜矿', en: 'Diversified Metals & Copper Mining' },
        description: {
          zh: '铁矿、铜、煤、锌等多金属生产商。电气化+电网投资推动铜中期需求中枢上行。',
          en: 'Iron ore, copper, coal, zinc and other diversified miners. Electrification and grid investment raise the medium-term copper baseline.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'BHP', name: 'BHP Group' },
          { symbol: 'RIO', name: 'Rio Tinto' },
          { symbol: 'VALE', name: 'Vale' },
          { symbol: 'FCX', name: 'Freeport-McMoRan' },
          { symbol: 'SCCO', name: 'Southern Copper' },
          { symbol: 'TECK', name: 'Teck Resources' },
        ],
      },
      {
        id: 'gold-silver',
        name: { zh: '黄金与白银矿业', en: 'Gold & Silver Miners' },
        description: {
          zh: '与金银价高度联动。美元/实际利率/央行购金/避险情绪决定股价。',
          en: 'Tracks gold/silver prices. Dollar, real rates, central-bank buying and risk-off flows dominate.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'NEM', name: 'Newmont' },
          { symbol: 'GOLD', name: 'Barrick Gold' },
          { symbol: 'AEM', name: 'Agnico Eagle Mines' },
          { symbol: 'KGC', name: 'Kinross Gold' },
          { symbol: 'AG', name: 'First Majestic Silver' },
        ],
      },
      {
        id: 'steel',
        name: { zh: '钢铁', en: 'Steel' },
        description: {
          zh: '美国本土电炉短流程+长流程钢厂。基建/汽车/能源用钢+反倾销关税+电炉转型是变量。',
          en: 'US EAF mini-mills and integrated steel. Infra/auto/energy demand, anti-dumping tariffs and EAF transition are key.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'NUE', name: 'Nucor' },
          { symbol: 'STLD', name: 'Steel Dynamics' },
          { symbol: 'X', name: 'United States Steel' },
          { symbol: 'CLF', name: 'Cleveland-Cliffs' },
          { symbol: 'RS', name: 'Reliance' },
          { symbol: 'ATI', name: 'ATI Inc' },
        ],
      },
      {
        id: 'aluminum-other',
        name: { zh: '铝与其他基本金属', en: 'Aluminum & Other Base Metals' },
        description: {
          zh: '电解铝+铝加工。能源转型+轻量化+电力成本是关键变量。',
          en: 'Aluminum smelting and processing. Energy transition, lightweighting and power costs drive economics.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'AA', name: 'Alcoa' },
          { symbol: 'CENX', name: 'Century Aluminum' },
          { symbol: 'KALU', name: 'Kaiser Aluminum' },
        ],
      },
      {
        id: 'industrial-gases',
        name: { zh: '工业气体', en: 'Industrial Gases' },
        description: {
          zh: 'O₂/N₂/H₂/特种气体长期供气合同+电子级气体。氢能+半导体+医疗是结构增长。',
          en: 'O₂/N₂/H₂/specialty gas long-term contracts and electronic-grade gases. Hydrogen, semis and medical drive secular growth.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'LIN', name: 'Linde' },
          { symbol: 'APD', name: 'Air Products & Chemicals' },
        ],
      },
      {
        id: 'diversified-chemicals',
        name: { zh: '综合化工', en: 'Diversified Chemicals' },
        description: {
          zh: '基础化工、特种聚合物、化学中间体。原油/天然气原料价格+下游需求周期决定盈利。',
          en: 'Commodity chemicals, specialty polymers, intermediates. Oil/gas feedstock and downstream cycles drive earnings.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'DOW', name: 'Dow' },
          { symbol: 'DD', name: 'DuPont de Nemours' },
          { symbol: 'LYB', name: 'LyondellBasell Industries' },
          { symbol: 'EMN', name: 'Eastman Chemical' },
          { symbol: 'CE', name: 'Celanese' },
          { symbol: 'HUN', name: 'Huntsman' },
          { symbol: 'OLN', name: 'Olin' },
        ],
      },
      {
        id: 'specialty-coatings',
        name: { zh: '涂料与特种材料', en: 'Coatings & Specialty Materials' },
        description: {
          zh: '建筑涂料+工业涂料+卫生服务+特种添加剂。强品牌定价+全球分销，估值长期较高。',
          en: 'Architectural/industrial coatings, hygiene services, specialty additives. Strong brand pricing and global distribution support premium multiples.',
        },
        position: 'downstream',
        companies: [
          { symbol: 'SHW', name: 'Sherwin-Williams' },
          { symbol: 'PPG', name: 'PPG Industries' },
          { symbol: 'AXTA', name: 'Axalta Coating Systems' },
          { symbol: 'RPM', name: 'RPM International' },
          { symbol: 'ECL', name: 'Ecolab' },
        ],
      },
      {
        id: 'agchem-fertilizer',
        name: { zh: '农化与化肥', en: 'Agricultural Chemicals & Fertilizers' },
        description: {
          zh: '氮肥/钾肥/磷肥+农药+种业。粮价、天然气价格、气候因素和俄白供给是关键变量。',
          en: 'N/P/K fertilizers, crop protection and seeds. Grain prices, natural gas, weather and Russian/Belarusian supply drive results.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'CTVA', name: 'Corteva' },
          { symbol: 'NTR', name: 'Nutrien' },
          { symbol: 'MOS', name: 'Mosaic' },
          { symbol: 'CF', name: 'CF Industries Holdings' },
          { symbol: 'FMC', name: 'FMC' },
        ],
      },
      {
        id: 'packaging',
        name: { zh: '包装与容器', en: 'Packaging & Containers' },
        description: {
          zh: '纸盒、金属罐、塑料、玻璃。原材料价格+下游饮料/食品销量+可持续包装是焦点。',
          en: 'Paperboard, metal cans, plastics, glass. Raw material costs, beverage/food volumes and sustainable packaging are central.',
        },
        position: 'midstream',
        companies: [
          { symbol: 'PKG', name: 'Packaging Corp of America' },
          { symbol: 'IP', name: 'International Paper' },
          { symbol: 'BALL', name: 'Ball Corp' },
          { symbol: 'AMCR', name: 'Amcor' },
          { symbol: 'SEE', name: 'Sealed Air' },
          { symbol: 'BERY', name: 'Berry Global' },
          { symbol: 'OI', name: 'O-I Glass' },
        ],
      },
      {
        id: 'construction-materials',
        name: { zh: '骨料与水泥', en: 'Aggregates & Cement' },
        description: {
          zh: '砂石骨料+水泥+沥青。IRA/IIJA基建+本土化学开支+住建复苏支撑需求。',
          en: 'Aggregates, cement, asphalt. IRA/IIJA infra spending, reshoring construction and housing recovery support demand.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'VMC', name: 'Vulcan Materials' },
          { symbol: 'MLM', name: 'Martin Marietta Materials' },
          { symbol: 'EXP', name: 'Eagle Materials' },
          { symbol: 'CRH', name: 'CRH' },
          { symbol: 'JHX', name: 'James Hardie Industries' },
        ],
      },
      {
        id: 'lithium-battery',
        name: { zh: '锂与电池材料', en: 'Lithium & Battery Materials' },
        description: {
          zh: '锂盐+电池正/负极原料。EV周期+锂价波动+美国本土供应链是关键。',
          en: 'Lithium salts and cathode/anode precursors. EV cycle, lithium prices and US onshore supply chains drive volatility.',
        },
        position: 'upstream',
        companies: [
          { symbol: 'ALB', name: 'Albemarle' },
          { symbol: 'SQM', name: 'Sociedad Quimica y Minera' },
          { symbol: 'LAC', name: 'Lithium Americas' },
        ],
      },
    ],
  },

  'Real Estate': {
    sector: 'Real Estate',
    overview: {
      zh: '房地产板块以 REITs 为主，按物业类型分为住宅、工业物流、数据中心、铁塔、医疗、零售、净租赁、办公、自助仓储、酒店、按揭等子板块，加上房地产服务商。利率水平、物业类型供需结构、写字楼空置率与AI数据中心需求是当前最核心变量。',
      en: 'Real Estate is mostly REITs grouped by property type: residential, industrial/logistics, data centers, towers, healthcare, retail, net lease, office, self-storage, hospitality, mortgage — plus real-estate services. Rates, property-type fundamentals, office vacancy, and AI data-center demand are the dominant drivers.',
    },
    segments: [
      {
        id: 'residential-reits',
        name: { zh: '住宅REITs', en: 'Residential REITs' },
        description: {
          zh: '公寓+单户出租。Sun Belt供需+租金增速+利率是关键。',
          en: 'Apartments and single-family rentals. Sun Belt supply/demand, rent growth and rates are central.',
        },
        position: 'service',
        companies: [
          { symbol: 'AVB', name: 'AvalonBay Communities' },
          { symbol: 'EQR', name: 'Equity Residential' },
          { symbol: 'ESS', name: 'Essex Property Trust' },
          { symbol: 'MAA', name: 'Mid-America Apartment' },
          { symbol: 'UDR', name: 'UDR' },
          { symbol: 'INVH', name: 'Invitation Homes' },
          { symbol: 'AMH', name: 'American Homes 4 Rent' },
        ],
      },
      {
        id: 'industrial-reits',
        name: { zh: '工业与物流REITs', en: 'Industrial & Logistics REITs' },
        description: {
          zh: '物流仓储+轻工业。电商+回流投资带来长期需求支撑。',
          en: 'Logistics warehouses and light industrial. E-commerce and reshoring underpin long-term demand.',
        },
        position: 'service',
        companies: [
          { symbol: 'PLD', name: 'Prologis' },
          { symbol: 'EGP', name: 'EastGroup Properties' },
          { symbol: 'REXR', name: 'Rexford Industrial Realty' },
          { symbol: 'FR', name: 'First Industrial Realty Trust' },
          { symbol: 'STAG', name: 'STAG Industrial' },
          { symbol: 'TRNO', name: 'Terreno Realty' },
        ],
      },
      {
        id: 'data-center-reits',
        name: { zh: '数据中心REITs', en: 'Data Center REITs' },
        description: {
          zh: '互联+大规模算力机房。AI/超大规模租户需求是当前最强结构性主线。',
          en: 'Interconnection and hyperscale data centers. AI/hyperscaler demand is the strongest structural theme in REITs.',
        },
        position: 'infrastructure',
        themes: {
          zh: ['AI算力扩张', '电力获取受限', '租约价格上行'],
          en: ['AI compute expansion', 'Power availability constraints', 'Rising lease economics'],
        },
        companies: [
          { symbol: 'EQIX', name: 'Equinix' },
          { symbol: 'DLR', name: 'Digital Realty Trust' },
        ],
      },
      {
        id: 'tower-reits',
        name: { zh: '通信塔REITs', en: 'Cell Tower REITs' },
        description: {
          zh: '北美+海外铁塔租赁。5G高峰过后增速放缓，海外项目和小基站是新增量。',
          en: 'North America + international tower leasing. Growth slowing post-5G peak; international and small cells are the new vectors.',
        },
        position: 'infrastructure',
        companies: [
          { symbol: 'AMT', name: 'American Tower' },
          { symbol: 'CCI', name: 'Crown Castle' },
          { symbol: 'SBAC', name: 'SBA Communications' },
        ],
      },
      {
        id: 'healthcare-reits',
        name: { zh: '医疗REITs', en: 'Healthcare REITs' },
        description: {
          zh: '老年住房+医疗写字楼+康复护理。婴儿潮老龄化是长期需求引擎，运营商财务健康是风险。',
          en: 'Senior housing, medical offices, skilled nursing. Boomer aging is the long-term demand engine; operator health is the risk.',
        },
        position: 'service',
        companies: [
          { symbol: 'WELL', name: 'Welltower' },
          { symbol: 'VTR', name: 'Ventas' },
          { symbol: 'OHI', name: 'Omega Healthcare Investors' },
          { symbol: 'DOC', name: 'Healthpeak Properties' },
          { symbol: 'MPW', name: 'Medical Properties Trust' },
        ],
      },
      {
        id: 'retail-reits',
        name: { zh: '零售REITs', en: 'Retail REITs' },
        description: {
          zh: '高端购物中心+社区/邻里中心。租金提升+空置率改善是当前主线。',
          en: 'Class-A malls plus neighborhood/community centers. Rent uplift and improving occupancy are the current drivers.',
        },
        position: 'service',
        companies: [
          { symbol: 'SPG', name: 'Simon Property Group' },
          { symbol: 'REG', name: 'Regency Centers' },
          { symbol: 'KIM', name: 'Kimco Realty' },
          { symbol: 'FRT', name: 'Federal Realty Investment Trust' },
          { symbol: 'BRX', name: 'Brixmor Property Group' },
        ],
      },
      {
        id: 'net-lease-reits',
        name: { zh: '净租赁REITs', en: 'Net Lease REITs' },
        description: {
          zh: '便利店+药店+快餐+工业，长期单租户净租赁。类债券现金流，对利率敏感。',
          en: 'Convenience, drugstore, QSR and industrial single-tenant net leases. Bond-like cash flows, rate-sensitive.',
        },
        position: 'service',
        companies: [
          { symbol: 'O', name: 'Realty Income' },
          { symbol: 'ADC', name: 'Agree Realty' },
          { symbol: 'NNN', name: 'NNN REIT' },
          { symbol: 'WPC', name: 'W. P. Carey' },
        ],
      },
      {
        id: 'office-reits',
        name: { zh: '办公REITs', en: 'Office REITs' },
        description: {
          zh: '城市核心+生命科学专业写字楼。混合办公冲击+CRE再融资压力，分化最严重。',
          en: 'CBD plus life-sciences specialty offices. Hybrid-work pressure and CRE refinancing — most bifurcated sub-sector.',
        },
        position: 'service',
        companies: [
          { symbol: 'BXP', name: 'Boston Properties' },
          { symbol: 'ARE', name: 'Alexandria Real Estate Equities' },
          { symbol: 'VNO', name: 'Vornado Realty Trust' },
          { symbol: 'KRC', name: 'Kilroy Realty' },
          { symbol: 'SLG', name: 'SL Green Realty' },
        ],
      },
      {
        id: 'self-storage-reits',
        name: { zh: '自助仓储REITs', en: 'Self-Storage REITs' },
        description: {
          zh: '存储单元租赁。新供给消化期+搬家活动放缓压制定价。',
          en: 'Storage unit leasing. Pricing pressured by new supply digestion and slow moving activity.',
        },
        position: 'service',
        companies: [
          { symbol: 'PSA', name: 'Public Storage' },
          { symbol: 'EXR', name: 'Extra Space Storage' },
          { symbol: 'CUBE', name: 'CubeSmart' },
          { symbol: 'NSA', name: 'National Storage Affiliates' },
        ],
      },
      {
        id: 'hospitality-reits',
        name: { zh: '酒店REITs', en: 'Hospitality REITs' },
        description: {
          zh: '酒店物业出租人。RevPAR+集团商旅恢复+成本通胀是变量。',
          en: 'Hotel property landlords. RevPAR, group/business travel recovery and cost inflation are the swings.',
        },
        position: 'service',
        companies: [
          { symbol: 'HST', name: 'Host Hotels & Resorts' },
          { symbol: 'PK', name: 'Park Hotels & Resorts' },
          { symbol: 'RHP', name: 'Ryman Hospitality Properties' },
          { symbol: 'APLE', name: 'Apple Hospitality REIT' },
        ],
      },
      {
        id: 'mortgage-reits',
        name: { zh: '按揭REITs', en: 'Mortgage REITs' },
        description: {
          zh: '按揭贷款/MBS与商业房贷投资。利差+杠杆+提前还款率决定收益。',
          en: 'Residential MBS and commercial mortgage investors. Spread, leverage and prepayment speeds drive returns.',
        },
        position: 'service',
        companies: [
          { symbol: 'NLY', name: 'Annaly Capital Management' },
          { symbol: 'AGNC', name: 'AGNC Investment' },
          { symbol: 'STWD', name: 'Starwood Property Trust' },
          { symbol: 'BXMT', name: 'Blackstone Mortgage Trust' },
        ],
      },
      {
        id: 'real-estate-services',
        name: { zh: '房地产服务', en: 'Real Estate Services' },
        description: {
          zh: '商业地产经纪+物业管理+评估咨询。CRE交易回暖与办公复杂转型是关键。',
          en: 'Commercial brokerage, property management, appraisal/consulting. CRE transaction recovery and office complexity are central.',
        },
        position: 'service',
        companies: [
          { symbol: 'CBRE', name: 'CBRE Group' },
          { symbol: 'JLL', name: 'Jones Lang LaSalle' },
          { symbol: 'CWK', name: 'Cushman & Wakefield' },
          { symbol: 'NMRK', name: 'Newmark Group' },
        ],
      },
    ],
  },

  Utilities: {
    sector: 'Utilities',
    overview: {
      zh: '公用事业以受监管的电力+燃气+水务为主，叠加独立发电、可再生 IPP。AI 数据中心电力需求结构性上行+电网十年期投资周期+核电复兴+利率回落是当前最关键的多头逻辑；监管允许 ROE 和资本结构是估值锚点。',
      en: 'Utilities is regulated electric, gas and water, plus IPPs and renewables. The structural lift from AI data-center power demand, a decade-long grid capex cycle, the nuclear renaissance and easing rates are the bull case; allowed ROE and capital structure anchor valuations.',
    },
    segments: [
      {
        id: 'regulated-electric',
        name: { zh: '受监管电力公用事业', en: 'Regulated Electric Utilities' },
        description: {
          zh: '州内垄断电网+发电资产的IOU。允许ROE+资本开支节奏+输配电投资是利润主线。',
          en: 'State-monopoly IOUs combining grid and generation. Allowed ROE, capex cadence and T&D investment drive earnings.',
        },
        position: 'service',
        themes: {
          zh: ['AI带来的电力需求结构性上行', '电网现代化投资', '州级监管周期'],
          en: ['Structural AI power demand', 'Grid modernization capex', 'State rate-case cycles'],
        },
        companies: [
          { symbol: 'DUK', name: 'Duke Energy' },
          { symbol: 'SO', name: 'Southern Company' },
          { symbol: 'AEP', name: 'American Electric Power' },
          { symbol: 'XEL', name: 'Xcel Energy' },
          { symbol: 'EXC', name: 'Exelon' },
          { symbol: 'ED', name: 'Consolidated Edison' },
          { symbol: 'ES', name: 'Eversource Energy' },
          { symbol: 'ETR', name: 'Entergy' },
          { symbol: 'AEE', name: 'Ameren' },
          { symbol: 'EVRG', name: 'Evergy' },
          { symbol: 'DTE', name: 'DTE Energy' },
          { symbol: 'CMS', name: 'CMS Energy' },
          { symbol: 'LNT', name: 'Alliant Energy' },
        ],
      },
      {
        id: 'renewable-utilities',
        name: { zh: '可再生能源公用事业', en: 'Renewable / Yieldco Utilities' },
        description: {
          zh: '受监管电力+大规模可再生能源开发+yieldco。NEE是行业标杆，受能源转型与利率周期共同影响。',
          en: 'Regulated electric plus large-scale renewable development and yieldcos. NEE is the bellwether; mix of energy-transition tailwind and rate cycle.',
        },
        position: 'service',
        companies: [
          { symbol: 'NEE', name: 'NextEra Energy' },
          { symbol: 'BEPC', name: 'Brookfield Renewable Corp' },
          { symbol: 'BEP', name: 'Brookfield Renewable Partners' },
          { symbol: 'AES', name: 'AES Corp' },
          { symbol: 'CWEN', name: 'Clearway Energy' },
          { symbol: 'ORA', name: 'Ormat Technologies' },
        ],
      },
      {
        id: 'ipp-power',
        name: { zh: '独立发电商(IPP)', en: 'Independent Power Producers (IPP)' },
        description: {
          zh: '非受监管发电（核电/天然气/煤电），与电力批发价/PPA高度相关。AI数据中心长协与核电复兴推动估值重估。',
          en: 'Non-regulated nuclear, gas and coal generation tied to wholesale prices/PPAs. AI hyperscaler PPAs and nuclear renaissance have re-rated this group.',
        },
        position: 'upstream',
        themes: {
          zh: ['核电与AI数据中心配对', '电力批发价上行', '清洁能源补贴'],
          en: ['Nuclear paired with AI data centers', 'Rising wholesale power prices', 'Clean energy tax credits'],
        },
        companies: [
          { symbol: 'CEG', name: 'Constellation Energy' },
          { symbol: 'VST', name: 'Vistra' },
          { symbol: 'TLN', name: 'Talen Energy' },
        ],
      },
      {
        id: 'multi-utilities',
        name: { zh: '多元化公用事业', en: 'Multi-Utilities' },
        description: {
          zh: '电力+天然气+水务等多元业务组合，部分含中游能源。地理分散+多业务对冲是优势。',
          en: 'Combined electric, gas and water (some with midstream). Geographic and business-line diversification.',
        },
        position: 'service',
        companies: [
          { symbol: 'SRE', name: 'Sempra' },
          { symbol: 'D', name: 'Dominion Energy' },
          { symbol: 'PCG', name: 'PG&E' },
          { symbol: 'PEG', name: 'Public Service Enterprise' },
          { symbol: 'WEC', name: 'WEC Energy Group' },
          { symbol: 'EIX', name: 'Edison International' },
        ],
      },
      {
        id: 'gas-utilities',
        name: { zh: '天然气公用事业', en: 'Natural Gas Utilities' },
        description: {
          zh: '居民+商业天然气配送。基础设施成本回收+冬季气温敏感，长期面临电气化压力。',
          en: 'Residential and commercial gas distribution. Cost recovery + winter weather; long-term electrification pressure.',
        },
        position: 'service',
        companies: [
          { symbol: 'ATO', name: 'Atmos Energy' },
          { symbol: 'NJR', name: 'New Jersey Resources' },
          { symbol: 'SWX', name: 'Southwest Gas' },
          { symbol: 'OGS', name: 'ONE Gas' },
          { symbol: 'NWN', name: 'Northwest Natural' },
        ],
      },
      {
        id: 'water-utilities',
        name: { zh: '水务', en: 'Water Utilities' },
        description: {
          zh: '受监管水务公司。小型行业整合机会+基础设施投资+干旱地区敏感。',
          en: 'Regulated water utilities. Industry consolidation, infra capex and drought sensitivity.',
        },
        position: 'service',
        companies: [
          { symbol: 'AWK', name: 'American Water Works' },
          { symbol: 'WTRG', name: 'Essential Utilities' },
          { symbol: 'CWT', name: 'California Water Service' },
          { symbol: 'SJW', name: 'SJW Group' },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Backwards-compatible exports kept for any other module that may import them.
// ---------------------------------------------------------------------------

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

export function flattenSectorSymbols(sector: string): string[] {
  const structure = SECTOR_STRUCTURE[sector];
  if (!structure) return [];
  const symbols = new Set<string>();
  for (const segment of structure.segments) {
    for (const company of segment.companies) {
      symbols.add(company.symbol);
    }
  }
  return Array.from(symbols);
}

export function buildSectorNameMap(sector: string): Record<string, string> {
  const structure = SECTOR_STRUCTURE[sector];
  if (!structure) return {};
  const map: Record<string, string> = {};
  for (const segment of structure.segments) {
    for (const company of segment.companies) {
      map[company.symbol] = company.name;
    }
  }
  return map;
}
