import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** 标题上方的小字（面包屑 / 分类） */
  eyebrow?: ReactNode;
  /** 右侧操作区（按钮、统计数字等），与标题底部对齐 */
  actions?: ReactNode;
}

/**
 * 页面标题栏：紧贴顶部导航、白色面板底、下方 1px 分隔线。
 * 与导航和正文共用 page-container，保证左边缘在所有页面上对齐。
 */
export default function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-panel">
      <div className="page-container flex flex-col gap-4 py-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-[12px] text-text-3">{eyebrow}</div>}
          <h1 className="text-h1 text-fg">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-[14px] leading-6 text-text-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
