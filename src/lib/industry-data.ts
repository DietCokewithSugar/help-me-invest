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
          { symbol: 'SNPS', name: 'Synopsys', note: { zh: 'EDA双雄之一，AI芯片设计软件渗透率最高。', en: 'EDA duopoly leader; deepest reach in AI chip design tooling.' } },
          { symbol: 'CDNS', name: 'Cadence Design Systems', note: { zh: 'EDA双雄之一，强项在数字签核与系统级仿真。', en: 'The other half of the EDA duopoly; strong in digital sign-off and system-level simulation.' } },
          { symbol: 'ARM', name: 'Arm Holdings', note: { zh: '低功耗处理器架构授权方，正快速扩张到PC与数据中心。', en: 'Licensor of the dominant low-power CPU ISA, now expanding into PCs and the data center.' } },
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
          { symbol: 'ASML', name: 'ASML Holding', note: { zh: '全球唯一EUV光刻机供应商，先进制程不可替代。', en: 'Sole supplier of EUV lithography — non-substitutable for leading-edge nodes.' } },
          { symbol: 'AMAT', name: 'Applied Materials', note: { zh: '半导体设备综合龙头，薄膜沉积与离子注入市占率第一。', en: 'Most diversified wafer-fab equipment vendor; #1 in deposition and ion implant.' } },
          { symbol: 'LRCX', name: 'Lam Research', note: { zh: '刻蚀与清洗设备双霸主，NAND/HBM工艺核心受益者。', en: 'Co-leader in etch and clean tools; key beneficiary of the NAND/HBM build-out.' } },
          { symbol: 'KLAC', name: 'KLA Corp', note: { zh: '量测与检测设备绝对龙头，毛利率超过60%。', en: 'Dominant process-control / inspection vendor; gross margin north of 60%.' } },
          { symbol: 'TER', name: 'Teradyne', note: { zh: '半导体测试设备龙头，工业自动化板块的协同延伸。', en: 'Leader in semiconductor test gear with an adjacent industrial-automation arm.' } },
          { symbol: 'ENTG', name: 'Entegris', note: { zh: '半导体过滤、纯化与材料封装的关键耗材供应商。', en: 'Critical supplier of filtration, purification, and materials packaging consumables.' } },
          { symbol: 'ACLS', name: 'Axcelis Technologies', note: { zh: '高电流离子注入机龙头，强汽车SiC功率半导体敞口。', en: 'High-current ion implant leader; heavy exposure to automotive SiC power.' } },
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
          { symbol: 'TSM', name: 'Taiwan Semiconductor', note: { zh: '全球先进制程晶圆代工绝对霸主，AI芯片产能瓶颈所在。', en: 'Undisputed leader in leading-edge foundry; the bottleneck for AI silicon supply.' } },
          { symbol: 'INTC', name: 'Intel', note: { zh: '老牌IDM转型代工业务中，技术与盈利能力都在重建。', en: 'Legacy IDM rebuilding both its process roadmap and its foundry business.' } },
          { symbol: 'GFS', name: 'GlobalFoundries', note: { zh: '聚焦特种工艺（射频/汽车/物联网）的纯代工，避开先进制程之争。', en: 'Pure-play foundry focused on specialty nodes (RF, auto, IoT); not chasing leading-edge.' } },
          { symbol: 'UMC', name: 'United Microelectronics', note: { zh: '台湾第二大代工厂，主营成熟制程与显示驱动IC。', en: 'Taiwan\'s #2 foundry; mature nodes and display driver ICs.' } },
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
          { symbol: 'NVDA', name: 'NVIDIA', note: { zh: 'AI加速器绝对龙头，GPU+CUDA+网络全栈生态构筑护城河。', en: 'AI accelerator king; full GPU + CUDA + networking stack forms the moat.' } },
          { symbol: 'AMD', name: 'Advanced Micro Devices', note: { zh: 'CPU+GPU双线，MI系列AI加速器是NVIDIA最现实的挑战者。', en: 'CPU and GPU dual-track; the MI accelerator line is the most credible NVIDIA challenger.' } },
          { symbol: 'AVGO', name: 'Broadcom', note: { zh: '网络ASIC+无线连接+VMware软件三引擎，超大规模AI网络深度受益。', en: 'Networking ASIC + wireless connectivity + VMware software trifecta; AI networking is a huge tailwind.' } },
          { symbol: 'QCOM', name: 'Qualcomm', note: { zh: '手机基带与SoC核心，AI PC与汽车智能化打开第二增长曲线。', en: 'Mobile baseband and SoC core; AI PCs and automotive add a second growth vector.' } },
          { symbol: 'MRVL', name: 'Marvell Technology', note: { zh: '光互连/DSP/定制ASIC，超大规模客户AI芯片合作放量。', en: 'Optical interconnect, DSP and custom ASIC; ramping with hyperscaler AI silicon deals.' } },
          { symbol: 'CRDO', name: 'Credo Technology', note: { zh: 'AEC有源电缆与SerDes连接技术，AI数据中心高速互联新星。', en: 'AEC active cables and SerDes IP; rising star of AI data-center high-speed connectivity.' } },
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
          { symbol: 'TXN', name: 'Texas Instruments', note: { zh: '全球最大模拟芯片厂商，工业与汽车敞口最高。', en: 'World\'s largest analog chip maker; highest industrial and automotive exposure.' } },
          { symbol: 'ADI', name: 'Analog Devices', note: { zh: '高性能模拟与混合信号龙头，B2B客户黏性极强。', en: 'High-performance analog and mixed-signal leader; extremely sticky B2B base.' } },
          { symbol: 'NXPI', name: 'NXP Semiconductors', note: { zh: '汽车半导体三巨头之一，单车价值随智能化电动化提升。', en: 'One of the big three auto-semi names; content per vehicle rises with EV/AD.' } },
          { symbol: 'MCHP', name: 'Microchip Technology', note: { zh: '8/16位MCU与混合信号芯片，工业自动化与白电核心供应商。', en: '8/16-bit MCU and mixed-signal supplier; backbone of industrial and white-goods control.' } },
          { symbol: 'ON', name: 'ON Semiconductor', note: { zh: '碳化硅功率器件领先，EV与可再生能源主线受益。', en: 'Leader in SiC power devices; key beneficiary of EVs and renewable power.' } },
          { symbol: 'MPWR', name: 'Monolithic Power Systems', note: { zh: '高效电源管理芯片，AI服务器供电环节估值溢价。', en: 'High-efficiency power management ICs; commands a premium on AI server power exposure.' } },
          { symbol: 'MU', name: 'Micron Technology', note: { zh: 'DRAM/NAND三大原厂之一，HBM是当前AI最紧缺资源。', en: 'One of the big-three DRAM/NAND IDMs; HBM is the tightest AI bottleneck.' } },
          { symbol: 'WDC', name: 'Western Digital', note: { zh: '机械硬盘与NAND业务正分拆，云存储是长期需求引擎。', en: 'HDD and NAND businesses splitting; cloud storage is the long-term demand engine.' } },
          { symbol: 'STX', name: 'Seagate Technology', note: { zh: '机械硬盘双寡头之一，HAMR大容量盘正在拉动均价。', en: 'Co-leader of the HDD duopoly; HAMR high-capacity drives are lifting ASPs.' } },
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
          { symbol: 'CSCO', name: 'Cisco Systems', note: { zh: '企业网络设备龙头，软件订阅化转型持续。', en: 'Enterprise networking incumbent; continuing the shift to software subscriptions.' } },
          { symbol: 'ANET', name: 'Arista Networks', note: { zh: '云端高性能交换机龙头，超大规模AI数据中心首选。', en: 'Cloud-grade high-performance switching leader; first choice for hyperscale AI fabrics.' } },
          { symbol: 'JNPR', name: 'Juniper Networks', note: { zh: '企业与服务商路由交换，正被HPE收购。', en: 'Service-provider and enterprise routing/switching; being acquired by HPE.' } },
          { symbol: 'HPE', name: 'Hewlett Packard Enterprise', note: { zh: '企业IT基础设施，AI服务器与GreenLake订阅服务双驱动。', en: 'Enterprise infrastructure; growth from AI servers and the GreenLake subscription model.' } },
          { symbol: 'CIEN', name: 'Ciena', note: { zh: '光网络与相干光通信龙头，云互联升级周期受益方。', en: 'Optical networking and coherent optics leader; benefiting from the cloud interconnect upgrade.' } },
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
          { symbol: 'AAPL', name: 'Apple', note: { zh: 'iPhone+服务双引擎，AI功能与可穿戴扩展生态边界。', en: 'iPhone + Services twin engines; on-device AI and wearables extend the ecosystem.' } },
          { symbol: 'DELL', name: 'Dell Technologies', note: { zh: '企业PC与服务器双线，AI服务器订单是当前最大题材。', en: 'Enterprise PC and server dual play; AI server backlog is the headline driver.' } },
          { symbol: 'SMCI', name: 'Super Micro Computer', note: { zh: 'AI服务器定制化龙头，与NVIDIA深度绑定但披露透明度受质疑。', en: 'AI server specialist tightly tied to NVIDIA; disclosure quality has been questioned.' } },
          { symbol: 'HPQ', name: 'HP Inc', note: { zh: '消费PC与打印机，AI PC换机周期是主要催化。', en: 'Consumer PCs and printers; the AI PC refresh cycle is the main catalyst.' } },
          { symbol: 'NTAP', name: 'NetApp', note: { zh: '企业级数据存储+混合云数据管理。', en: 'Enterprise data storage and hybrid-cloud data management.' } },
          { symbol: 'PSTG', name: 'Pure Storage', note: { zh: '全闪存阵列龙头，DirectFlash架构与超大规模订单是看点。', en: 'All-flash array leader; DirectFlash architecture and hyperscaler deals are the key catalysts.' } },
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
          { symbol: 'APH', name: 'Amphenol', note: { zh: '连接器全球龙头，AI服务器高速互连含量提升。', en: 'Global interconnect leader; AI server high-speed content per box keeps rising.' } },
          { symbol: 'TEL', name: 'TE Connectivity', note: { zh: '工业与汽车连接器与传感器龙头，电动化深度受益。', en: 'Industrial / auto connector and sensor leader; deep beneficiary of electrification.' } },
          { symbol: 'GLW', name: 'Corning', note: { zh: '玻璃基板与特种光纤龙头，AI光通信用纤需求爆发。', en: 'Specialty glass and optical fiber leader; AI optical interconnect is a demand surge.' } },
          { symbol: 'FLEX', name: 'Flex Ltd', note: { zh: '全球EMS第二大厂，AI云基础设施与汽车订单是结构亮点。', en: 'World\'s #2 EMS player; structural upside from AI cloud infrastructure and auto programs.' } },
          { symbol: 'JBL', name: 'Jabil', note: { zh: '高端EMS与设计制造服务，医疗、汽车、AI硬件多元客户。', en: 'Premium EMS and design-manufacturing services; diversified across medical, auto and AI hardware.' } },
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
          { symbol: 'PANW', name: 'Palo Alto Networks', note: { zh: '网络安全平台化龙头，多产品整合策略推动ARR持续高增。', en: 'The platformization leader; multi-product consolidation drives high ARR growth.' } },
          { symbol: 'CRWD', name: 'CrowdStrike', note: { zh: '云原生端点检测霸主，单一Agent多模块上量是估值核心。', en: 'Cloud-native endpoint detection king; one-agent multi-module upsell anchors the valuation.' } },
          { symbol: 'FTNT', name: 'Fortinet', note: { zh: '硬件+软件一体化网络安全，性价比与防火墙性能领先。', en: 'Integrated hardware+software security; best-in-class firewall performance per dollar.' } },
          { symbol: 'ZS', name: 'Zscaler', note: { zh: 'SASE/零信任先驱，纯云架构替代传统网关。', en: 'SASE / zero-trust pioneer; cloud-native architecture replacing legacy gateways.' } },
          { symbol: 'NET', name: 'Cloudflare', note: { zh: '边缘网络+应用安全+开发者平台，CDN之外加速变现。', en: 'Edge network + app security + developer platform; monetizing well beyond CDN.' } },
          { symbol: 'OKTA', name: 'Okta', note: { zh: '身份管理SaaS龙头，企业级SSO与CIAM双线。', en: 'Identity-as-a-service leader; workforce SSO and CIAM dual track.' } },
          { symbol: 'S', name: 'SentinelOne', note: { zh: 'AI驱动端点防护，CrowdStrike最直接的挑战者。', en: 'AI-driven endpoint protection; most direct CrowdStrike challenger.' } },
          { symbol: 'CYBR', name: 'CyberArk', note: { zh: '特权访问管理(PAM)龙头，正向身份安全平台扩展。', en: 'Privileged access management leader; extending into a full identity-security platform.' } },
          { symbol: 'RBRK', name: 'Rubrik', note: { zh: '云数据安全与勒索软件防御，赛道处于早期高速期。', en: 'Cloud data security and ransomware defense; still in the high-growth phase.' } },
          { symbol: 'TENB', name: 'Tenable', note: { zh: '漏洞与暴露面管理(EM)平台，云资产可见性是新主线。', en: 'Vulnerability and exposure management; cloud asset visibility is the new vector.' } },
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
          { symbol: 'MSFT', name: 'Microsoft', note: { zh: 'Azure+Office+Windows三引擎，OpenAI合作推动企业AI落地。', en: 'Azure + Office + Windows trifecta; the OpenAI partnership drives enterprise AI rollout.' } },
          { symbol: 'ORCL', name: 'Oracle', note: { zh: 'OCI云增长加速，AI算力租赁与数据库现代化双驱动。', en: 'OCI growth accelerating; AI compute rental plus database modernization drive the story.' } },
          { symbol: 'IBM', name: 'IBM', note: { zh: '混合云+AI+咨询三轮，Red Hat是利润压舱石。', en: 'Hybrid cloud + AI + consulting; Red Hat is the profit anchor.' } },
          { symbol: 'SNOW', name: 'Snowflake', note: { zh: '数据云平台龙头，正从仓储扩展到AI应用层。', en: 'Data cloud leader; extending from warehousing to AI applications.' } },
          { symbol: 'MDB', name: 'MongoDB', note: { zh: '文档数据库领导者，Atlas云服务驱动主要增长。', en: 'Leading document database; Atlas cloud service is the main growth engine.' } },
          { symbol: 'DDOG', name: 'Datadog', note: { zh: '可观测性平台综合龙头，"一站式"卖法持续上量。', en: 'Top integrated observability platform; "one stop" land-and-expand keeps compounding.' } },
          { symbol: 'ESTC', name: 'Elastic', note: { zh: '搜索与可观测开源平台，向量数据库AI赛道新增长口。', en: 'Open-source search and observability; vector DB capabilities open an AI growth angle.' } },
          { symbol: 'GTLB', name: 'GitLab', note: { zh: '一体化DevSecOps平台，AI辅助编程功能持续迭代。', en: 'End-to-end DevSecOps platform; AI-assisted coding features rolling out steadily.' } },
          { symbol: 'CFLT', name: 'Confluent', note: { zh: '实时数据流处理(Kafka)商业化龙头。', en: 'Commercial steward of Apache Kafka and real-time data streaming.' } },
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
          { symbol: 'CRM', name: 'Salesforce', note: { zh: 'CRM绝对龙头，Agentforce生成式AI代理是新增长叙事。', en: 'CRM market leader; Agentforce GenAI agents are the new growth narrative.' } },
          { symbol: 'ADBE', name: 'Adobe', note: { zh: '创意+文档+营销云三引擎，AI生成内容是双刃剑。', en: 'Creative + document + marketing cloud trifecta; GenAI is both opportunity and threat.' } },
          { symbol: 'INTU', name: 'Intuit', note: { zh: 'TurboTax+QuickBooks+Credit Karma，中小企业财务SaaS主导者。', en: 'TurboTax + QuickBooks + Credit Karma; dominant SMB financial SaaS franchise.' } },
          { symbol: 'NOW', name: 'ServiceNow', note: { zh: '企业工作流平台龙头，AI Now平台溢价持续。', en: 'Enterprise workflow platform leader; AI Now command premium pricing.' } },
          { symbol: 'WDAY', name: 'Workday', note: { zh: '云端HR与财务SaaS龙头，企业核心系统替换长牛。', en: 'Cloud HCM and finance SaaS leader; long runway in enterprise system replacement.' } },
          { symbol: 'TEAM', name: 'Atlassian', note: { zh: 'Jira/Confluence开发者协作工具，云迁移与AI双重催化。', en: 'Jira/Confluence developer collaboration; both cloud migration and AI as catalysts.' } },
          { symbol: 'HUBS', name: 'HubSpot', note: { zh: '中小企业营销与CRM SaaS，覆盖空间向上拓展。', en: 'SMB-focused marketing and CRM SaaS; gradually moving upmarket.' } },
          { symbol: 'ADSK', name: 'Autodesk', note: { zh: 'AEC建筑与制造业设计软件，订阅化与定价权稳健。', en: 'AEC and manufacturing design software; subscription model with steady pricing power.' } },
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
          { symbol: 'PLTR', name: 'Palantir Technologies', note: { zh: '政府与企业AI决策平台，AIP产品商业化加速。', en: 'Government + enterprise AI decisioning platform; AIP commercialization is ramping.' } },
          { symbol: 'AI', name: 'C3.ai', note: { zh: '企业AI应用软件，按使用付费模型转型中。', en: 'Enterprise AI application software; transitioning to consumption-based pricing.' } },
          { symbol: 'PATH', name: 'UiPath', note: { zh: 'RPA流程自动化龙头，与AI Agent融合是关键议程。', en: 'RPA process-automation leader; the AI agent fusion is the key strategic issue.' } },
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
          { symbol: 'ACN', name: 'Accenture', note: { zh: '全球IT咨询第一品牌，AI落地项目订单储备扎实。', en: 'Largest global IT consultancy; healthy AI implementation backlog.' } },
          { symbol: 'IT', name: 'Gartner', note: { zh: 'IT研究与咨询订阅服务龙头，超高利润率与现金流。', en: 'Top IT research and advisory subscription business; very high margins and cash flow.' } },
          { symbol: 'CTSH', name: 'Cognizant Technology', note: { zh: '美印混合IT服务商，正抢占AI转型项目份额。', en: 'US/India hybrid IT services vendor; competing for AI transformation projects.' } },
          { symbol: 'INFY', name: 'Infosys', note: { zh: '印度第二大IT服务商，强金融与制造业大客户。', en: 'India\'s #2 IT services player; strong financial and manufacturing client base.' } },
          { symbol: 'WIT', name: 'Wipro', note: { zh: '印度三大IT服务巨头之一，重点布局AI与云迁移。', en: 'One of the top-three Indian IT outsourcers; investing heavily in AI and cloud migration.' } },
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
          { symbol: 'TMO', name: 'Thermo Fisher Scientific', note: { zh: '全球最大的生命科学工具与诊断公司，业务结构最完整。', en: 'Largest life-sciences tools and diagnostics company globally; most complete portfolio.' } },
          { symbol: 'DHR', name: 'Danaher', note: { zh: '生物制药仪器与诊断龙头，DBS精益管理是估值锚。', en: 'Bioprocess instruments and diagnostics leader; DBS lean management anchors the multiple.' } },
          { symbol: 'A', name: 'Agilent Technologies', note: { zh: '分析仪器与诊断龙头，强生物制药与食品安全敞口。', en: 'Analytical instruments and diagnostics leader; strong biopharma and food-safety exposure.' } },
          { symbol: 'IQV', name: 'IQVIA Holdings', note: { zh: '全球最大临床CRO+健康数据服务商。', en: 'World\'s largest CRO and healthcare data services provider.' } },
          { symbol: 'MTD', name: 'Mettler-Toledo', note: { zh: '精密天平与实验室分析仪器全球龙头，超高定价权。', en: 'Global leader in precision balances and lab instruments; exceptional pricing power.' } },
          { symbol: 'WAT', name: 'Waters', note: { zh: '液相色谱与质谱龙头，制药QC环节核心供应商。', en: 'Leader in liquid chromatography and mass spec; core supplier to pharma QC.' } },
          { symbol: 'BIO', name: 'Bio-Rad Laboratories', note: { zh: '生命科学研究试剂与临床诊断双业务。', en: 'Dual life-science research reagents and clinical diagnostics franchise.' } },
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
          { symbol: 'ILMN', name: 'Illumina', note: { zh: '基因测序仪绝对龙头，新平台NovaSeq X周期重启。', en: 'Dominant sequencing platform vendor; NovaSeq X cycle relaunching the upgrade trade.' } },
          { symbol: 'EXAS', name: 'Exact Sciences', note: { zh: '结直肠癌筛查Cologuard龙头，多癌种早筛是下一个增长口。', en: 'Cologuard colorectal screening leader; multi-cancer early detection is the next leg.' } },
          { symbol: 'NTRA', name: 'Natera', note: { zh: '产前与肿瘤微残留(MRD)液体活检龙头，毛利率快速改善。', en: 'Prenatal and oncology MRD liquid-biopsy leader; gross margin improving fast.' } },
          { symbol: 'GH', name: 'Guardant Health', note: { zh: '肿瘤液体活检领导者，已上市Shield结直肠早筛。', en: 'Liquid-biopsy oncology leader; Shield CRC screening now launched.' } },
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
          { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', note: { zh: '囊性纤维化垄断，IgA肾病与镇痛药打开新市场。', en: 'Cystic fibrosis monopoly; IgAN and non-opioid pain open new TAMs.' } },
          { symbol: 'REGN', name: 'Regeneron Pharmaceuticals', note: { zh: 'Eylea眼科黄斑变性核心，肿瘤与免疫管线持续兑现。', en: 'Eylea ophthalmology franchise; oncology and immunology pipelines delivering.' } },
          { symbol: 'AMGN', name: 'Amgen', note: { zh: '生物制药老牌龙头，多管线对冲专利悬崖，押注减重药。', en: 'Established biopharma; multi-pipeline hedge of patent cliff plus obesity drug bets.' } },
          { symbol: 'GILD', name: 'Gilead Sciences', note: { zh: 'HIV治疗绝对龙头，肿瘤管线分量逐步加重。', en: 'Dominant HIV franchise; oncology pipeline weight is rising.' } },
          { symbol: 'BIIB', name: 'Biogen', note: { zh: '神经科学专精，Leqembi阿尔茨海默症放量是关键变量。', en: 'Neuroscience specialist; Leqembi Alzheimer\'s ramp is the swing variable.' } },
          { symbol: 'ALNY', name: 'Alnylam Pharmaceuticals', note: { zh: 'RNAi疗法领导者，Amvuttra在TTR淀粉样变心肌病放量。', en: 'RNAi therapeutics leader; Amvuttra ramping in ATTR cardiomyopathy.' } },
          { symbol: 'INCY', name: 'Incyte', note: { zh: '小分子肿瘤与皮肤科药企，专利悬崖压力下管线储备充足。', en: 'Small-molecule oncology and dermatology; deep pipeline against patent cliff.' } },
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
          { symbol: 'MRNA', name: 'Moderna', note: { zh: 'mRNA技术平台龙头，新冠收入下滑后转向流感/RSV/肿瘤。', en: 'mRNA platform leader; pivoting from COVID toward flu/RSV/oncology.' } },
          { symbol: 'BNTX', name: 'BioNTech', note: { zh: '德国mRNA技术先驱，与辉瑞合作的新冠疫苗成名。', en: 'German mRNA pioneer made famous by the Pfizer-partnered COVID vaccine.' } },
          { symbol: 'CRSP', name: 'CRISPR Therapeutics', note: { zh: '已有商业化的镰刀贫血基因编辑疗法Casgevy。', en: 'Commercialized Casgevy gene-editing therapy for sickle cell disease.' } },
          { symbol: 'NTLA', name: 'Intellia Therapeutics', note: { zh: '体内基因编辑领跑者，ATTR与遗传性血管水肿临床推进。', en: 'In vivo gene-editing leader; ATTR and HAE programs advancing.' } },
          { symbol: 'BEAM', name: 'Beam Therapeutics', note: { zh: '碱基编辑技术先驱，靶向血液病与肝病。', en: 'Base editing pioneer; targeting hematologic and liver indications.' } },
          { symbol: 'RXRX', name: 'Recursion Pharmaceuticals', note: { zh: 'AI驱动药物发现龙头，已与NVIDIA和Sanofi合作。', en: 'AI-driven drug-discovery leader; NVIDIA and Sanofi as headline partners.' } },
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
          { symbol: 'LLY', name: 'Eli Lilly', note: { zh: '减重药Mounjaro/Zepbound引爆，是行业最强成长股之一。', en: 'GLP-1 superstar — Mounjaro/Zepbound is one of the strongest growth stories in pharma.' } },
          { symbol: 'JNJ', name: 'Johnson & Johnson', note: { zh: '制药+医疗器械双轮，强生消费业务已分拆为Kenvue。', en: 'Pharma + MedTech dual track after spinning off consumer health into Kenvue.' } },
          { symbol: 'ABBV', name: 'AbbVie', note: { zh: 'Humira专利悬崖应对中，Skyrizi/Rinvoq接续放量。', en: 'Managing the Humira cliff; Skyrizi/Rinvoq are the new growth engines.' } },
          { symbol: 'MRK', name: 'Merck', note: { zh: '免疫肿瘤明星药Keytruda是利润核心，重押HIV与心血管。', en: 'Keytruda dominates profits; doubling down on HIV and cardiovascular.' } },
          { symbol: 'PFE', name: 'Pfizer', note: { zh: '新冠收入回归后重新构建增长，肿瘤(Seagen并购)是重点。', en: 'Rebuilding growth post-COVID; the Seagen acquisition shifts focus to oncology.' } },
          { symbol: 'BMY', name: 'Bristol-Myers Squibb', note: { zh: 'Opdivo+Eliquis主力，神经科学Cobenfy是新增长口。', en: 'Opdivo + Eliquis as the workhorses; neuroscience Cobenfy is the new lever.' } },
          { symbol: 'AZN', name: 'AstraZeneca', note: { zh: '肿瘤+心血管/代谢/呼吸全领域龙头，强中国敞口。', en: 'Oncology + CVRM + respiratory; meaningful China exposure.' } },
          { symbol: 'NVO', name: 'Novo Nordisk', note: { zh: '减重药Wegovy+糖尿病药Ozempic双明星，与LLY平分GLP-1天下。', en: 'Wegovy + Ozempic make Novo co-leader of the GLP-1 market with Lilly.' } },
          { symbol: 'NVS', name: 'Novartis', note: { zh: '瑞士制药龙头，剥离仿制药后聚焦创新药。', en: 'Swiss pharma major; pure-play innovative pharma after the Sandoz spin-off.' } },
          { symbol: 'GSK', name: 'GSK', note: { zh: '英国制药+疫苗龙头，分拆消费业务后聚焦呼吸与HIV。', en: 'UK pharma + vaccines; post-consumer spin focus is respiratory and HIV.' } },
          { symbol: 'SNY', name: 'Sanofi', note: { zh: '法国制药龙头，免疫龙头Dupixent是利润核心。', en: 'French pharma major; Dupixent immunology franchise dominates profits.' } },
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
          { symbol: 'ZTS', name: 'Zoetis', note: { zh: '全球最大动物保健公司，宠物医疗与新药管线持续高增。', en: 'World\'s largest animal health company; companion-animal and pipeline drive growth.' } },
          { symbol: 'ELAN', name: 'Elanco Animal Health', note: { zh: '动物保健第二大企业，正修复并购消化期资产负债表。', en: 'Animal health #2; balance sheet repairing post-acquisition.' } },
          { symbol: 'VTRS', name: 'Viatris', note: { zh: '辉瑞仿制药与迈兰合并，全球仿制药与品牌药龙头。', en: 'Pfizer generics + Mylan merger; global generics and branded specialty pharma.' } },
          { symbol: 'TEVA', name: 'Teva Pharmaceutical', note: { zh: '全球最大仿制药企业，正向创新药转型，债务持续压降。', en: 'World\'s largest generics maker; pivoting to innovation while paying down debt.' } },
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
          { symbol: 'ABT', name: 'Abbott Laboratories', note: { zh: '诊断+器械+营养品+仿制药多元龙头，Libre CGM是明星产品。', en: 'Diagnostics + devices + nutrition + generics; Libre CGM is the star franchise.' } },
          { symbol: 'MDT', name: 'Medtronic', note: { zh: '全球医疗器械龙头，心脏+糖尿病+神经科学产品组合最完整。', en: 'World\'s largest med-device company; most complete cardio + diabetes + neuro portfolio.' } },
          { symbol: 'SYK', name: 'Stryker', note: { zh: '骨科与外科器械龙头，机器人Mako是核心驱动。', en: 'Orthopedic and surgical device leader; the Mako robot is the core growth driver.' } },
          { symbol: 'BSX', name: 'Boston Scientific', note: { zh: '心血管介入与电生理强者，Farapulse PFA消融是新明星。', en: 'Cardiovascular and electrophysiology leader; Farapulse PFA is the breakout product.' } },
          { symbol: 'ISRG', name: 'Intuitive Surgical', note: { zh: 'da Vinci手术机器人垄断，新一代dV5系统继续护城河。', en: 'da Vinci surgical robotics monopoly; the new dV5 system extends the moat.' } },
          { symbol: 'EW', name: 'Edwards Lifesciences', note: { zh: '经导管心脏瓣膜TAVR龙头，结构性心脏病新产品打开空间。', en: 'Transcatheter heart valve (TAVR) leader; structural-heart pipeline expands TAM.' } },
          { symbol: 'BDX', name: 'Becton Dickinson', note: { zh: '医用注射器与实验室仪器全球龙头。', en: 'Global leader in medical injectors and lab instrumentation.' } },
          { symbol: 'DXCM', name: 'DexCom', note: { zh: '连续血糖监测(CGM)双寡头之一，新一代G7器件量产爬坡。', en: 'CGM duopoly leader; the G7 device is ramping production.' } },
          { symbol: 'PODD', name: 'Insulet', note: { zh: 'Omnipod无管胰岛素泵龙头，与CGM一体化加速渗透。', en: 'Omnipod tubeless insulin pump leader; CGM integration accelerates adoption.' } },
          { symbol: 'BAX', name: 'Baxter International', note: { zh: '医院输液系统与肾科透析全球龙头，已剥离生物制药业务。', en: 'Global hospital infusion and renal dialysis leader; biopharma services divested.' } },
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
          { symbol: 'UNH', name: 'UnitedHealth Group', note: { zh: '美国最大商业医保+Optum医疗服务平台一体化。', en: 'Largest US commercial insurer + integrated Optum services platform.' } },
          { symbol: 'ELV', name: 'Elevance Health', note: { zh: '蓝十字蓝盾(BCBS)阵营核心，多州医保覆盖+Carelon服务。', en: 'BCBS franchise anchor; multi-state insurance plus Carelon services arm.' } },
          { symbol: 'CI', name: 'Cigna', note: { zh: '商业医保+Evernorth PBM双引擎，反垄断诉讼是焦点。', en: 'Commercial insurance + Evernorth PBM; antitrust litigation in focus.' } },
          { symbol: 'HUM', name: 'Humana', note: { zh: 'Medicare Advantage纯化战略，受Medicare费率调整影响最大。', en: 'Medicare Advantage pure-play; most exposed to MA rate revisions.' } },
          { symbol: 'CNC', name: 'Centene', note: { zh: '低收入医保(Medicaid)与平价医保(ACA)龙头。', en: 'Largest provider of Medicaid and ACA marketplace plans.' } },
          { symbol: 'MOH', name: 'Molina Healthcare', note: { zh: '专注政府医保(Medicaid+Medicare)的中型管理式医疗。', en: 'Mid-cap managed care focused on government programs (Medicaid + MA).' } },
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
          { symbol: 'HCA', name: 'HCA Healthcare', note: { zh: '美国最大盈利性医院集团，规模与定价权双优。', en: 'Largest US for-profit hospital operator; scale plus pricing power.' } },
          { symbol: 'THC', name: 'Tenet Healthcare', note: { zh: '医院+门诊手术中心(USPI)双轮，正向轻资产倾斜。', en: 'Hospitals + ambulatory surgery (USPI); tilting toward asset-light services.' } },
          { symbol: 'UHS', name: 'Universal Health Services', note: { zh: '行为健康(精神科)与综合医院双业务。', en: 'Behavioral health (psychiatric) + acute-care hospital dual track.' } },
          { symbol: 'DGX', name: 'Quest Diagnostics', note: { zh: '美国连锁实验室双寡头之一，并购小型实验室持续整合。', en: 'One of the US reference-lab duopoly; consolidating smaller labs via M&A.' } },
          { symbol: 'LH', name: 'Labcorp', note: { zh: '连锁实验室+CRO药品研发服务双业务。', en: 'Reference labs plus drug-development services (CRO).' } },
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
          { symbol: 'MCK', name: 'McKesson', note: { zh: '美国药品分销三巨头之首，主营高利润专科药与肿瘤业务。', en: 'Top US drug distributor; high-margin specialty drugs and oncology services.' } },
          { symbol: 'COR', name: 'Cencora', note: { zh: '原AmerisourceBergen，药品分销三巨头之一，国际业务持续扩张。', en: 'Formerly AmerisourceBergen; one of the big-three distributors, expanding internationally.' } },
          { symbol: 'CAH', name: 'Cardinal Health', note: { zh: '药品分销三巨头之一，医疗器械与外科产品作为利润补充。', en: 'One of the big-three distributors; medical products complement the pharma franchise.' } },
          { symbol: 'CVS', name: 'CVS Health', note: { zh: 'PBM(Caremark)+连锁药房+医保(Aetna)三位一体。', en: 'PBM (Caremark) + retail pharmacy + Aetna insurance — three-in-one model.' } },
          { symbol: 'WBA', name: 'Walgreens Boots Alliance', note: { zh: '美国第二大连锁药房，正大幅关店与重组以重建估值。', en: 'US #2 retail pharmacy; aggressive store closures and restructuring to reset valuation.' } },
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
          { symbol: 'VEEV', name: 'Veeva Systems', note: { zh: '生命科学专属CRM+临床/质量SaaS龙头，护城河极深。', en: 'Life-sciences vertical CRM + clinical/quality SaaS leader; very deep moat.' } },
          { symbol: 'DOCS', name: 'Doximity', note: { zh: '美国医生社交平台龙头，制药数字营销变现主线。', en: 'Top US physician social network; pharma digital marketing drives monetization.' } },
          { symbol: 'HIMS', name: 'Hims & Hers Health', note: { zh: '远程医疗+处方DTC平台，复方减重药是争议焦点。', en: 'Telehealth + prescription DTC; compounded GLP-1 offerings are the lightning rod.' } },
          { symbol: 'TDOC', name: 'Teladoc Health', note: { zh: '远程医疗第一品牌，疫情后估值重塑过程中。', en: 'Largest telehealth brand; valuation reset still in progress post-pandemic.' } },
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
          { symbol: 'JPM', name: 'JPMorgan Chase', note: { zh: '美国资产规模第一银行，投行+财富管理+零售三线全能。', en: 'US largest bank by assets; investment banking + wealth + consumer all leading.' } },
          { symbol: 'BAC', name: 'Bank of America', note: { zh: '消费银行+财富管理(Merrill)双核心，NIM对利率最敏感。', en: 'Consumer banking + Merrill wealth; most rate-sensitive NIM among peers.' } },
          { symbol: 'WFC', name: 'Wells Fargo', note: { zh: '美国最大社区银行，正脱离监管资产规模限制。', en: 'Largest US community bank; emerging from the regulatory asset cap.' } },
          { symbol: 'C', name: 'Citigroup', note: { zh: '全球最国际化美资银行，多年重组提升ROTCE在进行中。', en: 'Most international US bank; multi-year restructuring aiming to lift ROTCE.' } },
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
          { symbol: 'GS', name: 'Goldman Sachs', note: { zh: '全球顶级投行+交易做市，并购顾问与资管业务并重。', en: 'Top-tier investment bank + market-maker; balanced M&A advisory and asset management.' } },
          { symbol: 'MS', name: 'Morgan Stanley', note: { zh: '财富管理转型最成功的投行，E*Trade并购显著提升估值。', en: 'Most successful IB-to-wealth pivot; the E*Trade deal materially lifted the multiple.' } },
          { symbol: 'EVR', name: 'Evercore', note: { zh: '精品并购顾问龙头，纯咨询无重资本敞口。', en: 'Top M&A boutique; pure advisory, no balance-sheet exposure.' } },
          { symbol: 'LAZ', name: 'Lazard', note: { zh: '老牌精品投行+资产管理双线，国际并购强项。', en: 'Heritage boutique IB + asset management; strong in cross-border M&A.' } },
          { symbol: 'HLI', name: 'Houlihan Lokey', note: { zh: '专注中端并购与重组顾问，业务波动性低于同业。', en: 'Mid-market M&A and restructuring advisor; less cyclical than larger peers.' } },
          { symbol: 'PJT', name: 'PJT Partners', note: { zh: '精品并购顾问+战略咨询，破产重组业务强。', en: 'M&A boutique with leading restructuring practice.' } },
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
          { symbol: 'USB', name: 'U.S. Bancorp', note: { zh: '美国最大超地区银行(super-regional)，支付与财富业务出色。', en: 'Largest US super-regional; strong payments and wealth franchises.' } },
          { symbol: 'PNC', name: 'PNC Financial', note: { zh: '东海岸超地区银行龙头，资本充足率与盈利稳健。', en: 'East coast super-regional leader; solid capital and earnings consistency.' } },
          { symbol: 'TFC', name: 'Truist Financial', note: { zh: 'BB&T与SunTrust合并而来，正持续整合系统并优化网点。', en: 'Born from BB&T/SunTrust merger; still integrating systems and rationalizing branches.' } },
          { symbol: 'FITB', name: 'Fifth Third Bancorp', note: { zh: '中西部地区银行，对公小微+消费贷款两线均衡。', en: 'Midwest regional bank; balanced commercial SMB + consumer lending.' } },
          { symbol: 'MTB', name: 'M&T Bank', note: { zh: '美东地区银行，并购成长史与CRE敞口为投资者关注。', en: 'Northeast regional; M&A-led growth story plus CRE exposure draws attention.' } },
          { symbol: 'KEY', name: 'KeyCorp', note: { zh: '克利夫兰区域银行，资本市场业务占比高于多数同业。', en: 'Cleveland-based regional; higher capital-markets mix than most peers.' } },
          { symbol: 'RF', name: 'Regions Financial', note: { zh: '美东南地区银行，存款基础稳健，盈利波动较低。', en: 'Southeast regional; sticky deposit base and steady earnings.' } },
          { symbol: 'HBAN', name: 'Huntington Bancshares', note: { zh: '中西部地区银行，消费金融与中小企业贷款双业务。', en: 'Midwest regional; consumer finance and SMB lending.' } },
          { symbol: 'CFG', name: 'Citizens Financial', note: { zh: '新英格兰地区银行，正向私人银行(Private Bank)扩张。', en: 'New England regional; expanding into private banking.' } },
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
          { symbol: 'BK', name: 'BNY Mellon', note: { zh: '全球最大托管银行，托管资产超50万亿美元。', en: 'World\'s largest custody bank with $50T+ in assets under custody.' } },
          { symbol: 'STT', name: 'State Street', note: { zh: '托管银行+SPDR ETF发行商，AUC/A与ETF两块基本盘。', en: 'Custody bank + SPDR ETF sponsor; AUC/A and ETFs anchor the business.' } },
          { symbol: 'NTRS', name: 'Northern Trust', note: { zh: '聚焦超高净值与机构客户的小型托管/财富银行。', en: 'Niche custody/wealth bank focused on UHNW and institutional clients.' } },
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
          { symbol: 'ICE', name: 'Intercontinental Exchange', note: { zh: 'NYSE母公司+能源衍生品交易所+按揭数据，业务最多元。', en: 'Owns NYSE plus energy derivatives and mortgage data; most diversified exchange.' } },
          { symbol: 'CME', name: 'CME Group', note: { zh: '全球最大期货与期权交易所，利率/能源/农产品衍生品垄断。', en: 'World\'s largest futures and options exchange; rates / energy / ag derivatives lock-in.' } },
          { symbol: 'NDAQ', name: 'Nasdaq', note: { zh: 'Nasdaq交易所+反金融犯罪软件+交易技术解决方案。', en: 'Nasdaq exchange + anti-financial-crime software + trading-tech solutions.' } },
          { symbol: 'CBOE', name: 'Cboe Global Markets', note: { zh: 'VIX指数与SPX期权独家交易所，零日到期期权高速增长。', en: 'Exclusive venue for VIX and SPX options; 0DTE options growth has been explosive.' } },
          { symbol: 'MKTX', name: 'MarketAxess', note: { zh: '电子化信用债交易平台龙头，机构信用交易电子化是结构红利。', en: 'Leading electronic credit-trading venue; electronification is a structural tailwind.' } },
          { symbol: 'TW', name: 'Tradeweb Markets', note: { zh: '电子化利率与信用交易平台，规模仅次于MarketAxess。', en: 'Electronic rates and credit trading venue, just behind MarketAxess in scale.' } },
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
          { symbol: 'V', name: 'Visa', note: { zh: '全球最大开放支付网络，跨境消费是利润率核心。', en: 'World\'s largest open-loop payment network; cross-border is the margin engine.' } },
          { symbol: 'MA', name: 'Mastercard', note: { zh: '第二大支付网络，并购数据/咨询服务持续增厚业务。', en: 'World\'s #2 payment network; acquiring data/services keeps thickening the model.' } },
          { symbol: 'AXP', name: 'American Express', note: { zh: '高端封闭卡组织+发卡行一体化，年费与忠诚度构筑护城河。', en: 'Closed-loop premium network + issuer; annual fees and loyalty are the moat.' } },
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
          { symbol: 'FIS', name: 'Fidelity National Information', note: { zh: '银行核心系统服务商，已剥离Worldpay专注金融科技。', en: 'Bank core-systems vendor; divested Worldpay to focus on fintech.' } },
          { symbol: 'FI', name: 'Fiserv', note: { zh: '美国最大商户收单+银行核心系统服务商，Clover中小商户业务亮眼。', en: 'Largest US merchant acquirer + bank core; Clover SMB stack is the bright spot.' } },
          { symbol: 'GPN', name: 'Global Payments', note: { zh: '全球商户收单服务商，并购整合压力下估值低位。', en: 'Global merchant acquirer; M&A integration overhang keeps the multiple depressed.' } },
          { symbol: 'WU', name: 'Western Union', note: { zh: '跨境汇款龙头，正面临数字支付崛起的结构性挑战。', en: 'Cross-border remittance leader; structural challenge from digital payments.' } },
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
          { symbol: 'BRK-B', name: 'Berkshire Hathaway', note: { zh: '巴菲特控股集团，保险+铁路+能源+股权投资全平台。', en: 'Buffett-led conglomerate; insurance + rail + energy + equity investments.' } },
          { symbol: 'PGR', name: 'Progressive', note: { zh: '美国第一车险公司，承保技术领先与电报盒式定价是护城河。', en: 'Largest US auto insurer; telematics and technology underwriting form the moat.' } },
          { symbol: 'CB', name: 'Chubb', note: { zh: '全球高端商业财险与高净值个人保险龙头。', en: 'Global leader in premium commercial P&C and high-net-worth personal lines.' } },
          { symbol: 'TRV', name: 'Travelers Companies', note: { zh: '美国大型商业财险老牌龙头，承保盈利能力稳健。', en: 'Heritage US commercial P&C major with steady underwriting profit.' } },
          { symbol: 'ALL', name: 'Allstate', note: { zh: '美国个人车险与家财险大型公司，正大规模提价修复盈利。', en: 'Major US personal lines insurer; restoring profitability via aggressive rate hikes.' } },
          { symbol: 'AIG', name: 'American International Group', note: { zh: '全球大型商业财险，金融危机后多年瘦身重塑。', en: 'Global commercial P&C; years of streamlining post-GFC.' } },
          { symbol: 'HIG', name: 'Hartford Financial', note: { zh: '商业小微财险与团险，业绩稳定且回购力度大。', en: 'Small-commercial P&C and group benefits; stable earnings with strong buyback.' } },
          { symbol: 'EG', name: 'Everest Group', note: { zh: '全球再保险与初级承保混合公司，受益于硬市场周期。', en: 'Reinsurance + primary; benefiting from the hard market cycle.' } },
          { symbol: 'RNR', name: 'RenaissanceRe', note: { zh: '百慕大再保险公司，巨灾再保险定价能力强。', en: 'Bermuda reinsurer with strong cat-pricing capability.' } },
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
          { symbol: 'MET', name: 'MetLife', note: { zh: '美国最大寿险公司之一，团险与亚洲业务比重高。', en: 'One of the largest US life insurers; heavy group and Asia exposure.' } },
          { symbol: 'PRU', name: 'Prudential Financial', note: { zh: '寿险与年金+资产管理双业务，PGIM管理超1.5万亿美元。', en: 'Life and annuity + asset management; PGIM manages over $1.5T.' } },
          { symbol: 'AFL', name: 'Aflac', note: { zh: '日本鸭子保险，日本市场补充医疗险龙头。', en: 'The "Aflac duck"; market leader in Japanese supplemental medical insurance.' } },
          { symbol: 'PFG', name: 'Principal Financial', note: { zh: '聚焦养老金与中小企业团险业务的多元保险公司。', en: 'Diversified insurer focused on retirement and SMB group benefits.' } },
          { symbol: 'LNC', name: 'Lincoln National', note: { zh: '美国寿险与年金，正在重建准备金应对低利率影响。', en: 'US life and annuity; rebuilding reserves after low-rate-era reserve revisions.' } },
          { symbol: 'GL', name: 'Globe Life', note: { zh: '低收入家庭定期寿险龙头，承保利润率稳定。', en: 'Low-income market term-life leader; consistent underwriting margins.' } },
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
          { symbol: 'MMC', name: 'Marsh & McLennan', note: { zh: '全球最大保险经纪+咨询(McKinsey之外Mercer/Oliver Wyman)。', en: 'World\'s largest insurance broker + consulting (Mercer / Oliver Wyman).' } },
          { symbol: 'AON', name: 'Aon', note: { zh: '全球第二大保险经纪+再保经纪+健康咨询。', en: 'Global #2 insurance broker, with reinsurance broking and health consulting arms.' } },
          { symbol: 'AJG', name: 'Arthur J. Gallagher', note: { zh: '美国中型企业保险经纪龙头，并购扩张持续。', en: 'Mid-market US insurance broker; consolidating via continued M&A.' } },
          { symbol: 'WTW', name: 'Willis Towers Watson', note: { zh: '保险经纪+精算咨询，已撤回与AON合并案。', en: 'Insurance broker + actuarial consulting; abandoned merger with AON.' } },
          { symbol: 'BRO', name: 'Brown & Brown', note: { zh: '美国中小型保险经纪龙头，去中心化管理与并购增长稳健。', en: 'US mid-market broker; decentralized model with steady tuck-in M&A.' } },
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
          { symbol: 'BLK', name: 'BlackRock', note: { zh: '全球最大资产管理公司(AUM超10万亿)，iShares ETF与Aladdin平台核心。', en: 'World\'s largest asset manager ($10T+ AUM); iShares ETFs and Aladdin platform anchor.' } },
          { symbol: 'TROW', name: 'T. Rowe Price', note: { zh: '主动管理共同基金龙头，被动化趋势是结构逆风。', en: 'Active mutual-fund leader; passive shift is the structural headwind.' } },
          { symbol: 'BEN', name: 'Franklin Resources', note: { zh: '老牌主动资管，并购Putnam与Legg Mason后规模显著扩张。', en: 'Heritage active manager; scale stepped up after Putnam and Legg Mason acquisitions.' } },
          { symbol: 'IVZ', name: 'Invesco', note: { zh: '主被动并存的中型资管，QQQ ETF为主要明星。', en: 'Mixed active/passive mid-cap manager; QQQ ETF is the headline product.' } },
          { symbol: 'AMG', name: 'Affiliated Managers', note: { zh: '多元化精品资管控股公司，专注高利润率私募市场策略。', en: 'Holding company of boutique managers; focus on premium private-market strategies.' } },
          { symbol: 'BAM', name: 'Brookfield Asset Management', note: { zh: '加拿大另类资管巨头BN旗下纯资管子公司。', en: 'The pure-play asset-manager subsidiary spun out of Brookfield Corp.' } },
          { symbol: 'BN', name: 'Brookfield Corporation', note: { zh: '加拿大另类资管母公司，资管+保险+地产+基建多业务。', en: 'Canadian alts parent; asset mgmt + insurance + real estate + infra.' } },
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
          { symbol: 'BX', name: 'Blackstone', note: { zh: '全球最大另类资管，PE+地产+信贷+对冲基金全平台。', en: 'World\'s largest alts manager; PE + real estate + credit + hedge funds.' } },
          { symbol: 'KKR', name: 'KKR & Co', note: { zh: '老牌PE巨头，正向永续资本+保险(Global Atlantic)倾斜。', en: 'Legacy PE major; tilting toward permanent capital and insurance (Global Atlantic).' } },
          { symbol: 'APO', name: 'Apollo Global Management', note: { zh: '私募信贷龙头，与Athene寿险合并形成永续资本机器。', en: 'Private-credit leader; merged with Athene to build a permanent-capital engine.' } },
          { symbol: 'ARES', name: 'Ares Management', note: { zh: '私募信贷与房地产二线另类资管，规模扩张快速。', en: 'Private-credit and real estate alts manager; scaling fast.' } },
          { symbol: 'OWL', name: 'Blue Owl Capital', note: { zh: 'GP股权融资+直接借贷+净租赁三业务，结构性永续资本。', en: 'GP stakes + direct lending + net lease; structurally permanent capital.' } },
          { symbol: 'TPG', name: 'TPG Inc', note: { zh: '另类资管PE龙头之一，正向影响力投资(Rise)与气候基金倾斜。', en: 'One of the larger PE alts; tilting into impact (Rise) and climate strategies.' } },
          { symbol: 'CG', name: 'Carlyle Group', note: { zh: '老牌PE巨头，正在重建增长动能。', en: 'Heritage PE major; rebuilding growth momentum.' } },
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
          { symbol: 'SCHW', name: 'Charles Schwab', note: { zh: '美国最大零售券商+财富管理平台。', en: 'Largest US retail broker + wealth management platform.' } },
          { symbol: 'IBKR', name: 'Interactive Brokers', note: { zh: '高频专业交易者首选券商，国际化与低成本优势明显。', en: 'Preferred broker of professional traders; international reach and rock-bottom costs.' } },
          { symbol: 'LPLA', name: 'LPL Financial', note: { zh: '美国最大独立财务顾问平台，招募规模持续放量。', en: 'Largest US independent advisor platform; advisor recruiting consistently strong.' } },
          { symbol: 'RJF', name: 'Raymond James', note: { zh: '券商+财富管理+投行，文化保守资产质量稳健。', en: 'Brokerage + wealth + IB; culturally conservative with sound asset quality.' } },
          { symbol: 'HOOD', name: 'Robinhood Markets', note: { zh: '年轻散户首选App券商，加密+期权交易是主要收入。', en: 'Go-to mobile broker for younger retail; crypto and options drive revenue.' } },
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
          { symbol: 'COF', name: 'Capital One Financial', note: { zh: '美国第二大信用卡发卡行，正并购Discover扩大支付网络。', en: 'US #2 card issuer; acquiring Discover to scale into a payment network.' } },
          { symbol: 'DFS', name: 'Discover Financial', note: { zh: '信用卡发卡行+支付网络，正被Capital One并购。', en: 'Card issuer + payment network; being acquired by Capital One.' } },
          { symbol: 'SYF', name: 'Synchrony Financial', note: { zh: '美国最大私品牌信用卡发行商，与零售商合作发卡。', en: 'Largest private-label card issuer in the US; partners with retailers.' } },
          { symbol: 'ALLY', name: 'Ally Financial', note: { zh: '美国最大独立汽车金融公司，正逐步发展数字银行业务。', en: 'Largest independent US auto lender; gradually building a digital bank.' } },
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
          { symbol: 'PYPL', name: 'PayPal Holdings', note: { zh: '电商支付钱包龙头，份额受Apple Pay与Stripe挤压。', en: 'E-commerce wallet leader; share pressured by Apple Pay and Stripe.' } },
          { symbol: 'SQ', name: 'Block Inc', note: { zh: '原Square，商户收单+Cash App双轮，多元化扩张。', en: 'Formerly Square; merchant acquiring + Cash App dual engines, expanding broadly.' } },
          { symbol: 'AFRM', name: 'Affirm Holdings', note: { zh: '美国先买后付(BNPL)龙头，强电商伙伴生态。', en: 'Top US buy-now-pay-later platform; strong e-commerce partner ecosystem.' } },
          { symbol: 'SOFI', name: 'SoFi Technologies', note: { zh: '一站式数字银行(贷款+投资+银行账户)，正持续扩张产品线。', en: 'One-stop digital bank (lending + investing + accounts); product line keeps expanding.' } },
          { symbol: 'COIN', name: 'Coinbase Global', note: { zh: '美国最大合规加密货币交易所，机构服务与稳定币业务在扩张。', en: 'Largest US regulated crypto exchange; expanding institutional and stablecoin services.' } },
          { symbol: 'NU', name: 'Nu Holdings', note: { zh: '拉美最大数字银行，巴西/墨西哥/哥伦比亚客户超1亿。', en: 'Largest digital bank in Latin America; 100M+ customers across Brazil, Mexico, Colombia.' } },
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
          { symbol: 'XOM', name: 'ExxonMobil', note: { zh: '美国最大油气公司，二叠盆地与圭亚那是核心增长资产。', en: 'Largest US oil major; Permian and Guyana are the core growth assets.' } },
          { symbol: 'CVX', name: 'Chevron', note: { zh: '美国第二大油气巨头，正并购Hess扩张资产组合。', en: 'US #2 oil major; acquiring Hess to expand the portfolio.' } },
          { symbol: 'SHEL', name: 'Shell', note: { zh: '荷兰皇家壳牌，全球LNG最大交易商，正回归油气主业。', en: 'Royal Dutch Shell; world\'s largest LNG trader, refocusing on oil & gas.' } },
          { symbol: 'BP', name: 'BP', note: { zh: '英国油气巨头，正回调能源转型节奏重新强调油气。', en: 'UK oil major; dialing back the energy-transition pivot to re-emphasize oil & gas.' } },
          { symbol: 'TTE', name: 'TotalEnergies', note: { zh: '法国油气巨头，油气与可再生能源平衡发展。', en: 'French major; balancing legacy oil & gas with renewables build-out.' } },
          { symbol: 'EQNR', name: 'Equinor', note: { zh: '挪威国家石油，海上油气与海上风电的领导者。', en: 'Norway\'s national oil; leader in offshore oil & gas plus offshore wind.' } },
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
          { symbol: 'COP', name: 'ConocoPhillips', note: { zh: '美国最大纯上游E&P公司，资本纪律严明。', en: 'Largest pure-play US E&P; capital discipline is a hallmark.' } },
          { symbol: 'EOG', name: 'EOG Resources', note: { zh: '页岩气与页岩油先驱，技术与单井经济性强。', en: 'Shale pioneer; best-in-class well-level economics.' } },
          { symbol: 'OXY', name: 'Occidental Petroleum', note: { zh: '巴菲特重仓股，二叠盆地资源与碳捕获并行布局。', en: 'A Buffett favorite; Permian assets plus a carbon-capture bet.' } },
          { symbol: 'FANG', name: 'Diamondback Energy', note: { zh: '二叠盆地纯上游龙头，并购Endeavor巩固龙头地位。', en: 'Permian pure-play; the Endeavor merger consolidates its leadership.' } },
          { symbol: 'DVN', name: 'Devon Energy', note: { zh: '多盆地油气生产商，浮动股息政策吸引收益型投资者。', en: 'Multi-basin producer; variable-dividend policy attracts income investors.' } },
          { symbol: 'HES', name: 'Hess', note: { zh: '正被Chevron收购，圭亚那海上油田是核心价值资产。', en: 'Being acquired by Chevron; Guyana offshore is the prize asset.' } },
          { symbol: 'CTRA', name: 'Coterra Energy', note: { zh: '由Cabot与Cimarex合并而来，天然气+油气均衡组合。', en: 'Born of Cabot/Cimarex merger; balanced gas + oil portfolio.' } },
          { symbol: 'EXE', name: 'Expand Energy', note: { zh: 'Chesapeake与Southwestern合并后，美国最大天然气生产商。', en: 'Largest US natgas producer after the Chesapeake / Southwestern merger.' } },
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
          { symbol: 'SLB', name: 'Schlumberger', note: { zh: '全球最大油田服务公司，国际市场份额最高。', en: 'World\'s largest oilfield services company; biggest international footprint.' } },
          { symbol: 'HAL', name: 'Halliburton', note: { zh: '北美压裂服务龙头，与北美页岩开发密切相关。', en: 'NA frac services leader; closely tied to North American shale capex.' } },
          { symbol: 'BKR', name: 'Baker Hughes', note: { zh: '油气服务+LNG涡轮设备双业务，能源转型转型受益方。', en: 'Oilfield services + LNG turbomachinery; benefits from the energy transition.' } },
          { symbol: 'NOV', name: 'NOV Inc', note: { zh: '钻井设备与海上油气装备龙头，海上复苏受益方。', en: 'Drilling equipment and offshore gear leader; benefits from offshore revival.' } },
          { symbol: 'WFRD', name: 'Weatherford International', note: { zh: '中型油服公司，破产重组后业绩反弹。', en: 'Mid-cap OFS; rebounded sharply after restructuring.' } },
          { symbol: 'CHX', name: 'ChampionX', note: { zh: '生产化学品与人工举升设备，正被SLB收购。', en: 'Production chemicals and artificial lift; being acquired by SLB.' } },
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
          { symbol: 'RIG', name: 'Transocean', note: { zh: '全球最大海上深水钻井平台运营商。', en: 'World\'s largest offshore deepwater drilling-rig operator.' } },
          { symbol: 'VAL', name: 'Valaris', note: { zh: '海上钻井公司，破产重组后债务大幅清理。', en: 'Offshore driller; balance sheet cleaned up via restructuring.' } },
          { symbol: 'NE', name: 'Noble Corporation', note: { zh: '海上钻井公司，与Maersk Drilling合并后规模扩大。', en: 'Offshore driller; scaled up after the Maersk Drilling merger.' } },
          { symbol: 'BORR', name: 'Borr Drilling', note: { zh: '现代化自升式钻井平台运营商，专注浅水油气。', en: 'Modern jackup operator focused on shallow-water drilling.' } },
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
          { symbol: 'ENB', name: 'Enbridge', note: { zh: '加拿大最大管道运营商，原油+天然气+公用事业三业务。', en: 'Canada\'s largest pipeline operator; crude + gas + utilities trifecta.' } },
          { symbol: 'KMI', name: 'Kinder Morgan', note: { zh: '美国最大天然气管道运营商，类公用事业现金流。', en: 'Largest US natural gas pipeline operator; utility-like cash flow.' } },
          { symbol: 'WMB', name: 'Williams Companies', note: { zh: '美国天然气管道与处理龙头，受益于LNG出口扩张。', en: 'US natural gas pipeline and processing leader; benefits from LNG export expansion.' } },
          { symbol: 'OKE', name: 'ONEOK', note: { zh: '天然气液体(NGL)管道与处理龙头，并购Magellan扩张原油业务。', en: 'NGL pipeline and processing leader; the Magellan acquisition adds crude lines.' } },
          { symbol: 'TRGP', name: 'Targa Resources', note: { zh: '二叠盆地天然气加工与NGL运输龙头，是页岩气增长直接受益方。', en: 'Permian gas-processing and NGL-transport leader; direct beneficiary of shale growth.' } },
          { symbol: 'ET', name: 'Energy Transfer', note: { zh: 'MLP结构大型综合中游，受益于天然气与NGL出口长协。', en: 'Large diversified midstream MLP; long-term gas and NGL export contracts.' } },
          { symbol: 'EPD', name: 'Enterprise Products Partners', note: { zh: '美国最大NGL综合中游，资产负债表与分派纪律严明。', en: 'Largest US NGL midstream; disciplined balance sheet and distribution policy.' } },
          { symbol: 'MPLX', name: 'MPLX', note: { zh: 'Marathon Petroleum旗下中游MLP，强NGL与天然气加工敞口。', en: 'Marathon Petroleum\'s midstream MLP; heavy NGL and gas-processing exposure.' } },
          { symbol: 'PAA', name: 'Plains All American', note: { zh: '美国最大原油管道运营商之一，二叠盆地资产核心。', en: 'One of the largest US crude pipeline operators; Permian assets are core.' } },
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
          { symbol: 'VLO', name: 'Valero Energy', note: { zh: '美国最大独立炼油商，强可再生柴油业务布局。', en: 'Largest US independent refiner; meaningful renewable diesel build-out.' } },
          { symbol: 'MPC', name: 'Marathon Petroleum', note: { zh: '美国第二大独立炼油商，零售加油Speedway已分拆。', en: 'US #2 independent refiner; Speedway retail was spun off.' } },
          { symbol: 'PSX', name: 'Phillips 66', note: { zh: '一体化炼化+中游+化工，正剥离化工业务。', en: 'Integrated refining + midstream + chemicals; divesting chemicals.' } },
          { symbol: 'DINO', name: 'HF Sinclair', note: { zh: 'HollyFrontier与Sinclair合并而来，西部炼油龙头。', en: 'Born of HollyFrontier / Sinclair merger; western US refining leader.' } },
          { symbol: 'PBF', name: 'PBF Energy', note: { zh: '美国中型独立炼油商，强东海岸炼厂资产。', en: 'Mid-cap independent refiner with strong East Coast refinery base.' } },
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
          { symbol: 'LNG', name: 'Cheniere Energy', note: { zh: '美国最大LNG出口商，Sabine Pass与Corpus Christi两大基地。', en: 'Largest US LNG exporter; Sabine Pass and Corpus Christi facilities.' } },
          { symbol: 'CQP', name: 'Cheniere Energy Partners', note: { zh: 'Cheniere旗下MLP，Sabine Pass资产持有者。', en: 'Cheniere\'s MLP; holds the Sabine Pass assets.' } },
          { symbol: 'NFE', name: 'New Fortress Energy', note: { zh: 'LNG+发电一体化，主营拉美和加勒比小型LNG分销。', en: 'Integrated LNG + power generation; small-scale LNG in LatAm and Caribbean.' } },
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
          { symbol: 'FSLR', name: 'First Solar', note: { zh: '美国最大薄膜光伏组件商，IRA最大受益方之一。', en: 'Largest US thin-film solar module maker; major IRA beneficiary.' } },
          { symbol: 'ENPH', name: 'Enphase Energy', note: { zh: '住宅光伏微逆变器与电池储能龙头。', en: 'Leader in residential microinverters and battery storage.' } },
          { symbol: 'RUN', name: 'Sunrun', note: { zh: '美国最大住宅光伏租赁安装商。', en: 'Largest US residential solar lease and installation provider.' } },
          { symbol: 'ARRY', name: 'Array Technologies', note: { zh: '光伏跟踪器制造商，公用事业级光伏项目主要供应商。', en: 'Solar-tracker manufacturer; key supplier to utility-scale solar.' } },
          { symbol: 'NOVA', name: 'Sunnova Energy', note: { zh: '住宅光伏与储能融资平台，正面对利率与流动性压力。', en: 'Residential solar and storage financing platform; pressured by rates and liquidity.' } },
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
          { symbol: 'CCJ', name: 'Cameco', note: { zh: '全球最大上市铀矿生产商，加拿大铀矿龙头。', en: 'Largest publicly traded uranium miner; Canadian uranium leader.' } },
          { symbol: 'UEC', name: 'Uranium Energy', note: { zh: '美国本土铀矿生产商，ISR原地浸出工艺。', en: 'US domestic uranium producer; in-situ recovery (ISR) process.' } },
          { symbol: 'LEU', name: 'Centrus Energy', note: { zh: '美国铀浓缩与高富集低浓铀(HALEU)唯一商业化供应商。', en: 'Only commercial US uranium enricher and HALEU supplier.' } },
          { symbol: 'BTU', name: 'Peabody Energy', note: { zh: '美国最大煤炭生产商，冶金煤与动力煤并重。', en: 'Largest US coal producer; balanced met and thermal coal.' } },
          { symbol: 'ARCH', name: 'Arch Resources', note: { zh: '美国第二大煤炭生产商，专注冶金煤出口。', en: 'US #2 coal producer; focused on metallurgical coal exports.' } },
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
          { symbol: 'TSLA', name: 'Tesla', note: { zh: '全球EV龙头，AI/Robotaxi/Optimus机器人成为新估值驱动。', en: 'Global EV leader; AI / Robotaxi / Optimus are the new valuation drivers.' } },
          { symbol: 'GM', name: 'General Motors', note: { zh: '美国第一大整车厂，正调整EV节奏并加速回购。', en: 'Largest US OEM; adjusting EV cadence while ramping buybacks.' } },
          { symbol: 'F', name: 'Ford Motor', note: { zh: '美国第二大整车厂，皮卡F-150与商用车Pro业务是利润核心。', en: 'US #2 OEM; F-150 trucks and Ford Pro commercial drive profits.' } },
          { symbol: 'TM', name: 'Toyota Motor', note: { zh: '全球最大汽车制造商，混合动力技术先锋。', en: 'World\'s largest carmaker; hybrid powertrain pioneer.' } },
          { symbol: 'HMC', name: 'Honda Motor', note: { zh: '日本第二大整车厂，摩托车业务全球第一。', en: 'Japan\'s #2 OEM; world\'s largest motorcycle business.' } },
          { symbol: 'STLA', name: 'Stellantis', note: { zh: '由PSA与FCA合并而来，跨大西洋汽车集团(Jeep/Ram等)。', en: 'PSA + FCA merger; transatlantic auto group (Jeep, Ram, Peugeot...).' } },
          { symbol: 'RIVN', name: 'Rivian Automotive', note: { zh: '美国电动皮卡与商用车初创，与亚马逊深度绑定。', en: 'US EV pickup and commercial van startup; deep Amazon relationship.' } },
          { symbol: 'LCID', name: 'Lucid Group', note: { zh: '豪华电动车初创，受沙特PIF持股支持。', en: 'Luxury EV startup; backed by Saudi PIF.' } },
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
          { symbol: 'APTV', name: 'Aptiv', note: { zh: '汽车电气架构与ADAS零部件龙头，未来电动化重要受益方。', en: 'Auto electrical architecture and ADAS supplier; key EV beneficiary.' } },
          { symbol: 'MGA', name: 'Magna International', note: { zh: '加拿大汽车零部件巨头，整车代工(奔驰G/捷豹I-Pace)业务独特。', en: 'Canadian auto parts giant; uniquely also a contract assembler (G-Class, I-Pace).' } },
          { symbol: 'LEA', name: 'Lear', note: { zh: '汽车座椅与电气分销系统全球供应商。', en: 'Global supplier of automotive seating and electrical distribution.' } },
          { symbol: 'GT', name: 'Goodyear Tire & Rubber', note: { zh: '美国最大轮胎制造商，与汽车行业周期高度同步。', en: 'Largest US tire maker; tightly correlated with auto industry cycles.' } },
          { symbol: 'AZO', name: 'AutoZone', note: { zh: '美国最大汽车后市场连锁零售商，回购驱动型公司。', en: 'Largest US auto aftermarket retailer; buyback-driven compounder.' } },
          { symbol: 'ORLY', name: "O'Reilly Automotive", note: { zh: '汽车后市场专业渠道(DIFM)龙头，毛利率行业最高。', en: 'Leader in DIFM auto-aftermarket; industry-best gross margins.' } },
          { symbol: 'AAP', name: 'Advance Auto Parts', note: { zh: '美国第三大汽车后市场连锁，正在大规模重组。', en: 'US #3 aftermarket chain; in the middle of a large-scale restructuring.' } },
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
          { symbol: 'NKE', name: 'Nike', note: { zh: '全球最大运动品牌，正进行DTC策略调整与产品创新。', en: 'World\'s largest athletic brand; recalibrating DTC strategy and product innovation.' } },
          { symbol: 'LULU', name: 'Lululemon Athletica', note: { zh: '高端瑜伽服饰品牌，北美增长放缓但国际市场仍快速扩张。', en: 'Premium athleisure brand; NA slowing but international still growing fast.' } },
          { symbol: 'ONON', name: 'On Holding', note: { zh: '瑞士跑鞋新锐品牌，DTC占比高且品牌势能强。', en: 'Swiss premium running brand; high DTC mix and strong brand momentum.' } },
          { symbol: 'DECK', name: 'Deckers Outdoor', note: { zh: 'HOKA跑鞋与UGG雪地靴双品牌，HOKA是高速增长引擎。', en: 'HOKA running + UGG boots dual brand; HOKA is the high-growth engine.' } },
          { symbol: 'VFC', name: 'VF Corp', note: { zh: 'Vans/The North Face/Timberland多品牌组合，正在重组。', en: 'Vans / The North Face / Timberland portfolio; in turnaround mode.' } },
          { symbol: 'RL', name: 'Ralph Lauren', note: { zh: '美国高端服饰品牌，正进行品牌高端化与亚洲扩张。', en: 'American premium apparel brand; brand elevation plus Asia expansion.' } },
          { symbol: 'CROX', name: 'Crocs', note: { zh: '洞洞鞋经典品牌+HEYDUDE合并，强DTC定价能力。', en: 'Iconic clog brand + HEYDUDE acquisition; strong DTC pricing power.' } },
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
          { symbol: 'MCD', name: "McDonald's", note: { zh: '全球最大快餐连锁，特许经营模式现金流稳健。', en: 'World\'s largest QSR; franchise model delivers steady cash flow.' } },
          { symbol: 'SBUX', name: 'Starbucks', note: { zh: '全球最大咖啡连锁，正进行新CEO Niccol领导的运营改造。', en: 'World\'s largest coffee chain; new CEO Niccol leading an operational reset.' } },
          { symbol: 'CMG', name: 'Chipotle Mexican Grill', note: { zh: '美国Fast-Casual墨西哥菜龙头，同店增长行业领先。', en: 'US fast-casual Mexican leader; SSS growth tops the industry.' } },
          { symbol: 'YUM', name: 'Yum! Brands', note: { zh: 'KFC+必胜客+塔可贝尔多品牌，全球轻资产特许经营。', en: 'KFC + Pizza Hut + Taco Bell; asset-light global franchising.' } },
          { symbol: 'QSR', name: 'Restaurant Brands', note: { zh: 'Burger King+Tim Hortons+Popeyes+Firehouse Subs多品牌。', en: 'Burger King + Tim Hortons + Popeyes + Firehouse Subs platform.' } },
          { symbol: 'DPZ', name: "Domino's Pizza", note: { zh: '全球最大披萨连锁，技术与外送物流领先。', en: 'World\'s largest pizza chain; technology and delivery logistics edge.' } },
          { symbol: 'WING', name: 'Wingstop', note: { zh: '鸡翅快餐龙头，特许经营+数字化点单转化亮眼。', en: 'Chicken wing QSR leader; franchise + digital ordering shine.' } },
          { symbol: 'CAVA', name: 'CAVA Group', note: { zh: '地中海fast-casual新锐，"下一代Chipotle"概念。', en: 'Mediterranean fast-casual upstart; "the next Chipotle" narrative.' } },
          { symbol: 'DRI', name: 'Darden Restaurants', note: { zh: 'Olive Garden+LongHorn等casual dining多品牌龙头。', en: 'Casual-dining portfolio (Olive Garden + LongHorn + others).' } },
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
          { symbol: 'HD', name: 'Home Depot', note: { zh: '美国最大家居建材零售商，专业承包商业务比重持续提升。', en: 'Largest US home-improvement retailer; pro contractor mix rising.' } },
          { symbol: 'LOW', name: "Lowe's Companies", note: { zh: '美国第二大家居建材零售商，主营DIY消费者市场。', en: 'US #2 home-improvement retailer; DIY consumer focused.' } },
          { symbol: 'FND', name: 'Floor & Decor', note: { zh: '硬地板专业仓储零售商，市占率持续提升。', en: 'Specialty warehouse retailer for hard-surface flooring; share gainer.' } },
          { symbol: 'TSCO', name: 'Tractor Supply', note: { zh: '农村生活方式连锁零售，宠物与家畜用品是核心。', en: 'Rural-lifestyle chain; pet and livestock supplies anchor sales.' } },
          { symbol: 'BLDR', name: 'Builders FirstSource', note: { zh: '美国最大建材分销商，住宅新建筑核心供应商。', en: 'Largest US building-materials distributor; key supplier to new-home construction.' } },
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
          { symbol: 'TJX', name: 'TJX Companies', note: { zh: 'T.J. Maxx/Marshalls/HomeGoods母公司，品牌折扣零售龙头。', en: 'Parent of T.J. Maxx / Marshalls / HomeGoods; off-price retail leader.' } },
          { symbol: 'ROST', name: 'Ross Stores', note: { zh: '美国第二大品牌折扣零售连锁，西海岸大本营。', en: 'US #2 off-price retailer; West Coast stronghold.' } },
          { symbol: 'BURL', name: 'Burlington Stores', note: { zh: '美国第三大品牌折扣零售商，正进行运营效率改造。', en: 'US #3 off-price retailer; in the middle of an operational reset.' } },
          { symbol: 'FIVE', name: 'Five Below', note: { zh: '面向青少年的5美元以下折扣零售商。', en: 'Discount retailer for teens, priced under $5.' } },
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
          { symbol: 'TGT', name: 'Target', note: { zh: '美国大众百货龙头，自有品牌占比高。', en: 'Mass-market US general merchandise retailer; high private-label mix.' } },
          { symbol: 'BBY', name: 'Best Buy', note: { zh: '美国最大消费电子连锁，AI PC换机周期是当前催化。', en: 'Largest US consumer electronics retailer; AI PC refresh is the catalyst.' } },
          { symbol: 'ULTA', name: 'Ulta Beauty', note: { zh: '美国最大美妆专业零售商，高端+大众两端通吃。', en: 'Largest US beauty specialty retailer; spans prestige and mass.' } },
          { symbol: 'CVNA', name: 'Carvana', note: { zh: '在线二手车零售商，已从破产边缘大幅反弹。', en: 'Online used-car retailer; back from the brink of bankruptcy.' } },
          { symbol: 'KMX', name: 'CarMax', note: { zh: '美国最大二手车连锁零售商。', en: 'Largest US used-car retailer.' } },
          { symbol: 'GPS', name: 'Gap', note: { zh: 'Gap/Old Navy/Banana Republic/Athleta多品牌服装零售。', en: 'Multi-brand apparel retailer (Gap / Old Navy / Banana Republic / Athleta).' } },
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
          { symbol: 'AMZN', name: 'Amazon', note: { zh: '全球最大电商+云计算AWS+广告业务，AI驱动多业务增长。', en: 'Largest global e-commerce + AWS cloud + ads; AI drives all three.' } },
          { symbol: 'BABA', name: 'Alibaba', note: { zh: '中国最大电商集团，云计算与AI是新增长引擎。', en: 'Largest Chinese e-commerce group; cloud and AI are the new engines.' } },
          { symbol: 'PDD', name: 'PDD Holdings', note: { zh: '拼多多+海外Temu平台，性价比电商模式高速扩张。', en: 'Pinduoduo + overseas Temu; value-priced e-commerce expanding fast.' } },
          { symbol: 'JD', name: 'JD.com', note: { zh: '中国第二大电商，自营物流与3C家电核心业务。', en: 'China\'s #2 e-commerce; first-party logistics and consumer electronics anchor.' } },
          { symbol: 'MELI', name: 'MercadoLibre', note: { zh: '拉丁美洲最大电商+金融科技平台。', en: 'Largest LatAm e-commerce + fintech platform.' } },
          { symbol: 'EBAY', name: 'eBay', note: { zh: '老牌C2C电商平台，正聚焦收藏品与奢侈品垂直市场。', en: 'Heritage C2C marketplace; pivoting to collectibles and luxury verticals.' } },
          { symbol: 'ETSY', name: 'Etsy', note: { zh: '手工艺与个性化商品电商，疫情后回归常态化增长。', en: 'Handmade and custom-goods marketplace; back to normalized growth post-COVID.' } },
          { symbol: 'CHWY', name: 'Chewy', note: { zh: '美国最大宠物电商，正向宠物医疗与保险扩张。', en: 'Largest US pet e-commerce; expanding into vet care and insurance.' } },
          { symbol: 'W', name: 'Wayfair', note: { zh: '美国最大家居电商，正进行降本提效与盈利能力修复。', en: 'Largest US home goods e-commerce; cutting costs to rebuild profitability.' } },
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
          { symbol: 'BKNG', name: 'Booking Holdings', note: { zh: '全球最大OTA(在线旅游)，欧洲市场基础+美洲扩张。', en: 'World\'s largest OTA; European base + Americas expansion.' } },
          { symbol: 'ABNB', name: 'Airbnb', note: { zh: '全球最大短租平台，正向"体验"产品扩张。', en: 'World\'s largest short-term rental platform; expanding into Experiences.' } },
          { symbol: 'EXPE', name: 'Expedia Group', note: { zh: '美国最大OTA集团，Expedia/Hotels.com/Vrbo多品牌组合。', en: 'Largest US OTA group; Expedia / Hotels.com / Vrbo portfolio.' } },
          { symbol: 'MAR', name: 'Marriott International', note: { zh: '全球最大连锁酒店集团，轻资产管理模式。', en: 'World\'s largest hotel chain; asset-light management model.' } },
          { symbol: 'HLT', name: 'Hilton Worldwide', note: { zh: '全球第二大连锁酒店集团，新中端品牌扩张迅速。', en: 'World\'s #2 hotel chain; new midscale brands scaling fast.' } },
          { symbol: 'H', name: 'Hyatt Hotels', note: { zh: '高端酒店连锁，并购Apple Leisure后度假酒店组合扩大。', en: 'Luxury / upper-upscale chain; Apple Leisure acquisition expanded resort portfolio.' } },
          { symbol: 'IHG', name: 'InterContinental Hotels', note: { zh: '英国洲际酒店集团，Holiday Inn等多品牌全球网络。', en: 'UK-based InterContinental hotels; global multi-brand network (Holiday Inn etc.).' } },
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
          { symbol: 'CCL', name: 'Carnival', note: { zh: '全球最大邮轮公司，债务重压下盈利复苏中。', en: 'World\'s largest cruise operator; restoring earnings under debt overhang.' } },
          { symbol: 'RCL', name: 'Royal Caribbean Group', note: { zh: '全球第二大邮轮公司，Icon系列大船拉动定价。', en: 'World\'s #2 cruise operator; Icon class ships lifting pricing.' } },
          { symbol: 'NCLH', name: 'Norwegian Cruise Line', note: { zh: '中型邮轮公司，奢华品牌Oceania与Regent是亮点。', en: 'Mid-cap cruise operator; Oceania and Regent are the luxury bright spots.' } },
          { symbol: 'LVS', name: 'Las Vegas Sands', note: { zh: '澳门与新加坡综合度假村龙头，已剥离拉斯维加斯业务。', en: 'Macau and Singapore integrated-resort leader; divested Las Vegas assets.' } },
          { symbol: 'WYNN', name: 'Wynn Resorts', note: { zh: '高端综合度假村，澳门与拉斯维加斯双业务。', en: 'Premium integrated resorts; Macau and Las Vegas exposure.' } },
          { symbol: 'MGM', name: 'MGM Resorts', note: { zh: '拉斯维加斯综合度假村龙头，BetMGM数字博彩业务加速。', en: 'Largest Las Vegas integrated-resort operator; BetMGM digital ramping.' } },
          { symbol: 'DKNG', name: 'DraftKings', note: { zh: '美国第二大体育博彩App，市场份额持续提升。', en: 'US #2 mobile sports-betting app; share gaining.' } },
          { symbol: 'FLUT', name: 'Flutter Entertainment', note: { zh: '全球最大体育博彩公司，旗下FanDuel是美国市场龙头。', en: 'World\'s largest sports-betting group; FanDuel leads the US market.' } },
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
          { symbol: 'DHI', name: 'D.R. Horton', note: { zh: '美国销量最大的住宅建造商，定位入门级和首次置业者。', en: 'Largest US homebuilder by volume; entry-level and first-time buyer focus.' } },
          { symbol: 'LEN', name: 'Lennar', note: { zh: '美国第二大住宅建造商，正轻资产化分拆土地资产。', en: 'US #2 homebuilder; moving asset-light via land spin-off.' } },
          { symbol: 'NVR', name: 'NVR', note: { zh: '轻资产土地期权模式建造商，ROIC行业最高。', en: 'Asset-light land-option homebuilder; industry-best ROIC.' } },
          { symbol: 'PHM', name: 'PulteGroup', note: { zh: '美国大型住宅建造商，业务跨越入门、改善与活跃成人三市场。', en: 'Major US builder spanning entry-level, move-up and active-adult segments.' } },
          { symbol: 'TOL', name: 'Toll Brothers', note: { zh: '美国最大豪宅建造商，高端市场定价能力强。', en: 'Largest US luxury homebuilder; strong pricing power at the high end.' } },
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
          { symbol: 'WMT', name: 'Walmart', note: { zh: '美国最大零售商，沃尔玛+山姆会员店+全球电商三轮齐发。', en: 'Largest US retailer; Walmart + Sam\'s Club + global e-commerce.' } },
          { symbol: 'COST', name: 'Costco Wholesale', note: { zh: '全球最大仓储会员制零售商，会员费是高质量利润核心。', en: 'World\'s largest warehouse club; membership fees are the high-quality profit core.' } },
          { symbol: 'BJ', name: 'BJ\'s Wholesale Club', note: { zh: '美国第三大仓储会员制零售商，主营美东市场。', en: 'US #3 warehouse club; East Coast focused.' } },
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
          { symbol: 'KR', name: 'Kroger', note: { zh: '美国最大连锁超市，与Albertsons合并案被法院叫停。', en: 'Largest US grocery chain; the Albertsons merger was blocked by courts.' } },
          { symbol: 'ACI', name: 'Albertsons Companies', note: { zh: '美国第二大连锁超市，Safeway旗下品牌之一。', en: 'US #2 grocery chain; parent of Safeway.' } },
          { symbol: 'SFM', name: 'Sprouts Farmers Market', note: { zh: '专注健康有机食品的连锁超市，同店增长持续领先。', en: 'Health and organic-focused grocer; consistently industry-leading SSS.' } },
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
          { symbol: 'KO', name: 'Coca-Cola', note: { zh: '全球最大软饮料品牌，全球瓶装系统是护城河。', en: 'World\'s largest soft drink brand; the global bottling system is the moat.' } },
          { symbol: 'PEP', name: 'PepsiCo', note: { zh: '可乐+休闲食品(Frito-Lay)+饮料一体化巨头。', en: 'Cola + Frito-Lay snacks + beverages integrated giant.' } },
          { symbol: 'KDP', name: 'Keurig Dr Pepper', note: { zh: 'K-Cup咖啡系统+Dr Pepper等饮料品牌组合。', en: 'K-Cup coffee system + Dr Pepper and other beverage brands.' } },
          { symbol: 'MNST', name: 'Monster Beverage', note: { zh: '全球最大能量饮料品牌之一，与可口可乐分销合作。', en: 'One of the world\'s top energy drink brands; distribution deal with Coca-Cola.' } },
          { symbol: 'CELH', name: 'Celsius Holdings', note: { zh: '健康概念能量饮料新锐，由百事分销支持快速放量。', en: 'Health-positioned energy drink upstart; Pepsi distribution accelerated the ramp.' } },
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
          { symbol: 'BUD', name: 'Anheuser-Busch InBev', note: { zh: '全球最大啤酒集团，Bud Light事件后份额持续修复中。', en: 'World\'s largest brewer; recovering share after the Bud Light controversy.' } },
          { symbol: 'STZ', name: 'Constellation Brands', note: { zh: 'Corona/Modelo美国进口商，Modelo已是美国第一啤酒品牌。', en: 'US importer of Corona/Modelo; Modelo is now the #1 US beer brand.' } },
          { symbol: 'DEO', name: 'Diageo', note: { zh: '全球最大烈酒集团，Johnnie Walker/Smirnoff/健力士多品牌。', en: 'World\'s largest spirits group; Johnnie Walker / Smirnoff / Guinness portfolio.' } },
          { symbol: 'TAP', name: 'Molson Coors Beverage', note: { zh: '美国第二大啤酒集团，Coors与Miller等品牌。', en: 'US #2 beer group; owns Coors and Miller franchises.' } },
          { symbol: 'SAM', name: 'Boston Beer', note: { zh: 'Samuel Adams与Truly苏打酒龙头，正向无酒精产品扩张。', en: 'Samuel Adams + Truly hard seltzer leader; expanding into non-alcoholic products.' } },
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
          { symbol: 'PM', name: 'Philip Morris International', note: { zh: '全球最大烟草公司，IQOS加热不燃烧产品全球领跑。', en: 'World\'s largest tobacco company; IQOS heat-not-burn leads globally.' } },
          { symbol: 'MO', name: 'Altria Group', note: { zh: 'Marlboro美国品牌持有人，正发展NJOY电子烟与口含烟。', en: 'Owns the Marlboro US brand; developing NJOY vapes and oral nicotine.' } },
          { symbol: 'BTI', name: 'British American Tobacco', note: { zh: '全球烟草巨头，强减害产品组合(Vuse电子烟、Glo加热烟)。', en: 'Global tobacco major; strong reduced-risk portfolio (Vuse vapes, Glo HnB).' } },
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
          { symbol: 'KHC', name: 'Kraft Heinz', note: { zh: '美国最大包装食品公司之一，巴菲特持股是关注点。', en: 'One of the largest US packaged-food companies; Buffett ownership in focus.' } },
          { symbol: 'GIS', name: 'General Mills', note: { zh: '美国包装食品老牌龙头，Cheerios/Yoplait/Pillsbury多品牌。', en: 'Heritage US packaged-food leader; Cheerios / Yoplait / Pillsbury portfolio.' } },
          { symbol: 'K', name: 'Kellanova', note: { zh: '原家乐氏拆分而来，主营国际零食业务，正被Mars收购。', en: 'Spin-off of Kellogg\'s; international snacks focus; being acquired by Mars.' } },
          { symbol: 'HSY', name: 'Hershey', note: { zh: '美国最大巧克力糖果商，可可豆价格上涨是当前最大逆风。', en: 'Largest US chocolate maker; record cocoa prices are the main headwind.' } },
          { symbol: 'MDLZ', name: 'Mondelez International', note: { zh: '全球最大零食与饼干公司，奥利奥与吉百利是核心品牌。', en: 'World\'s largest snacks and biscuits company; Oreo and Cadbury are flagship.' } },
          { symbol: 'CAG', name: 'Conagra Brands', note: { zh: '美国包装食品中型公司，冷冻食品(Birds Eye)与零食。', en: 'Mid-cap US packaged-food; frozen (Birds Eye) and snacks.' } },
          { symbol: 'HRL', name: 'Hormel Foods', note: { zh: '美国蛋白质与肉类加工品(SPAM/Skippy)多品牌龙头。', en: 'Multi-brand US protein and processed-meat leader (SPAM / Skippy).' } },
          { symbol: 'CPB', name: 'Campbell Soup', note: { zh: '美国汤品与零食(Pepperidge Farm)双业务，正并购Sovos。', en: 'US soups + Pepperidge Farm snacks; recent Sovos acquisition.' } },
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
          { symbol: 'PG', name: 'Procter & Gamble', note: { zh: '全球最大家居日用品公司，提价能力业内领先。', en: 'World\'s largest household and personal-care company; best-in-class pricing power.' } },
          { symbol: 'CL', name: 'Colgate-Palmolive', note: { zh: '全球最大口腔护理品牌(高露洁)，新兴市场敞口高。', en: 'World\'s leading oral-care brand (Colgate); high emerging-markets exposure.' } },
          { symbol: 'CLX', name: 'Clorox', note: { zh: '美国家居清洁与消毒品牌龙头(漂白水/卫生用品)。', en: 'Leading US cleaning and disinfection brand (bleach, sanitation products).' } },
          { symbol: 'CHD', name: 'Church & Dwight', note: { zh: 'Arm & Hammer小苏打母公司，多品牌组合稳健。', en: 'Owner of Arm & Hammer; resilient multi-brand portfolio.' } },
          { symbol: 'KMB', name: 'Kimberly-Clark', note: { zh: '纸品(Kleenex/Huggies)与个人卫生用品龙头。', en: 'Tissue (Kleenex / Huggies) and personal-hygiene leader.' } },
          { symbol: 'UL', name: 'Unilever', note: { zh: '英荷消费品巨头，正进行品牌组合精简与剥离冰淇淋业务。', en: 'Anglo-Dutch consumer giant; trimming portfolio and spinning off ice cream.' } },
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
          { symbol: 'EL', name: 'Estée Lauder', note: { zh: '全球最大高端美妆集团，中国免税复苏是估值核心。', en: 'World\'s largest prestige beauty group; China travel-retail recovery is the swing factor.' } },
          { symbol: 'COTY', name: 'Coty', note: { zh: '全球大众与高端香水龙头，多品牌组合。', en: 'Global mass-and-prestige fragrance leader with a multi-brand portfolio.' } },
          { symbol: 'ELF', name: 'e.l.f. Beauty', note: { zh: '高性价比美妆新锐，市占率持续提升的现象级品牌。', en: 'High-value mass-prestige beauty upstart; consistent share gainer.' } },
          { symbol: 'BBWI', name: 'Bath & Body Works', note: { zh: '美国家居香氛与个护连锁品牌。', en: 'US home fragrance and personal-care retail brand.' } },
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
          { symbol: 'ADM', name: 'Archer-Daniels-Midland', note: { zh: '全球最大农产品贸易与加工龙头之一。', en: 'One of the world\'s largest ag commodity traders and processors.' } },
          { symbol: 'BG', name: 'Bunge Global', note: { zh: '全球最大油籽加工与贸易公司，并购Viterra后规模翻倍。', en: 'World\'s largest oilseed processor and trader; the Viterra merger doubles scale.' } },
          { symbol: 'TSN', name: 'Tyson Foods', note: { zh: '美国最大肉类加工(鸡肉/牛肉/猪肉)综合公司。', en: 'Largest US integrated meat processor (chicken / beef / pork).' } },
          { symbol: 'PPC', name: 'Pilgrim\'s Pride', note: { zh: '美国第二大鸡肉生产商，巴西JBS控股。', en: 'US #2 chicken producer; controlled by Brazil\'s JBS.' } },
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
          { symbol: 'DG', name: 'Dollar General', note: { zh: '美国最大一元店连锁，正处于经营困境与组织重组中。', en: 'Largest US dollar-store chain; in the middle of an operational turnaround.' } },
          { symbol: 'DLTR', name: 'Dollar Tree', note: { zh: '美国第二大一元店，Family Dollar子业务正考虑剥离。', en: 'US #2 dollar store; considering a divestiture of the Family Dollar banner.' } },
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
          { symbol: 'TMUS', name: 'T-Mobile US', note: { zh: '美国第二大无线运营商，5G网络与FWA固定无线宽带快速放量。', en: 'US #2 wireless carrier; 5G network and FWA broadband scaling fast.' } },
          { symbol: 'VZ', name: 'Verizon Communications', note: { zh: '美国最大无线运营商，资本开支高峰已过，回归现金回报。', en: 'Largest US wireless carrier; capex peak past, returning cash to shareholders.' } },
          { symbol: 'T', name: 'AT&T', note: { zh: '美国第三大无线运营商，光纤宽带业务持续扩张。', en: 'US #3 wireless carrier; fiber broadband build continues to expand.' } },
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
          { symbol: 'CMCSA', name: 'Comcast', note: { zh: '美国最大有线电视与宽带运营商，NBCUniversal媒体业务支撑。', en: 'Largest US cable and broadband operator; NBCUniversal media supports earnings.' } },
          { symbol: 'CHTR', name: 'Charter Communications', note: { zh: '美国第二大有线宽带运营商(Spectrum品牌)。', en: 'US #2 cable broadband operator (Spectrum brand).' } },
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
          { symbol: 'AMT', name: 'American Tower', note: { zh: '全球最大铁塔REIT，海外业务比重高。', en: 'World\'s largest tower REIT; meaningful international exposure.' } },
          { symbol: 'CCI', name: 'Crown Castle', note: { zh: '美国第二大铁塔REIT，光纤业务正在剥离中。', en: 'US #2 tower REIT; divesting the fiber business.' } },
          { symbol: 'SBAC', name: 'SBA Communications', note: { zh: '美国第三大铁塔REIT，南美与南非市场布局。', en: 'US #3 tower REIT; LatAm and South Africa presence.' } },
          { symbol: 'IRDM', name: 'Iridium Communications', note: { zh: '低轨卫星通信运营商，紧急定位与航海航空通信。', en: 'LEO satellite communications operator; emergency / maritime / aviation comms.' } },
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
          { symbol: 'GOOGL', name: 'Alphabet (Class A)', note: { zh: 'Google搜索+YouTube+Android+云计算+Waymo自动驾驶。', en: 'Google Search + YouTube + Android + Cloud + Waymo.' } },
          { symbol: 'META', name: 'Meta Platforms', note: { zh: 'Facebook+Instagram+WhatsApp+Threads+Reality Labs(VR/AR)。', en: 'Facebook + Instagram + WhatsApp + Threads + Reality Labs (VR/AR).' } },
          { symbol: 'PINS', name: 'Pinterest', note: { zh: '视觉发现与购物平台，正向购物意图广告变现。', en: 'Visual discovery and shopping platform; monetizing shopping intent.' } },
          { symbol: 'SNAP', name: 'Snap', note: { zh: 'Snapchat青少年社交平台，AR与广告业务持续投入。', en: 'Snapchat — younger-demographic social platform; AR and ads keep getting investment.' } },
          { symbol: 'RDDT', name: 'Reddit', note: { zh: '上市社交论坛，AI数据授权与广告变现是新故事。', en: 'Newly public social forum; AI data licensing and ads are the new story.' } },
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
          { symbol: 'NFLX', name: 'Netflix', note: { zh: '全球最大流媒体平台，广告层与体育版权扩张。', en: 'World\'s largest streaming platform; expanding ad tier and sports rights.' } },
          { symbol: 'DIS', name: 'Walt Disney', note: { zh: 'Disney+流媒体+主题乐园+ESPN三业务一体化。', en: 'Disney+ streaming + theme parks + ESPN integrated franchise.' } },
          { symbol: 'WBD', name: 'Warner Bros. Discovery', note: { zh: '华纳兄弟与Discovery合并而来，Max流媒体与电影业务。', en: 'Warner-Discovery merger; Max streaming + movie studios.' } },
          { symbol: 'PARA', name: 'Paramount Global', note: { zh: 'Paramount+流媒体+CBS电视网+影业，正与Skydance合并。', en: 'Paramount+ streaming + CBS + film studios; merging with Skydance.' } },
          { symbol: 'FOXA', name: 'Fox', note: { zh: '新闻+体育+广播电视集团，与Disney未合并而保留的部分。', en: 'News + sports + broadcast TV group; remained independent of Disney.' } },
          { symbol: 'ROKU', name: 'Roku', note: { zh: '美国最大流媒体设备与CTV广告平台。', en: 'Largest US streaming-device maker and CTV ad platform.' } },
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
          { symbol: 'SPOT', name: 'Spotify Technology', note: { zh: '全球最大音乐流媒体平台，正大幅提升盈利能力。', en: 'World\'s largest music streaming platform; profitability ramping sharply.' } },
          { symbol: 'SIRI', name: 'SiriusXM Holdings', note: { zh: '美国卫星电台龙头，正向音频与车载流媒体扩张。', en: 'US satellite radio leader; expanding into audio and in-vehicle streaming.' } },
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
          { symbol: 'EA', name: 'Electronic Arts', note: { zh: '美国最大体育与FPS游戏发行商(FIFA/Madden/Battlefield)。', en: 'Largest US sports / FPS game publisher (EA Sports FC / Madden / Battlefield).' } },
          { symbol: 'TTWO', name: 'Take-Two Interactive', note: { zh: 'GTA与NBA 2K母公司，GTA VI上市临近。', en: 'Owner of GTA and NBA 2K franchises; GTA VI launch is imminent.' } },
          { symbol: 'RBLX', name: 'Roblox', note: { zh: '青少年UGC游戏平台，与现实经济模型相结合。', en: 'Youth UGC gaming platform with a real-world economy model.' } },
          { symbol: 'U', name: 'Unity Software', note: { zh: '全球最大游戏引擎(与Unreal并列)，正向AI广告变现转型。', en: 'World\'s largest game engine alongside Unreal; pivoting to AI ad monetization.' } },
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
          { symbol: 'TTD', name: 'The Trade Desk', note: { zh: '全球最大独立DSP需求方平台，CTV广告主要承接者。', en: 'World\'s largest independent DSP; primary beneficiary of CTV ad shift.' } },
          { symbol: 'APP', name: 'AppLovin', note: { zh: '移动游戏广告变现平台，AXON 2.0 AI算法驱动业绩爆发。', en: 'Mobile game ad monetization platform; AXON 2.0 AI engine has fueled explosive growth.' } },
          { symbol: 'MGNI', name: 'Magnite', note: { zh: '最大独立SSP供应方平台，CTV广告核心位置。', en: 'Largest independent SSP; entrenched in CTV advertising.' } },
          { symbol: 'PUBM', name: 'PubMatic', note: { zh: '独立SSP供应方平台，CTV与无cookie身份解决方案。', en: 'Independent SSP; cookieless identity and CTV solutions.' } },
          { symbol: 'CRTO', name: 'Criteo', note: { zh: '法国零售媒体广告与重定向广告平台。', en: 'France-based retail media and retargeting ad platform.' } },
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
          { symbol: 'ERIC', name: 'Ericsson', note: { zh: '瑞典电信设备龙头，与诺基亚共同主导5G RAN市场。', en: 'Swedish telecom equipment leader; co-dominant in 5G RAN with Nokia.' } },
          { symbol: 'NOK', name: 'Nokia', note: { zh: '芬兰电信设备龙头，5G光网络与企业网双业务。', en: 'Finnish telecom equipment leader; 5G + optical networking + enterprise.' } },
          { symbol: 'COMM', name: 'CommScope Holding', note: { zh: '美国宽带与无线基础设施设备制造商，债务压力下重组中。', en: 'US broadband and wireless infrastructure equipment; restructuring under debt overhang.' } },
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
          { symbol: 'NYT', name: 'New York Times', note: { zh: '美国最成功的数字订阅化媒体公司之一。', en: 'One of the most successful digital-subscription transitions in news media.' } },
          { symbol: 'NWSA', name: 'News Corp (Class A)', note: { zh: '默多克新闻集团，Dow Jones+REA+Realtor.com房产业务。', en: 'Murdoch news group; Dow Jones + REA + Realtor.com real-estate.' } },
          { symbol: 'OMC', name: 'Omnicom Group', note: { zh: '全球最大广告代理集团之一，正与IPG合并。', en: 'One of the largest global ad agency groups; merging with IPG.' } },
          { symbol: 'IPG', name: 'Interpublic Group', note: { zh: '全球第三大广告代理集团，正与Omnicom合并。', en: 'World\'s #3 ad agency group; merging with Omnicom.' } },
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
          { symbol: 'BA', name: 'Boeing', note: { zh: '美国最大商用飞机制造商，质量与安全危机修复中。', en: 'Largest US commercial airframer; recovering from quality and safety crises.' } },
          { symbol: 'RTX', name: 'RTX Corp', note: { zh: 'Pratt & Whitney发动机+Collins航电+Raytheon军工。', en: 'Pratt & Whitney engines + Collins avionics + Raytheon defense.' } },
          { symbol: 'GE', name: 'GE Aerospace', note: { zh: '全球最大商用航空发动机制造商，已完成业务分拆专精航空。', en: 'World\'s largest commercial aero-engine maker; pure-play after corporate split.' } },
          { symbol: 'TDG', name: 'TransDigm Group', note: { zh: '航空售后市场专精零部件商，定价能力极强。', en: 'Aerospace aftermarket specialty parts; exceptional pricing power.' } },
          { symbol: 'HEI', name: 'HEICO', note: { zh: '航空售后市场零部件并购整合者，FAA认证商品长期复利。', en: 'Aerospace aftermarket M&A consolidator; FAA-certified parts compound for decades.' } },
          { symbol: 'TXT', name: 'Textron', note: { zh: 'Cessna公务机+Bell直升机+特种车辆多元化业务。', en: 'Cessna business jets + Bell helicopters + specialty vehicles.' } },
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
          { symbol: 'LMT', name: 'Lockheed Martin', note: { zh: '美国最大国防承包商，F-35战斗机与导弹防御核心。', en: 'Largest US defense contractor; F-35 fighter and missile defense at the core.' } },
          { symbol: 'NOC', name: 'Northrop Grumman', note: { zh: 'B-21隐形轰炸机与陆基战略核武器主要承包商。', en: 'Prime contractor for the B-21 stealth bomber and land-based strategic nuclear systems.' } },
          { symbol: 'GD', name: 'General Dynamics', note: { zh: '美国国防巨头，弗吉尼亚级核潜艇+湾流公务机+地面装甲。', en: 'US defense major; Virginia-class subs + Gulfstream jets + ground combat.' } },
          { symbol: 'LHX', name: "L3Harris Technologies", note: { zh: '美国国防电子与通信龙头，已并购固体火箭推进商Aerojet。', en: 'Leader in defense electronics and comms; acquired Aerojet for solid rocket motors.' } },
          { symbol: 'HII', name: 'Huntington Ingalls', note: { zh: '美国最大军用造船公司，福特级航母与攻击潜艇核心。', en: 'Largest US military shipbuilder; Ford-class carriers and attack submarines.' } },
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
          { symbol: 'GEV', name: 'GE Vernova', note: { zh: 'GE分拆出的电力设备公司，全球电网投资周期最大受益方。', en: 'Spun out of GE; biggest beneficiary of the global grid investment cycle.' } },
          { symbol: 'ETN', name: 'Eaton', note: { zh: '全球电力管理设备龙头，AI数据中心与电网投资双轮。', en: 'Global power management leader; AI data-center demand plus grid capex.' } },
          { symbol: 'EMR', name: 'Emerson Electric', note: { zh: '工业自动化与流程控制龙头，软件转型(Aspen Tech)持续。', en: 'Industrial automation and process-control leader; software transition via Aspen Tech.' } },
          { symbol: 'ROK', name: 'Rockwell Automation', note: { zh: '美国最大工厂自动化设备商，回流投资周期受益方。', en: 'Largest US factory automation vendor; reshoring beneficiary.' } },
          { symbol: 'HON', name: 'Honeywell', note: { zh: '工业巨头，自动化+航空+能源+特种材料多元化业务。', en: 'Industrial conglomerate; automation + aerospace + energy + specialty materials.' } },
          { symbol: 'PH', name: 'Parker-Hannifin', note: { zh: '全球最大液压与运动控制设备商，并购Meggitt后航空业务扩大。', en: 'World\'s largest motion-control supplier; Meggitt acquisition deepened aerospace exposure.' } },
          { symbol: 'AME', name: 'AMETEK', note: { zh: '高端电子仪器与机电仪器组合，并购整合复利模式。', en: 'High-end electronic instruments and EMG; serial-acquirer compounder.' } },
          { symbol: 'IR', name: 'Ingersoll Rand', note: { zh: '工业压缩机与流体控制设备龙头，分布式发电AI数据中心受益。', en: 'Industrial compressors and flow control; benefits from distributed power and AI data centers.' } },
          { symbol: 'DOV', name: 'Dover', note: { zh: '多元化工业制造商，加油站与油泵业务正在快速增长。', en: 'Diversified industrial manufacturer; fueling-station and pump businesses growing fast.' } },
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
          { symbol: 'PWR', name: 'Quanta Services', note: { zh: '美国最大电力与通信基础设施承包商，电网升级直接受益。', en: 'Largest US electric and comms infrastructure contractor; direct grid-upgrade beneficiary.' } },
          { symbol: 'MTZ', name: 'MasTec', note: { zh: '通信+能源+电力基础设施综合工程承包商。', en: 'Integrated contractor for comms, energy and power infrastructure.' } },
          { symbol: 'J', name: 'Jacobs Solutions', note: { zh: '美国最大工程咨询公司之一，强国防与生命科学项目。', en: 'One of the largest US engineering consultancies; strong defense and life-sci backlog.' } },
          { symbol: 'ACM', name: 'AECOM', note: { zh: '美国最大基础设施工程咨询公司之一。', en: 'One of the largest US infrastructure engineering consultancies.' } },
          { symbol: 'FIX', name: 'Comfort Systems USA', note: { zh: '机电与HVAC专业承包商，数据中心与半导体厂建设核心。', en: 'Mechanical and HVAC contractor; core to data-center and fab construction.' } },
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
          { symbol: 'CAT', name: 'Caterpillar', note: { zh: '全球最大土方机械制造商，电力与矿山业务受益AI数据中心。', en: 'World\'s largest earthmoving equipment maker; power + mining benefit from AI data centers.' } },
          { symbol: 'DE', name: 'Deere & Co', note: { zh: '全球最大农业机械制造商，正向精准农业与自动驾驶拖拉机转型。', en: 'World\'s largest ag-equipment maker; pivoting to precision ag and autonomous tractors.' } },
          { symbol: 'AGCO', name: 'AGCO', note: { zh: '美国第二大农业机械制造商，欧洲市场基础雄厚。', en: 'US #2 ag-equipment maker; strong European base.' } },
          { symbol: 'OSK', name: 'Oshkosh', note: { zh: '专用车辆制造商，消防/军用/邮政邮车多业务。', en: 'Specialty vehicle maker; fire / military / postal franchises.' } },
          { symbol: 'PCAR', name: 'PACCAR', note: { zh: '全球第二大重卡制造商(Peterbilt/Kenworth/DAF品牌)。', en: 'World\'s #2 heavy truck maker (Peterbilt / Kenworth / DAF brands).' } },
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
          { symbol: 'UNP', name: 'Union Pacific', note: { zh: '美国最大一类铁路公司，覆盖美国西部网络。', en: 'Largest US Class I railroad; covers the western US network.' } },
          { symbol: 'CSX', name: 'CSX', note: { zh: '美国一类铁路公司，覆盖东部网络。', en: 'US Class I railroad; eastern US network.' } },
          { symbol: 'NSC', name: 'Norfolk Southern', note: { zh: '美国一类铁路公司，覆盖东部，正进行精益化改造。', en: 'US Class I railroad; eastern US, in the middle of an operational reset.' } },
          { symbol: 'CP', name: 'Canadian Pacific Kansas City', note: { zh: 'CP与KCS合并后，美加墨三国唯一直通铁路。', en: 'CP / KCS merger created the only single-line railroad spanning Canada-US-Mexico.' } },
          { symbol: 'CNI', name: 'Canadian National Railway', note: { zh: '加拿大最大铁路公司，加拿大三海岸+美国中部网络。', en: 'Largest Canadian railroad; three-coast Canadian + US central network.' } },
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
          { symbol: 'ODFL', name: 'Old Dominion Freight Line', note: { zh: '美国最大LTL零担货运商，服务质量与运营效率行业标杆。', en: 'Largest US LTL carrier; service quality and operational efficiency are best-in-class.' } },
          { symbol: 'JBHT', name: 'J.B. Hunt Transport', note: { zh: '美国最大多式联运承运商，与铁路深度合作。', en: 'Largest US intermodal carrier; deep partnerships with the rails.' } },
          { symbol: 'XPO', name: 'XPO', note: { zh: 'LTL承运商，分拆为多家公司后聚焦零担市场份额。', en: 'LTL carrier focused on share gains after spinning off other businesses.' } },
          { symbol: 'SAIA', name: 'Saia', note: { zh: '美国LTL承运商，正快速扩张服务网点。', en: 'US LTL carrier in rapid network expansion mode.' } },
          { symbol: 'KNX', name: 'Knight-Swift Transportation', note: { zh: '美国最大整车(TL)承运商。', en: 'Largest US truckload carrier.' } },
          { symbol: 'CHRW', name: 'C.H. Robinson Worldwide', note: { zh: '美国最大第三方物流(3PL)经纪商。', en: 'Largest US third-party logistics (3PL) broker.' } },
          { symbol: 'GXO', name: 'GXO Logistics', note: { zh: '全球最大纯电商仓储物流(契约物流)运营商。', en: 'World\'s largest pure-play contract logistics / e-commerce fulfillment operator.' } },
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
          { symbol: 'UPS', name: 'United Parcel Service', note: { zh: '美国最大快递包裹公司，正进行成本节省与重组。', en: 'Largest US parcel carrier; cost reductions and restructuring underway.' } },
          { symbol: 'FDX', name: 'FedEx', note: { zh: '美国第二大快递包裹公司，正合并Express与Ground业务。', en: 'US #2 parcel carrier; merging Express and Ground operations.' } },
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
          { symbol: 'DAL', name: 'Delta Air Lines', note: { zh: '美国第二大航空公司，高端客舱与忠诚度计划是利润核心。', en: 'US #2 airline; premium cabins and loyalty drive profitability.' } },
          { symbol: 'UAL', name: 'United Airlines', note: { zh: '美国第三大航空公司，国际航线网络全美最广。', en: 'US #3 airline; broadest international network among US carriers.' } },
          { symbol: 'AAL', name: 'American Airlines', note: { zh: '美国第一大航空公司，正修复管理与销售渠道问题。', en: 'Largest US airline; repairing management and distribution issues.' } },
          { symbol: 'LUV', name: 'Southwest Airlines', note: { zh: '美国最大低成本航空，正面临行动派股东与盈利能力挑战。', en: 'Largest US low-cost carrier; facing activist pressure and profitability challenges.' } },
          { symbol: 'ALK', name: 'Alaska Air', note: { zh: '美国西海岸航空公司，正完成与Hawaiian Air的合并。', en: 'US West Coast airline; closing the Hawaiian Air acquisition.' } },
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
          { symbol: 'UBER', name: 'Uber Technologies', note: { zh: '全球最大网约车与外卖一体化平台，自动驾驶布局深。', en: 'World\'s largest ride-hail + delivery platform; deep autonomous vehicle bets.' } },
          { symbol: 'LYFT', name: 'Lyft', note: { zh: '美国第二大网约车公司，新CEO推动盈利改善。', en: 'US #2 ride-hail company; new CEO driving profitability improvements.' } },
          { symbol: 'DASH', name: 'DoorDash', note: { zh: '美国最大外卖配送平台，正向广告与杂货扩张。', en: 'Largest US food-delivery platform; expanding into advertising and grocery.' } },
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
          { symbol: 'WM', name: 'Waste Management', note: { zh: '北美最大固废处理公司，正向沼气与回收业务投资。', en: 'Largest NA solid-waste company; investing in renewable natural gas and recycling.' } },
          { symbol: 'RSG', name: 'Republic Services', note: { zh: '北美第二大固废处理公司，业务结构与WM类似。', en: 'NA #2 solid-waste company; similar business model to WM.' } },
          { symbol: 'WCN', name: 'Waste Connections', note: { zh: '北美第三大固废处理公司，专注非核心市场。', en: 'NA #3 solid-waste company; focuses on secondary markets.' } },
          { symbol: 'GFL', name: 'GFL Environmental', note: { zh: '加拿大固废处理公司，正进行业务剥离降杠杆。', en: 'Canadian solid-waste company; divesting assets to deleverage.' } },
          { symbol: 'CWST', name: 'Casella Waste Systems', note: { zh: '美东北部地区固废处理商，并购整合策略稳健。', en: 'Northeast US solid-waste operator; steady tuck-in M&A strategy.' } },
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
          { symbol: 'FAST', name: 'Fastenal', note: { zh: '美国最大工业紧固件分销商，独特门店模式与VMI服务。', en: 'Largest US industrial fastener distributor; unique on-site store model.' } },
          { symbol: 'GWW', name: 'W.W. Grainger', note: { zh: '美国最大MRO维修保养工业品分销商。', en: 'Largest US MRO industrial distributor.' } },
          { symbol: 'WSO', name: 'Watsco', note: { zh: '美国最大HVAC分销商，受益气候变化与建筑改造。', en: 'Largest US HVAC distributor; benefits from climate-driven retrofit demand.' } },
          { symbol: 'URI', name: 'United Rentals', note: { zh: '北美最大工业设备租赁商，基建投资周期最大受益方。', en: 'Largest NA industrial equipment rental company; biggest infra capex beneficiary.' } },
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
          { symbol: 'TT', name: 'Trane Technologies', note: { zh: '全球最大商业HVAC暖通空调制造商，节能减排趋势受益方。', en: 'World\'s largest commercial HVAC maker; beneficiary of decarbonization trends.' } },
          { symbol: 'CARR', name: 'Carrier Global', note: { zh: 'Otis电梯之外的开利暖通空调，并购Viessmann后扩张欧洲。', en: 'Carrier HVAC business; the Viessmann acquisition deepens European presence.' } },
          { symbol: 'JCI', name: 'Johnson Controls International', note: { zh: '建筑技术与暖通空调解决方案龙头，正剥离住宅HVAC业务。', en: 'Building tech and HVAC solutions leader; divesting residential HVAC.' } },
          { symbol: 'AOS', name: 'A.O. Smith', note: { zh: '全球最大热水器制造商，强中国市场敞口。', en: 'World\'s largest water-heater maker; meaningful China exposure.' } },
          { symbol: 'MAS', name: 'Masco', note: { zh: '美国浴室与厨房产品(如Delta水龙头)龙头。', en: 'Leader in US plumbing fixtures (Delta faucets) and decorative architectural products.' } },
          { symbol: 'BLD', name: 'TopBuild', note: { zh: '美国最大住宅保温材料安装商。', en: 'Largest US residential insulation installer.' } },
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
