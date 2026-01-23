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

## Implementation Rules
1. **Financial Precision**: Always use `font-mono` for all currency and percentage values.
2. **Theme Consistency**: Use CSS variables (e.g., `--bg-surface`) or theme-aware utility classes.
3. **No Gradients**: Avoid background gradients; use solid fills or subtle 1px borders for definition.
4. **Transition**: All theme-related changes should have `transition: background-color 0.2s, color 0.2s`.
