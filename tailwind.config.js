/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ===== Aptos warm-neutral core =====
        // Page-level backgrounds (warm black & warm white, not pure)
        'obsidian':       '#0F0E0B', // Dark mode main background (Aptos black)
        'void':           '#0F0E0B', // Alias
        'surface':        '#171612', // Card background dark (Aptos ink)
        'surface-hover':  '#21201C', // Card hover (Aptos coal)

        // ===== Aptos brand palette (named directly) =====
        // Neutrals — light → dark
        'cream':    '#EFECCA',
        'sand':     '#CCC5A3',
        'tan':      '#9D937C',
        'ash':      '#3D3B34',
        'graphite': '#2F2D28',
        'coal':     '#21201C',
        'ink':      '#171612',

        // Accents (kept saturated in both modes — Aptos signature)
        'mint':  '#D5FAD3',  // Hero background
        'coral': '#FF8866',  // CTA / warning highlight

        // Borders (translucent in both modes)
        'border':         'rgba(255, 255, 255, 0.10)',
        'border-strong':  'rgba(255, 255, 255, 0.18)',

        // ===== Semantic financial colors =====
        // Slightly muted to fit warm-neutral palette while keeping convention
        'growth': '#10B981', // Up — keep familiar green
        'decay':  '#EF4444', // Down — keep familiar red

        // ===== Legacy brand tokens remapped to Aptos signatures =====
        // `glacier` was the old teal primary. Aptos primary = inverted-100 (warm black/white).
        // We re-purpose it as Aptos's signature coral so existing `bg-glacier-500` etc.
        // produce on-brand pills throughout the codebase.
        'glacier': {
          300: '#FFB39A', // light coral hover
          400: '#FF9A7D',
          500: '#FF8866', // Aptos coral (primary accent)
          600: '#E5704F',
          700: '#C45838',
        },
        'gemini': {
          blue:   '#BADBEE', // Aptos accent blue
          purple: '#C5B6E0', // soft lilac (kept for legacy uses)
          yellow: '#DFD6B8', // 黄润 yellow tone
        },

        // ===== Text scale =====
        // Index goes light → dark like before, but values use Aptos warm grays
        'mist': {
          50:  '#FFFFFA', // pure-white
          100: '#F9F9F0', // white  (Aptos light bg)
          200: '#EFECCA', // cream  (primary text on dark)
          300: '#CCC5A3', // sand   (light-secondary on dark)
          400: '#9D937C', // tan    (muted-on-dark / secondary-on-light)
          500: '#3D3B34', // ash    (muted-on-light)
          600: '#2F2D28', // graphite
          700: '#21201C', // coal
        },
      },
      fontFamily: {
        // Aptos uses "Season Serif" (proprietary variable font). Closest free
        // open-source equivalent is Fraunces (variable opsz / SOFT / WONK).
        'sans':    ['"Inter"', 'system-ui', 'sans-serif'],
        'serif':   ['"Fraunces"', '"Instrument Serif"', '"Times New Roman"', 'Georgia', 'serif'],
        'display': ['"Fraunces"', '"Instrument Serif"', '"Times New Roman"', 'Georgia', 'serif'],
        'mono':    ['"JetBrains Mono"', '"Akkurat Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Editorial-style scale matching Aptos `--text-*` tokens (desktop)
        // Mobile values are clamped at runtime via globals.css clamp().
        'kicker':   ['0.6875rem', { lineHeight: '1.3',  letterSpacing: '0.12em' }], // 11px
        'caption':  ['0.8125rem', { lineHeight: '1.4',  letterSpacing: '0.02em' }], // 13px
        'body':     ['1rem',      { lineHeight: '1.5',  letterSpacing: '0.01em' }],
        'lead':     ['1.125rem',  { lineHeight: '1.4'                              }],
        'h3':       ['1.5rem',    { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'h2':       ['2.25rem',   { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'h1':       ['3.4375rem', { lineHeight: '1.0',  letterSpacing: '-0.02em' }], // 55px
        'display':  ['5.625rem',  { lineHeight: '0.95', letterSpacing: '-0.02em' }], // 90px
        'mega':     ['7.5rem',    { lineHeight: '0.95', letterSpacing: '-0.03em' }], // 120px
      },
      borderRadius: {
        DEFAULT: '6px',
        'sm':    '4px',
        'md':    '6px',
        'lg':    '12px',  // Aptos cards
        'xl':    '16px',
        '2xl':   '20px',
        '3xl':   '24px',
        'pill':  '9999px',// Aptos signature pill (buttons / navbar / toggles)
      },
      boxShadow: {
        // Warm-toned shadows (Aptos uses rgba(15,14,11,…) — its warm black)
        'low':    '0 1px 2px rgba(15, 14, 11, 0.06)',
        'sm':     '0 1px 2px rgba(15, 14, 11, 0.06)',
        'medium': '0 4px 12px rgba(15, 14, 11, 0.08)',
        'md':     '0 4px 12px rgba(15, 14, 11, 0.08)',
        'lg':     '0 12px 32px rgba(15, 14, 11, 0.12)',
        'xl':     '0 24px 60px rgba(15, 14, 11, 0.16)',
        'pill':   '0 4px 12px rgba(15, 14, 11, 0.08), 0 1px 2px rgba(15, 14, 11, 0.04)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out forwards',
        'fade-in-up':    'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'parallax-in':   'parallaxIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'text-mask-in':  'textMaskIn 1.6s cubic-bezier(0.76, 0, 0.24, 1) forwards',
        'stack-shrink':  'stackShrink 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'marquee':       'marquee 30s linear infinite',
        'marquee-slow':  'marquee 60s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Aptos-style scroll-driven feel (without scroll-timeline)
        parallaxIn: {
          '0%':   { opacity: '0', transform: 'translateY(20%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        textMaskIn: {
          '0%':   { clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-2%)' },
          '50%':  { clipPath: 'inset(0 0 0 0)',   transform: 'translateX(0)' },
          '100%': { clipPath: 'inset(0 0 0 0)',   transform: 'translateX(0)' },
        },
        stackShrink: {
          '0%':   { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.85)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundImage: {
        // Used only for the marquee mask-image; no real gradient backgrounds.
        'fade-mask-h': 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
