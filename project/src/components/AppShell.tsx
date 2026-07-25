import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, BarChart3, Brain, Map, Lightbulb, FileText, Users,
  ShieldCheck, Moon, Sun, LogOut, ChevronDown, Menu, X, Bell, FlaskConical,
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { useTheme } from '../services/themeContext';
import { Badge } from './ui/Badge';
import { cn } from '../services/utils';
import type { UserRole } from '../services/types';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
  { id: 'prediction', label: 'Prediction', icon: <Brain className="h-4.5 w-4.5" /> },
  { id: 'map', label: 'Crime Map', icon: <Map className="h-4.5 w-4.5" /> },
  { id: 'insights', label: 'AI Insights', icon: <Lightbulb className="h-4.5 w-4.5" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="h-4.5 w-4.5" /> },
  { id: 'admin', label: 'Admin', icon: <Users className="h-4.5 w-4.5" />, roles: ['admin'] },
];

export function AppShell({
  page,
  setPage,
  children,
}: {
  page: string;
  setPage: (p: string) => void;
  children: ReactNode;
}) {
  const { profile, signOut, isDemo } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(profile?.role as UserRole));
  const activeLabel = NAV.find((n) => n.id === page)?.label ?? 'Dashboard';

  const navigate = (id: string) => {
    setPage(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 shadow-lg shadow-brand-500/30">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-slate-800 dark:text-white">CrimeScope</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">AI Analytics</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                page === item.id
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
              )}
            >
              <span className={cn(page === item.id ? 'text-white' : 'text-slate-400 group-hover:text-brand-500 dark:group-hover:text-brand-400')}>
                {item.icon}
              </span>
              {item.label}
              {item.id === 'admin' && <Badge variant="brand" className="ml-auto">Admin</Badge>}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500 text-xs font-bold text-white">
                {profile?.full_name?.charAt(0) ?? 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {profile?.full_name}
                </p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {profile?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="font-display text-base font-bold text-slate-800 dark:text-white">{activeLabel}</h1>
            {isDemo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                <FlaskConical className="h-3 w-3" />
                Demo
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500 text-xs font-bold text-white">
                  {profile?.full_name?.charAt(0) ?? 'A'}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{profile?.full_name}</p>
                  <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{profile?.role}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-scale-in rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile?.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                      <Badge variant={profile?.role === 'admin' ? 'brand' : 'default'} className="mt-1.5">
                        {profile?.role === 'admin' ? 'Administrator' : 'Analyst'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
