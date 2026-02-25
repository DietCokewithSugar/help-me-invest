'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import CompanyOverviewModal from '@/components/CompanyOverviewModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateDiagnosticTag } from '@/i18n/diagnosticTags';
import {
    SearchIcon,
    FilterIcon,
    TrendingUpIcon,
    ChevronDownIcon,
    LogoIcon,
    XIcon,
} from '@/components/Icons';
import type { CompanyDiagnostic, CompanyFilterRequest } from '@/types';

// 7个维度的选项
const DIMENSION_OPTIONS = {
    strategicPositioning: {
        label: '企业战略定位',
        options: [
            { value: '开拓者', label: '开拓者', desc: '增长优先，全力扩张' },
            { value: '稳固者', label: '稳固者', desc: '守成为主，追求稳健' },
            { value: '分红者', label: '分红者', desc: '回报股东，高分红' },
        ],
    },
    marketCapSize: {
        label: '目前市场体量',
        options: [
            { value: '实力股', label: '实力股', desc: '大盘/蓝筹' },
            { value: '潜力股', label: '潜力股', desc: '中盘/成长' },
            { value: '弹簧股', label: '弹簧股', desc: '小盘/微盘' },
        ],
    },
    cyclicalNature: {
        label: '周期特性',
        options: [
            { value: '防御型', label: '防御型', desc: '需求稳定' },
            { value: '周期型', label: '周期型', desc: '随经济波动' },
            { value: '探险型', label: '探险型', desc: '依赖创新' },
        ],
    },
    cashFlowStatus: {
        label: '当前资金状况',
        options: [
            { value: '健康型', label: '健康型', desc: '现金流充沛' },
            { value: '贫血型', label: '贫血型', desc: '需要外部输血' },
        ],
    },
    debtStructure: {
        label: '当前债务结构',
        options: [
            { value: '轻装型', label: '轻装型', desc: '负债率低' },
            { value: '平衡型', label: '平衡型', desc: '合理杠杆' },
            { value: '背债型', label: '背债型', desc: '负债率高' },
        ],
    },
    externalSensitivity: {
        label: '外部敏感点',
        options: [
            { value: '政策型', label: '政策型', desc: '受政策影响大' },
            { value: '汇率型', label: '汇率型', desc: '受汇率影响大' },
            { value: '内功型', label: '内功型', desc: '内部驱动为主' },
        ],
    },
    profitModel: {
        label: '盈利模式',
        options: [
            { value: '薄利多销型', label: '薄利多销型', desc: '低毛利高周转' },
            { value: '高利少销型', label: '高利少销型', desc: '高毛利高净利' },
            { value: '坐地收租型', label: '坐地收租型', desc: '垄断地位稳定收益' },
            { value: '烧钱圈地型', label: '烧钱圈地型', desc: '补贴换市场' },
        ],
    },
};

const DIMENSION_VALUE_KEY_MAP: Record<string, string> = {
    '开拓者': 'pioneer',
    '稳固者': 'stabilizer',
    '分红者': 'dividend',
    '实力股': 'largeCap',
    '潜力股': 'midCap',
    '弹簧股': 'smallCap',
    '防御型': 'defensive',
    '周期型': 'cyclical',
    '探险型': 'adventurous',
    '健康型': 'healthy',
    '贫血型': 'anemic',
    '轻装型': 'light',
    '平衡型': 'balanced',
    '背债型': 'heavy',
    '政策型': 'policy',
    '汇率型': 'forex',
    '内功型': 'internal',
    '薄利多销型': 'thinMargin',
    '高利少销型': 'highMargin',
    '坐地收租型': 'rentSeeking',
    '烧钱圈地型': 'cashBurn',
};

// 行业板块选项（中英文映射）
const SECTOR_OPTIONS = [
    { value: 'Basic Materials', label: '基础材料' },
    { value: 'Communication Services', label: '通信服务' },
    { value: 'Consumer Cyclical', label: '可选消费' },
    { value: 'Consumer Defensive', label: '必需消费' },
    { value: 'Energy', label: '能源' },
    { value: 'Financial Services', label: '金融服务' },
    { value: 'Healthcare', label: '医疗保健' },
    { value: 'Industrials', label: '工业' },
    { value: 'Real Estate', label: '房地产' },
    { value: 'Technology', label: '科技' },
    { value: 'Utilities', label: '公用事业' },
];

