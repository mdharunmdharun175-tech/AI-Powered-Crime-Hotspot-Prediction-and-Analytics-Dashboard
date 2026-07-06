import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, PieChart as PieIcon, Map, Clock, Download } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ErrorState, EmptyState } from '../components/ui/Feedback';
import { LineChart, MultiLineChart, BarChartV, BarChartH, PieChart, DoughnutChart } from '../components/charts/Charts';
import { HeatmapTable, PatternTable } from '../components/charts/HeatmapTable';
import { fetchAllCrimesForAnalytics, computeAnalytics, WEEKDAY_LABELS_EXPORT } from '../services/analytics';
import { useFilters } from '../services/filterContext';
import { exportCrimesToCsv } from '../services/reports';
import { errorMessage } from '../services/utils';
import type { Crime, AnalyticsSummary } from '../services/types';

export function Analytics() {
  const { filters } = useFilters();
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const all = await fetchAllCrimesForAnalytics();
        if (!mounted) return;
        let filtered = all;
        if (filters.district) filtered = filtered.filter((c) => c.district === filters.district);
        if (filters.state) filtered = filtered.filter((c) => c.state === filters.state);
        if (filters.crimeType) filtered = filtered.filter((c) => c.crime_type === filters.crimeType);
        if (filters.severity) filtered = filtered.filter((c) => c.severity === filters.severity);
        if (filters.dateFrom) filtered = filtered.filter((c) => c.date >= filters.dateFrom!);
        if (filters.dateTo) filtered = filtered.filter((c) => c.date <= filters.dateTo!);
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(
            (c) => c.district.toLowerCase().includes(q) || c.crime_type.toLowerCase().includes(q),
          );
        }
        setCrimes(filtered);
        setSummary(computeAnalytics(filtered));
      } catch (e) {
        setError(errorMessage(e, 'Failed to load analytics'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const weekdayHourMatrix = useMemo(() => {
    if (!crimes.length) return { rows: [], cols: [], values: [] };
    const hours = ['0', '3', '6', '9', '12', '15', '18', '21'];
    const matrix = WEEKDAY_LABELS_EXPORT.map(() => hours.map(() => 0));
    for (const c of crimes) {
      const bucket = Math.floor(c.hour / 3) * 3;
      const colIdx = hours.indexOf(String(bucket));
      if (colIdx >= 0) matrix[c.weekday][colIdx] += 1;
    }
    return { rows: WEEKDAY_LABELS_EXPORT, cols: hours.map((h) => `${h}:00`), values: matrix };
  }, [crimes]);

  const yearlyByType = useMemo(() => {
    if (!crimes.length) return null;
    const years = [...new Set(crimes.map((c) => c.year))].sort();
    const types = [...new Set(crimes.map((c) => c.crime_type))].slice(0, 5);
    const palette = ['#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];
    const datasets = types.map((type, i) => ({
      label: type,
      data: years.map((y) => crimes.filter((c) => c.year === y && c.crime_type === type).length),
      color: palette[i],
    }));
    return { labels: years.map(String), datasets };
  }, [crimes]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (error || !summary) return <ErrorState title="Analytics unavailable" description={error || undefined} />;
  if (summary.total_crimes === 0)
    return <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No data for current filters" description="Try widening your date range or clearing filters." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Crime Analytics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {summary.total_crimes.toLocaleString()} incidents · {summary.districts.length} districts · {summary.yearly_trend.length} years
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => exportCrimesToCsv(crimes.slice(0, 3000))}>
          Export CSV
        </Button>
      </div>

      {/* Monthly trend */}
      <Card hover>
        <CardHeader title="Monthly Crime Trend" subtitle="Incident volume over time" icon={<Calendar className="h-4 w-4" />} />
        <LineChart labels={summary.monthly_trend.map((m) => m.label)} data={summary.monthly_trend.map((m) => m.count)} height={300} />
      </Card>

      {/* Crime type + severity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card hover>
          <CardHeader title="Crime Type Distribution" subtitle="Share of total incidents" icon={<PieIcon className="h-4 w-4" />} />
          <PieChart
            labels={summary.crime_types.map((t) => t.type)}
            data={summary.crime_types.map((t) => t.count)}
            height={300}
          />
        </Card>
        <Card hover>
          <CardHeader title="Severity Breakdown" subtitle="Low → Critical" icon={<BarChart3 className="h-4 w-4" />} />
          <DoughnutChart
            labels={summary.severity_breakdown.map((s) => s.severity)}
            data={summary.severity_breakdown.map((s) => s.count)}
            height={300}
          />
        </Card>
      </div>

      {/* Yearly by type multi-line */}
      {yearlyByType && (
        <Card hover>
          <CardHeader title="Yearly Trends by Crime Type" subtitle="Top 5 categories" icon={<BarChart3 className="h-4 w-4" />} />
          <MultiLineChart labels={yearlyByType.labels} datasets={yearlyByType.datasets} height={300} />
        </Card>
      )}

      {/* District bar + status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card hover>
          <CardHeader title="District-wise Crime Volume" subtitle="All districts" icon={<Map className="h-4 w-4" />} />
          <BarChartH
            labels={summary.districts.slice(0, 12).map((d) => d.district)}
            data={summary.districts.slice(0, 12).map((d) => d.count)}
            height={360}
          />
        </Card>
        <Card hover>
          <CardHeader title="Case Status Breakdown" subtitle="Investigation progress" icon={<BarChart3 className="h-4 w-4" />} />
          <BarChartV
            labels={summary.status_breakdown.map((s) => s.status)}
            data={summary.status_breakdown.map((s) => s.count)}
            colors={['#3b82f6', '#f59e0b', '#94a3b8', '#22c55e']}
            height={300}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.status_breakdown.map((s) => (
              <div key={s.status} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.status}</p>
                <p className="mt-1 font-display text-lg font-bold text-slate-800 dark:text-white">{s.count}</p>
                <p className="text-[10px] text-slate-400">{s.pct.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Time patterns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card hover>
          <CardHeader title="Weekly Pattern" subtitle="Crimes by day of week" icon={<Calendar className="h-4 w-4" />} />
          <BarChartV
            labels={summary.weekday_pattern.map((w) => w.label)}
            data={summary.weekday_pattern.map((w) => w.count)}
            colors={summary.weekday_pattern.map((_, i) => (i === 0 || i === 6 ? '#ef4444' : '#2563eb'))}
            height={260}
          />
        </Card>
        <Card hover>
          <CardHeader title="Seasonal Pattern" subtitle="Crimes by season" icon={<Clock className="h-4 w-4" />} />
          <BarChartV
            labels={summary.seasonal_pattern.map((s) => s.label)}
            data={summary.seasonal_pattern.map((s) => s.count)}
            colors={['#06b6d4', '#f59e0b', '#2563eb', '#22c55e']}
            height={260}
          />
        </Card>
      </div>

      {/* Weekday x Hour heatmap */}
      <Card hover>
        <CardHeader title="Weekday × Hour Heatmap" subtitle="When crimes concentrate" icon={<Clock className="h-4 w-4" />} />
        <HeatmapTable
          rows={weekdayHourMatrix.rows}
          cols={weekdayHourMatrix.cols}
          values={weekdayHourMatrix.values}
          rowLabel="Day"
        />
      </Card>

      {/* Hourly line */}
      <Card hover>
        <CardHeader title="Hourly Distribution" subtitle="24-hour crime pattern" icon={<Clock className="h-4 w-4" />} />
        <LineChart labels={summary.hourly_pattern.map((h) => h.label)} data={summary.hourly_pattern.map((h) => h.count)} height={240} />
      </Card>

      {/* District table */}
      <Card hover>
        <CardHeader title="District Statistics" subtitle="Full breakdown" icon={<Map className="h-4 w-4" />} />
        <PatternTable
          data={summary.districts}
          columns={[
            { key: 'district', label: 'District' },
            { key: 'state', label: 'State' },
            { key: 'count', label: 'Incidents', render: (v: unknown) => Number(v).toLocaleString() },
            {
              key: 'count',
              label: 'Share',
              render: (_v: unknown, row: { count: number }) => {
                const pct = (row.count / summary.total_crimes) * 100;
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                  </div>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
