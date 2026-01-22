/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Utilitarian Dark Mode Palette
        // Base backgrounds
        'obsidian': '#0A0A0B', // Main background
        'void': '#0A0A0B',     // Alias
        'surface': '#121212',  // Card background
        'surface-hover': '#1A1A1A', // Card hover

        // Borders
        'border': 'rgba(255, 255, 255, 0.1)',
        'border-strong': 'rgba(255, 255, 255, 0.15)',

        // Semantic Function Colors (Restrained)
        'growth': '#10B981', // Success/Up
        'decay': '#EF4444',  // Error/Down

        // Brand/Accent (Minimal)
        'glacier': {
          500: '#14b8a6', // Teal for primary actions
          600: '#0d9488',
        },
        'gemini': {
          blue: '#3b82f6', // Kept for brand consistency but used sparingly
        },

        // Text Colors
        'mist': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0', // Primary text
          300: '#cbd5e1',
          400: '#94a3b8', // Secondary text
          500: '#64748b', // Muted text
          600: '#475569',
          700: '#334155',
        },
      },
      fontFamily: {
        'sans': ['"Inter"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'], // For data
      },
      borderRadius: {
        DEFAULT: '4px',
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',
        '2xl': '8px', // Override large radius
        '3xl': '8px', // Override large radius
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'low': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
