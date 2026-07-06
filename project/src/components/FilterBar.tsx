import { useEffect, useState } from 'react';
import { Search, MapPin, Calendar, Filter, RotateCcw } from 'lucide-react';
import { useFilters } from '../services/filterContext';
import { CRIME_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../services/analytics';
import { fetchDistricts, fetchStates } from '../services/dataLayer';
import { Select } from './ui/Select';
import { cn } from '../services/utils';
import type { CrimeType, CrimeSeverity } from '../services/types';

export function FilterBar({ compact = false }: { compact?: boolean }) {
  const f = useFilters();
  const [districts, setDistricts] = useState<{ district: string; state: string }[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [open, setOpen] = useState(!compact);

  useEffect(() => {
    (async () => {
      try {
        const [d, s] = await Promise.all([fetchDistricts(), fetchStates()]);
        setDistricts(d);
        setStates(s);
      } catch {
        // ignore
      }
    })();
  }, []);

  const activeCount =
    (f.filters.dateFrom ? 1 : 0) +
    (f.filters.dateTo ? 1 : 0) +
    (f.filters.district ? 1 : 0) +
    (f.filters.state ? 1 : 0) +
    (f.filters.crimeType ? 1 : 0) +
    (f.filters.severity ? 1 : 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={f.filters.search}
            onChange={(e) => f.setSearch(e.target.value)}
            placeholder="Search district, crime type, description..."
            className={cn(
              'h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400',
              'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500',
            )}
          />
        </div>

        {compact && (
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
              open || activeCount > 0
                ? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        )}

        {activeCount > 0 && (
          <button
            onClick={f.reset}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {open && (
        <div className="grid animate-fade-in grid-cols-1 gap-3 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 dark:border-slate-800">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">From date</span>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={f.filters.dateFrom ?? ''}
                onChange={(e) => f.setDateFrom(e.target.value || null)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">To date</span>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={f.filters.dateTo ?? ''}
                onChange={(e) => f.setDateTo(e.target.value || null)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </label>
          <Select
            label="State"
            icon={<MapPin className="h-4 w-4" />}
            value={f.filters.state ?? ''}
            onChange={(v) => {
              f.setState(v || null);
              f.setDistrict(null);
            }}
            placeholder="All states"
            options={states.map((s) => ({ label: s, value: s }))}
          />
          <Select
            label="District"
            value={f.filters.district ?? ''}
            onChange={(v) => f.setDistrict(v || null)}
            placeholder="All districts"
            options={districts
              .filter((d) => !f.filters.state || d.state === f.filters.state)
              .map((d) => ({ label: `${d.district}`, value: d.district }))}
          />
          <Select
            label="Crime type"
            value={f.filters.crimeType ?? ''}
            onChange={(v) => f.setCrimeType((v || null) as CrimeType | null)}
            placeholder="All types"
            options={CRIME_TYPE_OPTIONS}
          />
          <Select
            label="Severity"
            value={f.filters.severity ?? ''}
            onChange={(v) => f.setSeverity((v || null) as CrimeSeverity | null)}
            placeholder="All severities"
            options={SEVERITY_OPTIONS}
          />
        </div>
      )}
    </div>
  );
}
