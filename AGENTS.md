# UI Design System: Aptos Editorial Mode

> Inspired by [aptosnetwork.com](https://aptosnetwork.com).
> Full extraction artefacts live in [`design-extractor/`](./design-extractor/)
> (tokens.json · palette.md · design-system.md · components.md · playground.html).

## Design Philosophy

- **Editorial First** — display + body both use a variable serif (Fraunces); reads like a magazine, not a SaaS dashboard.
- **Warmth Over Sterility** — no pure `#FFFFFF` / `#000000`. Light is `#F9F9F0` (warm white), dark is `#0F0E0B` (warm black). All neutrals carry a yellow undertone.
- **Pill Geometry** — the signature shape is `border-radius: 9999px`. Navbar, primary buttons and theme toggles are pills. Cards stay at `12px`.
- **Motion as Meaning** — animation is reserved for editorial moments (hero text reveal, card stacking, marquee). No bouncy springs, no parallax for decoration only.
- **Dual Mode Native** — every theme value is driven by CSS variables under `[data-theme="dark"]` / `[data-theme="light"]`. There is no third "system" mode at runtime; SSR seeds from cookie.
- **No Decoration** — zero background gradients, zero glassmorphism, zero hover-lift shadows. The only effects allowed are 1px translucent borders and a single warm `shadow-md` for floating elements.

## Core Palette

### Dark Mode (Default)
- **Main BG**: `bg-obsidian` (`#0F0E0B` — Aptos black, warm)
- **Surface**: `bg-surface` (`#171612` — Aptos ink)
- **Elevated**: `bg-coal` (`#21201C`) / `bg-graphite` (`#2F2D28`)
- **Text Heading**: `text-mist-50` (`#FFFFFA`)
- **Text Primary**: `text-mist-100` / `text-mist-200` (`#F9F9F0` / `#EFECCA`)
- **Text Secondary**: `text-mist-300` / `text-mist-400` (`#CCC5A3` sand / `#9D937C` tan)
- **Text Muted**: `text-mist-500` (`#3D3B34` ash)
- **Borders**: `border-white/10` (1px translucent)
- **Accent (CTA / link)**: `text-glacier-500` / `bg-glacier-500` — re-mapped to Aptos coral `#FF8866`
- **Accent Mint**: `bg-mint` (`#D5FAD3`) — hero backgrounds
- **Accent Blue**: `bg-gemini-blue` (`#BADBEE`) — informational blocks
- **Growth / Decay**: `#10B981` / `#EF4444` (kept for financial convention)

### Light Mode (`[data-theme="light"]`)
- **Main BG**: `#F9F9F0` (Aptos warm white)
- **Surface**: `#FFFFFA`
- **Elevated**: `#EFECCA` (cream)
- **Text Heading**: `#0F0E0B`
- **Text Primary**: `#171612`
- **Text Secondary**: `#3D3B34` (ash)
- **Text Muted**: `#9D937C` (tan)
- **Borders**: `rgba(0, 0, 0, 0.10)`
- **Accent**: darker coral `#E5704F` for sufficient contrast on light bg
- **Growth / Decay**: `#059669` / `#DC2626`

> Accent colours `mint / blue / coral` **do not invert** between modes — they are part of brand identity.

## Typography

- **Display & headings**: `font-serif` → Fraunces (variable; we use `opsz`, `SOFT`, `WONK` axes). Falls back to Instrument Serif → Times New Roman.
- **UI / body**: `font-sans` → Inter.
- **Data / labels / kickers**: `font-mono` → JetBrains Mono. **Always uppercase + `tracking-[0.12em]`** when used as a label (use the `.mono-kicker` utility).
- **Hero**: use `.editorial-title` (Fraunces with `SOFT 50, WONK 0`) or `.gradient-text` for the highlighted phrase (Fraunces italic, coral→blue gradient).

### Scale (Tailwind)
| Class | Size | Use |
| --- | --- | --- |
| `text-mega` | 120px | XL hero |
| `text-display` | 90px | hero h1 |
| `text-h1` | 55px | page h1 |
| `text-h2` | 36px | section h2 |
| `text-h3` | 24px | module h3 |
| `text-lead` | 18px | hero subtitle / lede |
| `text-body` | 16px | body |
| `text-caption` | 13px | meta |
| `text-kicker` | 11px | mono uppercase eyebrow |

Mobile: heading sizes auto-clamp via `clamp()` inside `globals.css`.

## Shape & Components

- **Radius**: `rounded-sm` (4px tags) · `rounded-md` (6px inputs/secondary cards) · `rounded-lg` (12px cards) · `rounded-pill` (9999px — buttons, navbar, toggles).
  *Exception*: text inputs use `12px` for legibility.
- **Borders**: 1px. Dark: `border-white/10`. Light: `rgba(0, 0, 0, 0.10)`. Use `border-white/20` for emphasis.
- **Shadows**: keep flat. Only `shadow-md` (`0 4px 12px rgba(15,14,11,0.08)`) on the floating navbar. `shadow-lg` for dropdowns / modals.
- **Glass surfaces**: the legacy `.glass-card` is now a **solid** surface with 1px border and a soft warm shadow (no heavy blur). Backdrop-filter is reduced to `blur(8px)` so navbar text stays sharp.

### Primary CTA
Use `.pill-btn` (or any `.gemini-btn` / `.gemini-btn-primary` — they alias to the same Aptos pill).

```html
<button class="pill-btn">Start Analysis</button>
```

Secondary: `.gemini-btn-secondary` — outline pill.

### Floating Navbar
The site uses a single fixed pill anchored at `top-3` (mobile) / `top-5` (desktop), max-w-6xl centered, always pill-shaped, never reshapes on scroll. Implementation lives in `src/components/Header.tsx`.

## Data Visualization Palette

### Semantic Colors (Standard Report)
- **Revenue / Primary**: `窈蓝` (`#88ABDA`) — kept
- **Profit / Positive**: `鞠尘` (`#C0D09D`)
- **Expense / Negative**: `艳炽` (`#CB523E`)
- **Secondary / Assets**: `白青` (`#98B6C2`)
- **Neutral / Secondary**: `缟羽` (`#EFEFEF`)

### Categorical Palette (Aptos accent layer applied)
For pie / multi-series charts, alternate between traditional named colours and Aptos accents:

1. **窈蓝 (Yao Lan)**: `#88ABDA`
2. **白青 (Bai Qing)**: `#98B6C2`
3. **鞠尘 (Ju Chen)**: `#C0D09D`
4. **Aptos Coral**: `#FF8866`
5. **Aptos Mint**: `#D5FAD3`
6. **Aptos Blue**: `#BADBEE`
7. **黄润 (Huang Run)**: `#DFD6B8`
8. **艳炽 (Yan Chi)**: `#CB523E`

## Implementation Rules

1. **Financial Precision**: Always use `font-mono` (`tabular-nums`) for currency / percentage values.
2. **Theme Consistency**: Read from CSS variables (`--bg-surface`, `--text-primary`, etc.) or theme-aware utility classes (`theme-text-primary`, `bg-surface`, `border-white/10`). Never hardcode colors that don't have a light-mode override in `globals.css`.
3. **Chart Adaptation**: ECharts / SVG must detect `document.documentElement.dataset.theme` and switch background / tooltip / label colors.
4. **No Gradients**: Avoid background gradients. The only allowed gradient is the `.gradient-text` accent applied to ≤ 5 words of a single hero phrase.
5. **Transition**: `transition: background-color 0.2s, color 0.2s, border-color 0.2s` applied globally in light mode for smooth theme swap.
6. **Mono Labels**: Section eyebrows, table headers, ticker symbols, button text in navbar — all `font-mono uppercase tracking-[0.12em]`. Use `.mono-kicker`.
7. **Editorial Titles**: All `<h1>` / `<h2>` / `<h3>` default to Fraunces serif in `globals.css`. To opt out (e.g. for code / inline mono), add `font-sans` or `font-mono`.

## Interactive Data Rows (Hint UI/UX)

Used in report modules like "Calculation Factor Details", "Financial Indicators", and "Capital & Return".
- **Interaction**: Rows must be clickable with a hover state.
- **Hover State**: `hover:bg-white/5 px-2 -mx-2 rounded-md transition-colors`.
- **Tooltip / Hint**:
  - Implementation: non-transparent overlay (`bg-surface` or `bg-obsidian`) with `border border-white/10`.
  - Position: typically `bottom-full right-0 mb-2`.
  - Visibility: controlled by local state (`hoveredMetric`).
- **Typography**: Label uses `text-mist-400` (mono uppercase). Value uses `font-mono` (tabular-nums).

## Responsive

- Breakpoints follow Tailwind defaults; `lg` (1024px) is where the floating navbar reveals the full menu row.
- Mobile pill collapses to logo + theme + lang + hamburger; the dropdown sheet inherits the same surface treatment.
- Hero `text-display` clamps from 90px → 44px on mobile via CSS `clamp()` in `globals.css`.
- All `padding`/`gap` values respect the Aptos `5px` base spacing unit (multiples of 5).

## Cursor Cloud specific instructions

- **Stack**: Next.js 14 (App Router) with React 18, Tailwind CSS 3, TypeScript 5. Package manager is `npm`.
- **Dev server**: `npm run dev` (starts on port 3000). No Docker or external services needed for the frontend; API routes call external APIs (FMP, Google Gemini) requiring `FMP_API_KEY` and `GOOGLE_API_KEY` environment variables at runtime.
- **Lint**: `npm run lint` — pre-existing lint errors exist in `FinancialRatiosDisplay.tsx`, `FinancialRatiosTTMDisplay.tsx`, and `TextSelectionMenu.tsx` (unescaped quotes). These are not regressions.
- **Build**: `npm run build` — runs TypeScript type-checking and produces a production build.
- **i18n**: Dual-language (zh/en). Translation keys are in `src/i18n/locales/zh.ts` (source of truth for types) and `src/i18n/locales/en.ts`. When adding new UI text, add keys to both files.
- **Contexts**: `CompareProvider`, `LanguageProvider`, and `UnitModeProvider` are already mounted in the root layout (`src/app/layout.tsx`).
- **Page pattern**: Pages are `'use client'` components importing `Header`, managing their own `theme` state via `localStorage`, and using `useLanguage()` for translations. See `src/app/companies/page.tsx` as the canonical example.
- **Design context**: when generating UI, read `design-extractor/tokens.json` / `design-extractor/design-system.md` for source-of-truth values; never invent new accent colors outside the Aptos palette.
