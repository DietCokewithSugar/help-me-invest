'use client';

import { forwardRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLDivElement>;
  fileName: string;
}

// 动画变体
const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 300,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
};

const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
        >
          {/* 背景遮罩 */}
          <motion.div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* 模态框内容 */}
          <motion.div
            className="relative w-full max-w-md gemini-card p-8 overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* 装饰背景 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gemini-blue/10 to-gemini-purple/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-gemini-pink/10 to-gemini-yellow/5 rounded-full blur-3xl pointer-events-none" />

            {/* 关闭按钮 */}
            <motion.button
              className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist-400 hover:text-white transition-colors"
              onClick={onClose}
              disabled={status === 'exporting'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* 标题区域 */}
            <div className="relative mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gemini-blue to-gemini-pink opacity-40 blur-2xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">导出报告</h2>
                  <p className="text-sm text-mist-500 mt-1">将报告保存为高清图片</p>
                </div>
              </div>
            </div>

            {/* 状态提示 */}
            <AnimatePresence mode="wait">
              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-gemini-green/10 border border-gemini-green/20 flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-gemini-green" />
                  <span className="text-gemini-green text-sm">导出成功！</span>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 操作按钮 */}
            <div className="relative space-y-3">
              {/* 下载按钮 */}
              <motion.button
                className="w-full gemini-btn gemini-btn-primary flex items-center justify-center gap-3 py-4 text-base"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
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
              </motion.button>

              {/* 分享按钮（仅在支持时显示） */}
              {supportsShare && (
                <motion.button
                  className="w-full gemini-btn gemini-btn-secondary flex items-center justify-center gap-3 py-4 text-base"
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleShare}
                  disabled={status === 'exporting'}
                >
                  <Share2 className="w-5 h-5" />
                  分享到其他应用
                </motion.button>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