// 细分行业选项（中英文映射）
const INDUSTRY_OPTIONS = [
    // Basic Materials
    { value: 'Steel', label: '钢铁' },
    { value: 'Silver', label: '白银' },
    { value: 'Other Precious Metals', label: '其他贵金属' },
    { value: 'Gold', label: '黄金' },
    { value: 'Copper', label: '铜' },
    { value: 'Aluminum', label: '铝' },
    { value: 'Paper, Lumber & Forest Products', label: '纸张、木材与林产品' },
    { value: 'Industrial Materials', label: '工业材料' },
    { value: 'Construction Materials', label: '建筑材料' },
    { value: 'Chemicals - Specialty', label: '特种化工' },
    { value: 'Chemicals', label: '化工' },
    { value: 'Agricultural Inputs', label: '农业投入品' },
    // Communication Services
    { value: 'Telecommunications Services', label: '电信服务' },
    { value: 'Internet Content & Information', label: '互联网内容与信息' },
    { value: 'Publishing', label: '出版' },
    { value: 'Broadcasting', label: '广播' },
    { value: 'Advertising Agencies', label: '广告代理' },
    { value: 'Entertainment', label: '娱乐' },
    // Consumer Cyclical
    { value: 'Travel Lodging', label: '旅游住宿' },
    { value: 'Travel Services', label: '旅游服务' },
    { value: 'Specialty Retail', label: '专业零售' },
    { value: 'Luxury Goods', label: '奢侈品' },
    { value: 'Home Improvement', label: '家装建材' },
    { value: 'Residential Construction', label: '住宅建筑' },
    { value: 'Department Stores', label: '百货商店' },
    { value: 'Personal Products & Services', label: '个人产品与服务' },
    { value: 'Leisure', label: '休闲' },
    { value: 'Gambling, Resorts & Casinos', label: '博彩、度假与赌场' },
    { value: 'Furnishings, Fixtures & Appliances', label: '家具、固定装置与电器' },
    { value: 'Restaurants', label: '餐饮' },
    { value: 'Auto - Parts', label: '汽车零部件' },
    { value: 'Auto - Manufacturers', label: '汽车制造商' },
    { value: 'Auto - Recreational Vehicles', label: '休闲车' },
    { value: 'Auto - Dealerships', label: '汽车经销商' },
    { value: 'Apparel - Retail', label: '服装零售' },
    { value: 'Apparel - Manufacturers', label: '服装制造' },
    { value: 'Apparel - Footwear & Accessories', label: '鞋类与配饰' },
    // Consumer Defensive
    { value: 'Packaging & Containers', label: '包装与容器' },
    { value: 'Tobacco', label: '烟草' },
    { value: 'Grocery Stores', label: '杂货店' },
    { value: 'Discount Stores', label: '折扣店' },
    { value: 'Household & Personal Products', label: '家居与个人用品' },
    { value: 'Packaged Foods', label: '包装食品' },
    { value: 'Food Distribution', label: '食品分销' },
    { value: 'Food Confectioners', label: '糖果食品' },
    { value: 'Agricultural Farm Products', label: '农产品' },
    { value: 'Education & Training Services', label: '教育培训服务' },
    { value: 'Beverages - Wineries & Distilleries', label: '葡萄酒与蒸馏酒' },
    { value: 'Beverages - Non-Alcoholic', label: '非酒精饮料' },
    { value: 'Beverages - Alcoholic', label: '酒精饮料' },
    // Energy
    { value: 'Uranium', label: '铀' },
    { value: 'Solar', label: '太阳能' },
    { value: 'Oil & Gas Refining & Marketing', label: '油气炼化与营销' },
    { value: 'Oil & Gas Midstream', label: '油气中游' },
    { value: 'Oil & Gas Integrated', label: '综合油气' },
    { value: 'Oil & Gas Exploration & Production', label: '油气勘探与生产' },
    { value: 'Oil & Gas Equipment & Services', label: '油气设备与服务' },
    { value: 'Oil & Gas Energy', label: '油气能源' },
    { value: 'Oil & Gas Drilling', label: '油气钻探' },
    { value: 'Coal', label: '煤炭' },
    // Financial Services
    { value: 'Shell Companies', label: '壳公司' },
    { value: 'Investment - Banking & Investment Services', label: '投资银行与服务' },
    { value: 'Insurance - Specialty', label: '专业保险' },
    { value: 'Insurance - Reinsurance', label: '再保险' },
    { value: 'Insurance - Property & Casualty', label: '财产与意外保险' },
    { value: 'Insurance - Life', label: '人寿保险' },
    { value: 'Insurance - Diversified', label: '多元化保险' },
    { value: 'Insurance - Brokers', label: '保险经纪' },
    { value: 'Financial - Mortgages', label: '抵押贷款' },
    { value: 'Financial - Diversified', label: '多元化金融' },
    { value: 'Financial - Data & Stock Exchanges', label: '金融数据与证券交易所' },
    { value: 'Financial - Credit Services', label: '信用服务' },
    { value: 'Financial - Conglomerates', label: '金融集团' },
    { value: 'Financial - Capital Markets', label: '资本市场' },
    { value: 'Banks - Regional', label: '区域银行' },
    { value: 'Banks - Diversified', label: '多元化银行' },
    { value: 'Banks', label: '银行' },
    { value: 'Asset Management', label: '资产管理' },
    { value: 'Asset Management - Bonds', label: '债券资管' },
    { value: 'Asset Management - Income', label: '收益型资管' },
    { value: 'Asset Management - Leveraged', label: '杠杆型资管' },
    { value: 'Asset Management - Cryptocurrency', label: '加密货币资管' },
    { value: 'Asset Management - Global', label: '全球资管' },
    // Healthcare
    { value: 'Medical - Specialties', label: '医疗专科' },
    { value: 'Medical - Pharmaceuticals', label: '医药' },
    { value: 'Medical - Instruments & Supplies', label: '医疗器械与耗材' },
    { value: 'Medical - Healthcare Plans', label: '医疗保健计划' },
    { value: 'Medical - Healthcare Information Services', label: '医疗信息服务' },
    { value: 'Medical - Equipment & Services', label: '医疗设备与服务' },
    { value: 'Medical - Distribution', label: '医药分销' },
    { value: 'Medical - Diagnostics & Research', label: '诊断与研究' },
    { value: 'Medical - Devices', label: '医疗设备' },
    { value: 'Medical - Care Facilities', label: '医疗护理设施' },
    { value: 'Drug Manufacturers - Specialty & Generic', label: '特种与仿制药制造商' },
    { value: 'Drug Manufacturers - General', label: '综合药品制造商' },
    { value: 'Biotechnology', label: '生物技术' },
    // Industrials
    { value: 'Waste Management', label: '废物管理' },
    { value: 'Trucking', label: '卡车运输' },
    { value: 'Railroads', label: '铁路' },
    { value: 'Aerospace & Defense', label: '航空航天与国防' },
    { value: 'Marine Shipping', label: '海运' },
    { value: 'Integrated Freight & Logistics', label: '综合货运与物流' },
    { value: 'Airlines, Airports & Air Services', label: '航空公司、机场与航空服务' },
    { value: 'General Transportation', label: '综合交通运输' },
    { value: 'Manufacturing - Tools & Accessories', label: '工具与配件制造' },
    { value: 'Manufacturing - Textiles', label: '纺织制造' },
    { value: 'Manufacturing - Miscellaneous', label: '其他制造' },
    { value: 'Manufacturing - Metal Fabrication', label: '金属制造' },
    { value: 'Industrial - Distribution', label: '工业分销' },
    { value: 'Industrial - Specialties', label: '工业专业' },
    { value: 'Industrial - Pollution & Treatment Controls', label: '污染与治理控制' },
    { value: 'Environmental Services', label: '环境服务' },
    { value: 'Industrial - Machinery', label: '工业机械' },
    { value: 'Industrial - Infrastructure Operations', label: '基础设施运营' },
    { value: 'Industrial - Capital Goods', label: '工业资本品' },
    { value: 'Consulting Services', label: '咨询服务' },
    { value: 'Business Equipment & Supplies', label: '商业设备与用品' },
    { value: 'Staffing & Employment Services', label: '人力资源服务' },
    { value: 'Rental & Leasing Services', label: '租赁服务' },
    { value: 'Engineering & Construction', label: '工程与建筑' },
    { value: 'Security & Protection Services', label: '安防服务' },
    { value: 'Specialty Business Services', label: '特种商业服务' },
    { value: 'Construction', label: '建筑' },
    { value: 'Conglomerates', label: '企业集团' },
    { value: 'Electrical Equipment & Parts', label: '电气设备与零件' },
    { value: 'Agricultural - Machinery', label: '农业机械' },
    { value: 'Agricultural - Commodities/Milling', label: '农业商品/研磨' },
    // Real Estate
    { value: 'REIT - Specialty', label: 'REIT-专业' },
    { value: 'REIT - Retail', label: 'REIT-零售' },
    { value: 'REIT - Residential', label: 'REIT-住宅' },
    { value: 'REIT - Office', label: 'REIT-办公' },
    { value: 'REIT - Mortgage', label: 'REIT-抵押' },
    { value: 'REIT - Industrial', label: 'REIT-工业' },
    { value: 'REIT - Hotel & Motel', label: 'REIT-酒店' },
    { value: 'REIT - Healthcare Facilities', label: 'REIT-医疗设施' },
    { value: 'REIT - Diversified', label: 'REIT-多元化' },
    { value: 'Real Estate - Services', label: '房地产服务' },
    { value: 'Real Estate - Diversified', label: '多元化房地产' },
    { value: 'Real Estate - Development', label: '房地产开发' },
    { value: 'Real Estate - General', label: '综合房地产' },
    // Technology
    { value: 'Information Technology Services', label: 'IT服务' },
    { value: 'Hardware, Equipment & Parts', label: '硬件设备与零件' },
    { value: 'Computer Hardware', label: '计算机硬件' },
    { value: 'Electronic Gaming & Multimedia', label: '电子游戏与多媒体' },
    { value: 'Software - Services', label: '软件服务' },
    { value: 'Software - Infrastructure', label: '基础软件' },
    { value: 'Software - Application', label: '应用软件' },
    { value: 'Semiconductors', label: '半导体' },
    { value: 'Media & Entertainment', label: '媒体与娱乐' },
    { value: 'Communication Equipment', label: '通信设备' },
    { value: 'Technology Distributors', label: '技术分销商' },
    { value: 'Consumer Electronics', label: '消费电子' },
    // Utilities
    { value: 'Renewable Utilities', label: '可再生能源公用事业' },
    { value: 'Regulated Water', label: '水务' },
    { value: 'Regulated Gas', label: '燃气' },
    { value: 'Regulated Electric', label: '电力' },
    { value: 'Independent Power Producers', label: '独立发电商' },
    { value: 'Diversified Utilities', label: '多元化公用事业' },
    { value: 'General Utilities', label: '综合公用事业' },
];

