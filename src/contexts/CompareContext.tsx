'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface CompareCompany {
  symbol: string;
  companyName: string;
  market: string;
  image?: string;
  price?: number;
  changePercentage?: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
}

interface CompareContextType {
  companies: CompareCompany[];
  addCompany: (company: CompareCompany) => boolean;
  removeCompany: (symbol: string) => void;
  clearAll: () => void;
  isInCompare: (symbol: string) => boolean;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextType>({
  companies: [],
  addCompany: () => false,
  removeCompany: () => {},
  clearAll: () => {},
  isInCompare: () => false,
  isFull: false,
});

export function CompareProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<CompareCompany[]>([]);

  const addCompany = useCallback((company: CompareCompany): boolean => {
    if (companies.length >= 3) return false;
    if (companies.some(c => c.symbol === company.symbol)) return false;
    setCompanies(prev => [...prev, company]);
    return true;
  }, [companies]);

  const removeCompany = useCallback((symbol: string) => {
    setCompanies(prev => prev.filter(c => c.symbol !== symbol));
  }, []);

  const clearAll = useCallback(() => {
    setCompanies([]);
  }, []);

  const isInCompare = useCallback((symbol: string) => {
    return companies.some(c => c.symbol === symbol);
  }, [companies]);

  return (
    <CompareContext.Provider value={{
      companies,
      addCompany,
      removeCompany,
      clearAll,
      isInCompare,
      isFull: companies.length >= 3,
    }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  return useContext(CompareContext);
}
