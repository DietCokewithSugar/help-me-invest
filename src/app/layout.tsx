import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import TextSelectionMenu from '@/components/TextSelectionMenu';
import { UnitModeProvider } from '@/lib/UnitModeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CompareProvider } from '@/contexts/CompareContext';
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
        {/* Favicon - Next.js automatically uses src/app/icon.png */}
        <meta name="theme-color" content="#0A0A0B" />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <CompareProvider>
            <UnitModeProvider>
              <div className="relative z-10">
                {children}
              </div>
              <Analytics />
              <TextSelectionMenu />
            </UnitModeProvider>
          </CompareProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
