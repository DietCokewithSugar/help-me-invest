import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '智投研究 | AI Investment Research',
  description: '基于AI的上市企业投资研究助手 - 输入股票代码，获取全面的企业分析报告',
  keywords: ['投资研究', 'AI分析', '股票分析', '财务报告', '企业研究'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Google Sans 字体 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
        {/* Gemini 风格 Favicon */}
        <link 
          rel="icon" 
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:%234285f4'/><stop offset='100%' style='stop-color:%23a855f7'/></linearGradient></defs><circle cx='50' cy='50' r='45' fill='url(%23g)'/><path d='M30 50 L45 65 L70 35' stroke='white' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>" 
        />
      </head>
      <body className="antialiased font-sans">
        {/* 极光背景 */}
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
          <div className="aurora-orb aurora-orb-3" />
        </div>
        
        {/* 主内容 */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
