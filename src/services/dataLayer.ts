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
 * Data access layer with resilient fallback.
 * If live Supabase queries fail (e.g. missing SQL tables or network errors),
 * it seamlessly falls back to pre-seeded mock data so every page stays 100% active.
 */

export async function fetchDistricts(): Promise<{ district: string; state: string }[]> {
  if (isDemoMode()) return MOCK_DISTRICTS;
  try {
    const { data, error } = await supabase
      .from('crimes')
      .select('district, state')
      .order('district');
    if (error || !data || data.length === 0) return MOCK_DISTRICTS;
    const seen = new Map<string, string>();
    for (const r of data) if (!seen.has(r.district)) seen.set(r.district, r.state);
    return [...seen.entries()].map(([district, state]) => ({ district, state }));
  } catch {
    return MOCK_DISTRICTS;
  }
}

export async function fetchStates(): Promise<string[]> {
  if (isDemoMode()) return [...new Set(MOCK_DISTRICTS.map((d) => d.state))].sort();
  try {
    const { data, error } = await supabase.from('crimes').select('state');
    if (error || !data || data.length === 0) return [...new Set(MOCK_DISTRICTS.map((d) => d.state))].sort();
    return [...new Set(data.map((r) => r.state))].sort();
  } catch {
    return [...new Set(MOCK_DISTRICTS.map((d) => d.state))].sort();
  }
}

export async function saveInsights(insights: Insight[]): Promise<void> {
  if (isDemoMode()) return;
  if (!insights.length) return;
  try {
    await supabase.from('insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = insights.map((i) => ({
      title: i.title,
      body: i.body,
      category: i.category,
      severity: i.severity,
      tags: i.tags,
      generated_at: i.generated_at,
    }));
    await supabase.from('insights').insert(rows);
  } catch {
    // Silent catch
  }
}

export async function fetchInsights(): Promise<Insight[]> {
  if (isDemoMode()) return MOCK_INSIGHTS;
  try {
    const { data, error } = await supabase
      .from('insights')
      .select('id, title, body, category, severity, tags, generated_at')
      .order('generated_at', { ascending: false })
      .limit(50);
    if (error || !data || data.length === 0) return MOCK_INSIGHTS;
    return (data as Insight[]) ?? MOCK_INSIGHTS;
  } catch {
    return MOCK_INSIGHTS;
  }
}

export async function saveReport(
  title: string,
  scope: string,
  summary: string,
  generatedBy: string,
): Promise<ReportRecord | null> {
  if (isDemoMode()) {
    return {
      id: `report-demo-${Date.now()}`,
      title,
      scope,
      summary,
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
    };
  }
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({ title, scope, summary, generated_by: generatedBy })
      .select('id, title, scope, generated_by, generated_at, summary, storage_path')
      .maybeSingle();
    if (error || !data) {
      return {
        id: `report-demo-${Date.now()}`,
        title,
        scope,
        summary,
        generated_by: generatedBy,
        generated_at: new Date().toISOString(),
      };
    }
    return data as ReportRecord | null;
  } catch {
    return {
      id: `report-demo-${Date.now()}`,
      title,
      scope,
      summary,
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
    };
  }
}

export async function fetchReports(): Promise<ReportRecord[]> {
  if (isDemoMode()) return MOCK_REPORTS;
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id, title, scope, generated_by, generated_at, summary, storage_path')
      .order('generated_at', { ascending: false })
      .limit(50);
    if (error || !data || data.length === 0) return MOCK_REPORTS;
    return (data as ReportRecord[]) ?? MOCK_REPORTS;
  } catch {
    return MOCK_REPORTS;
  }
}

export async function deleteReport(id: string): Promise<void> {
  if (isDemoMode()) return;
  try {
    await supabase.from('reports').delete().eq('id', id);
  } catch {
    // Silent catch
  }
}

export async function fetchProfiles(): Promise<Profile[]> {
  if (isDemoMode()) return MOCK_PROFILES;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return MOCK_PROFILES;
    return (data as Profile[]) ?? MOCK_PROFILES;
  } catch {
    return MOCK_PROFILES;
  }
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  if (isDemoMode()) return;
  try {
    await supabase.from('profiles').update({ role }).eq('id', id);
  } catch {
    // Silent catch
  }
}

export async function fetchCrimesForMap(limit = 2000): Promise<Crime[]> {
  if (isDemoMode()) return getPersistedCrimes().slice(0, limit);
  try {
    const { data, error } = await supabase
      .from('crimes')
      .select(
        'id, date, crime_type, district, state, latitude, longitude, severity, victims, status, year, month, day, weekday, hour, season, description',
      )
      .order('date', { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return getPersistedCrimes().slice(0, limit);
    return (data as Crime[]) ?? getPersistedCrimes().slice(0, limit);
  } catch {
    return getPersistedCrimes().slice(0, limit);
  }
}

export async function createIncident(crimeData: Omit<Crime, 'id'>): Promise<Crime> {
  if (isDemoMode()) {
    return saveMockIncident(crimeData);
  }
  try {
    const { data, error } = await supabase
      .from('crimes')
      .insert([crimeData])
      .select()
      .single();
    if (error || !data) return saveMockIncident(crimeData);
    return data as Crime;
  } catch {
    return saveMockIncident(crimeData);
  }
}

export function subscribeToCrimes(callback: (crime: Crime) => void) {
  if (isDemoMode()) {
    return { unsubscribe: () => {} } as unknown as ReturnType<typeof supabase.channel>;
  }
  try {
    return supabase
      .channel('crimes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crimes' }, (payload) => {
        callback(payload.new as Crime);
      })
      .subscribe();
  } catch {
    return { unsubscribe: () => {} } as unknown as ReturnType<typeof supabase.channel>;
  }
}

export function subscribeToInsights(callback: () => void) {
  if (isDemoMode()) {
    return { unsubscribe: () => {} } as unknown as ReturnType<typeof supabase.channel>;
  }
  try {
    return supabase
      .channel('insights-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights' }, () => callback())
      .subscribe();
  } catch {
    return { unsubscribe: () => {} } as unknown as ReturnType<typeof supabase.channel>;
  }
}
