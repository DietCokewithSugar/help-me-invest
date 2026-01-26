'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UnitMode } from './format-number';

const STORAGE_KEY = 'unit-mode';

interface UnitModeContextType {
    unitMode: UnitMode;
    toggleUnitMode: () => void;
    setUnitMode: (mode: UnitMode) => void;
}

const UnitModeContext = createContext<UnitModeContextType | undefined>(undefined);

interface UnitModeProviderProps {
    children: React.ReactNode;
    defaultMode?: UnitMode;
}

export function UnitModeProvider({ children, defaultMode = 'en' }: UnitModeProviderProps) {
    const [unitMode, setUnitModeState] = useState<UnitMode>(defaultMode);
    const [mounted, setMounted] = useState(false);

    // Load saved preference from localStorage on mount
    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'en' || saved === 'zh') {
                setUnitModeState(saved);
            }
        } catch {
            // localStorage not available
        }
    }, []);

    // Persist to localStorage when mode changes
    useEffect(() => {
        if (mounted) {
            try {
                localStorage.setItem(STORAGE_KEY, unitMode);
            } catch {
                // localStorage not available
            }
        }
    }, [unitMode, mounted]);

    const setUnitMode = useCallback((mode: UnitMode) => {
        setUnitModeState(mode);
    }, []);

    const toggleUnitMode = useCallback(() => {
        setUnitModeState(prev => prev === 'en' ? 'zh' : 'en');
    }, []);

    const value: UnitModeContextType = {
        unitMode,
        toggleUnitMode,
        setUnitMode,
    };

    return (
        <UnitModeContext.Provider value={value}>
            {children}
        </UnitModeContext.Provider>
    );
}

/**
 * Hook to access the unit mode context
 * @returns UnitModeContextType with unitMode, toggleUnitMode, and setUnitMode
 */
export function useUnitMode(): UnitModeContextType {
    const context = useContext(UnitModeContext);
    if (context === undefined) {
        // Return a default if not wrapped in provider (for SSR or testing)
        return {
            unitMode: 'en',
            toggleUnitMode: () => { },
            setUnitMode: () => { },
        };
    }
    return context;
}
