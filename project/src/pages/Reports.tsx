import { useEffect, useState } from 'react';
import { FileText, Trash2, Plus, FileBarChart, Calendar } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { SkeletonCard, ErrorState, EmptyState } from '../components/ui/Feedback';
import { fetchAllCrimesForAnalytics, computeAnalytics } from '../services/analytics';
import { rankDistricts } from '../services/prediction';
import { generateInsights } from '../services/insights';
import { fetchReports, saveReport, deleteReport, fetchDistricts } from '../services/dataLayer';
import { exportAnalyticsReport, exportCrimesToCsv } from '../services/reports';
import { useAuth } from '../services/authContext';
import { useFilters } from '../services/filterContext';
import { formatDateTime, errorMessage } from '../services/utils';
import type { Crime, ReportRecord } from '../services/types';

export function Reports() {
  const { profile } = useAuth();
  const { filters } = useFilters();
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [districts, setDistricts] = useState<{ district: string; state: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // generate form
  const [scope, setScope] = useState('All districts');
  const [reportType, setReportType] = useState('full');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [c, r, d] = await Promise.all([
          fetchAllCrimesForAnalytics(),
          fetchReports(),
          fetchDistricts(),
        ]);
        if (!mounted) return;
        setCrimes(c);
        setReports(r);
        setDistricts(d);
      } catch (e) {
        setError(errorMessage(e, "Failed to load reports"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleGenerate = async () => {
    if (crimes.length === 0) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 400));

    let scoped = crimes;
    if (scope !== 'All districts') scoped = crimes.filter((c) => c.district === scope);
    if (filters.dateFrom) scoped = scoped.filter((c) => c.date >= filters.dateFrom!);
    if (filters.dateTo) scoped = scoped.filter((c) => c.date <= filters.dateTo!);

    const summary = computeAnalytics(scoped);
    const rankings = rankDistricts(scoped);
    const insights = generateInsights(scoped);

    if (reportType === 'csv') {
      exportCrimesToCsv(scoped.slice(0, 3000), `crimes_${scope.replace(/\s+/g, '_').toLowerCase()}.csv`);
    } else {
      exportAnalyticsReport(summary, rankings, insights, scope);
    }

    // Persist a record
    try {
      const summaryText = `${summary.total_crimes} crimes, ${summary.active_cases} active, ${summary.high_risk_districts} high-risk districts, top type ${summary.top_crime_type}`;
      const rec = await saveReport(
        `${reportType === 'csv' ? 'CSV Export' : 'Analytics Report'} — ${scope}`,
        scope,
        summaryText,
        profile?.id ?? '',
      );
      if (rec) setReports((prev) => [rec, ...prev]);
    } catch {
      // persistence optional — report still downloaded
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }
  if (error) return <ErrorState title="Reports unavailable" description={error} />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Reports</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate and download analytics reports · {reports.length} historical reports
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Generate panel */}
        <Card hover className="lg:col-span-1">
          <CardHeader
            title="Generate Report"
            subtitle="PDF or CSV export"
            icon={<Plus className="h-4 w-4" />}
          />
          <div className="space-y-3">
            <Select
              label="Scope"
              value={scope}
              onChange={setScope}
              options={[{ label: 'All districts', value: 'All districts' }, ...districts.map((d) => ({ label: d.district, value: d.district }))]}
            />
            <Select
              label="Format"
              value={reportType}
              onChange={setReportType}
              options={[
                { label: 'Full PDF report (executive summary + tables + insights)', value: 'full' },
                { label: 'CSV data export', value: 'csv' },
              ]}
            />
            <Button onClick={handleGenerate} loading={generating} className="w-full" leftIcon={<FileBarChart className="h-4 w-4" />}>
              Generate & Download
            </Button>
            <p className="text-xs text-slate-400">
              Reports include executive summary, district rankings, crime-type distribution, and AI insights.
            </p>
          </div>
        </Card>

        {/* Historical reports */}
        <Card hover className="lg:col-span-2">
          <CardHeader
            title="Historical Reports"
            subtitle="Previously generated"
            icon={<FileText className="h-4 w-4" />}
          />
          {reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No reports yet"
              description="Generate your first report using the panel on the left."
            />
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{r.title}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.summary}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {formatDateTime(r.generated_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                    title="Delete report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
