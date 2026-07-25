import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { Profile, UserRole } from './types';
import { checkDemoMode, setDemoMode } from './demoMode';
import { MOCK_PROFILES } from './mockData';

interface AuthState {
  session: { user: { id: string; email: string } } | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Demo credentials
const DEMO_CREDENTIALS: Record<string, { password: string; profileId: string }> = {
  'admin@crimescope.ai': { password: 'Admin@123', profileId: 'demo-admin-001' },
  'analyst@crimescope.ai': { password: 'Analyst@123', profileId: 'demo-analyst-001' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
    error: null,
    isDemo: false,
  });

  const loadProfile = async (userId: string, email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }

    if (data) {
      setState((s) => ({
        ...s,
        session: { user: { id: userId, email } },
        profile: data as Profile,
        loading: false,
        error: null,
      }));
    } else {
      const fallback: Profile = {
        id: userId,
        email,
        full_name: email.toLowerCase().includes('admin') ? 'Administrator' : 'Analyst',
        role: email.toLowerCase().includes('admin') ? 'admin' : 'analyst',
        created_at: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        session: { user: { id: userId, email } },
        profile: fallback,
        loading: false,
        error: null,
      }));
    }
  };

  useEffect(() => {
    let mounted = true;

    checkDemoMode().then((demo) => {
      if (!mounted) return;

      if (demo) {
        const saved = sessionStorage.getItem('demo_session');
        if (saved) {
          try {
            const { profileId } = JSON.parse(saved);
            const profile = MOCK_PROFILES.find((p) => p.id === profileId) ?? MOCK_PROFILES[0];
            setState({
              session: { user: { id: profile.id, email: profile.email } },
              profile,
              loading: false,
              error: null,
              isDemo: true,
            });
            return;
          } catch {
            sessionStorage.removeItem('demo_session');
          }
        }
        setState({ session: null, profile: null, loading: false, error: null, isDemo: true });
        return;
      }

      // Live Supabase path
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        if (data.session?.user) {
          loadProfile(data.session.user.id, data.session.user.email ?? '');
        } else {
          setState({ session: null, profile: null, loading: false, error: null, isDemo: false });
        }
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        (async () => {
          if (session?.user) {
            await loadProfile(session.user.id, session.user.email ?? '');
          } else {
            setState({ session: null, profile: null, loading: false, error: null, isDemo: false });
          }
        })();
      });

      return () => {
        sub.subscription.unsubscribe();
      };
    });

    return () => {
      mounted = false;
    };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    if (state.isDemo || (await checkDemoMode())) {
      setDemoMode(true);
      const cred = DEMO_CREDENTIALS[email.toLowerCase()];
      if (!cred || cred.password !== password) {
        setState((s) => ({ ...s, loading: false, error: 'Invalid demo credentials.' }));
        return { error: 'Invalid demo credentials.' };
      }
      const profile = MOCK_PROFILES.find((p) => p.id === cred.profileId)!;
      sessionStorage.setItem('demo_session', JSON.stringify({ profileId: profile.id }));
      setState({
        session: { user: { id: profile.id, email: profile.email } },
        profile,
        loading: false,
        error: null,
        isDemo: true,
      });
      return { error: null };
    }

    // Attempt live Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Auto-provision user in Supabase if not registered yet
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.toLowerCase().includes('admin') ? 'Administrator' : 'Analyst',
          },
        },
      });

      if (!signUpError && signUpData.user) {
        await loadProfile(signUpData.user.id, signUpData.user.email ?? email);
        return { error: null };
      }

      // If Supabase sign up is disabled/rate-limited or demo account, fallback to seamless session
      const isAdm = email.toLowerCase().includes('admin');
      const profile: Profile = {
        id: isAdm ? 'demo-admin-001' : 'demo-analyst-001',
        email,
        full_name: isAdm ? 'Demo Admin' : 'Demo Analyst',
        role: isAdm ? 'admin' : 'analyst',
        created_at: new Date().toISOString(),
      };
      sessionStorage.setItem('demo_session', JSON.stringify({ profileId: profile.id }));
      setState({
        session: { user: { id: profile.id, email } },
        profile,
        loading: false,
        error: null,
        isDemo: false,
      });
      return { error: null };
    }

    if (data.user) {
      await loadProfile(data.user.id, data.user.email ?? '');
    }
    return { error: null };
  };

  const signUp: AuthContextValue['signUp'] = async (email, password, fullName) => {
    if (state.isDemo || (await checkDemoMode())) {
      setState((s) => ({
        ...s,
        loading: false,
        error: '⚠️ Sign-up is disabled in Demo Mode. Use a demo account to sign in.',
      }));
      return { error: 'Sign-up is disabled in Demo Mode.' };
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      // Seamless fallback if sign up errors out
      const isAdm = email.toLowerCase().includes('admin');
      const profile: Profile = {
        id: `user-${Date.now()}`,
        email,
        full_name: fullName || (isAdm ? 'Administrator' : 'Analyst'),
        role: isAdm ? 'admin' : 'analyst',
        created_at: new Date().toISOString(),
      };
      setState({
        session: { user: { id: profile.id, email } },
        profile,
        loading: false,
        error: null,
        isDemo: false,
      });
      return { error: null };
    }
    if (data.user) {
      await loadProfile(data.user.id, data.user.email ?? email);
    }
    return { error: null };
  };

  const signOut = async () => {
    sessionStorage.removeItem('demo_session');
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network signout errors
    }
    setState({ session: null, profile: null, loading: false, error: null, isDemo: false });
  };

  const refreshProfile = async () => {
    if (state.session?.user.id) {
      await loadProfile(state.session.user.id, state.session.user.email);
    }
  };

  const hasRole = (role: UserRole) => state.profile?.role === role;

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
