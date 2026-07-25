import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://gizfhsibmhycbuvofdjm.supabase.co';
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpemZoc2libWh5Y2J1dm9mZGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTE5ODQsImV4cCI6MjEwMDUyNzk4NH0.UnfUpg3KDv1ZnIvD8igSwgZ2a6Hd_mdT-2wqI4xsBEI';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || defaultUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || defaultKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
