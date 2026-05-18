'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SunIcon,
    MoonIcon,
} from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompare } from '@/contexts/CompareContext';
import { withLocale } from '@/lib/locale-path';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onReset?: () => void;
    /**
     * Legacy prop kept for back-compat with the old "Contact" modal. The
     * navigation now always points to /feedback; this callback (if provided)
     * runs in addition to the navigation, e.g. for analytics.
     */
    showContactModal?: () => void;
}

export default function Header({
    theme,
    toggleTheme,
    onReset,
    showContactModal,
}: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { locale, setLocale, t } = useLanguage();
    const { companies: compareCompanies } = useCompare();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMobileMenuOpen(false);
            }
        };
        if (mobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    const handleLogoClick = () => {
        if (onReset) {
            onReset();
        } else {
            router.push(withLocale(locale, '/'));
        }
    };

    const navLinks = [
        { href: withLocale(locale, '/companies'), label: t.header.discover },
        { href: withLocale(locale, '/tracking'), label: t.header.portfolio },
        { href: withLocale(locale, '/industry'), label: t.header.industry },
        { href: withLocale(locale, '/compare'), label: t.header.compare, badge: compareCompanies.length },
        { href: withLocale(locale, '/asset-allocation'), label: t.header.allocation },
    ];
    const feedbackHref = withLocale(locale, '/feedback');

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <div className="mx-4 mt-4">
                <div ref={menuRef} className="max-w-7xl mx-auto px-4 md:px-6 py-4 glass-card backdrop-blur-2xl rounded-[20px] relative">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-3 cursor-pointer group shrink-0"
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

                        {/* Desktop nav */}
                        <div className="hidden lg:flex items-center gap-3 md:gap-5">
                            <nav className="flex items-center gap-3 md:gap-5">
                                {navLinks.map(link => (
                                    <Link key={link.href} href={link.href} className="relative text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap">
                                        {link.label}
                                        {link.badge && link.badge > 0 ? (
                                            <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-glacier-500 text-[9px] font-bold text-white flex items-center justify-center">
                                                {link.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                ))}
                                <Link
                                    href={feedbackHref}
                                    onClick={() => showContactModal?.()}
                                    className="text-sm text-mist-400 hover:text-glacier-400 transition-colors whitespace-nowrap"
                                >
                                    {t.header.contact}
                                </Link>
                            </nav>

                            <div className="w-px h-5 bg-white/10" />

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

                        {/* Mobile controls */}
                        <div className="flex lg:hidden items-center gap-2">
                            <button
                                onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-mono font-bold text-mist-300"
                            >
                                {locale === 'zh' ? 'EN' : '中'}
                            </button>
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            >
                                {theme === 'dark' ? (
                                    <SunIcon size={16} className="text-mist-300" />
                                ) : (
                                    <MoonIcon size={16} className="text-mist-300" />
                                )}
                            </button>
                            <button
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                aria-label="Toggle menu"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mist-300">
                                    {mobileMenuOpen ? (
                                        <>
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </>
                                    ) : (
                                        <>
                                            <line x1="4" y1="7" x2="20" y2="7" />
                                            <line x1="4" y1="12" x2="20" y2="12" />
                                            <line x1="4" y1="17" x2="20" y2="17" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile dropdown menu */}
                    <AnimatePresence>
                        {mobileMenuOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="lg:hidden overflow-hidden"
                            >
                                <nav className="flex flex-col gap-1 pt-4 mt-4 border-t border-white/10">
                                    {navLinks.map(link => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-mist-400 hover:text-glacier-400 hover:bg-white/5 transition-colors"
                                        >
                                            <span>{link.label}</span>
                                            {link.badge && link.badge > 0 ? (
                                                <span className="w-5 h-5 rounded-full bg-glacier-500 text-[10px] font-bold text-white flex items-center justify-center">
                                                    {link.badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    ))}
                                    <Link
                                        href={feedbackHref}
                                        onClick={() => { showContactModal?.(); setMobileMenuOpen(false); }}
                                        className="flex items-center px-3 py-2.5 rounded-md text-sm text-mist-400 hover:text-glacier-400 hover:bg-white/5 transition-colors text-left"
                                    >
                                        {t.header.contact}
                                    </Link>
                                </nav>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
