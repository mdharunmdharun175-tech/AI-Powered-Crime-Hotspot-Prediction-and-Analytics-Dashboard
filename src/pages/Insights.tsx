import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Sparkles, AlertTriangle, TrendingUp, Shield, RefreshCw, Brain, Clock } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonCard, ErrorState, EmptyState } from '../components/ui/Feedback';
import { fetchAllCrimesForAnalytics } from '../services/analytics';
import { generateInsights, generateRecommendations } from '../services/insights';
import { fetchInsights, saveInsights } from '../services/dataLayer';
import { useFilters } from '../services/filterContext';
import { formatDateTime, cn, errorMessage } from '../services/utils';
import type { Crime, Insight } from '../services/types';

const categoryIcon: Record<string, React.ReactNode> = {
  Trend: <TrendingUp className="h-4 w-4" />,
  Hotspot: <AlertTriangle className="h-4 w-4" />,
  Pattern: <Clock className="h-4 w-4" />,
  Seasonal: <Sparkles className="h-4 w-4" />,
  Recommendation: <Shield className="h-4 w-4" />,
  Operational: <Brain className="h-4 w-4" />,
};

const sevBorder: Record<string, string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-amber-500',
  Low: 'border-l-emerald-500',
};

export function Insights() {
  const { filters } = useFilters();
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recs, setRecs] = useState<{ title: string; body: string; priority: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const all = await fetchAllCrimesForAnalytics();
        if (!mounted) return;
        let filtered = all;
        if (filters.district) filtered = filtered.filter((c) => c.district === filters.district);
        if (filters.state) filtered = filtered.filter((c) => c.state === filters.state);
        if (filters.crimeType) filtered = filtered.filter((c) => c.crime_type === filters.crimeType);
        if (filters.severity) filtered = filtered.filter((c) => c.severity === filters.severity);
        if (filters.dateFrom) filtered = filtered.filter((c) => c.date >= filters.dateFrom!);
        if (filters.dateTo) filtered = filtered.filter((c) => c.date <= filters.dateTo!);

        setCrimes(filtered);
        setRecs(generateRecommendations(filtered));

        // Try to load persisted insights first
        const persisted = await fetchInsights();
        if (persisted.length > 0 && !filters.district && !filters.crimeType) {
          setInsights(persisted);
        } else {
          setInsights(generateInsights(filtered));
        }
      } catch (e) {
        setError(errorMessage(e, "Failed to load insights"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const regenerate = async () => {
    if (crimes.length === 0) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 600));
    const fresh = generateInsights(crimes);
    setInsights(fresh);
    try {
      await saveInsights(fresh);
    } catch {
      // persistence optional
    }
    setGenerating(false);
  };

  const categories = useMemo(() => {
    const set = new Set(insights.map((i) => i.category));
    return ['all', ...[...set].sort()];
  }, [insights]);

  const filteredInsights = useMemo(
    () => (activeCategory === 'all' ? insights : insights.filter((i) => i.category === activeCategory)),
    [insights, activeCategory],
  );

  const stats = useMemo(() => {
    const critical = insights.filter((i) => i.severity === 'Critical').length;
    const high = insights.filter((i) => i.severity === 'High').length;
    const recsCount = insights.filter((i) => i.category === 'Recommendation').length;
    return { total: insights.length, critical, high, recs: recsCount };
  }, [insights]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (error) return <ErrorState title="Insights unavailable" description={error} />;
  if (insights.length === 0)
    return <EmptyState icon={<Lightbulb className="h-6 w-6" />} title="No insights yet" description="Adjust filters or regenerate." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">AI Insights & Recommendations</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Rule-based engine analyzing {crimes.length.toLocaleString()} incidents
          </p>
        </div>
        <Button onClick={regenerate} loading={generating} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Regenerate
        </Button>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Total Insights" value={stats.total} icon={<Lightbulb className="h-4 w-4" />} accent="brand" />
        <MiniStat label="Critical" value={stats.critical} icon={<AlertTriangle className="h-4 w-4" />} accent="red" />
        <MiniStat label="High Priority" value={stats.high} icon={<Shield className="h-4 w-4" />} accent="orange" />
        <MiniStat label="Recommendations" value={stats.recs} icon={<Sparkles className="h-4 w-4" />} accent="cyan" />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeCategory === c
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
          >
            {c === 'all' ? 'All categories' : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Insights list */}
        <div className="space-y-3 lg:col-span-2">
          {filteredInsights.map((ins, i) => (
            <div
              key={ins.id ?? i}
              className={cn(
                'animate-fade-in-up rounded-2xl border border-slate-200/80 border-l-4 bg-white p-4 shadow-card transition-all duration-300 hover:shadow-card-hover dark:border-slate-700/60 dark:bg-slate-900/80',
                sevBorder[ins.severity] ?? 'border-l-slate-400',
              )}
              style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {categoryIcon[ins.category] ?? <Lightbulb className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {ins.title}
                    </h3>
                    <Badge variant="severity" value={ins.severity}>{ins.severity}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{ins.body}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Badge variant="brand">{ins.category}</Badge>
                    {ins.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        #{t}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-slate-400">{formatDateTime(ins.generated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations sidebar */}
        <div className="lg:col-span-1">
          <Card hover className="sticky top-4">
            <CardHeader
              title="AI Recommendations"
              subtitle="Actionable steps for authorities"
              icon={<Shield className="h-4 w-4" />}
            />
            <div className="space-y-3">
              {recs.map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        r.priority === 'Critical' && 'bg-red-500/15 text-red-600 dark:text-red-400',
                        r.priority === 'High' && 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
                        r.priority === 'Medium' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {r.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{r.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'brand' | 'red' | 'orange' | 'cyan';
}) {
  const accents = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accents[accent])}>{icon}</div>
      <div>
        <p className="font-display text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
