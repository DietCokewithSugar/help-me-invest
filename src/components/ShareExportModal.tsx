'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toPng } from 'html-to-image';
import {
    X,
    Download,
    Share2,
    Loader2,
    CheckCircle,
    AlertCircle,
    Smartphone,
    QrCode,
    Type,
    Sun,
    Moon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalA11y } from '@/hooks/useModalA11y';

// ==================== Types ====================
interface ExportSettings {
    fontSize: 'sm' | 'md' | 'lg';
    showQRCode: boolean;
    quality: 1 | 2 | 3;
    theme: 'dark' | 'light';
}

interface ShareExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    contentHtml: string;
    companyName?: string;
    symbol?: string;
    theme?: 'dark' | 'light';
}

// ==================== Animation Variants ====================
const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', damping: 25, stiffness: 300 },
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const buttonVariants: Variants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
};

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

// ==================== Font Size Config ====================
const fontSizeConfig = {
    sm: { label: 'S', value: '14px', lineHeight: '1.6' },
    md: { label: 'M', value: '16px', lineHeight: '1.7' },
    lg: { label: 'L', value: '18px', lineHeight: '1.8' },
};

// ==================== Theme Config ====================
const themeConfig = {
    dark: {
        wrapper: 'linear-gradient(135deg, #0f0f12 0%, #1a1a22 50%, #0f0f12 100%)',
        glow: 'radial-gradient(ellipse at 30% 20%, rgba(20, 184, 166, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        card: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
        cardBorder: 'rgba(255,255,255,0.1)',
        headerBorder: 'rgba(255,255,255,0.08)',
        title: '#ffffff',
        subtitle: 'rgba(255,255,255,0.5)',
        content: 'rgba(255,255,255,0.85)',
        footerBorder: 'rgba(255,255,255,0.08)',
        footerText: 'rgba(255,255,255,0.4)',
        qrBg: 'white',
        qrIcon: '#0a0a0b',
        watermark: 'rgba(255,255,255,0.3)',
        exportBg: '#0a0a0f',
    },
    light: {
        wrapper: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        glow: 'radial-gradient(ellipse at 30% 20%, rgba(20, 184, 166, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
        card: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
        cardBorder: 'rgba(0,0,0,0.08)',
        headerBorder: 'rgba(0,0,0,0.06)',
        title: '#1e293b',
        subtitle: 'rgba(30,41,59,0.6)',
        content: '#334155',
        footerBorder: 'rgba(0,0,0,0.06)',
        footerText: 'rgba(30,41,59,0.5)',
        qrBg: '#1e293b',
        qrIcon: '#ffffff',
        watermark: 'rgba(30,41,59,0.4)',
        exportBg: '#f8fafc',
    },
};

