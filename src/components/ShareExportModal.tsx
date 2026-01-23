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
    Sparkles,
} from 'lucide-react';

// ==================== Types ====================
interface ExportSettings {
    fontSize: 'sm' | 'md' | 'lg';
    showQRCode: boolean;
    quality: 1 | 2 | 3;
}

interface ShareExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    contentHtml: string;
    companyName?: string;
    symbol?: string;
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

// ==================== Export Card Component ====================
const ExportCard = React.forwardRef<
    HTMLDivElement,
    {
        title: string;
        contentHtml: string;
        settings: ExportSettings;
        companyName?: string;
        symbol?: string;
    }
>(({ title, contentHtml, settings, companyName, symbol }, ref) => {
    const fontSize = fontSizeConfig[settings.fontSize];

    return (
        <div
            ref={ref}
            className="export-card-wrapper"
            style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #0f0f12 0%, #1a1a22 50%, #0f0f12 100%)',
                minWidth: '400px',
                maxWidth: '600px',
            }}
        >
            {/* Glow effect */}
            <div
                style={{
                    position: 'absolute',
                    inset: '-50px',
                    background: 'radial-gradient(ellipse at 30% 20%, rgba(20, 184, 166, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            {/* Card content */}
            <div
                className="export-card"
                style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '24px',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '20px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Sparkles style={{ width: '18px', height: '18px', color: 'white' }} />
                    </div>
                    <div>
                        <h2
                            style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                color: '#ffffff',
                                margin: 0,
                                fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif',
                            }}
                        >
                            {title}
                        </h2>
                        {companyName && (
                            <p
                                style={{
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.5)',
                                    margin: '4px 0 0 0',
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                {companyName} {symbol && `(${symbol})`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div
                    className="export-content prose prose-invert"
                    style={{
                        fontSize: fontSize.value,
                        lineHeight: fontSize.lineHeight,
                        color: 'rgba(255,255,255,0.85)',
                        fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif',
                    }}
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {/* Footer with QR code option */}
                {settings.showQRCode && (
                    <div
                        style={{
                            marginTop: '24px',
                            paddingTop: '16px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                AI 投资研究报告
                            </span>
                        </div>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                background: 'white',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <QrCode style={{ width: '32px', height: '32px', color: '#0a0a0b' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Watermark */}
            <div
                style={{
                    marginTop: '12px',
                    textAlign: 'center',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.3)',
                    fontFamily: '"JetBrains Mono", monospace',
                }}
            >
                Generated by Help Me Invest · AI Powered
            </div>
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
}: ShareExportModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<ExportStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [settings, setSettings] = useState<ExportSettings>({
        fontSize: 'md',
        showQRCode: true,
        quality: 2,
    });
    const [supportsShare] = useState(() =>
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function'
    );

    // Reset status when modal opens
    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMessage('');
        }
    }, [isOpen]);

    // Generate image blob
    const generateImage = useCallback(async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;

        try {
            const dataUrl = await toPng(cardRef.current, {
                quality: 1,
                pixelRatio: settings.quality,
                backgroundColor: '#0a0a0f',
                cacheBust: true,
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
    }, [settings.quality]);

    // Download image
    const handleDownload = useCallback(async () => {
        setStatus('exporting');
        setErrorMessage('');

        try {
            if (!cardRef.current) {
                throw new Error('无法找到要导出的内容');
            }

            const dataUrl = await toPng(cardRef.current, {
                quality: 1,
                pixelRatio: settings.quality,
                backgroundColor: '#0a0a0f',
                cacheBust: true,
            });

            const link = document.createElement('a');
            link.download = `${symbol || 'report'}_${title}.png`;
            link.href = dataUrl;
            link.click();

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
    }, [settings.quality, symbol, title, onClose]);

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
                        className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-lg overflow-hidden max-h-[90vh] flex flex-col"
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
                                    <h2 className="text-lg font-semibold text-white">分享模块</h2>
                                    <p className="text-xs text-mist-500">{title}</p>
                                </div>
                            </div>
                            <motion.button
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist-400 hover:text-white transition-colors"
                                onClick={onClose}
                                disabled={status === 'exporting'}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
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
