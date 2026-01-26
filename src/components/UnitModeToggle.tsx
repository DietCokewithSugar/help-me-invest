'use client';

import { useUnitMode } from '@/lib/UnitModeContext';

interface UnitModeToggleProps {
    className?: string;
}

/**
 * Toggle button for switching between English and Chinese unit modes
 */
export default function UnitModeToggle({ className = '' }: UnitModeToggleProps) {
    const { unitMode, toggleUnitMode } = useUnitMode();

    return (
        <button
            onClick={toggleUnitMode}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-all border ${unitMode === 'zh'
                    ? 'bg-glacier-500/20 border-glacier-500/30 text-glacier-400'
                    : 'bg-white/5 border-white/10 text-mist-400 hover:text-white hover:bg-white/10'
                } ${className}`}
            title={unitMode === 'en' ? '切换到中文单位 (万/亿)' : 'Switch to English units (M/B)'}
        >
            <span className={`transition-opacity ${unitMode === 'en' ? 'opacity-100' : 'opacity-50'}`}>
                En
            </span>
            <span className="text-mist-600">/</span>
            <span className={`transition-opacity ${unitMode === 'zh' ? 'opacity-100' : 'opacity-50'}`}>
                中
            </span>
        </button>
    );
}
