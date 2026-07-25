import { cn } from '../../services/utils';

interface HeatmapTableProps {
  rows: string[];
  cols: string[];
  values: number[][];
  rowLabel?: string;
}

export function HeatmapTable({ rows, cols, values, rowLabel }: HeatmapTableProps) {
  const flat = values.flat().filter((v) => v > 0);
  const max = flat.length ? Math.max(...flat) : 1;

  const colorFor = (v: number) => {
    if (v === 0) return 'rgba(148,163,184,0.06)';
    const ratio = v / max;
    if (ratio > 0.75) return 'rgba(239,68,68,0.85)';
    if (ratio > 0.5) return 'rgba(249,115,22,0.75)';
    if (ratio > 0.25) return 'rgba(245,158,11,0.6)';
    return 'rgba(34,197,94,0.5)';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {rowLabel ?? ''}
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="px-1.5 py-1.5 text-center font-medium text-slate-500 dark:text-slate-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {r}
              </td>
              {cols.map((c, ci) => {
                const v = values[ri]?.[ci] ?? 0;
                return (
                  <td key={c} className="p-0.5">
                    <div
                      className="flex h-9 min-w-[34px] items-center justify-center rounded transition-all duration-200 hover:ring-2 hover:ring-brand-400/50"
                      style={{ backgroundColor: colorFor(v) }}
                      title={`${r} · ${c}: ${v}`}
                    >
                      <span
                        className={cn(
                          'text-[10px] font-semibold',
                          v > max * 0.5 ? 'text-white' : 'text-slate-600 dark:text-slate-300',
                        )}
                      >
                        {v > 0 ? v : ''}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          {['rgba(34,197,94,0.5)', 'rgba(245,158,11,0.6)', 'rgba(249,115,22,0.75)', 'rgba(239,68,68,0.85)'].map((c) => (
            <div key={c} className="h-3 w-6 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

export function PatternTable<T extends object>({
  data,
  columns,
}: {
  data: T[];
  columns: { key: string; label: string; render?: (v: unknown, row: T) => React.ReactNode }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  {c.render ? c.render(row[c.key as keyof T], row) : String(row[c.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
