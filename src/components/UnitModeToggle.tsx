'use client';

import { RefreshCw } from 'lucide-react';
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
            className={`gemini-btn gemini-btn-secondary flex items-center gap-2 ${className}`}
            title={unitMode === 'en' ? '切换到中文单位 (万/亿)' : '切换到英文单位 (M/B)'}
        >
            <span>{unitMode === 'en' ? 'M/B' : '万/亿'}</span>
            <RefreshCw className="w-4 h-4" />
        </button>
    );
}
