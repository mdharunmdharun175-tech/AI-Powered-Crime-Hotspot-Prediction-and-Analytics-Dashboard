import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CrimeFilters, CrimeType, CrimeSeverity } from './types';

interface FilterContextValue {
  filters: CrimeFilters;
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setDistrict: (v: string | null) => void;
  setState: (v: string | null) => void;
  setCrimeType: (v: CrimeType | null) => void;
  setSeverity: (v: CrimeSeverity | null) => void;
  setSearch: (v: string) => void;
  reset: () => void;
}

const defaultFilters: CrimeFilters = {
  dateFrom: null,
  dateTo: null,
  district: null,
  state: null,
  crimeType: null,
  severity: null,
  search: '',
};

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<CrimeFilters>(defaultFilters);

  const update = (patch: Partial<CrimeFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const value: FilterContextValue = {
    filters,
    setDateFrom: (v) => update({ dateFrom: v }),
    setDateTo: (v) => update({ dateTo: v }),
    setDistrict: (v) => update({ district: v }),
    setState: (v) => update({ state: v }),
    setCrimeType: (v) => update({ crimeType: v }),
    setSeverity: (v) => update({ severity: v }),
    setSearch: (v) => update({ search: v }),
    reset: () => setFilters(defaultFilters),
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
