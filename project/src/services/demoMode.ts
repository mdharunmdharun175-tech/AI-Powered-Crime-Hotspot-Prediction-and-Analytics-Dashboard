/**
 * Demo Mode detection.
 *
 * If the Supabase project is unreachable (paused / deleted / no network),
 * we activate Demo Mode so the app is fully functional with mock data.
 *
 * The check is performed once on app load and cached.
 */

let _isDemoMode: boolean | null = null;
let _checkPromise: Promise<boolean> | null = null;

export async function checkDemoMode(): Promise<boolean> {
  if (_isDemoMode !== null) return _isDemoMode;
  if (_checkPromise) return _checkPromise;

  _checkPromise = (async () => {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    if (!url) {
      _isDemoMode = true;
      return true;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${url}/auth/v1/health`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timer);
      _isDemoMode = !res.ok && res.status !== 200;
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
