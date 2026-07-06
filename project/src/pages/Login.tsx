import { useState, type FormEvent } from 'react';
import { ShieldCheck, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { Button } from '../components/ui/Button';

export function Login() {
  const { signIn, signUp, loading, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('admin@crimescope.ai');
  const [password, setPassword] = useState('Admin@123');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (mode === 'signup' && fullName.trim().length < 2) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setLocalError(error);
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) setLocalError(error);
    }
  };

  const fillDemo = (kind: 'admin' | 'analyst') => {
    setMode('login');
    setEmail(kind === 'admin' ? 'admin@crimescope.ai' : 'analyst@crimescope.ai');
    setPassword(kind === 'admin' ? 'Admin@123' : 'Analyst@123');
    setLocalError(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          {/* Left — brand panel */}
          <div className="relative hidden flex-col justify-between p-10 lg:flex">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 shadow-lg shadow-brand-500/30">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-white">CrimeScope AI</p>
                  <p className="text-xs text-slate-400">Hotspot Prediction & Analytics</p>
                </div>
              </div>
              <h1 className="mt-12 font-display text-3xl font-bold leading-tight text-white">
                Predict crime trends.<br />
                Identify hotspots.<br />
                <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
                  Protect communities.
                </span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                AI-powered crime analytics combining historical incident data, machine-learning
                forecasts, and interactive hotspot mapping to give law enforcement actionable intelligence.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'RandomForest-style occurrence prediction', icon: '🎯' },
                { label: 'DBSCAN hotspot clustering', icon: '📍' },
                { label: 'Linear-regression trend forecasting', icon: '📈' },
                { label: 'Rule-based AI insight engine', icon: '🧠' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-base">{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-white">CrimeScope AI</p>
                  <p className="text-xs text-slate-400">Hotspot Prediction & Analytics</p>
                </div>
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {mode === 'login'
                ? 'Sign in to access the analytics dashboard.'
                : 'Sign up as an analyst to start exploring crime data.'}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Full name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Aarav Sharma"
                      className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800/60 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@agency.gov.in"
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800/60 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800/60 pl-9 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {(localError || error) && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{localError || error}</span>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="h-11 w-full"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setLocalError(null);
                }}
                className="font-medium text-brand-400 hover:text-brand-300"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-800/40 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Demo accounts
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fillDemo('admin')}
                  className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-xs text-slate-300 hover:border-brand-500/50 hover:bg-slate-800"
                >
                  <p className="font-semibold text-slate-200">Admin</p>
                  <p className="text-slate-500">admin@crimescope.ai</p>
                </button>
                <button
                  onClick={() => fillDemo('analyst')}
                  className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-xs text-slate-300 hover:border-brand-500/50 hover:bg-slate-800"
                >
                  <p className="font-semibold text-slate-200">Analyst</p>
                  <p className="text-slate-500">analyst@crimescope.ai</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
