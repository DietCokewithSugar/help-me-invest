# UI Design System: Utilitarian Mode

## Design Philosophy
- **Minimalist**: Remove unnecessary decorations, gradients, and blurred backgrounds.
- **Data-First**: Focus on readability and data presentation.
- **Sharp & Industrial**: Use sharp or slightly rounded corners, thin borders, and monospaced fonts for data.
- **Dual Theme**: Support both high-contrast Dark mode and clean Slate-based Light mode.

## Core Palette

### Dark Mode (Default)
- **Main BG**: `bg-obsidian` (#0A0A0B)
- **Surface**: `bg-surface` (#121212)
- **Text Primary**: `text-mist-200` (#E2E8F0)
- **Text Secondary**: `text-mist-400` (#94A3B8)
- **Text Muted**: `text-mist-500` (#64748B)
- **Accent**: `text-glacier-500` (#14B8A6)
- **Growth**: `#10B981` | **Decay**: `#EF4444`

### Light Mode (`[data-theme="light"]`)
- **Main BG**: `#F8FAFC` (Slate 50)
- **Surface**: `#FFFFFF` (White)
- **Text Heading**: `#0F172A` (Slate 900)
- **Text Primary**: `#1E293B` (Slate 800)
- **Text Secondary**: `#475569` (Slate 600)
- **Text Muted**: `#64748B` (Slate 500)
- **Accent**: `#0D9488` (Teal 600)
- **Growth**: `#059669` | **Decay**: `#DC2626`

## Typography & Components
- **Fonts**: `font-sans` (Inter) for UI; `font-mono` (JetBrains Mono) for financial data.
- **Rounded**: `rounded-sm` (2px) or `rounded-md` (4px). *Exception: Inputs use 12px.*
- **Borders**: 1px width. `border-white/10` (Dark) vs `rgba(0,0,0,0.1)` (Light).
- **Glass**: 20px blur. `rgba(10,10,11,0.8)` (Dark) vs `rgba(248,250,252,0.9)` (Light).

## Data Visualization Palette

### Semantic Colors (Standard Report)
- **Revenue/Primary**: `窈蓝` (#88ABDA)
- **Profit/Positive**: `鞠尘` (#C0D09D)
- **Expense/Negative**: `艳炽` (#CB523E)
- **Secondary/Assets**: `白青` (#98B6C2)
- **Neutral/Secondary**: `缟羽` (#EFEFEF)

### Categorical Palette (Traditional Chinese)
Used for pie charts and multi-series charts:
1. **窈蓝 (Yao Lan)**: `#88ABDA` (Revenue / Primary)
2. **白青 (Bai Qing)**: `#98B6C2` (Gross Profit / Assets)
3. **鞠尘 (Ju Chen)**: `#C0D09D` (Net Profit / Equity)
4. **艳炽 (Yan Chi)**: `#CB523E` (Expenses / Debt)
5. **黄润 (Huang Run)**: `#DFD6B8` (Secondary Categories)
6. **玉色 (Yu Se)**: `#EAE4D1` (Muted Categories)

## Implementation Rules
1. **Financial Precision**: Always use `font-mono` for all currency and percentage values.
2. **Theme Consistency**: Use CSS variables (e.g., `--bg-surface`) or theme-aware utility classes.
3. **Chart Adaptation**: Data visualizations must detect the current theme and adjust background, tooltip, and label colors accordingly.
4. **No Gradients**: Avoid background gradients; use solid fills or subtle 1px borders for definition.
5. **Transition**: All theme-related changes should have `transition: background-color 0.2s, color 0.2s`.

## Interactive Data Rows (Hint UI/UX)
Used in report modules like "Calculation Factor Details", "Financial Indicators", and "Capital & Return".
- **Interaction**: Rows must be clickable and have a hover state for visual feedback.
- **Hover State**: Use `hover:bg-white/5 px-2 -mx-2 rounded-sm transition-colors` on the row container.
- **Tooltip/Hint**: 
 - Implementation: Use a non-transparent overlay (e.g., `bg-surface` or `bg-obsidian`) with a 1px border (`border-white/10`).
 - Position: Typically `bottom-full right-0 mb-2` or `absolute` near the clicked item.
 - Visibility: Controlled by local state (e.g., `hoveredMetric`).
- **Typography**: Label uses `text-mist-400`, value uses `font-mono`.

## Cursor Cloud specific instructions

- **Stack**: Next.js 14 (App Router) with React 18, Tailwind CSS 3, TypeScript 5. Package manager is `npm`.
- **Dev server**: `npm run dev` (starts on port 3000). No Docker or external services needed for the frontend; API routes call external APIs (FMP, Google Gemini) requiring `FMP_API_KEY` and `GOOGLE_API_KEY` environment variables at runtime.
- **Lint**: `npm run lint` — pre-existing lint errors exist in `FinancialRatiosDisplay.tsx`, `FinancialRatiosTTMDisplay.tsx`, and `TextSelectionMenu.tsx` (unescaped quotes). These are not regressions.
- **Build**: `npm run build` — runs TypeScript type-checking and produces a production build.
- **i18n**: Dual-language (zh/en). Translation keys are in `src/i18n/locales/zh.ts` (source of truth for types) and `src/i18n/locales/en.ts`. When adding new UI text, add keys to both files.
- **Contexts**: `CompareProvider`, `LanguageProvider`, and `UnitModeProvider` are already mounted in the root layout (`src/app/layout.tsx`).
- **Page pattern**: Pages are `'use client'` components importing `Header`, managing their own `theme` state via `localStorage`, and using `useLanguage()` for translations. See `src/app/companies/page.tsx` as the canonical example.
