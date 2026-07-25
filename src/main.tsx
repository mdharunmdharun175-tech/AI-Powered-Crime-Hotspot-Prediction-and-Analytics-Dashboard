import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
          <div className="max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              ⚠️
            </div>
            <h2 className="font-display text-lg font-bold">CrimeScope AI Encountered an Issue</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="mt-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-500"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
