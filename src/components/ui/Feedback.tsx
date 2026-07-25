import { type ReactNode } from 'react';
import { cn } from '../../services/utils';

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400',
        sizes[size],
        className,
      )}
    />
  );
}

export function LoadingOverlay({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton mt-3 h-8 w-32 rounded" />
      <div className="skeleton mt-3 h-3 w-20 rounded" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          {icon}
        </div>
      )}
      <div>
        <p className="font-display text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p className="font-display text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