// 市值范围预设选项
const MARKET_CAP_RANGES = [
    { value: 'mega', label: '超大盘', desc: '>1000亿', min: 100000000000, max: undefined },
    { value: 'large', label: '大盘', desc: '100-1000亿', min: 10000000000, max: 100000000000 },
    { value: 'mid', label: '中盘', desc: '10-100亿', min: 1000000000, max: 10000000000 },
    { value: 'small', label: '小盘', desc: '1-10亿', min: 100000000, max: 1000000000 },
    { value: 'micro', label: '微盘', desc: '<1亿', min: undefined, max: 100000000 },
];

// 多选下拉列表组件
interface MultiSelectDropdownProps {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    selectAllLabel: string;
    deselectAllLabel: string;
    searchPlaceholder: string;
    selectedLabel: (count: number) => string;
    noMatchLabel: string;
}

function MultiSelectDropdown({ label, options, selected, onChange, selectAllLabel, deselectAllLabel, searchPlaceholder, selectedLabel, noMatchLabel }: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleSelectAll = () => {
        onChange(options.map(opt => opt.value));
    };

    const handleDeselectAll = () => {
        onChange([]);
    };

    const handleOpen = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm bg-white/5 border border-white/10 hover:border-white/20 text-text-primary transition-colors"
            >
                <span className="truncate">
                    {selected.length === 0
                        ? label
                        : selectedLabel(selected.length)}
                </span>
                <ChevronDownIcon
                    size={14}
                    className={`text-text-muted transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    {/* 点击外部关闭 */}
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: 9998 }}
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="glass-card rounded-sm border border-white/10 shadow-xl max-h-64 overflow-hidden"
                        style={{
                            position: 'absolute',
                            zIndex: 9999,
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                        }}
                    >
                        {/* 搜索框 */}
                        <div className="p-2 border-b border-white/5">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* 全选/全不选按钮 */}
                        <div className="flex gap-2 px-2 py-1.5 border-b border-white/5 bg-white/[0.02]">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                                className="text-[10px] text-accent hover:underline"
                            >
                                {selectAllLabel}
                            </button>
                            <span className="text-text-muted text-[10px]">|</span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeselectAll(); }}
                                className="text-[10px] text-text-muted hover:text-text-secondary"
                            >
                                {deselectAllLabel}
                            </button>
                        </div>

                        {/* 选项列表 */}
                        <div className="max-h-40 overflow-y-auto">
                            {filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleToggle(option.value); }}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${selected.includes(option.value) ? 'text-accent' : 'text-text-secondary'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${selected.includes(option.value)
                                        ? 'bg-accent border-accent'
                                        : 'border-white/20'
                                        }`}>
                                        {selected.includes(option.value) && (
                                            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))}
                            {filteredOptions.length === 0 && (
                                <div className="px-3 py-2 text-xs text-text-muted">{noMatchLabel}</div>
                            )}
                        </div>
                    </motion.div>
                </>,
                document.body
            )}
        </div>
    );
}