// ==================== HTML Content Processor ====================
function processContentHtml(html: string, inputTheme: typeof themeConfig.dark | undefined): string {
    // 防止 theme 为 undefined 的情况，使用 const 变量确保 TypeScript 类型安全
    const theme = inputTheme ?? themeConfig.dark;

    // 创建一个临时的 DOM 解析器来处理 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild as HTMLElement;

    // 递归处理所有元素，添加内联样式
    function processElement(el: Element) {
        const tagName = el.tagName.toLowerCase();
        const htmlEl = el as HTMLElement;
        const style = htmlEl.style;
        // SVG 元素的 className 是 SVGAnimatedString，需要特殊处理
        // 使用 getAttribute 作为通用方法，兼容 HTML 和 SVG 元素
        const className = el.getAttribute('class') || '';

        // 确保所有元素可见（移除可能的隐藏样式）
        style.opacity = '1';
        style.height = 'auto';
        style.overflow = 'visible';
        style.visibility = 'visible';

        // 移除过渡动画
        style.transition = 'none';

        // 为不同元素类型设置颜色
        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                style.color = theme.title;
                style.fontWeight = '600';
                style.marginTop = '0.75em';
                style.marginBottom = '0.5em';
                break;
            case 'p':
                style.color = theme.content;
                style.marginTop = '0.5em';
                style.marginBottom = '0.5em';
                break;
            case 'strong':
            case 'b':
                style.color = theme.title;
                style.fontWeight = '600';
                break;
            case 'ul':
            case 'ol':
                style.color = theme.content;
                style.paddingLeft = '1.5em';
                style.marginTop = '0.5em';
                style.marginBottom = '0.5em';
                break;
            case 'li':
                style.color = theme.content;
                style.marginTop = '0.25em';
                style.marginBottom = '0.25em';
                break;
            case 'a':
                style.color = '#14b8a6';
                break;
            case 'code':
                style.fontFamily = '"JetBrains Mono", monospace';
                style.fontSize = '0.9em';
                break;
            case 'blockquote':
                style.borderLeft = '3px solid #14b8a6';
                style.paddingLeft = '1em';
                style.marginTop = '0.75em';
                style.marginBottom = '0.75em';
                style.color = theme.content;
                break;
            case 'span':
                // 处理 span 元素的颜色类
                if (className.includes('text-mist') || className.includes('text-white')) {
                    style.color = theme.content;
                }
                if (className.includes('text-glacier') || className.includes('text-emerald')) {
                    style.color = '#14b8a6';
                }
                if (className.includes('text-red')) {
                    style.color = '#ef4444';
                }
                break;
            case 'div':
                // 为 div 设置默认颜色
                style.color = theme.content;
                // 清理可能的背景和边框（用于卡片容器）
                if (className.includes('bg-white') || className.includes('gemini-card')) {
                    style.background = 'transparent';
                    style.border = 'none';
                    style.padding = '0';
                }
                break;
            case 'button':
                // 隐藏按钮元素（如分享按钮、折叠按钮）
                style.display = 'none';
                break;
            case 'svg':
                // 隐藏 SVG 图标（如 loading spinner）
                if (className.includes('animate-spin')) {
                    style.display = 'none';
                }
                break;
            case 'table':
                style.width = '100%';
                style.borderCollapse = 'collapse';
                style.tableLayout = 'fixed';
                style.marginTop = '0.75em';
                style.marginBottom = '0.75em';
                style.fontSize = '0.9em';
                break;
            case 'thead':
                style.borderBottom = `2px solid ${theme.headerBorder}`;
                break;
            case 'tbody':
                // tbody 不需要额外样式
                break;
            case 'tr':
                style.borderBottom = `1px solid ${theme.headerBorder}`;
                break;
            case 'th':
                style.color = theme.title;
                style.fontWeight = '600';
                style.textAlign = 'left';
                style.padding = '8px 12px';
                style.whiteSpace = 'nowrap';
                style.overflow = 'hidden';
                style.textOverflow = 'ellipsis';
                break;
            case 'td':
                style.color = theme.content;
                style.padding = '8px 12px';
                style.verticalAlign = 'top';
                style.wordBreak = 'break-word';
                break;
            default:
                // 对于其他元素，设置默认颜色
                style.color = theme.content;
        }

        // 递归处理子元素
        Array.from(el.children).forEach(child => processElement(child));
    }

    if (container) {
        processElement(container);
        return container.innerHTML;
    }
    return html;
}

// ==================== Export Card Component ====================
const ExportCard = React.forwardRef<
    HTMLDivElement,
    {
        title: string;
        contentHtml: string;
        settings: ExportSettings;
        companyName?: string;
        symbol?: string;
        t: { shareExportCard: { investReport: string } };
    }
