/**
 * ECharts / SVG 图表的统一配色，与 globals.css 中的主题令牌保持一致。
 * 图表组件不应再各自定义一套颜色常量。
 */

export interface ChartTheme {
  isLight: boolean;
  text: string;
  textSecondary: string;
  textMuted: string;
  axisLine: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  accent: string;
  brand: string;
  up: string;
  down: string;
  /** 分类序列配色：蓝、青灰、橄榄绿、琥珀、紫、红、灰 */
  series: string[];
  fontFamily: string;
}

const FONT_FAMILY = 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

export function getChartTheme(theme: 'dark' | 'light' | undefined): ChartTheme {
  const isLight = theme === 'light';
  return {
    isLight,
    text: isLight ? '#222222' : '#D8DCE2',
    textSecondary: isLight ? '#545B65' : '#A3ABB6',
    textMuted: isLight ? '#78808B' : '#7A838F',
    axisLine: isLight ? 'rgba(23,25,28,0.18)' : 'rgba(236,238,241,0.18)',
    splitLine: isLight ? 'rgba(23,25,28,0.07)' : 'rgba(236,238,241,0.07)',
    tooltipBg: isLight ? '#FFFFFF' : '#1B1F24',
    tooltipBorder: isLight ? 'rgba(23,25,28,0.14)' : 'rgba(236,238,241,0.14)',
    accent: isLight ? '#1565C0' : '#5CA0FF',
    brand: isLight ? '#DB1222' : '#E62B3A',
    up: isLight ? '#0C803E' : '#26BA69',
    down: isLight ? '#CF222E' : '#F05050',
    series: isLight
      ? ['#1565C0', '#5B8DEF', '#7A9A3A', '#C98A1A', '#8E7CC3', '#CF222E', '#78808B']
      : ['#5CA0FF', '#8DB4F5', '#9DBB5A', '#E0A63E', '#A897D6', '#F05050', '#A3ABB6'],
    fontFamily: FONT_FAMILY,
  };
}

/** 读取当前页面主题（客户端） */
export function currentTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** 通用 tooltip 样式 */
export function tooltipStyle(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: t.text, fontFamily: t.fontFamily, fontSize: 12 },
    extraCssText: 'box-shadow: 0 2px 8px rgba(16,24,40,0.12); border-radius: 4px;',
  };
}
