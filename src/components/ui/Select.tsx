import { type ReactNode } from 'react';
import { cn } from '../../services/utils';

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  label?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  icon,
  className,
  label,
}: SelectProps) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors',
            'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-brand-500',
            icon && 'pl-9',
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}
