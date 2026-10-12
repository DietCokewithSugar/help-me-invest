'use client';

import { forwardRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import {
  X,
  Download,
  Share2,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Smartphone,
} from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLDivElement>;
  fileName: string;
}

// 动画变体


type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

export default function ExportModal({ 
  isOpen, 
  onClose, 
  targetRef, 
  fileName 
}: ExportModalProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [supportsShare] = useState(() => 
    typeof navigator !== 'undefined' && 
    typeof navigator.share === 'function' && 
    typeof navigator.canShare === 'function'
  );
  const { dialogRef, titleId, descriptionId } = useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: status === 'idle',
  });

  // 生成图片
  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!targetRef.current) return null;

    try {
      // 等待所有字体加载完成
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(targetRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0f',
        cacheBust: false, // 禁用 cacheBust 避免字体缓存问题
        skipFonts: true,  // 跳过字体嵌入，避免 CORS 问题
        style: {
          transform: 'none',
        },
      });

      // 转换 dataUrl 为 Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('生成图片失败:', error);
      throw error;
    }
  }, [targetRef]);

  // 下载图片
  const handleDownload = useCallback(async () => {
    setStatus('exporting');
    setErrorMessage('');

    try {
      if (!targetRef.current) {
        throw new Error('无法找到要导出的内容');
      }

      // 等待所有字体加载完成
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 使用 skipFonts 避免外部字体的 CORS 问题
      // 字体已经在页面中渲染好了，不需要重新嵌入
      const dataUrl = await toPng(targetRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0f',
        cacheBust: false, // 禁用 cacheBust 避免字体缓存问题
        skipFonts: true,  // 跳过字体嵌入，避免 CORS 问题
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('下载失败:', error);
      setStatus('error');
      setErrorMessage(error.message || '导出失败，请稍后重试');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [targetRef, fileName, onClose]);

  // 分享图片（使用 Web Share API）
  const handleShare = useCallback(async () => {
    setStatus('exporting');
    setErrorMessage('');

    try {
      const blob = await generateImage();
      if (!blob) {
        throw new Error('无法生成图片');
      }

      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      // 检查是否可以分享此文件
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${fileName} 投资研究报告`,
          text: '查看这份 AI 生成的投资研究报告',
          files: [file],
        });
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          onClose();
        }, 1500);
      } else {
        // 如果不支持文件分享，回退到下载
        handleDownload();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消分享
        setStatus('idle');
        return;
      }
      console.error('分享失败:', error);
      setStatus('error');
      setErrorMessage(error.message || '分享失败，请尝试下载');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [generateImage, fileName, handleDownload, onClose]);

  // 处理背景点击关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && status === 'idle') {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleBackdropClick}>
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/50 animate-fade-in"/>

          {/* 模态框内容 */}
          <div
              ref={dialogRef as any}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              tabIndex={-1}
              className="relative w-full max-w-md panel p-8 overflow-hidden focus:outline-none"
          >
            {/* 装饰背景 */}

            {/* 关闭按钮 */}
            <button
                type="button"
                className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-mist-400 hover:text-white transition-colors disabled:opacity-50"
                onClick={onClose}
                disabled={status === 'exporting'}
                aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 标题区域 */}
            <div className="relative mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-accent" />
                  </div>
                </div>
                <div>
                  <h2 id={titleId} className="text-2xl font-bold text-white">导出报告</h2>
                  <p id={descriptionId} className="text-sm text-mist-500 mt-1">将报告保存为高清图片</p>
                </div>
              </div>
            </div>

            {/* 状态提示 */}
            <>
              {status === 'success' && (
                <div key="success" className="mb-6 p-4 rounded-2xl bg-up/10 border border-up/20 flex items-center gap-3 animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-up" />
                  <span className="text-up text-sm">导出成功！</span>
                </div>
              )}

              {status === 'error' && (
                <div key="error" className="mb-6 p-4 rounded-2xl bg-down/10 border border-down/20 flex items-center gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-down" />
                  <span className="text-down text-sm">{errorMessage}</span>
                </div>
              )}
            </>

            {/* 操作按钮 */}
            <div className="relative space-y-3">
              {/* 下载按钮 */}
              <button
                  className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-base"
                  onClick={handleDownload}
                  disabled={status === 'exporting'}
              >
                {status === 'exporting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在生成图片...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    下载为 PNG 图片
                  </>
                )}
              </button>

              {/* 分享按钮（仅在支持时显示） */}
              {supportsShare && (
                <button
                    className="w-full btn-secondary flex items-center justify-center gap-3 py-4 text-base"
                    onClick={handleShare}
                    disabled={status === 'exporting'}
                >
                  <Share2 className="w-5 h-5" />
                  分享到其他应用
                </button>
              )}
            </div>

            {/* 提示信息 */}
            <div className="relative mt-6 pt-6 border-t border-white/5">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-mist-500 shrink-0 mt-0.5" />
                <p className="text-xs text-mist-500 leading-relaxed">
                  图片将以 2 倍分辨率导出，确保在各种设备上都有清晰的显示效果。
                  {supportsShare && '您也可以直接分享到微信、微博等社交应用。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 导出卡片组件 - 使用 forwardRef 以便获取 DOM 引用
export const ExportableCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`export-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

ExportableCard.displayName = 'ExportableCard';
