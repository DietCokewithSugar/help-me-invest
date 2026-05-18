import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['zh', 'en'] as const;
const DEFAULT_LOCALE = 'zh';

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupported(value: string | undefined | null): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve the preferred locale for a request based on (in priority order):
 *   1. The `NEXT_LOCALE` cookie (set when the user explicitly toggles language).
 *   2. The `Accept-Language` header negotiated against our supported locales.
 *   3. The default locale (`zh`).
 */
function resolveLocale(request: NextRequest): SupportedLocale {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (isSupported(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get('accept-language') || '';
  // Parse "zh-CN,zh;q=0.9,en;q=0.8" → ordered list of base tags.
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';');
      const q = qPart && qPart.startsWith('q=') ? parseFloat(qPart.slice(2)) : 1;
      const base = (tag || '').toLowerCase().split('-')[0];
      return { base, q: isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { base } of ranked) {
    if (base === 'zh' || base === 'en') return base;
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip framework/asset/API paths.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname === '/wechat-qr.jpg' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest'
  ) {
    return NextResponse.next();
  }

  // Already locale-prefixed?
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isSupported(segments[0])) {
    // Propagate locale + raw pathname to downstream layouts/server components
    // via REQUEST headers (which `headers()` from `next/headers` can read).
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-next-locale', segments[0]);
    requestHeaders.set('x-next-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Need to redirect to the locale-prefixed equivalent.
  const locale = resolveLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  url.search = search;

  // 308 = permanent redirect that preserves method (vs. 301 which historically
  // didn't). Search engines treat both as canonical-moving signals.
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    // Match everything except framework internals and known static assets.
    // The function above re-filters defensively in case something slips through.
    '/((?!_next/static|_next/image|api|favicon.ico|icon.png|wechat-qr.jpg|robots.txt|sitemap.xml).*)',
  ],
};
