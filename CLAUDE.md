# UI Design System: Utilitarian Dark Mode

## Design Philosophy
- **Minimalist**: Remove unnecessary decorations, gradients, and blurred backgrounds.
- **Data-First**: Focus on readability and data presentation.
- **Sharp & Industrial**: Use sharp or slightly rounded corners, thin borders, and monospaced fonts for data.
- **Dark Mode**: High contrast dark theme.

## Core Palette

### Backgrounds
- **Main**: `bg-obsidian` (#0A0A0B)
- **Card/Surface**: `bg-surface` (#121212) or `bg-white/5`
- **Hover**: `bg-white/10` or `bg-surface-hover` (#1A1A1A)

### Typography
- **Primary Text**: `text-white` or `text-mist-200` (#e2e8f0)
- **Secondary**: `text-mist-400` (#94a3b8)
- **Muted**: `text-mist-500` (#64748b)
- **Fonts**:
  - Headings/Body: `font-sans` ("Inter")
  - Data/Numbers: `font-mono` ("JetBrains Mono")

### Borders
- **Default**: `border-white/10` or `border-white/5`
- **Active/Hover**: `border-white/20`

### Semantic Colors
- **Primary Accent**: `text-glacier-500` (#14b8a6) (Teal)
- **Success/Growth**: `text-growth` (#10B981) (Emerald)
- **Error/Decay**: `text-decay` (#EF4444) (Red)

## Component Guidelines

### Cards
- **Shape**: `rounded-sm` (2px) or `rounded-md` (4px). Avoid `rounded-xl` or larger.
- **Style**: Flat background (`bg-white/5`), thin border (`border border-white/10`).
- **No Drop Shadows**: Unless heavily elevated.

### Charts
- **Palette**: Flat colors.
  - Revenue: `#2dd4bf` (Teal 400)
  - Gross Profit: `#94a3b8` (Slate 400)
  - Op Income: `#fbbf24` (Amber 400)
  - Net Income: `#10b981` (Emerald 500)
  - Investing: `#f43f5e` (Rose 500)
- **Grid**: `splitLine: { show: false }` or dashed opacity 0.5.
- **Tooltip**: Simple, tabular, dark background (`#121212`), no shadow blur.

### Buttons & Inputs
- **Buttons**: Outline style or flat utilitarian background. `rounded-sm`.
- **Inputs**: `bg-white/5`, `border-white/10`, `rounded-sm`.

## Implementation Rules
1. **Always use `font-mono` for financial numbers.**
2. **Avoid gradients** for background fills.
3. **Use 1px borders** to define spacing rather than large gaps or shadows.
