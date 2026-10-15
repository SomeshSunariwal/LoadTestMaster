import './App.css';
import { Component, Suspense, lazy, type ReactNode } from 'react';
import { FiZap } from 'react-icons/fi';
import { useApp } from './hooks/useApp';
import { AppProvider } from './context/AppProvider';
import { Layout } from './components/Layout';
import { Button } from './components/ui';
import { ContextMenuBoundary } from './components/ContextMenuBoundary';
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Collections = lazy(() =>
  import('./pages/Collections').then((m) => ({ default: m.Collections })),
);
const Environments = lazy(() =>
  import('./pages/Environments').then((m) => ({ default: m.Environments })),
);
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));
const Monitoring = lazy(() =>
  import('./pages/Monitoring').then((m) => ({ default: m.Monitoring })),
);
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
function Content() {
  const app = useApp();
  if (!app.state)
    return (
      <Layout>
        <div className="loading-state">
          <div className="brand-icon">
            <FiZap />
          </div>
          <h2>{app.error ? 'Let’s reconnect' : 'Opening your workspace…'}</h2>
          <p>{app.error || 'Connecting to the LoadMaster backend'}</p>
          {app.error && <Button onClick={() => void app.refresh()}>Retry connection</Button>}
        </div>
      </Layout>
    );
  return (
    <Layout>
      <Suspense fallback={<div className="loading-state">Opening page…</div>}>
        {app.page === 'dashboard' ? (
          <Dashboard />
        ) : app.page === 'collections' ? (
          <Collections />
        ) : app.page === 'environments' ? (
          <Environments />
        ) : app.page === 'history' ? (
          <History />
        ) : app.page === 'monitoring' ? (
          <Monitoring />
        ) : (
          <Settings />
        )}
      </Suspense>
    </Layout>
  );
}
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="loading-state">
        <h1>Something went wrong</h1>
        <p>{this.state.error}</p>
        <Button onClick={() => this.setState({ error: '' })}>Try again</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ContextMenuBoundary>
      <ErrorBoundary>
        <AppProvider>
          <Content />
        </AppProvider>
      </ErrorBoundary>
    </ContextMenuBoundary>
  );
}
