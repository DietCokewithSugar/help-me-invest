/** @type {import('tailwindcss').Config} */

// 所有主题色都来自 globals.css 中的 CSS 变量（RGB 通道），
// 因此同一个类名在深色 / 浅色模式下自动取对应的值，并支持 /alpha 透明度写法。
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // dark: 变体跟随 <html data-theme>，而不是系统偏好
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ===== 语义令牌（新代码优先使用这些） =====
        page:      token('page'),      // 页面底色
        panel:     token('panel'),     // 面板 / 卡片
        raised:    token('raised'),    // 表头、次级面板
        hover:     token('hover'),     // 行悬停
        fg:        token('fg'),        // 标题 / 最强文字
        'text-1':  token('text-1'),    // 正文
        'text-2':  token('text-2'),    // 次要文字
        'text-3':  token('text-3'),    // 弱化文字 / 标签
        'text-4':  token('text-4'),    // 占位 / 禁用
        brand:     token('brand'),     // IBKR 红：主按钮、导航选中
        'brand-strong': token('brand-strong'),
        accent:    token('accent'),    // 交互蓝：链接、选中态、焦点
        'accent-strong': token('accent-strong'),
        up:        token('up'),
        down:      token('down'),
        warn:      token('warn'),
        line:      token('fg'),        // 边框基色，配合 /10 /20 使用

        // ===== 兼容层：旧类名映射到新令牌，存量组件无需逐个改写 =====
        // 本项目里 "white" 一直表示「前景色」（深色模式白、浅色模式近黑），
        // 映射到 fg 后 text-white / bg-white/5 / border-white/10 在两种主题下都正确。
        white:     token('fg'),
        'pure-white': '#FFFFFF',
        obsidian:  token('page'),
        void:      token('page'),
        surface:   token('panel'),
        'surface-hover': token('hover'),
        coal:      token('raised'),
        graphite:  token('hover'),
        ink:       token('panel'),
        cream:     token('text-1'),
        sand:      token('text-2'),
        tan:       token('text-3'),
        ash:       token('text-4'),
        mint:      token('up'),
        coral:     token('brand'),
        growth:    token('up'),
        decay:     token('down'),
        border:    token('fg'),
        glacier: {
          300: token('accent'),
          400: token('accent'),
          500: token('accent'),
          600: token('accent-strong'),
          700: token('accent-strong'),
        },
        mist: {
          50:  token('fg'),
          100: token('text-1'),
          200: token('text-1'),
          300: token('text-2'),
          400: token('text-2'),
          500: token('text-3'),
          600: token('text-4'),
          700: token('text-4'),
        },
        // 图表 / 标签用的固定辅助色（不随主题变化）
        chart: {
          blue:   '#5B8DEF',
          purple: '#8E7CC3',
          yellow: '#D9A83A',
        },
      },
      fontFamily: {
        // IBKR 风格：全站一套无衬线；中文回退到系统黑体，保证中英混排基线一致
        sans: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        serif: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        // 数字字体：同为 Inter，配合 globals.css 中的 tabular-nums 实现等宽数字对齐
        mono: ['Inter', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        code: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        // 紧凑的信息密度型字号（对齐券商终端），标题不再使用杂志式超大字号
        'kicker':  ['0.6875rem', { lineHeight: '1rem' }],    // 11px 标签
        'caption': ['0.75rem',   { lineHeight: '1.125rem' }], // 12px 辅助说明
        'body':    ['0.875rem',  { lineHeight: '1.375rem' }], // 14px 正文
        'lead':    ['1rem',      { lineHeight: '1.5rem' }],   // 16px 导语
        'h3':      ['1.125rem',  { lineHeight: '1.5rem' }],   // 18px 模块标题
        'h2':      ['1.375rem',  { lineHeight: '1.75rem' }],  // 22px 区块标题
        'h1':      ['1.75rem',   { lineHeight: '2.25rem' }],  // 28px 页面标题
        'display': ['2.5rem',    { lineHeight: '3rem' }],     // 40px 首页主标题
        'mega':    ['3rem',      { lineHeight: '3.5rem' }],
      },
      borderRadius: {
        DEFAULT: '4px',
        'sm':    '2px',
        'md':    '4px',
        'lg':    '6px',
        'xl':    '6px',
        '2xl':   '8px',
        '3xl':   '8px',
        'pill':  '4px', // 旧的胶囊形状统一收敛为直角矩形
      },
      boxShadow: {
        'low':    '0 1px 2px rgba(16, 24, 40, 0.06)',
        'sm':     '0 1px 2px rgba(16, 24, 40, 0.06)',
        'medium': '0 2px 8px rgba(16, 24, 40, 0.08)',
        'md':     '0 2px 8px rgba(16, 24, 40, 0.08)',
        'lg':     '0 8px 24px rgba(16, 24, 40, 0.12)',
        'xl':     '0 16px 40px rgba(16, 24, 40, 0.16)',
        'pill':   '0 1px 2px rgba(16, 24, 40, 0.06)',
      },
      animation: {
        // 仅保留功能性反馈：淡入用于浮层出现，其余装饰性动画全部移除
        'fade-in':    'fadeIn 120ms ease-out both',
        'fade-in-up': 'fadeIn 120ms ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