>(({ title, contentHtml, settings, companyName, symbol, t }, ref) => {
    const fontSize = fontSizeConfig[settings.fontSize] ?? fontSizeConfig.md;
    const theme = themeConfig[settings.theme] ?? themeConfig.dark;

    // 处理 HTML 内容，添加内联样式
    const processedHtml = React.useMemo(() => {
        if (typeof window === 'undefined') return contentHtml;
        return processContentHtml(contentHtml, theme);
    }, [contentHtml, theme]);

    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (contentRef.current && processedHtml) {
            contentRef.current.innerHTML = processedHtml;
        }
    }, [processedHtml]);

    return (
        <div
            ref={ref}
            className="export-card-wrapper"
            style={{
                padding: '24px',
                background: settings.theme === 'dark' ? '#0f0f12' : '#f8fafc',
                width: '600px',
                minWidth: '400px',
                maxWidth: '600px',
            }}
        >
            {/* Card content */}
            <div
                className="export-card"
                style={{
                    background: settings.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.95)',
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: settings.theme === 'light' ? '0 4px 24px rgba(0,0,0,0.08)' : 'none',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '16px',
                        borderBottom: `1px solid ${theme.headerBorder}`,
                    }}
                >
                    <div>
                        <h2
                            style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                color: theme.title,
                                margin: 0,
                                fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif',
                            }}
                        >
                            {companyName ? `${companyName} ${t.shareExportCard.investReport}` : title}
                        </h2>
                        <p
                            style={{
                                fontSize: '12px',
                                color: theme.subtitle,
                                margin: '4px 0 0 0',
                                fontFamily: '"JetBrains Mono", monospace',
                            }}
                        >
                            {symbol && `${symbol} · `}{title}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div
                    ref={contentRef}
                    className="export-content"
                    style={{
                        fontSize: fontSize.value,
                        lineHeight: fontSize.lineHeight,
                        color: theme.content,
                        fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif',
                    }}
                />

                {/* Footer with QR code option */}
                {settings.showQRCode && (
                    <div
                        style={{
                            marginTop: '24px',
                            paddingTop: '16px',
                            borderTop: `1px solid ${theme.footerBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span
                                style={{
                                    fontSize: '13px',
                                    color: theme.title,
                                    fontWeight: 600,
                                    fontFamily: '"Noto Serif SC", "Songti SC", serif',
                                }}
                            >
                                智投研究
                            </span>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: theme.footerText,
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                https://www.help-me-invest.com
                            </span>
                        </div>
                        <div
                            style={{
                                width: '56px',
                                height: '56px',
                                background: 'white',
                                borderRadius: '6px',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <img
                                src="/web-qrcode.png"
                                alt="扫码访问网站"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Watermark: 仅在未展示二维码时显示，避免信息重复 */}
            {!settings.showQRCode && (
                <div
                    style={{
                        marginTop: '12px',
                        textAlign: 'center',
                        fontSize: '10px',
                        color: theme.watermark,
                        fontFamily: '"JetBrains Mono", monospace',
                    }}
                >
                    智投研究 · help-me-invest.com · AI Powered
                </div>
            )}
        </div>
    );
});

ExportCard.displayName = 'ExportCard';

// ==================== Main Modal Component ====================
export default function ShareExportModal({
    isOpen,
    onClose,
    title,
    contentHtml,
    companyName,
    symbol,
    theme = 'dark',
}: ShareExportModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();
    const [status, setStatus] = useState<ExportStatus>('idle');
    const { dialogRef, titleId, descriptionId } = useModalA11y({
        isOpen,
        onClose,
        // Don't let ESC abort an in-flight image export.
        closeOnEscape: status !== 'exporting',
    });
    const [errorMessage, setErrorMessage] = useState('');
    const [settings, setSettings] = useState<ExportSettings>({
        fontSize: 'md',
        showQRCode: true,
        quality: 2,
        theme: 'dark',
    });
    const [supportsShare] = useState(() =>
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function'
    );

    // Reset status and theme when modal opens
    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMessage('');
            setSettings(s => ({ ...s, theme }));
        }
    }, [isOpen, theme]);

    // Generate image blob
    const generateImage = useCallback(async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;

        try {
            // 等待所有字体加载完成
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const currentTheme = themeConfig[settings.theme] ?? themeConfig.dark;
            const rect = cardRef.current.getBoundingClientRect();
            const dataUrl = await toPng(cardRef.current, {
                quality: 1,
                pixelRatio: settings.quality,
                backgroundColor: currentTheme.exportBg,
                cacheBust: false,
                skipFonts: true,
                width: rect.width,
                height: rect.height,
                style: {
                    transform: 'none',
                },
            });

            const response = await fetch(dataUrl);
            return await response.blob();
        } catch (error) {
            console.error('生成图片失败:', error);
            throw error;
        }
    }, [settings.quality, settings.theme]);

    // Download image
    const handleDownload = useCallback(async () => {
        setStatus('exporting');
        setErrorMessage('');

        try {
            if (!cardRef.current) {
                throw new Error('无法找到要导出的内容');
            }

            // 等待所有字体加载完成
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // 等待两帧确保布局完全稳定
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const currentTheme = themeConfig[settings.theme] ?? themeConfig.dark;
            const rect = cardRef.current.getBoundingClientRect();
            const dataUrl = await toPng(cardRef.current, {
                quality: 1,
                pixelRatio: settings.quality,
                backgroundColor: currentTheme.exportBg,
                cacheBust: false,
                skipFonts: true,
                width: rect.width,
                height: rect.height,
                style: {
                    transform: 'none',
                },
            });

            const link = document.createElement('a');
            link.download = `${symbol || 'report'}_${title}.png`;
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
    }, [settings.quality, settings.theme, symbol, title, onClose]);

    // Share image
    const handleShare = useCallback(async () => {
        setStatus('exporting');
        setErrorMessage('');

        try {
            const blob = await generateImage();
            if (!blob) {
                throw new Error('无法生成图片');
            }

            const file = new File([blob], `${symbol || 'report'}_${title}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `${companyName || ''} - ${title}`,
                    text: 'AI 生成的投资研究报告',
                    files: [file],
                });
                setStatus('success');
                setTimeout(() => {
                    setStatus('idle');
                    onClose();
                }, 1500);
            } else {
                handleDownload();
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setStatus('idle');
                return;
            }
            console.error('分享失败:', error);
            setStatus('error');
            setErrorMessage(error.message || '分享失败，请尝试下载');
            setTimeout(() => setStatus('idle'), 3000);
        }
    }, [generateImage, symbol, title, companyName, handleDownload, onClose]);

    // Handle backdrop click
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
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal */}
                    <motion.div
                        ref={dialogRef as any}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={descriptionId}
                        tabIndex={-1}
                        className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-lg overflow-hidden max-h-[90vh] flex flex-col focus:outline-none"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-glacier-500 to-blue-500 flex items-center justify-center">
                                    <Share2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 id={titleId} className="text-lg font-semibold text-white">{t.shareModal.title}</h2>
                                    <p id={descriptionId} className="text-xs text-mist-500">{companyName ? `${companyName} · ${title}` : title}</p>
                                </div>
                            </div>
                            <motion.button
                                type="button"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-mist-400 hover:text-white transition-colors disabled:opacity-50"
                                onClick={onClose}
                                disabled={status === 'exporting'}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label={t.common.close || 'Close'}
                            >
                                <X className="w-4 h-4" />
                            </motion.button>
                        </div>

                        {/* Preview Area */}
                        <div className="flex-1 overflow-y-auto p-4 bg-obsidian">
                            <div className="flex justify-center">
                                <ExportCard
                                    ref={cardRef}
                                    title={title}
                                    contentHtml={contentHtml}
                                    settings={settings}
                                    companyName={companyName}
                                    symbol={symbol}
                                    t={t}
                                />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-t border-white/10 bg-surface space-y-4">
                            {/* Settings Row */}
                            <div className="flex flex-wrap items-center gap-4">
                                {/* Font Size */}
                                <div className="flex items-center gap-2">
                                    <Type className="w-4 h-4 text-mist-500" />
                                    <span className="text-xs text-mist-500">字体</span>
                                    <div className="flex bg-white/5 rounded-md p-0.5">
                                        {(['sm', 'md', 'lg'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setSettings((s) => ({ ...s, fontSize: size }))}
                                                className={`px-3 py-1 text-xs font-medium rounded transition-all ${settings.fontSize === size
                                                    ? 'bg-glacier-500 text-white'
                                                    : 'text-mist-400 hover:text-white'
                                                    }`}
                                            >
                                                {fontSizeConfig[size].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* QR Code Toggle */}
                                <button
                                    onClick={() => setSettings((s) => ({ ...s, showQRCode: !s.showQRCode }))}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all ${settings.showQRCode
                                        ? 'bg-glacier-500/20 text-glacier-400 border border-glacier-500/30'
                                        : 'bg-white/5 text-mist-400 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <QrCode className="w-3.5 h-3.5" />
                                    二维码
                                </button>

                                {/* Quality */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-mist-500">清晰度</span>
                                    <div className="flex bg-white/5 rounded-md p-0.5">
                                        {([1, 2, 3] as const).map((q) => (
                                            <button
                                                key={q}
                                                onClick={() => setSettings((s) => ({ ...s, quality: q }))}
                                                className={`px-2 py-1 text-xs font-medium rounded transition-all ${settings.quality === q
                                                    ? 'bg-glacier-500 text-white'
                                                    : 'text-mist-400 hover:text-white'
                                                    }`}
                                            >
                                                {q}x
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme Toggle */}
                                <button
                                    onClick={() => setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all ${settings.theme === 'light'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-white/5 text-mist-400 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {settings.theme === 'dark' ? (
                                        <Moon className="w-3.5 h-3.5" />
                                    ) : (
                                        <Sun className="w-3.5 h-3.5" />
                                    )}
                                    {settings.theme === 'dark' ? '深色' : '浅色'}
                                </button>
                            </div>

                            {/* Status Messages */}
                            <AnimatePresence mode="wait">
                                {status === 'success' && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3"
                                    >
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                        <span className="text-emerald-400 text-sm">导出成功！</span>
                                    </motion.div>
                                )}

                                {status === 'error' && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-red-400 text-sm">{errorMessage}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <motion.button
                                    className="flex-1 gemini-btn gemini-btn-primary flex items-center justify-center gap-2 py-3"
                                    variants={buttonVariants}
                                    initial="idle"
                                    whileHover="hover"
                                    whileTap="tap"
                                    onClick={handleDownload}
                                    disabled={status === 'exporting'}
                                >
                                    {status === 'exporting' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            正在生成...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            保存图片
                                        </>
                                    )}
                                </motion.button>

                                {supportsShare && (
                                    <motion.button
                                        className="gemini-btn gemini-btn-secondary flex items-center justify-center gap-2 py-3 px-6"
                                        variants={buttonVariants}
                                        initial="idle"
                                        whileHover="hover"
                                        whileTap="tap"
                                        onClick={handleShare}
                                        disabled={status === 'exporting'}
                                    >
                                        <Share2 className="w-4 h-4" />
                                        分享
                                    </motion.button>
                                )}
                            </div>

                            {/* Tip */}
                            <div className="flex items-start gap-2 text-xs text-mist-500">
                                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>
                                    图片将以 {settings.quality}x 分辨率导出，确保清晰显示。
                                    {supportsShare && ' 也可直接分享到其他应用。'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
