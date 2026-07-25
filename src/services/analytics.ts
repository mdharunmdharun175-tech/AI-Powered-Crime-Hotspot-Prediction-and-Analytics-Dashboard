import { supabase } from './supabaseClient';
import { isDemoMode } from './demoMode';
import { MOCK_CRIMES } from './mockData';
import type {
  Crime,
  AnalyticsSummary,
  DashboardStats,
  CrimeFilters,
  CrimeType,
  CrimeSeverity,
  RiskLevel,
} from './types';

const CRIME_TYPES: CrimeType[] = [
  'Theft', 'Burglary', 'Robbery', 'Vehicle Theft', 'Assault', 'Cybercrime',
  'Kidnapping', 'Homicide', 'Sexual Offense', 'Drug Offense',
];

const SEVERITIES: CrimeSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function fetchCrimes(filters: CrimeFilters, limit = 5000): Promise<Crime[]> {
  if (isDemoMode()) {
    let rows = MOCK_CRIMES.slice(0, limit);
    if (filters.district) rows = rows.filter((r) => r.district === filters.district);
    if (filters.state) rows = rows.filter((r) => r.state === filters.state);
    if (filters.crimeType) rows = rows.filter((r) => r.crime_type === filters.crimeType);
    if (filters.severity) rows = rows.filter((r) => r.severity === filters.severity);
    if (filters.dateFrom) rows = rows.filter((r) => r.date >= filters.dateFrom!);
    if (filters.dateTo) rows = rows.filter((r) => r.date <= filters.dateTo!);
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.district.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q) ||
          r.crime_type.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }

  let query = supabase
    .from('crimes')
    .select(
      'id, date, crime_type, district, state, latitude, longitude, severity, victims, status, year, month, day, weekday, hour, season, description',
    )
    .order('date', { ascending: false })
    .limit(limit);

  if (filters.district) query = query.eq('district', filters.district);
  if (filters.state) query = query.eq('state', filters.state);
  if (filters.crimeType) query = query.eq('crime_type', filters.crimeType);
  if (filters.severity) query = query.eq('severity', filters.severity);
  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return [];

  let rows = data as Crime[];
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.district.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q) ||
        r.crime_type.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    );
  }
  return rows;
}

export async function fetchAllCrimesForAnalytics(): Promise<Crime[]> {
  if (isDemoMode()) return [...MOCK_CRIMES].sort((a, b) => a.date.localeCompare(b.date));
  const { data, error } = await supabase
    .from('crimes')
    .select(
      'id, date, crime_type, district, state, latitude, longitude, severity, victims, status, year, month, day, weekday, hour, season, description',
    )
    .order('date', { ascending: true })
    .limit(10000);
  if (error) throw new Error(error.message);
  return (data as Crime[]) ?? [];
}

