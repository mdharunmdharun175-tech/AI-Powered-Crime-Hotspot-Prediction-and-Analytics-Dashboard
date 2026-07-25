import { useState } from 'react';
import { AuthProvider, useAuth } from './services/authContext';
import { ThemeProvider } from './services/themeContext';
import { FilterProvider } from './services/filterContext';
import { AppShell } from './components/AppShell';
import { FilterBar } from './components/FilterBar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Prediction } from './pages/Prediction';
import { CrimeMap } from './pages/CrimeMap';
import { Insights } from './pages/Insights';
import { Reports } from './pages/Reports';
import { Admin } from './pages/Admin';
import { Spinner } from './components/ui/Feedback';

const PAGES_WITH_FILTERS = ['dashboard', 'analytics', 'prediction', 'insights', 'reports'];

function AppInner() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading CrimeScope AI...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const showFilters = PAGES_WITH_FILTERS.includes(page);

  return (
    <AppShell page={page} setPage={setPage}>
      <div className="space-y-4">
        {showFilters && <FilterBar compact />}
        {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
        {page === 'analytics' && <Analytics />}
        {page === 'prediction' && <Prediction />}
        {page === 'map' && <CrimeMap />}
        {page === 'insights' && <Insights />}
        {page === 'reports' && <Reports />}
        {page === 'admin' && <Admin />}
      </div>
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FilterProvider>
          <AppInner />
        </FilterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
