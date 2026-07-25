export type CrimeType =
  | 'Theft'
  | 'Burglary'
  | 'Robbery'
  | 'Vehicle Theft'
  | 'Assault'
  | 'Cybercrime'
  | 'Kidnapping'
  | 'Homicide'
  | 'Sexual Offense'
  | 'Drug Offense';

export type CrimeSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type CrimeStatus = 'Open' | 'Under Investigation' | 'Closed' | 'Arrest Made';
export type UserRole = 'admin' | 'analyst';
export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface Crime {
  id: string;
  date: string;
  crime_type: CrimeType;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  severity: CrimeSeverity;
  victims: number;
  status: CrimeStatus;
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  season: string;
  description?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Hotspot {
  id: string;
  cluster_id: number;
  center_lat: number;
  center_lng: number;
  risk_level: RiskLevel;
  crime_count: number;
  radius_m: number;
  dominant_crime: CrimeType;
  district: string;
  state: string;
  generated_at: string;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  category: string;
  severity: CrimeSeverity;
  tags: string[];
  generated_at: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  scope: string;
  generated_by: string;
  generated_at: string;
  summary: string;
  storage_path?: string;
}

export interface PredictionResult {
  crime_type: CrimeType;
  severity: CrimeSeverity;
  probability: number;
  confidence: number;
}

export interface ForecastPoint {
  label: string;
  historical: number | null;
  predicted: number;
  lower: number;
  upper: number;
}

export interface DistrictRanking {
  district: string;
  state: string;
  total_crimes: number;
  severity_score: number;
  risk_level: RiskLevel;
  trend_direction: 'up' | 'down' | 'flat';
  yoy_change_pct: number;
}

export interface AnalyticsSummary {
  total_crimes: number;
  active_cases: number;
  closed_cases: number;
  arrest_rate: number;
  total_victims: number;
  high_risk_districts: number;
  top_crime_type: CrimeType;
  crime_types: { type: CrimeType; count: number; pct: number }[];
  severity_breakdown: { severity: CrimeSeverity; count: number; pct: number }[];
  districts: { district: string; state: string; count: number }[];
  monthly_trend: { label: string; count: number }[];
  yearly_trend: { label: string; count: number }[];
  weekday_pattern: { label: string; count: number }[];
  hourly_pattern: { label: string; count: number }[];
  seasonal_pattern: { label: string; count: number }[];
  status_breakdown: { status: CrimeStatus; count: number; pct: number }[];
}

export interface DashboardStats {
  total_crimes: number;
  active_cases: number;
  high_risk_districts: number;
  top_crime_type: CrimeType;
  recent_trend: { label: string; count: number }[];
  top_districts: { district: string; count: number; risk_level: RiskLevel }[];
  alerts: { id: string; title: string; severity: CrimeSeverity; district: string }[];
}

export interface ModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  support: number;
  confusion: Record<string, Record<string, number>>;
}

export interface CrimeFilters {
  dateFrom: string | null;
  dateTo: string | null;
  district: string | null;
  state: string | null;
  crimeType: CrimeType | null;
  severity: CrimeSeverity | null;
  search: string;
}
