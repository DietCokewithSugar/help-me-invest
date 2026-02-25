'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    FilterIcon,
    TrendingUpIcon,
    ScaleIcon,
    SunIcon,
    MoonIcon,
} from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompare } from '@/contexts/CompareContext';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onReset?: () => void;
    showContactModal: () => void;
}

export default function Header({
    theme,
    toggleTheme,
    onReset,
    showContactModal,
}: HeaderProps) {
    const router = useRouter();
    const { locale, setLocale, t } = useLanguage();
    const { companies: compareCompanies } = useCompare();

    const handleLogoClick = () => {
        if (onReset) {
            onReset();
        } else {
            router.push('/');
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <div className="mx-4 mt-4">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 glass-card backdrop-blur-2xl rounded-[20px]">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={handleLogoClick}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl overflow-hidden shadow-lg shadow-glacier-500/20 group-hover:shadow-glacier-500/40 transition-shadow">
                                    <Image
                                        src="/icon.png"
                                        alt="智投研究"
                                        width={44}
                                        height={44}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-glacier-500 to-gemini-blue opacity-40 blur-xl group-hover:opacity-60 transition-opacity" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-lg font-semibold text-white group-hover:text-glacier-400 transition-colors">{t.header.title}</h1>
                                <p className="text-xs text-mist-500 hidden sm:block">{t.header.subtitle}</p>
                            </div>
                        </div>

                        {/* 右侧操作区 */}
                        <div className="flex items-center gap-2">
                            {/* 公司筛选入口 */}
                            <Link
                                href="/companies"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title={t.header.companyFilter}
                            >
                                <FilterIcon size={18} className="text-glacier-500" />
                            </Link>

                            {/* 追踪功能入口 */}
                            <Link
                                href="/tracking"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title={t.header.tracking}
                            >
                                <TrendingUpIcon size={18} className="text-glacier-500" />
                            </Link>

                            {/* 公司对比入口 */}
                            <Link
                                href="/compare"
                                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title={t.compare.title}
                            >
                                <ScaleIcon size={18} className="text-glacier-500" />
                                {compareCompanies.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-glacier-500 text-[10px] font-bold text-white flex items-center justify-center">
                                        {compareCompanies.length}
                                    </span>
                                )}
                            </Link>

                            {/* 联系我们 - 微信图标 */}
                            <button
                                onClick={showContactModal}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer overflow-hidden"
                                title={t.header.contactUs}
                            >
                                <Image
                                    src="/images/wechat-logo.png"
                                    alt="WeChat"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            </button>

                            {/* 语言切换 */}
                            <button
                                onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer text-xs font-mono font-bold text-mist-300"
                                title={t.header.language}
                            >
                                {locale === 'zh' ? 'EN' : '中'}
                            </button>

                            {/* 主题切换 */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title={theme === 'dark' ? t.header.lightMode : t.header.darkMode}
                            >
                                {theme === 'dark' ? (
                                    <SunIcon size={18} className="text-mist-300" />
                                ) : (
                                    <MoonIcon size={18} className="text-mist-300" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
