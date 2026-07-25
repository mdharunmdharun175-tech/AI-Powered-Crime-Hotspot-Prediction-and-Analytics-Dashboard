import { type ReactNode } from 'react';
import { cn } from '../../services/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'severity' | 'risk' | 'status' | 'brand';
  value?: string;
  className?: string;
}

const severityMap: Record<string, string> = {
  Critical: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30',
  High: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30',
  Medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30',
  Low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30',
};

const riskMap: Record<string, string> = {
  High: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30',
  Medium: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30',
  Low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30',
};

const statusMap: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30',
  'Under Investigation':
    'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30',
  Closed: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'Arrest Made':
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30',
};

export function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let cls = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  if (variant === 'severity' && value) cls = severityMap[value] ?? cls;
  if (variant === 'risk' && value) cls = riskMap[value] ?? cls;
  if (variant === 'status' && value) cls = statusMap[value] ?? cls;
  if (variant === 'brand')
    cls = 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 ring-1 ring-brand-500/20';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        cls,
        className,
      )}
    >
      {children}
    </span>
  );
}
