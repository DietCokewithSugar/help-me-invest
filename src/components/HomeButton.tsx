'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Floating "go home" button. Pulled out of the root layout so we can keep
 * the layout fully server-rendered while still letting this link respect
 * the current locale (`/zh` vs `/en`).
 */
export default function HomeButton() {
  const { locale, t } = useLanguage();
  const label = t.common.back || '返回首页';
  return (
    <Link
      href={`/${locale}`}
      aria-label={label}
      title={label}
      className="glass-card fixed bottom-5 left-5 z-[95] inline-flex h-10 w-10 items-center justify-center rounded-pill text-mist-300 hover:text-mist-50 transition-colors"
    >
      <Home className="h-4 w-4" />
    </Link>
  );
}
