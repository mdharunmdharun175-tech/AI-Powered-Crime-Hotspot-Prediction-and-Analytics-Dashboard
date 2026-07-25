/**
 * Demo Mode detection.
 *
 * Probes the Supabase health endpoint with apikey header.
 * If Supabase is online and responding, Demo Mode is FALSE.
 * If Supabase is unreachable (paused/deleted/no network), Demo Mode is TRUE.
 */

let _isDemoMode: boolean | null = null;
let _checkPromise: Promise<boolean> | null = null;

export async function checkDemoMode(): Promise<boolean> {
  if (_isDemoMode !== null) return _isDemoMode;
  if (_checkPromise) return _checkPromise;

  _checkPromise = (async () => {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    if (!url || !key) {
      _isDemoMode = true;
      return true;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url}/auth/v1/health`, {
        signal: controller.signal,
        method: 'GET',
        headers: { apikey: key },
      });
      clearTimeout(timer);
      _isDemoMode = !res.ok;
    } catch {
      _isDemoMode = true;
    }
    return _isDemoMode!;
  })();

  return _checkPromise;
}

export function isDemoMode(): boolean {
  return _isDemoMode === true;
}

export function setDemoMode(val: boolean) {
  _isDemoMode = val;
}
