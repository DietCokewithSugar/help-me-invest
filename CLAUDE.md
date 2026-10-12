# UI Design System: Brokerage Terminal (IBKR-inspired)

> Visual reference: Interactive Brokers (interactivebrokers.com, Client Portal).
> Brand values used: IBKR corporate red `#DB1222`, corporate black `#222222`.
> Tokens live in `src/app/globals.css` (CSS variables) and `tailwind.config.js` (Tailwind mapping).

## Principles

- **Data first** — dense, scannable, aligned. Pages read like a broker's research screen, not a marketing site.
- **Alignment is non-negotiable** — every page uses `.page-container` (max 1280px, 16/24px gutters), so the header logo, page title and panel edges share one left edge. Text is left-aligned; numbers are right-aligned with tabular figures.
- **Restrained colour** — neutral grey page, white (or dark) panels, 1px hairlines. Brand red is reserved for the primary action and the active-navigation underline. Interactive blue marks links, selections and focus. Green/red only mean up/down.
- **Motion only as feedback** — no entrance animations, scroll reveals, auto-rotating carousels, typing effects, number flips, hover lifts or springy modals. Allowed: 120ms colour transitions on hover, a 120ms fade when an overlay appears, spinners while something is actually loading. Tab/section switches and accordions are instant. `prefers-reduced-motion` is honoured globally.
- **No decoration** — no gradients, glows, blurs, glassmorphism or pill shapes.

## Tokens

All theme colours are RGB-channel CSS variables under `[data-theme="dark"]` (default) and `[data-theme="light"]`, so every utility supports `/alpha`.

| Token (Tailwind) | Dark | Light | Use |
| --- | --- | --- | --- |
| `bg-page` | `#0D0F12` | `#F3F4F6` | page background |
| `bg-panel` | `#15181C` | `#FFFFFF` | panels, header, toolbars |
| `bg-raised` | `#1B1F24` | `#F8F9FA` | table headers, secondary surfaces |
| `bg-hover` | `#21262C` | `#F1F3F5` | row / button hover |
| `text-fg` | `#ECEEF1` | `#17191C` | headings, key values |
| `text-text-1` | `#D8DCE2` | `#222222` | body |
| `text-text-2` | `#A3ABB6` | `#545B65` | secondary |
| `text-text-3` | `#7A838F` | `#78808B` | labels, captions |
| `text-text-4` | `#545C66` | `#A8AFB8` | placeholder / disabled |
| `brand` | `#E62B3A` | `#DB1222` | primary button, active nav |
| `accent` | `#5CA0FF` | `#1565C0` | links, selection, focus |
| `up` / `down` | `#26BA69` / `#F05050` | `#0C803E` / `#CF222E` | price & growth direction |
| `warn` | `#E6A23C` | `#B46E0A` | data caveats |

Borders: `border-line` (fg at 10–12%) and `border-line-strong`. `border-white/10` also works — in this codebase `white` maps to the foreground token, so legacy `text-white`, `bg-white/5`, `border-white/10` render correctly in both themes. Use `text-pure-white` when you genuinely need `#FFF` (text on a brand button).

Legacy aliases (`mist-*`, `glacier-*`, `surface`, `obsidian`, `growth`, `decay`) map onto the tokens above; prefer the semantic names in new code.

## Typography

- One family: **Inter**, with PingFang SC / Microsoft YaHei fallbacks so CJK and Latin share a baseline. `font-serif`/`font-display` resolve to the same stack.
- `font-mono` = Inter with `tabular-nums` (it is the *numeric* face, not a monospace). Use it for every price, percentage, ratio and ticker. True monospace for code: `font-code`.
- Scale: `text-display` 40 · `text-h1` 28 · `text-h2` 22 · `text-h3` 18 · `text-lead` 16 · `text-body` 14 · `text-caption` 12 · `text-kicker` 11. Body text is 14px; tables 13px.
- Headings are 600 weight, no letter-spacing tricks. Uppercase is only for `.label-caps` (11px, 0.04em).

## Components (`globals.css`)

- Layout: `.page-container`; `PageHeader` component (title bar under the nav, optional eyebrow/actions).
- Buttons: `.btn-primary` (brand red), `.btn-secondary` (outlined), `.btn-ghost`. Height 36px, radius 4px.
- Surfaces: `.panel`, `.panel-header`, `.panel-title`.
- Data: `.data-table` (+ `.num` cells for right-aligned tabular numbers), `.kv-row` / `.kv-label` / `.kv-value` for label–value lists.
- Navigation: `.tab` / `.tab-active` (2px brand underline). Segmented controls: bordered group, active segment `bg-accent/10 text-accent`.
- Inputs: `.input-field` (36px, 4px radius, blue focus ring). Badges: `.badge`. Labels: `.label-caps`.
- AI markdown: `.prose-report`.

Radius scale: `sm` 2px · `md` 4px · `lg`/`xl` 6px · `2xl` 8px. `rounded-pill` is 4px (pills are retired).

## Layout patterns

- **Top nav** (`Header.tsx`): sticky, full width, 56px, logo left, nav items with brand underline for the active route, language/theme toggles right. Mobile collapses to a menu that opens instantly.
- **Inner pages**: `PageHeader` → `<div className="page-container py-6">` → panels.
- **Company report** (`Report.tsx`): company header (name/ticker left, last price & change right, key facts row) → sticky toolbar under the nav (report version · section links · actions) → overview grid (`PriceChart`, `KeyStatsPanel`, `AnalystPanel`) → sections.

## Charts

Use `getChartTheme(theme)` / `tooltipStyle()` from `src/lib/chart-theme.ts` for ECharts colours; set `animation: false` for charts that redraw on user input. Charts must react to `document.documentElement.dataset.theme`. Categorical palette: `#4A86E8 #7FA3BF #3FA66B #D9534F #C9A227 #E07B39 #8DB4E2`.

## Implementation rules

1. Numbers: `font-mono`, right-aligned in tables, consistent decimals per column, `—` for missing values.
2. Theme: read colours from tokens/utilities; never hardcode a colour that lacks a light-mode counterpart.
3. Spacing: use Tailwind's 4px scale; panels pad 16–20px; vertical rhythm between page sections is 24px (`space-y-6`).
4. Interactive rows: `hover:bg-hover`; whole row clickable when it navigates.
5. Dialogs: `bg-black/50` scrim, `panel` body, `animate-fade-in`, Escape closes.

## Data & AI

- Market data: Yahoo Finance is the primary source for all markets (`src/lib/yahoo/*`, orchestrated in `src/lib/market-data.ts`). FMP (free plan, optional) adds 5-year US annual statements and DCF behind a circuit breaker; SEC EDGAR adds 10-year US history for long-run CAGR. Derived metrics come from `src/lib/financial-metrics.ts`.
- AI: DeepSeek only (`src/lib/deepseek.ts`, `src/lib/ai/*`), default model `deepseek-flash`. There is no other AI provider.
