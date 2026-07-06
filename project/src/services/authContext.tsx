import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { Profile, UserRole } from './types';

interface AuthState {
  session: { user: { id: string; email: string } } | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
    error: null,
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
        full_name: 'Analyst',
        role: 'analyst',
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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email ?? '');
      } else {
        setState({ session: null, profile: null, loading: false, error: null });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email ?? '');
        } else {
          setState({ session: null, profile: null, loading: false, error: null });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return { error: error.message };
    }
    if (data.user) {
      await loadProfile(data.user.id, data.user.email ?? '');
    }
    return { error: null };
  };

  const signUp: AuthContextValue['signUp'] = async (email, password, fullName) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return { error: error.message };
    }
    if (data.user) {
      await loadProfile(data.user.id, data.user.email ?? email);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, profile: null, loading: false, error: null });
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
