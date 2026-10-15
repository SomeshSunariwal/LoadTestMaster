import { VariableInput } from '../components/VariableInput';
import './Environments.css';
import { useState } from 'react';
import {
  FiPlus,
  FiSave,
  FiSearch,
  FiEdit2,
  FiDatabase,
  FiTrash2,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';
import { useApp } from '../hooks/useApp';
import { pair, uid } from '../shared/defaults';
import { Button, Empty, Field, IconButton, Modal } from '../components/ui';
import { PairEditor } from '../components/PairEditor';
import { ResizableEnvironments } from '../components/ResizableEnvironments';
export function Environments() {
  const app = useApp(),
    ws = app.state!.workspace;
  const [id, setId] = useState('local'),
    [query, setQuery] = useState(''),
    [naming, setNaming] = useState<'new' | 'rename'>(),
    [name, setName] = useState(''),
    [reveal, setReveal] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const env = ws.environments.find((e) => e.id === id) || ws.environments[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ONE REQUEST. EVERY ENVIRONMENT.</div>
          <h1>
            Environments
            <span className="heading-dot green" />
          </h1>
          <p>Keep your variables in sync, from local to production.</p>
        </div>
      </div>
      <ResizableEnvironments
        environments={
          <aside className="panel environment-list">
            <div className="panel-title">
              <h3>
                Environments <span className="count">{ws.environments.length}</span>
              </h3>
              <IconButton
                label="New environment"
                onClick={() => {
                  setName('');
                  setNaming('new');
                }}
              >
                <FiPlus />
              </IconButton>
            </div>
            <div className="search">
              <FiSearch />
              <VariableInput
                aria-label="Search environments"
                value={query}
                onValueChange={(value) => setQuery(value)}
                placeholder="Search environments…"
              />
            </div>
            <div className="environment-items">
              {ws.environments
                .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
                .map((e) => (
                  <button
                    key={e.id}
                    className={`environment-item ${env?.id === e.id ? 'selected' : ''}`}
                    onClick={() => setId(e.id)}
                  >
                    <span className="environment-orb" style={{ background: e.color }} />
                    <span>
                      <strong>{e.name}</strong>
                      <small>{e.variables.length} variables</small>
                    </span>
                    <span className="item-arrow">→</span>
                  </button>
                ))}
            </div>
          </aside>
        }
        variables={
          env ? (
            <section className="panel variable-panel">
              <div className="variable-heading">
                <div>
                  <h2>
                    <span className="dot" style={{ background: env.color }} />
                    {env.name}
                    <IconButton
                      label="Rename environment"
                      onClick={() => {
                        setName(env.name);
                        setNaming('rename');
                      }}
                    >
                      <FiEdit2 />
                    </IconButton>
                  </h2>
                  <p>
                    {env.variables.length} variables <span>·</span> Available to every collection
                  </p>
                </div>
                <div className="actions">
                  <IconButton
                    label={reveal ? 'Hide secret values' : 'Show secret values'}
                    onClick={() => setReveal(!reveal)}
                  >
                    {reveal ? <FiEyeOff /> : <FiEye />}
                  </IconButton>
                  {
                    <IconButton label="Delete environment" onClick={() => setConfirmDelete(true)}>
                      <FiTrash2 />
                    </IconButton>
                  }
                  <Button
                    variant="primary"
                    disabled={app.busy}
                    onClick={() => void app.perform(() => app.save('Environment saved'))}
                  >
                    <FiSave />
                    Save changes
                  </Button>
                </div>
              </div>
              <div className="variables-content">
                <PairEditor
                  environmentId={env.id}
                  scrollable
                  secret={!reveal}
                  items={env.variables}
                  onChange={(items) =>
                    app.update((w) => {
                      w.environments.find((e) => e.id === env.id)!.variables = items;
                    })
                  }
                />
              </div>
              <div className="variable-footer">
                <span className="dot green" />
                Variables are resolved in the desktop backend.
                <span>Values are saved locally on this device.</span>
              </div>
            </section>
          ) : (
            <Empty icon={<FiDatabase />} heading="Add an environment">
              Create your first environment to configure API variables.
            </Empty>
          )
        }
      />
      {naming && (
        <Modal
          title={naming === 'new' ? 'New environment' : 'Rename environment'}
          onClose={() => setNaming(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              app.update((w) => {
                if (naming === 'new') {
                  const next = uid();
                  w.environments.push({
                    id: next,
                    name: name.trim(),
                    color: '#a879ff',
                    variables: [pair('baseUrl', 'http://localhost:3000')],
                  });
                  setId(next);
                } else w.environments.find((e) => e.id === env?.id)!.name = name.trim();
              });
              setNaming(undefined);
              void app.perform(() => app.save());
            }}
          >
            <Field label="Environment name">
              <VariableInput
                autoFocus
                required
                maxLength={100}
                value={name}
                onValueChange={(value) => setName(value)}
                placeholder="e.g. Performance"
              />
            </Field>
            <div className="modal-footer">
              <Button type="button" onClick={() => setNaming(undefined)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save environment
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDelete && env && (
        <Modal title={`Delete ${env.name}?`} onClose={() => setConfirmDelete(false)}>
          <p>Collections using this environment will switch to the first available environment.</p>
          <div className="modal-footer">
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                app.update((w) => {
                  w.environments = w.environments.filter((e) => e.id !== env.id);
                  w.collections.forEach((c) => {
                    if (c.environmentId === env.id) c.environmentId = w.environments[0]?.id ?? '';
                  });
                });
                setId('');
                setConfirmDelete(false);
                void app.perform(() => app.save('Environment deleted'));
              }}
            >
              Delete environment
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
