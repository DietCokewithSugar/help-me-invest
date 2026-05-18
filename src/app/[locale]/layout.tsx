import { notFound } from 'next/navigation';
import { siteUrl } from '@/lib/seo';

export const dynamicParams = false;

const SUPPORTED_LOCALES = ['zh', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

/**
 * The locale layout is intentionally thin: it validates the locale segment
 * and renders <link rel="alternate" hreflang="..."> tags so search engines
 * understand we have parallel zh/en versions of every page.
 *
 * We can't read the precise pathname here (server components don't have it
 * on the client side), but Next.js will surface the current locale via
 * `params.locale` which we forward to <LanguageProvider> downstream via
 * usePathname inside the client tree.
 */
export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  if (!SUPPORTED_LOCALES.includes(params.locale as SupportedLocale)) {
    notFound();
  }

  return (
    <>
      {/* Provide a baseline canonical/alternate for the locale root; per-page
          metadata layers more specific entries via createPageMetadata. */}
      <link rel="alternate" hrefLang="zh" href={`${siteUrl}/zh`} />
      <link rel="alternate" hrefLang="en" href={`${siteUrl}/en`} />
      <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/zh`} />
      {children}
    </>
  );
}
