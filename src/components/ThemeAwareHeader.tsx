'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/lib/locale-path';

interface ThemeAwareHeaderProps {
  initialTheme?: 'dark' | 'light';
}

/**
 * Wraps <Header /> so the home server component (and any other server tree)
 * can mount the navigation without managing theme state inline. Theme is
 * persisted to both `localStorage` (client) and the `theme` cookie so the
 * server-rendered `<html data-theme>` stays in sync on the next request.
 */
export default function ThemeAwareHeader({ initialTheme }: ThemeAwareHeaderProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme || 'dark');
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('theme') as 'dark' | 'light' | null)
      : null);
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else if (initialTheme) {
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, [initialTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', next);
      } catch {
        // ignore
      }
      // Persist as a cookie so the root server layout can read it on next render.
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `theme=${next}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  return (
    <>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={() => router.push(withLocale(locale, '/'))}
        showContactModal={() => setContactOpen(true)}
      />
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        title={t.home.contact.title}
        scanQr={t.home.contact.scanQr}
        lookForward={t.home.contact.lookForward}
        wechatLabel={t.home.faq.wechat}
        emailLabel={t.home.faq.email}
      />
    </>
  );
}
