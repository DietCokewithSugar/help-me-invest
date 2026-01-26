import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import TextSelectionMenu from '@/components/TextSelectionMenu';
import './globals.css';

export const metadata: Metadata = {
  title: '智投研究 | AI Investment Research',
  description: '看透财务，见证商业逻辑。将海量数据转化为你的投资决断。支持美股、A股、港股、日股的 AI 智能投资研究助手。',
  keywords: ['投资研究', 'AI分析', '股票分析', '财务报告', '企业研究', '智投研究', '投研助理'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 字体预加载 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:%2314b8a6'/><stop offset='100%' style='stop-color:%234285f4'/></linearGradient></defs><rect x='10' y='10' width='80' height='80' rx='20' fill='url(%23g)'/><path d='M30 50 L45 65 L70 35' stroke='white' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>"
        />
        <meta name="theme-color" content="#0A0A0B" />
      </head>
      <body className="antialiased">
        <div className="relative z-10">
          {children}
        </div>
        <Analytics />
        <TextSelectionMenu />
      </body>
    </html>
  );
}
