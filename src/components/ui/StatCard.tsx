import { type ReactNode } from 'react';
import { cn, formatNumber } from '../../services/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  accent?: 'brand' | 'red' | 'orange' | 'emerald' | 'amber' | 'cyan';
  hint?: string;
}

const accents: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
};

export function StatCard({ label, value, icon, trend, accent = 'brand', hint }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
            accents[accent],
          )}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              trend.direction === 'up' &&
                'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
              trend.direction === 'down' &&
                'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
              trend.direction === 'flat' &&
                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            )}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">vs last period</span>
        </div>
      )}
    </div>
  );
}
