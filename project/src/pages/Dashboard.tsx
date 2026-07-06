import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Shield, TrendingUp, MapPin, ArrowUpRight, Siren, FileText } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard, ErrorState } from '../components/ui/Feedback';
import { LineChart, BarChartH, DoughnutChart } from '../components/charts/Charts';
import { fetchAllCrimesForAnalytics, computeAnalytics, computeDashboard } from '../services/analytics';
import { useFilters } from '../services/filterContext';
import type { DashboardStats, AnalyticsSummary } from '../services/types';
import { formatNumber, errorMessage } from '../services/utils';

export function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { filters } = useFilters();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
        // Apply current filters
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
            (c) =>
              c.district.toLowerCase().includes(q) ||
              c.crime_type.toLowerCase().includes(q) ||
              c.state.toLowerCase().includes(q),
          );
        }
        const s = computeAnalytics(filtered);
        const d = computeDashboard(filtered, s);
        setSummary(s);
        setStats(d);
      } catch (e) {
        setError(errorMessage(e, 'Failed to load dashboard data'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [filters]);

  const recentInsights = useMemo(() => {
    if (!summary) return [];
    const items: { title: string; severity: string; district?: string }[] = [];
    if (summary.high_risk_districts > 0) {
      items.push({
        title: `${summary.high_risk_districts} high-risk district${summary.high_risk_districts > 1 ? 's' : ''} flagged for surveillance`,
        severity: 'High',
      });
    }
    items.push({ title: `${summary.top_crime_type} is the most reported category`, severity: 'Medium' });
    if (summary.arrest_rate < 25) {
      items.push({ title: `Arrest rate at ${summary.arrest_rate.toFixed(1)}% — below 25% target`, severity: 'High' });
    }
    items.push({ title: `${formatNumber(summary.active_cases)} active cases under review`, severity: 'Low' });
    return items;
  }, [summary]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="skeleton h-72 rounded-2xl lg:col-span-2" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !summary || !stats) {
    return <ErrorState title="Dashboard unavailable" description={error || undefined} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid animate-fade-in-up grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Crimes"
          value={summary.total_crimes}
          icon={<Activity className="h-5 w-5" />}
          accent="brand"
          hint={`${summary.total_victims} victims affected`}
        />
        <StatCard
          label="Active Cases"
          value={summary.active_cases}
          icon={<Siren className="h-5 w-5" />}
          accent="orange"
          hint={`${summary.closed_cases} resolved`}
        />
        <StatCard
          label="High-Risk Districts"
          value={summary.high_risk_districts}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
          hint="Require increased surveillance"
        />
        <StatCard
          label="Top Crime Type"
          value={summary.top_crime_type}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="cyan"
          hint={`${summary.crime_types[0]?.pct.toFixed(1)}% of all incidents`}
        />
      </div>

      {/* Alerts banner */}
      {stats.alerts.length > 0 && (
        <div className="animate-fade-in rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-orange-500/5 p-4 dark:border-red-500/30">
          <div className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-red-500" />
            <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
              Active alerts — {stats.alerts.length} high-priority zones
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.alerts.map((a) => (
              <button
                key={a.id}
                onClick={() => onNavigate('map')}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/70"
              >
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                {a.district}
                <Badge variant="severity" value={a.severity}>{a.severity}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" hover>
          <CardHeader
            title="Crime Trend"
            subtitle="Monthly incident volume"
            icon={<TrendingUp className="h-4 w-4" />}
            action={<Badge variant="brand">{summary.total_crimes} total</Badge>}
          />
          <LineChart
            labels={summary.monthly_trend.map((m) => m.label)}
            data={summary.monthly_trend.map((m) => m.count)}
            height={280}
          />
        </Card>

        <Card hover>
          <CardHeader
            title="Severity Mix"
            subtitle="Distribution by severity"
            icon={<Shield className="h-4 w-4" />}
          />
          <DoughnutChart
            labels={summary.severity_breakdown.map((s) => s.severity)}
            data={summary.severity_breakdown.map((s) => s.count)}
            height={280}
          />
        </Card>
      </div>

      {/* Districts + insights row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" hover>
          <CardHeader
            title="Top Districts by Crime Volume"
            subtitle="Severity-weighted ranking"
            icon={<MapPin className="h-4 w-4" />}
            action={
              <button
                onClick={() => onNavigate('analytics')}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <BarChartH
            labels={stats.top_districts.map((d) => d.district)}
            data={stats.top_districts.map((d) => d.count)}
            height={280}
          />
        </Card>

        <Card hover>
          <CardHeader
            title="Recent Insights"
            subtitle="AI-generated"
            icon={<Activity className="h-4 w-4" />}
            action={
              <button
                onClick={() => onNavigate('insights')}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                All <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="space-y-2.5">
            {recentInsights.map((ins, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                <Badge variant="severity" value={ins.severity}>{ins.severity}</Badge>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{ins.title}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionCard
          icon={<MapPin className="h-5 w-5" />}
          title="Open Crime Map"
          desc="Explore interactive heatmap & hotspots"
          onClick={() => onNavigate('map')}
        />
        <ActionCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="View Predictions"
          desc="Forecasts & occurrence models"
          onClick={() => onNavigate('prediction')}
        />
        <ActionCard
          icon={<FileText className="h-5 w-5" />}
          title="Generate Report"
          desc="Export analytics to PDF/CSV"
          onClick={() => onNavigate('reports')}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-card-hover dark:border-slate-700/60 dark:bg-slate-900/80 dark:hover:border-brand-700/60"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform group-hover:scale-110 dark:bg-brand-900/40 dark:text-brand-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  );
}
