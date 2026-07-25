import { useEffect, useMemo, useState } from 'react';
import { Brain, Target, TrendingUp, Gauge, Cpu, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { SkeletonCard, ErrorState, EmptyState } from '../components/ui/Feedback';
import { MultiLineChart, BarChartH } from '../components/charts/Charts';
import { PatternTable } from '../components/charts/HeatmapTable';
import { fetchAllCrimesForAnalytics } from '../services/analytics';
import { fetchDistricts } from '../services/dataLayer';
import {
  trainOccurrenceModel,
  evaluateOccurrenceModel,
  forecastMonthlyTrend,
  forecastByDistrict,
  rankDistricts,
} from '../services/prediction';
import { useFilters } from '../services/filterContext';
import { cn, formatNumber, errorMessage } from '../services/utils';
import type { Crime, PredictionResult, ForecastPoint, DistrictRanking, ModelEvaluation } from '../services/types';

export function Prediction() {
  const { filters } = useFilters();
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [evalResult, setEvalResult] = useState<ModelEvaluation | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [districtForecast, setDistrictForecast] = useState<ForecastPoint[]>([]);
  const [rankings, setRankings] = useState<DistrictRanking[]>([]);

  // Predictor form state
  const [predDistrict, setPredDistrict] = useState('');
  const [predHour, setPredHour] = useState('20');
  const [predWeekday, setPredWeekday] = useState('5');
  const [predSeason, setPredSeason] = useState('Winter');
  const [predResult, setPredResult] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [selectedForecastDistrict, setSelectedForecastDistrict] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [all, dists] = await Promise.all([fetchAllCrimesForAnalytics(), fetchDistricts()]);
        if (!mounted) return;
        let filtered = all;
        if (filters.crimeType) filtered = filtered.filter((c) => c.crime_type === filters.crimeType);
        if (filters.severity) filtered = filtered.filter((c) => c.severity === filters.severity);
        if (filters.dateFrom) filtered = filtered.filter((c: Crime) => c.date >= filters.dateFrom!);
        if (filters.dateTo) filtered = filtered.filter((c: Crime) => c.date <= filters.dateTo!);

        setCrimes(filtered);
        setDistricts(dists.map((d: { district: string }) => d.district));
        setEvalResult(evaluateOccurrenceModel(filtered));
        setForecast(forecastMonthlyTrend(filtered, 6));
        setRankings(rankDistricts(filtered));
        if (dists.length > 0) {
          const topDist = rankDistricts(filtered)[0]?.district ?? dists[0].district;
          setSelectedForecastDistrict(topDist);
          setPredDistrict(topDist);
          setDistrictForecast(forecastByDistrict(filtered, topDist, 6));
        }
      } catch (e) {
        setError(errorMessage(e, 'Failed to load prediction data'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const model = useMemo(() => (crimes.length ? trainOccurrenceModel(crimes) : null), [crimes]);

  const runPrediction = async () => {
    if (!model || !predDistrict) return;
    setPredicting(true);
    await new Promise((r) => setTimeout(r, 350)); // brief feedback animation
    const result = model.predict({
      district: predDistrict,
      hour: parseInt(predHour),
      weekday: parseInt(predWeekday),
      season: predSeason,
    });
    setPredResult(result);
    setPredicting(false);
  };

  const changeForecastDistrict = (d: string) => {
    setSelectedForecastDistrict(d);
    setDistrictForecast(forecastByDistrict(crimes, d, 6));
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }
  if (error || !evalResult) return <ErrorState title="Prediction unavailable" description={error || undefined} />;
  if (crimes.length < 50)
    return <EmptyState icon={<Brain className="h-6 w-6" />} title="Not enough data to train models" description="At least 50 incidents are required." />;

  const forecastLine = {
    labels: forecast.map((f) => f.label),
    datasets: [
      {
        label: 'Historical',
        data: forecast.map((f) => f.historical),
        color: '#2563eb',
      },
      {
        label: 'Forecast',
        data: forecast.map((f) => (f.historical === null ? f.predicted : null)),
        color: '#f97316',
      },
    ],
  };

  const districtForecastLine = {
    labels: districtForecast.map((f) => f.label),
    datasets: [
      {
        label: 'Historical',
        data: districtForecast.map((f) => f.historical),
        color: '#06b6d4',
      },
      {
        label: 'Forecast',
        data: districtForecast.map((f) => (f.historical === null ? f.predicted : null)),
        color: '#ef4444',
      },
      {
        label: 'Lower bound',
        data: districtForecast.map((f) => (f.historical === null ? f.lower : null)),
        color: '#475569',
      },
      {
        label: 'Upper bound',
        data: districtForecast.map((f) => (f.historical === null ? f.upper : null)),
        color: '#94a3b8',
      },
    ],
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">AI Prediction Center</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trained on {formatNumber(crimes.length)} incidents · {districts.length} districts
        </p>
      </div>

      {/* Model evaluation card */}
      <Card hover>
        <CardHeader
          title="Model Evaluation"
          subtitle="RandomForest-style occurrence classifier · held-out 20% test set"
          icon={<Cpu className="h-4 w-4" />}
          action={<Badge variant="brand"><Sparkles className="h-3 w-3" /> AI</Badge>}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Accuracy" value={evalResult.accuracy} />
          <Metric label="Precision" value={evalResult.precision} />
          <Metric label="Recall" value={evalResult.recall} />
          <Metric label="F1 Score" value={evalResult.f1} />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Evaluated on {evalResult.support} held-out samples across {Object.keys(evalResult.confusion).length} crime categories.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Occurrence predictor */}
        <Card hover>
          <CardHeader
            title="Crime Occurrence Predictor"
            subtitle="Predict category, severity & probability"
            icon={<Target className="h-4 w-4" />}
          />
          <div className="space-y-3">
            <Select
              label="District"
              value={predDistrict}
              onChange={setPredDistrict}
              placeholder="Select district"
              options={districts.map((d) => ({ label: d, value: d }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Hour of day"
                value={predHour}
                onChange={setPredHour}
                options={Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: String(i) }))}
              />
              <Select
                label="Day of week"
                value={predWeekday}
                onChange={setPredWeekday}
                options={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => ({ label: d, value: String(i) }))}
              />
            </div>
            <Select
              label="Season"
              value={predSeason}
              onChange={setPredSeason}
              options={['Winter', 'Summer', 'Monsoon', 'Post-Monsoon'].map((s) => ({ label: s, value: s }))}
            />
            <Button onClick={runPrediction} loading={predicting} className="w-full" leftIcon={<Brain className="h-4 w-4" />}>
              Predict
            </Button>

            {predResult && (
              <div className="animate-fade-in-up rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800/60 dark:bg-brand-900/20">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Prediction result
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Predicted crime type</span>
                    <Badge variant="brand">{predResult.crime_type}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Predicted severity</span>
                    <Badge variant="severity" value={predResult.severity}>{predResult.severity}</Badge>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-300">Occurrence probability</span>
                      <span className="font-display text-sm font-bold text-slate-800 dark:text-white">
                        {(predResult.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-700"
                        style={{ width: `${Math.min(predResult.probability * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Overall forecast */}
        <Card hover>
          <CardHeader
            title="Future Crime Trend Forecast"
            subtitle="6-month linear-regression projection"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MultiLineChart labels={forecastLine.labels} datasets={forecastLine.datasets} height={300} />
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Historical</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Forecast</span>
          </div>
        </Card>
      </div>

      {/* District forecast */}
      <Card hover>
        <CardHeader
          title="District-wise Forecast"
          subtitle="Linear regression per district with confidence band"
          icon={<Gauge className="h-4 w-4" />}
          action={
            <Select
              value={selectedForecastDistrict}
              onChange={changeForecastDistrict}
              options={districts.map((d) => ({ label: d, value: d }))}
              className="w-48"
            />
          }
        />
        <MultiLineChart labels={districtForecastLine.labels} datasets={districtForecastLine.datasets} height={320} />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Historical</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Forecast</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-500" /> 95% confidence</span>
        </div>
      </Card>

      {/* District ranking */}
      <Card hover>
        <CardHeader
          title="District Risk Ranking"
          subtitle="Severity-weighted index with YoY trend"
          icon={<Target className="h-4 w-4" />}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChartH
            labels={rankings.slice(0, 10).map((r) => r.district)}
            data={rankings.slice(0, 10).map((r) => r.severity_score)}
            label="Severity score"
            height={320}
          />
          <PatternTable
            data={rankings.slice(0, 12)}
            columns={[
              { key: 'district', label: 'District' },
              { key: 'state', label: 'State' },
              { key: 'total_crimes', label: 'Incidents', render: (v: unknown) => Number(v).toLocaleString() },
              { key: 'severity_score', label: 'Score' },
              {
                key: 'risk_level',
                label: 'Risk',
                render: (v: unknown) => <Badge variant="risk" value={String(v)}>{String(v)}</Badge>,
              },
              {
                key: 'yoy_change_pct',
                label: 'YoY',
                render: (v: unknown, row: { trend_direction: string }) => {
                  const pct = Number(v);
                  return (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-semibold',
                      row.trend_direction === 'up' && 'text-red-500',
                      row.trend_direction === 'down' && 'text-emerald-500',
                      row.trend_direction === 'flat' && 'text-slate-400',
                    )}
                  >
                    {row.trend_direction === 'up' ? '↑' : row.trend_direction === 'down' ? '↓' : '→'}
                    {Math.abs(pct).toFixed(1)}%
                  </span>
                );
                  }
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const pct = (value * 100).toFixed(1);
  const color = value >= 0.7 ? '#22c55e' : value >= 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-white">{pct}%</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value * 100, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
