import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatPct(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function severityColor(sev: string): string {
  switch (sev) {
    case 'Critical':
      return 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30';
    case 'High':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-orange-500/30';
    case 'Medium':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30';
    default:
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30';
  }
}

export function riskColor(risk: string): string {
  switch (risk) {
    case 'High':
      return 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30';
    case 'Medium':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-orange-500/30';
    default:
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30';
  }
}

export function riskHex(risk: string): string {
  switch (risk) {
    case 'High':
      return '#ef4444';
    case 'Medium':
      return '#f97316';
    default:
      return '#22c55e';
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export function errorMessage(e: unknown, fallback = 'Request failed'): string {
  return e instanceof Error ? e.message : fallback;
}