export function computeAnalytics(crimes: Crime[]): AnalyticsSummary {
  const total = crimes.length;
  const active = crimes.filter((c) => c.status === 'Open' || c.status === 'Under Investigation').length;
  const closed = crimes.filter((c) => c.status === 'Closed' || c.status === 'Arrest Made').length;
  const arrests = crimes.filter((c) => c.status === 'Arrest Made').length;
  const victims = crimes.reduce((s, c) => s + (c.victims ?? 1), 0);

  const typeCounts = new Map<CrimeType, number>();
  const sevCounts = new Map<CrimeSeverity, number>();
  const statusCounts = new Map<string, number>();
  const districtCounts = new Map<string, { state: string; count: number }>();
  const monthlyCounts = new Map<string, number>();
  const yearlyCounts = new Map<number, number>();
  const weekdayCounts = new Array(7).fill(0);
  const hourlyCounts = new Array(24).fill(0);
  const seasonCounts = new Map<string, number>();

  for (const c of crimes) {
    typeCounts.set(c.crime_type, (typeCounts.get(c.crime_type) ?? 0) + 1);
    sevCounts.set(c.severity, (sevCounts.get(c.severity) ?? 0) + 1);
    statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);

    const dk = c.district;
    if (!districtCounts.has(dk)) districtCounts.set(dk, { state: c.state, count: 0 });
    districtCounts.get(dk)!.count += 1;

    const monthKey = `${c.year}-${String(c.month).padStart(2, '0')}`;
    monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) ?? 0) + 1);
    yearlyCounts.set(c.year, (yearlyCounts.get(c.year) ?? 0) + 1);
    weekdayCounts[c.weekday] += 1;
    hourlyCounts[c.hour] += 1;
    seasonCounts.set(c.season, (seasonCounts.get(c.season) ?? 0) + 1);
  }

  const crime_types = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  const severity_breakdown = SEVERITIES.map((severity) => ({
    severity,
    count: sevCounts.get(severity) ?? 0,
    pct: total ? ((sevCounts.get(severity) ?? 0) / total) * 100 : 0,
  }));

  const status_breakdown = (['Open', 'Under Investigation', 'Closed', 'Arrest Made'] as const).map(
    (status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
      pct: total ? ((statusCounts.get(status) ?? 0) / total) * 100 : 0,
    }),
  );

  const districts = [...districtCounts.entries()]
    .map(([district, v]) => ({ district, state: v.state, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const sortedMonths = [...monthlyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthly_trend = sortedMonths.map(([k, count]) => {
    const [, m] = k.split('-');
    return { label: `${MONTH_LABELS[parseInt(m) - 1]} ${k.slice(0, 4)}`, count };
  });

  const yearly_trend = [...yearlyCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ label: String(year), count }));

  const weekday_pattern = WEEKDAY_LABELS.map((label, i) => ({ label, count: weekdayCounts[i] }));
  const hourly_pattern = hourlyCounts.map((count, h) => ({ label: `${h}:00`, count }));
  const seasonal_pattern = (['Winter', 'Summer', 'Monsoon', 'Post-Monsoon'] as const)
    .map((season) => ({ label: season, count: seasonCounts.get(season) ?? 0 }));

  const top_crime_type = crime_types[0]?.type ?? 'Theft';

  const sevScore = (s: CrimeSeverity) =>
    s === 'Critical' ? 4 : s === 'High' ? 3 : s === 'Medium' ? 2 : 1;
  const highRiskDistricts = districts.filter((d) => {
    const distCrimes = crimes.filter((c) => c.district === d.district);
    const avgSev = distCrimes.reduce((s, c) => s + sevScore(c.severity), 0) / distCrimes.length;
    return avgSev >= 2.5 || d.count > total / districts.length * 1.5;
  }).length;

  return {
    total_crimes: total,
    active_cases: active,
    closed_cases: closed,
    arrest_rate: total ? (arrests / total) * 100 : 0,
    total_victims: victims,
    high_risk_districts: highRiskDistricts,
    top_crime_type,
    crime_types,
    severity_breakdown,
    districts,
    monthly_trend,
    yearly_trend,
    weekday_pattern,
    hourly_pattern,
    seasonal_pattern,
    status_breakdown,
  };
}

export function computeDashboard(crimes: Crime[], summary: AnalyticsSummary): DashboardStats {
  const recent = crimes.slice(-120).reverse();
  const recentTrend = recent.slice(0, 6).map((c) => ({
    label: `${c.month}/${c.day}`,
    count: 1,
  }));
  const trendAgg = new Map<string, number>();
  for (const c of crimes.slice(-180)) {
    const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
    trendAgg.set(key, (trendAgg.get(key) ?? 0) + 1);
  }
  const recent_trend = [...trendAgg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([k, count]) => {
      const [, m] = k.split('-');
      return { label: MONTH_LABELS[parseInt(m) - 1], count };
    });

  const sevScore = (s: CrimeSeverity) =>
    s === 'Critical' ? 4 : s === 'High' ? 3 : s === 'Medium' ? 2 : 1;
  const top_districts = summary.districts.slice(0, 6).map((d) => {
    const distCrimes = crimes.filter((c) => c.district === d.district);
    const avgSev = distCrimes.reduce((s, c) => s + sevScore(c.severity), 0) / distCrimes.length;
    const risk_level: RiskLevel = avgSev >= 3 ? 'High' : avgSev >= 2 ? 'Medium' : 'Low';
    return { district: d.district, count: d.count, risk_level };
  });

  const alerts = summary.districts.slice(0, 4).map((d, i) => {
    const distCrimes = crimes.filter((c) => c.district === d.district);
    const avgSev = distCrimes.reduce((s, c) => s + sevScore(c.severity), 0) / distCrimes.length;
    const severity: CrimeSeverity = avgSev >= 3.2 ? 'Critical' : avgSev >= 2.5 ? 'High' : 'Medium';
    return {
      id: `alert-${i}`,
      title: `Elevated risk in ${d.district}`,
      severity,
      district: d.district,
    };
  });

  return {
    total_crimes: summary.total_crimes,
    active_cases: summary.active_cases,
    high_risk_districts: summary.high_risk_districts,
    top_crime_type: summary.top_crime_type,
    recent_trend: recent_trend.length ? recent_trend : recentTrend,
    top_districts,
    alerts,
  };
}

export const CRIME_TYPE_OPTIONS = CRIME_TYPES.map((t) => ({ label: t, value: t }));
export const SEVERITY_OPTIONS = SEVERITIES.map((s) => ({ label: s, value: s }));
export const MONTH_LABELS_EXPORT = MONTH_LABELS;
export const WEEKDAY_LABELS_EXPORT = WEEKDAY_LABELS;
