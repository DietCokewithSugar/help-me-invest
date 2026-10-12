'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { SunIcon, MoonIcon } from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompare } from '@/contexts/CompareContext';
import { withLocale } from '@/lib/locale-path';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onReset?: () => void;
}

/**
 * 顶部导航栏（参考 IBKR）：贴顶全宽、56px 高、底部 1px 分隔线。
 * 当前页面在导航项下方以品牌红下划线标示；主题与语言直接一键切换，
 * 不再藏在二级设置菜单里。移动端折叠为汉堡菜单，展开即显示，不做高度动画。
 */
export default function Header({ theme, toggleTheme, onReset }: HeaderProps) {
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
        if (!mobileMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMobileMenuOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
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

    const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

    const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon;
    const themeLabel = theme === 'dark' ? t.header.light : t.header.dark;

    return (
        <header ref={menuRef} className="sticky top-0 z-50 bg-panel border-b border-line">
            <div className="page-container flex h-14 items-center gap-6">
                <button
                    type="button"
                    onClick={handleLogoClick}
                    className="flex shrink-0 items-center gap-2.5"
                >
                    <Image
                        src="/logo.png"
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-sm object-cover"
                    />
                    <span className="text-[15px] font-semibold text-fg whitespace-nowrap">
                        {t.header.title}
                    </span>
                </button>

                <nav className="hidden lg:flex h-full items-stretch gap-1" aria-label="Primary">
                    {navLinks.map((link) => {
                        const active = isActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? 'page' : undefined}
                                className={`relative flex items-center gap-1.5 px-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    active
                                        ? 'border-brand text-fg'
                                        : 'border-transparent text-text-2 hover:text-fg'
                                }`}
                            >
                                {link.label}
                                {link.badge && link.badge > 0 ? (
                                    <span className="inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-sm bg-accent px-1 text-[11px] font-semibold text-pure-white font-mono">
                                        {link.badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                        className="btn-ghost !h-8 !px-2.5 !text-[13px] !font-medium"
                        aria-label={t.header.language}
                        title={t.header.language}
                    >
                        {locale === 'zh' ? 'EN' : '中文'}
                    </button>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="btn-ghost !h-8 !w-8 !p-0"
                        aria-label={themeLabel}
                        title={themeLabel}
                    >
                        <ThemeIcon size={16} />
                    </button>

                    <Link href={feedbackHref} className="hidden md:inline-flex btn-secondary !h-8 !px-3">
                        {t.header.contact}
                    </Link>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        className="lg:hidden btn-ghost !h-8 !w-8 !p-0"
                        aria-label={mobileMenuOpen ? t.header.closeMenu : t.header.openMenu}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-nav-sheet"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

            {mobileMenuOpen && (
                <nav id="mobile-nav-sheet" className="lg:hidden border-t border-line bg-panel" aria-label="Primary">
                    <div className="page-container py-2">
                        {[...navLinks, { href: feedbackHref, label: t.header.contact, badge: 0 }].map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex min-h-[44px] items-center justify-between border-l-2 px-3 text-sm font-medium ${
                                        active
                                            ? 'border-brand bg-hover text-fg'
                                            : 'border-transparent text-text-2 hover:bg-hover hover:text-fg'
                                    }`}
                                >
                                    <span>{link.label}</span>
                                    {link.badge && link.badge > 0 ? (
                                        <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-sm bg-accent px-1 text-[11px] font-semibold text-pure-white font-mono">
                                            {link.badge}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}
        </header>
    );
}
