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

/**
 * Aptos-style floating pill navbar.
 *
 * Desktop: a single horizontally-centred pill containing logo · nav links
 *          (mono uppercase) · language toggle · theme toggle · primary CTA.
 *          The pill is `position: fixed` and never changes shape on scroll.
 *
 * Mobile : the same pill collapses to logo + theme + language + hamburger.
 *          Tapping the hamburger expands a dropdown sheet anchored to the
 *          pill, with the same nav links stacked vertically.
 */
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
        <header className="fixed top-3 md:top-5 left-0 right-0 z-50 px-3 md:px-6">
            <div
                ref={menuRef}
                // The pill container also hosts the mobile dropdown panel.
                // `rounded-pill` resolves to `min(width, height) / 2`, so the
                // moment the container grows tall enough to fit a vertical
                // menu the bottom corners curve inward by ~half-the-height
                // and start clipping menu-item text. Drop the radius to a
                // sane 24px while the mobile sheet is open. On `lg+` the
                // sheet never opens, so the pill stays a pill there.
                // `overflow-hidden` keeps the height transition clean and
                // prevents children from poking out of the rounded corners.
                className={`relative mx-auto w-full max-w-6xl glass-card overflow-hidden transition-[border-radius] duration-200 ${
                    mobileMenuOpen ? 'rounded-3xl lg:rounded-pill' : 'rounded-pill'
                }`}
            >
                <div className="flex items-center justify-between px-3 md:px-3 py-2">
                    {/* Logo */}
                    <button
                        type="button"
                        onClick={handleLogoClick}
                        className="group flex items-center gap-2.5 pl-1 pr-3 md:pr-4 py-1 rounded-pill hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <span className="relative inline-flex">
                            <span className="w-8 h-8 md:w-9 md:h-9 rounded-pill overflow-hidden ring-1 ring-white/15">
                                <Image
                                    src="/icon.png"
                                    alt="智投研究"
                                    width={36}
                                    height={36}
                                    className="w-full h-full object-cover"
                                />
                            </span>
                        </span>
                        <span className="hidden sm:flex flex-col leading-none">
                            <span className="font-serif text-[15px] md:text-base text-mist-100 group-hover:text-mist-50 transition-colors tracking-tight">
                                {t.header.title}
                            </span>
                        </span>
                    </button>

                    {/* Desktop nav (centered) */}
                    <nav className="hidden lg:flex items-center">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="relative px-3 xl:px-4 py-2 rounded-pill font-mono text-[11px] uppercase tracking-[0.12em] text-mist-300 hover:text-mist-50 hover:bg-white/5 transition-colors whitespace-nowrap"
                            >
                                {link.label}
                                {link.badge && link.badge > 0 ? (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-pill bg-glacier-500 text-[9px] font-bold text-obsidian flex items-center justify-center">
                                        {link.badge}
                                    </span>
                                ) : null}
                            </Link>
                        ))}
                        <Link
                            href={feedbackHref}
                            onClick={() => showContactModal?.()}
                            className="px-3 xl:px-4 py-2 rounded-pill font-mono text-[11px] uppercase tracking-[0.12em] text-mist-300 hover:text-mist-50 hover:bg-white/5 transition-colors whitespace-nowrap"
                        >
                            {t.header.contact}
                        </Link>
                    </nav>

                    {/* Right cluster: language · theme · CTA */}
                    <div className="flex items-center gap-1.5 md:gap-2">
                        {/* Language toggle */}
                        <button
                            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-pill border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer text-[10px] font-mono uppercase tracking-wider text-mist-200"
                            title={t.header.language}
                        >
                            {locale === 'zh' ? 'EN' : 'ZH'}
                        </button>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-9 h-9 rounded-pill border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer"
                            title={theme === 'dark' ? t.header.lightMode : t.header.darkMode}
                        >
                            {theme === 'dark' ? (
                                <SunIcon size={16} className="text-mist-200" />
                            ) : (
                                <MoonIcon size={16} className="text-mist-200" />
                            )}
                        </button>

                        {/* Mobile hamburger */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(prev => !prev)}
                            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-pill border border-white/10 hover:bg-white/5 transition-all"
                            aria-label={mobileMenuOpen ? t.header.closeMenu : t.header.openMenu}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="mobile-nav-sheet"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mist-200">
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

                        {/* Desktop primary CTA — pill */}
                        <Link
                            href={feedbackHref}
                            onClick={() => showContactModal?.()}
                            className="hidden xl:inline-flex pill-btn !py-2 !px-4 !text-[10px]"
                        >
                            {t.header.contact}
                        </Link>
                    </div>
                </div>

                {/* Mobile dropdown sheet */}
                <AnimatePresence initial={false}>
                    {mobileMenuOpen && (
                        <motion.div
                            id="mobile-nav-sheet"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="lg:hidden overflow-hidden"
                        >
                            {/* Horizontal padding is generous so menu items
                                clear the 24px corner radius on both sides;
                                pb-5 keeps the last row well clear of the
                                bottom curve. */}
                            <nav className="flex flex-col gap-0.5 px-4 pt-3 pb-5 border-t border-white/10 mt-1">
                                <div className="flex items-center justify-between px-1 pb-2">
                                    <span className="mono-kicker">Menu</span>
                                    <button
                                        type="button"
                                        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                                        className="inline-flex items-center justify-center min-w-[44px] h-8 px-3 rounded-pill border border-white/10 hover:bg-white/5 text-[10px] font-mono uppercase tracking-wider text-mist-200"
                                        aria-label={t.header.language}
                                    >
                                        {locale === 'zh' ? 'EN' : 'ZH'}
                                    </button>
                                </div>
                                {navLinks.map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center justify-between gap-3 px-3 py-3 min-h-[44px] rounded-md text-sm font-mono uppercase tracking-[0.1em] text-mist-300 hover:text-mist-50 hover:bg-white/5 transition-colors"
                                    >
                                        <span className="truncate">{link.label}</span>
                                        {link.badge && link.badge > 0 ? (
                                            <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-pill bg-glacier-500 text-[10px] font-bold text-obsidian">
                                                {link.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                ))}
                                <Link
                                    href={feedbackHref}
                                    onClick={() => { showContactModal?.(); setMobileMenuOpen(false); }}
                                    className="flex items-center px-3 py-3 min-h-[44px] rounded-md text-sm font-mono uppercase tracking-[0.1em] text-mist-300 hover:text-mist-50 hover:bg-white/5 transition-colors text-left"
                                >
                                    <span className="truncate">{t.header.contact}</span>
                                </Link>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
}
