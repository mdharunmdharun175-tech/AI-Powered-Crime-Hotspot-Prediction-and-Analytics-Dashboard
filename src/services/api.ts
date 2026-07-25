import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Axios client for Supabase Edge Functions.
 * Automatically injects auth headers and the anon key for edge-function auth.
 */
export const api = axios.create({
  baseURL: `${supabaseUrl}/functions/v1`,
  headers: {
    'Content-Type': 'application/json',
    apikey: anonKey,
  },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  // Pull the current access token from supabase session if available
  try {
    const { supabase } = await import('./supabaseClient');
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // ignore — use anon key only
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  },
);

export async function callEdgeFunction<T = unknown>(
  name: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const { data } = await api.post(`/${name}`, params ?? {});
  return data as T;
}
