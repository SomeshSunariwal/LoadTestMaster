import { VariableTextarea } from '../components/VariableInput';
import './Settings.css';
import { FiDownload, FiUpload, FiMoon, FiSun, FiSave, FiInfo, FiZap } from 'react-icons/fi';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { workspaceSchema } from '../shared/schema';
import { Button, Field, Modal, NumberField } from '../components/ui';
export function Settings() {
  const app = useApp();
  const ws = app.state!.workspace;
  const [importing, setImporting] = useState(false),
    [input, setInput] = useState(''),
    [error, setError] = useState(''),
    [exported, setExported] = useState(false);
  const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(ws, null, 2))}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOUR WORKSPACE</div>
          <h1>
            Settings
            <span className="heading-dot" />
          </h1>
          <p>A few thoughtful defaults, just the way you work.</p>
        </div>
        <Button variant="primary" onClick={() => void app.perform(() => app.save())}>
          <FiSave />
          Save settings
        </Button>
      </div>
      <div className="settings-grid">
        <section className="panel settings-card">
          <h3>Appearance</h3>
          <p>Choose a theme for your workspace.</p>
          <div className="theme-options">
            {(['dark', 'light'] as const).map((theme) => (
              <button
                key={theme}
                className={ws.theme === theme ? 'selected' : ''}
                onClick={() => {
                  app.update((w) => {
                    w.theme = theme;
                  });
                  void app.perform(() => app.save('Theme updated'));
                }}
              >
                {theme === 'dark' ? <FiMoon /> : <FiSun />}
                <strong>{theme === 'dark' ? 'Dark' : 'Light'}</strong>
                <span>{theme === 'dark' ? 'Charcoal #292929' : 'Bright and focused'}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel settings-card">
          <h3>Run history</h3>
          <p>Keep completed results on this device.</p>
          <NumberField
            label="Maximum saved runs"
            min={1}
            max={100}
            value={ws.retention}
            onChange={(v) =>
              app.update((w) => {
                w.retention = v;
              })
            }
          />
          <small>Retention applies when the next run is saved.</small>
        </section>
        <section className="panel settings-card">
          <h3>Workspace backup</h3>
          <p>
            Export collections, environment variables, and settings, or restore an existing backup.
          </p>
          <div className="actions">
            <Button onClick={() => setExported(true)}>
              <FiDownload />
              Export workspace
            </Button>
            <Button
              onClick={() => {
                setInput('');
                setError('');
                setImporting(true);
              }}
            >
              <FiUpload />
              Import workspace
            </Button>
          </div>
          <div className="inline-alert">
            <FiInfo />
            Backups include authentication values. Keep them private.
          </div>
        </section>
        <section className="panel settings-card about-card">
          <div className="brand-icon">
            <FiZapIcon />
          </div>
          <h3>
            LoadMaster <span className="count">1.0.0</span>
          </h3>
          <p>API load testing, with room to grow.</p>
          <small>React 19 · Electrobun 2 · Tailwind 4</small>
        </section>
      </div>
      {exported && (
        <Modal title="Export workspace" onClose={() => setExported(false)}>
          <p>This backup contains environment values and API credentials.</p>
          <div className="modal-footer">
            <Button onClick={() => setExported(false)}>Cancel</Button>
            <a
              className="button primary"
              download="loadmaster-workspace.json"
              href={dataUrl}
              onClick={() => setExported(false)}
            >
              <FiDownload />
              Download backup
            </a>
          </div>
        </Modal>
      )}
      {importing && (
        <Modal
          title="Import workspace"
          subtitle="Paste a LoadMaster JSON backup. This replaces your current configuration."
          onClose={() => setImporting(false)}
        >
          <Field label="Workspace JSON">
            <VariableTextarea
              className="code-editor"
              value={input}
              onValueChange={(value) => setInput(value)}
              placeholder={'{ "collections": […], "environments": […] }'}
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-footer">
            <Button onClick={() => setImporting(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                try {
                  const parsed = workspaceSchema.parse(JSON.parse(input));
                  app.update((w) => Object.assign(w, parsed));
                  void app.perform(async () => {
                    await app.save('Workspace imported');
                    setImporting(false);
                  });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Invalid workspace');
                }
              }}
            >
              Import and replace
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function FiZapIcon() {
  return <FiZap />;
}