export default function CompaniesPage() {
    const router = useRouter();
    const { locale, t } = useLanguage();
    const [filters, setFilters] = useState<CompanyFilterRequest>({
        page: 1,
        limit: 50,
    });
    const [companies, setCompanies] = useState<CompanyDiagnostic[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [showContactModal, setShowContactModal] = useState(false);
    const [selectedMarketCapRange, setSelectedMarketCapRange] = useState<string | null>(null);

    // 公司概述浮窗状态
    const [selectedCompany, setSelectedCompany] = useState<CompanyDiagnostic | null>(null);
    const [showOverviewModal, setShowOverviewModal] = useState(false);

    // 初始化主题
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        const initialTheme = savedTheme || 'dark';
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    // 切换主题
    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // 获取筛选后的公司列表
    const fetchCompanies = useCallback(async (currentFilters: CompanyFilterRequest, query: string) => {
        setLoading(true);
        try {
            const requestBody = {
                ...currentFilters,
                searchQuery: query.trim() || undefined,
            };
            const response = await fetch('/api/companies/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            const data = await response.json();
            if (data.success) {
                setCompanies(data.data);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('获取公司列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 搜索防抖
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        searchTimerRef.current = setTimeout(() => {
            setFilters((prev) => ({ ...prev, page: 1 }));
            fetchCompanies({ ...filters, page: 1 }, value);
        }, 300);
    };

    // 初始加载 & 翻页
    useEffect(() => {
        fetchCompanies(filters, searchQuery);
    }, [filters.page]);

    // 应用筛选
    const applyFilters = () => {
        const newFilters = { ...filters, page: 1 };
        setFilters(newFilters);
        fetchCompanies(newFilters, searchQuery);
    };

    // 重置筛选
    const resetFilters = () => {
        const newFilters = { page: 1, limit: 50 };
        setFilters(newFilters);
        setSearchQuery('');
        setSelectedMarketCapRange(null);
        fetchCompanies(newFilters, '');
    };

    // 切换多选项
    const toggleFilter = (key: keyof CompanyFilterRequest, value: string) => {
        const currentValues = (filters[key] as string[]) || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];
        setFilters({ ...filters, [key]: newValues.length > 0 ? newValues : undefined });
    };

    // 选择市值范围
    const handleMarketCapRangeSelect = (rangeValue: string) => {
        if (selectedMarketCapRange === rangeValue) {
            // 取消选择
            setSelectedMarketCapRange(null);
            setFilters({ ...filters, marketCapMin: undefined, marketCapMax: undefined });
        } else {
            // 选中新范围
            setSelectedMarketCapRange(rangeValue);
            const range = MARKET_CAP_RANGES.find(r => r.value === rangeValue);
            if (range) {
                setFilters({ ...filters, marketCapMin: range.min, marketCapMax: range.max });
            }
        }
    };

    // 更新 sector 筛选
    const handleSectorsChange = (values: string[]) => {
        setFilters({ ...filters, sectors: values.length > 0 ? values : undefined });
    };

    // 更新 industry 筛选
    const handleIndustriesChange = (values: string[]) => {
        setFilters({ ...filters, industries: values.length > 0 ? values : undefined });
    };

    // 格式化市值
    const formatMarketCap = (marketCap: number | null) => {
        if (!marketCap) return 'N/A';
        if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
        return `$${marketCap.toFixed(0)}`;
    };

    // 导航到报告页面
    const handleGenerateReport = (symbol: string) => {
        router.push(`/?symbol=${symbol}`);
    };

    // 打开公司概述浮窗
    const handleOpenOverview = (company: CompanyDiagnostic) => {
        setSelectedCompany(company);
        setShowOverviewModal(true);
    };

    // 关闭公司概述浮窗
    const handleCloseOverview = () => {
        setShowOverviewModal(false);
        setSelectedCompany(null);
    };

    const translatedSectorOptions = SECTOR_OPTIONS.map(opt => ({
        ...opt,
        label: t.sectors[opt.value as keyof typeof t.sectors] || opt.label,
    }));

    return (
        <div className="min-h-screen bg-main-bg transition-colors duration-200">
            {/* Background Pattern */}
            <div className="fixed inset-0 bg-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

            {/* Header */}
            <Header
                theme={theme}
                toggleTheme={toggleTheme}
                onReset={() => router.push('/')}
                showContactModal={() => setShowContactModal(true)}
            />

            {/* Main Content */}
            <div className="pt-32 pb-12 px-4 md:px-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
                                {t.companies.title}
                            </h2>
                            <p className="text-text-secondary">
                                {t.companies.subtitle}
                            </p>
                        </div>
                        <div className="glass-card p-4 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-text-primary leading-none">{total}</div>
                                <div className="text-xs text-text-muted mt-1">{t.companies.matchingCompanies}</div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Section - Now Vertical */}
                    <div className="space-y-4">
                        <div className="glass-card rounded-sm border border-white/10 dark:border-white/10 light:border-black/10 overflow-hidden">
                            <button
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <FilterIcon size={16} />
                                    {t.companies.filterTitle}
                                </div>
                                <div className="flex items-center gap-4">
                                    <ChevronDownIcon
                                        size={16}
                                        className={`text-text-muted transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isFilterExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="p-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                                            {Object.entries(DIMENSION_OPTIONS).map(([key, config]) => {
                                                const isProfitModel = key === 'profitModel';
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`space-y-2 ${isProfitModel ? 'lg:col-span-2' : ''}`}
                                                    >
                                                        <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                                            {t.companies.dimensions[key as keyof typeof t.companies.dimensions]}
                                                        </h4>
                                                        <div className={`grid gap-2 ${isProfitModel
                                                            ? 'grid-cols-2 lg:grid-cols-4'
                                                            : 'grid-cols-2 lg:grid-cols-3'
                                                            }`}>
                                                            {config.options.map((option) => {
                                                                const isActive = (filters[key as keyof CompanyFilterRequest] as string[])?.includes(option.value);
                                                                const translationKey = DIMENSION_VALUE_KEY_MAP[option.value];
                                                                return (
                                                                    <button
                                                                        key={option.value}
                                                                        onClick={() => toggleFilter(key as keyof CompanyFilterRequest, option.value)}
                                                                        className={`px-2 py-1.5 rounded-sm text-xs transition-all border text-center ${isActive
                                                                            ? 'bg-accent/15 border-accent text-accent shadow-[0_0_8px_rgba(20,184,166,0.1)]'
                                                                            : 'bg-white/5 border-transparent text-text-muted hover:border-text-muted/30 hover:text-text-secondary hover:bg-white/10'
                                                                            }`}
                                                                    >
                                                                        {translationKey
                                                                            ? t.companies.dimensionValues[translationKey as keyof typeof t.companies.dimensionValues]
                                                                            : option.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* 新增筛选条件：市值范围、行业板块、细分行业 */}
                                        <div className="px-6 pb-4 border-t border-white/5 pt-4">
                                            <h4 className="text-[11px] font-bold text-accent uppercase tracking-wider mb-4">
                                                {t.companies.otherFilters}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* 市值范围 */}
                                                <div className="space-y-2">
                                                    <h5 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                                        {t.companies.marketCapUsd}
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {MARKET_CAP_RANGES.map((range) => {
                                                            const isActive = selectedMarketCapRange === range.value;
                                                            return (
                                                                <button
                                                                    key={range.value}
                                                                    onClick={() => handleMarketCapRangeSelect(range.value)}
                                                                    className={`px-2 py-1.5 rounded-sm text-xs transition-all border text-center ${isActive
                                                                        ? 'bg-accent/15 border-accent text-accent shadow-[0_0_8px_rgba(20,184,166,0.1)]'
                                                                        : 'bg-white/5 border-transparent text-text-muted hover:border-text-muted/30 hover:text-text-secondary hover:bg-white/10'
                                                                        }`}
                                                                    title={range.desc}
                                                                >
                                                                    {t.companies.marketCapRanges[range.value as keyof typeof t.companies.marketCapRanges]}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* 行业板块 */}
                                                <div className="space-y-2">
                                                    <h5 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                                        {t.companies.sectorLabel}
                                                    </h5>
                                                    <MultiSelectDropdown
                                                        label={t.companies.sectorPlaceholder}
                                                        options={translatedSectorOptions}
                                                        selected={filters.sectors || []}
                                                        onChange={handleSectorsChange}
                                                        selectAllLabel={t.companies.selectAll}
                                                        deselectAllLabel={t.companies.deselectAll}
                                                        searchPlaceholder={t.common.search + '...'}
                                                        selectedLabel={t.companies.selected}
                                                        noMatchLabel={t.companies.noMatch}
                                                    />
                                                </div>

                                                {/* 细分行业 */}
                                                <div className="space-y-2">
                                                    <h5 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                                        {t.companies.industryLabel}
                                                    </h5>
                                                    <MultiSelectDropdown
                                                        label={t.companies.industryPlaceholder}
                                                        options={INDUSTRY_OPTIONS}
                                                        selected={filters.industries || []}
                                                        onChange={handleIndustriesChange}
                                                        selectAllLabel={t.companies.selectAll}
                                                        deselectAllLabel={t.companies.deselectAll}
                                                        searchPlaceholder={t.common.search + '...'}
                                                        selectedLabel={t.companies.selected}
                                                        noMatchLabel={t.companies.noMatch}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end items-center gap-4">
                                            <button
                                                onClick={resetFilters}
                                                className="text-sm text-text-muted hover:text-text-primary transition-colors"
                                            >
                                                {t.common.reset}
                                            </button>
                                            <button
                                                onClick={applyFilters}
                                                disabled={loading}
                                                className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-sm font-medium text-sm transition-colors disabled:opacity-50"
                                            >
                                                {loading ? t.common.loading : t.common.apply}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder={t.companies.searchPlaceholder}
                                className="w-full pl-12 pr-4 py-4 glass-card border border-white/10 dark:border-white/10 light:border-black/10 rounded-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-text-muted font-mono animate-pulse">{t.companies.loadingData}</div>
                            </div>
                        ) : companies.length === 0 ? (
                            <div className="glass-card p-12 rounded-sm border border-white/10 text-center">
                                <div className="text-text-muted mb-4 font-mono">{t.companies.noResultsFound}</div>
                                <button
                                    onClick={resetFilters}
                                    className="text-sm text-accent hover:underline"
                                >
                                    {t.companies.resetFilters}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {companies.map((company) => (
                                        <motion.div
                                            key={company.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass-card p-5 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 hover:border-accent/50 transition-all group cursor-pointer relative overflow-hidden"
                                            onClick={() => handleOpenOverview(company)}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-text-primary mb-1 group-hover:text-accent transition-colors line-clamp-1">
                                                        {company.company_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-sm">{company.symbol}</span>
                                                        <span className="text-text-muted">•</span>
                                                        <span className="text-text-secondary truncate max-w-[150px]">{company.sector}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-mono font-bold text-text-primary">
                                                        {formatMarketCap(company.market_cap)}
                                                    </div>
                                                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Market Cap</div>
                                                </div>
                                            </div>

                                            {/* Diagnostic Tags */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {company.strategic_positioning && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-white/5 text-text-secondary border border-white/10">
                                                        {translateDiagnosticTag(company.strategic_positioning, locale)}
                                                    </span>
                                                )}
                                                {company.market_cap_size && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-white/5 text-text-secondary border border-white/10">
                                                        {translateDiagnosticTag(company.market_cap_size, locale)}
                                                    </span>
                                                )}
                                                {company.profit_model && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-white/5 text-text-secondary border border-white/10">
                                                        {translateDiagnosticTag(company.profit_model, locale)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-accent opacity-0 group-hover:opacity-100 transition-opacity border-t border-white/5 pt-3">
                                                <span className="font-bold uppercase tracking-tighter">{t.companies.viewReport}</span>
                                                <TrendingUpIcon size={12} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="glass-card p-4 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 flex items-center justify-between">
                                    <button
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                        disabled={(filters.page || 1) <= 1}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                                    >
                                        PREV
                                    </button>
                                    <div className="text-xs text-text-muted font-mono">
                                        PAGE {filters.page || 1} / {Math.ceil(total / (filters.limit || 50))}
                                    </div>
                                    <button
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                        disabled={(filters.page || 1) * (filters.limit || 50) >= total}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                                    >
                                        NEXT
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div >

            {/* 公司概述浮窗 */}
            <CompanyOverviewModal
                company={selectedCompany}
                isOpen={showOverviewModal}
                onClose={handleCloseOverview}
                currentFilters={filters}
                onCompanyChange={(newCompany) => setSelectedCompany(newCompany)}
            />

            {/* 联系我们弹窗 */}
            <AnimatePresence>
                {
                    showContactModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowContactModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative bg-gradient-to-br from-arctic-800 to-arctic-900 rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl max-w-sm mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* 关闭按钮 */}
                                <button
                                    onClick={() => setShowContactModal(false)}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <XIcon size={18} className="text-mist-400" />
                                </button>

                                {/* 标题 */}
                                <h3 className="text-xl font-semibold text-white mb-2 text-center">{t.home.contact.title}</h3>
                                <p className="text-sm text-mist-400 mb-6 text-center">{t.home.contact.scanQr}</p>

                                {/* 二维码图片 */}
                                <div className="flex justify-center">
                                    <img
                                        src="/wechat-qr.jpg"
                                        alt="微信二维码"
                                        className="w-64 h-64 object-cover rounded-lg"
                                    />
                                </div>

                                {/* 提示文字 */}
                                <p className="text-xs text-mist-500 mt-4 text-center">
                                    {t.home.contact.lookForward}
                                </p>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
