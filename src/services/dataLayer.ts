import { supabase } from './supabaseClient';
import { isDemoMode } from './demoMode';
import {
  MOCK_INSIGHTS,
  MOCK_REPORTS,
  MOCK_DISTRICTS,
  MOCK_PROFILES,
  getPersistedCrimes,
  saveMockIncident,
} from './mockData';
import type { Crime, Insight, ReportRecord, Profile, UserRole } from './types';

/**
 * Data access layer. Wraps Supabase queries with typed helpers and error handling.
 * In Demo Mode, all functions return pre-seeded mock data immediately.
 */

export async function fetchDistricts(): Promise<{ district: string; state: string }[]> {
  if (isDemoMode()) return MOCK_DISTRICTS;
  const { data, error } = await supabase
    .from('crimes')
    .select('district, state')
    .order('district');
  if (error) throw new Error(error.message);
  if (!data) return [];
  const seen = new Map<string, string>();
  for (const r of data) if (!seen.has(r.district)) seen.set(r.district, r.state);
  return [...seen.entries()].map(([district, state]) => ({ district, state }));
}

export async function fetchStates(): Promise<string[]> {
  if (isDemoMode()) return [...new Set(MOCK_DISTRICTS.map((d) => d.state))].sort();
  const { data, error } = await supabase.from('crimes').select('state');
  if (error) throw new Error(error.message);
  if (!data) return [];
  return [...new Set(data.map((r) => r.state))].sort();
}

export async function saveInsights(insights: Insight[]): Promise<void> {
  if (isDemoMode()) return; // no-op in demo
  if (!insights.length) return;
  await supabase.from('insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const rows = insights.map((i) => ({
    title: i.title,
    body: i.body,
    category: i.category,
    severity: i.severity,
    tags: i.tags,
    generated_at: i.generated_at,
  }));
  const { error } = await supabase.from('insights').insert(rows);
  if (error) throw new Error(error.message);
}

export async function fetchInsights(): Promise<Insight[]> {
  if (isDemoMode()) return MOCK_INSIGHTS;
  const { data, error } = await supabase
    .from('insights')
    .select('id, title, body, category, severity, tags, generated_at')
    .order('generated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as Insight[]) ?? [];
}

export async function saveReport(
  title: string,
  scope: string,
  summary: string,
  generatedBy: string,
): Promise<ReportRecord | null> {
  if (isDemoMode()) {
    // Return a fake saved record
    return {
      id: `report-demo-${Date.now()}`,
      title,
      scope,
      summary,
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
    };
  }
  const { data, error } = await supabase
    .from('reports')
    .insert({ title, scope, summary, generated_by: generatedBy })
    .select('id, title, scope, generated_by, generated_at, summary, storage_path')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ReportRecord | null;
}

export async function fetchReports(): Promise<ReportRecord[]> {
  if (isDemoMode()) return MOCK_REPORTS;
  const { data, error } = await supabase
    .from('reports')
    .select('id, title, scope, generated_by, generated_at, summary, storage_path')
    .order('generated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as ReportRecord[]) ?? [];
}

export async function deleteReport(id: string): Promise<void> {
  if (isDemoMode()) return; // no-op in demo
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchProfiles(): Promise<Profile[]> {
  if (isDemoMode()) return MOCK_PROFILES;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Profile[]) ?? [];
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  if (isDemoMode()) return; // no-op in demo
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchCrimesForMap(limit = 2000): Promise<Crime[]> {
  if (isDemoMode()) return getPersistedCrimes().slice(0, limit);
  const { data, error } = await supabase
    .from('crimes')
    .select(
      'id, date, crime_type, district, state, latitude, longitude, severity, victims, status, year, month, day, weekday, hour, season, description',
    )
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as Crime[]) ?? [];
}

export async function createIncident(crimeData: Omit<Crime, 'id'>): Promise<Crime> {
  if (isDemoMode()) {
    return saveMockIncident(crimeData);
  }
  const { data, error } = await supabase
    .from('crimes')
    .insert([crimeData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Crime;
}

/**
 * Realtime subscription for new crimes.
 */
export function subscribeToCrimes(callback: (crime: Crime) => void) {
  if (isDemoMode()) {
    // Return a fake subscription handle
    return { unsubscribe: () => {} } as unknown as ReturnType<typeof supabase.channel>;
  }
  return supabase
    .channel('crimes-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crimes' }, (payload) => {
      callback(payload.new as Crime);
    })
    .subscribe();
}

export function subscribeToInsights(callback: () => void) {
  if (isDemoMode()) {
    return { unsubscribe: () => {} } as unknown as ReturnType<typeof supabase.channel>;
  }
  return supabase
    .channel('insights-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'insights' }, () => callback())
    .subscribe();
}
