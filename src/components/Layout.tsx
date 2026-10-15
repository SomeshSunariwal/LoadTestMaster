import './css/Layout.css';
import {
  FiActivity,
  FiArrowUpRight,
  FiBox,
  FiClock,
  FiCpu,
  FiDatabase,
  FiGrid,
  FiLayers,
  FiMoon,
  FiSave,
  FiServer,
  FiSettings,
  FiSun,
  FiZap,
} from 'react-icons/fi';
import { useApp } from '../hooks/useApp';
import type { Page } from '../shared/schema';
import { bytes } from '../shared/format';
import { Button, IconButton, Toast } from './ui';
import type { ReactNode } from 'react';
const navigation: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
  { id: 'collections', label: 'Collections', icon: <FiLayers /> },
  { id: 'environments', label: 'Environments', icon: <FiDatabase /> },
  { id: 'history', label: 'History', icon: <FiClock /> },
  { id: 'monitoring', label: 'Monitoring', icon: <FiActivity /> },
  { id: 'settings', label: 'Settings', icon: <FiSettings /> },
];
export function Layout({ children }: { children: ReactNode }) {
  const app = useApp();
  const state = app.state;
  const theme = state?.workspace.theme || 'dark';
  const r = state?.resources;
  const active = state?.runs.filter((r) => r.status === 'running').length || 0;
  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <FiZap />
          </span>
          <div>
            <strong>
              LoadMaster<span>®</span>
            </strong>
            <small>API LOAD TESTING</small>
          </div>
        </div>
        <div className="workspace-label">
          WORKSPACE <span>LOCAL</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <button
              aria-label={n.label}
              key={n.id}
              className={app.page === n.id ? 'active' : ''}
              onClick={() => app.setPage(n.id)}
            >
              {n.icon}
              <span>{n.label}</span>
              {n.id === 'dashboard' && active > 0 && <span className="nav-count">{active}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-callout">
            <div>
              <span className="dot green" />
              YOUR WORKSPACE
            </div>
            <p>
              Your next bottleneck
              <br />
              is waiting to be found.
            </p>
            <button onClick={() => app.setPage('collections')}>
              Start testing <FiArrowUpRight />
            </button>
          </div>
          <section className="resource-card">
            <h4>
              System resources
              <span className="dot green" />
            </h4>
            {[
              {
                label: 'CPU',
                value: `${(r?.cpu || 0).toFixed(0)}%`,
                progress: r?.cpu || 0,
                icon: <FiCpu />,
                tone: 'blue',
              },
              {
                label: 'Memory',
                value: r ? `${bytes(r.memoryUsed)} / ${bytes(r.memoryTotal)}` : 'Connecting…',
                progress: r ? (r.memoryUsed / r.memoryTotal) * 100 : 0,
                icon: <FiServer />,
                tone: 'green',
              },
            ].map((s) => (
              <div className="resource-row" key={s.label}>
                {s.icon}
                <div>
                  <div>
                    <span>{s.label}</span>
                    <small>{s.value}</small>
                  </div>
                  <div className={`progress ${s.tone}`}>
                    <span style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </section>
          <div className="sidebar-footer">
            <span className="avatar">LM</span>
            <div>
              <strong>Local workspace</strong>
              <small>All systems ready</small>
            </div>
            <span className="dot green" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <FiBox />
            <span>Workspace</span>
            <span>/</span>
            <strong>{navigation.find((n) => n.id === app.page)?.label || 'Settings'}</strong>
          </div>
          <div className="actions">
            {app.dirty && (
              <Button variant="ghost" onClick={() => void app.perform(() => app.save())}>
                <FiSave />
                Save changes
              </Button>
            )}
            <span className="local-chip">
              <span className="dot green" />
              Local
            </span>
            <span className="topbar-divider" />
            <IconButton
              label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => {
                app.update((w) => {
                  w.theme = theme === 'dark' ? 'light' : 'dark';
                });
                void app.perform(() => app.save('Theme updated'));
              }}
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </IconButton>
            <span className="avatar small">LM</span>
          </div>
        </header>
        <main
          className={
            ['dashboard', 'collections', 'environments', 'history'].includes(app.page)
              ? `workspace-page ${app.page}-page`
              : undefined
          }
        >
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <span className="dot green" />
            Local-first. Built for performance.
          </span>
          <span>
            LoadMaster <span className="muted">v1.0.0</span>
          </span>
        </footer>
      </div>
      {app.error && <Toast error message={app.error} onClose={() => app.setError('')} />}
      {app.notice && !app.error && <Toast message={app.notice} onClose={() => app.setNotice('')} />}
    </div>
  );
}
