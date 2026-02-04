'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    LogoIcon,
    FilterIcon,
    TrendingUpIcon,
    SunIcon,
    MoonIcon,
} from '@/components/Icons';

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
    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <div className="mx-4 mt-4">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 glass-card backdrop-blur-2xl rounded-[20px]">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={onReset}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-glacier-500 to-gemini-blue flex items-center justify-center shadow-lg shadow-glacier-500/20 group-hover:shadow-glacier-500/40 transition-shadow">
                                    <LogoIcon size={24} className="text-white" />
                                </div>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-glacier-500 to-gemini-blue opacity-40 blur-xl group-hover:opacity-60 transition-opacity" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-lg font-semibold text-white group-hover:text-glacier-400 transition-colors">智投研究</h1>
                                <p className="text-xs text-mist-500 hidden sm:block">AI Investment Research</p>
                            </div>
                        </div>

                        {/* 右侧操作区 */}
                        <div className="flex items-center gap-2">
                            {/* 公司筛选入口 */}
                            <Link
                                href="/companies"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title="公司筛选"
                            >
                                <FilterIcon size={18} className="text-glacier-500" />
                            </Link>

                            {/* 追踪功能入口 */}
                            <Link
                                href="/tracking"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title="追踪"
                            >
                                <TrendingUpIcon size={18} className="text-glacier-500" />
                            </Link>

                            {/* 联系我们 - 微信图标 */}
                            <button
                                onClick={showContactModal}
                                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer overflow-hidden"
                                title="联系我们"
                            >
                                <Image
                                    src="/images/wechat-logo.png"
                                    alt="微信"
                                    fill
                                    className="object-cover"
                                />
                            </button>

                            {/* 主题切换 */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                                title={theme === 'dark' ? '切换到亮色模式' : '切换到深色模式'}
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
