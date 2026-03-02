'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
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
                        <div className="flex items-center gap-3 md:gap-5">
                            {/* Text nav links */}
                            <nav className="flex items-center gap-3 md:gap-5">
                                <Link href="/companies" className="text-[11px] md:text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                    {t.header.discover}
                                </Link>
                                <Link href="/tracking" className="text-[11px] md:text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                    {t.header.portfolio}
                                </Link>
                                <Link href="/industry" className="text-[11px] md:text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                    {t.header.industry}
                                </Link>
                                <Link href="/compare" className="relative text-[11px] md:text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                    {t.header.compare}
                                    {compareCompanies.length > 0 && (
                                        <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-glacier-500 text-[9px] font-bold text-white flex items-center justify-center">
                                            {compareCompanies.length}
                                        </span>
                                    )}
                                </Link>
                                <Link href="/asset-allocation" className="text-[11px] md:text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                    {t.header.allocation}
                                </Link>
                                <button onClick={showContactModal} className="text-[11px] md:text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                    {t.header.contact}
                                </button>
                            </nav>

                            {/* Separator */}
                            <div className="w-px h-5 bg-white/10" />

                            {/* Language + Theme toggles */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer text-xs font-mono font-bold text-mist-300"
                                    title={t.header.language}
                                >
                                    {locale === 'zh' ? 'EN' : '中'}
                                </button>
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
            </div>
        </header>
    );
}
