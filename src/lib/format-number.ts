'use client';

/**
 * Unit mode for number formatting
 * - 'en': English units (T, B, M, K)
 * - 'zh': Chinese units (万亿, 亿, 万)
 */
export type UnitMode = 'en' | 'zh';

/**
 * Format a number with appropriate unit suffix based on the unit mode
 * 
 * @param num - The number to format
 * @param mode - The unit mode ('en' for English, 'zh' for Chinese)
 * @returns Formatted string with unit suffix
 * 
 * @example
 * formatNumber(1234567890, 'en') // '1.23B'
 * formatNumber(1234567890, 'zh') // '12.35亿'
 */
export function formatNumber(
    num: number | undefined | null,
    mode: UnitMode = 'en'
): string {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';

    const absNum = Math.abs(num);

    if (mode === 'zh') {
        // Chinese units: 万亿, 亿, 万
        // 万亿 (wan yi) = 10^12 (trillion)
        // 亿 (yi) = 10^8 (100 million)
        // 万 (wan) = 10^4 (10 thousand)
        if (absNum >= 1e12) return (num / 1e12).toFixed(2) + '万亿';
        if (absNum >= 1e8) return (num / 1e8).toFixed(2) + '亿';
        if (absNum >= 1e4) return (num / 1e4).toFixed(2) + '万';
        return num.toFixed(2);
    }

    // English units: T, B, M, K
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

/**
 * Get the unit suffix for chart axis labels
 * 
 * @param mode - The unit mode
 * @param scale - The scale multiplier applied to the values (e.g., 1e9 for billions)
 * @returns The appropriate unit suffix string
 */
export function getUnitSuffix(mode: UnitMode, scale: number): string {
    if (mode === 'zh') {
        if (scale >= 1e12) return '万亿';
        if (scale >= 1e8) return '亿';
        if (scale >= 1e4) return '万';
        return '';
    }

    if (scale >= 1e12) return 'T';
    if (scale >= 1e9) return 'B';
    if (scale >= 1e6) return 'M';
    if (scale >= 1e3) return 'K';
    return '';
}

/**
 * Format a chart value based on the unit mode
 * Used for chart labels and tooltips where values are pre-scaled
 * 
 * @param value - The pre-scaled value
 * @param mode - The unit mode
 * @param originalScale - The scale that was applied (e.g., 1e9 for B)
 * @returns Formatted string with appropriate unit
 */
export function formatChartValue(
    value: number,
    mode: UnitMode,
    originalScale: number
): string {
    // Reconstruct the original value
    const originalValue = value * originalScale;

    if (mode === 'zh') {
        // Convert to Chinese units
        if (Math.abs(originalValue) >= 1e12) {
            return (originalValue / 1e12).toFixed(2) + '万亿';
        }
        if (Math.abs(originalValue) >= 1e8) {
            return (originalValue / 1e8).toFixed(2) + '亿';
        }
        if (Math.abs(originalValue) >= 1e4) {
            return (originalValue / 1e4).toFixed(2) + '万';
        }
        return originalValue.toFixed(2);
    }

    // English: just return the value with the original scale suffix
    const suffix = getUnitSuffix('en', originalScale);
    return value.toFixed(2) + suffix;
}
