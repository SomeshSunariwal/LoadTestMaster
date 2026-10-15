import { VariableInput } from '../components/VariableInput';
import './css/Collections.css';
import { useState } from 'react';
import {
  FiFolder,
  FiPlus,
  FiSearch,
  FiPlay,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiLayers,
  FiArrowRight,
  FiSliders,
} from 'react-icons/fi';
import { useApp } from '../hooks/useApp';
import { blankApi, defaultConfig, uid } from '../shared/defaults';
import type { ApiDefinition } from '../shared/schema';
import { Badge, Button, Empty, Field, IconButton, Modal, Select } from '../components/ui';
import { LoadConfigForm } from '../components/LoadConfigForm';
import { ApiModal } from '../components/ApiModal';
import { ResizableColumns } from '../components/ResizableColumns';

export function Collections() {
  const app = useApp();
  const ws = app.state!.workspace;
  const collection = ws.collections.find((c) => c.id === app.collectionId) || ws.collections[0];
  const [query, setQuery] = useState('');
  const [collectionQuery, setCollectionQuery] = useState('');
  const [editing, setEditing] = useState<ApiDefinition>();
  const [naming, setNaming] = useState<'new' | 'rename'>();
  const [name, setName] = useState('');
  const [all, setAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const change = (fn: (c: NonNullable<typeof collection>) => void) =>
    app.update((w) => {
      const c = w.collections.find((c) => c.id === collection?.id);
      if (c) fn(c);
    });
  const selected = collection?.apis.filter((a) => a.selected).length || 0;
  const filteredCollections = ws.collections.filter((c) =>
    c.name.toLowerCase().includes(collectionQuery.trim().toLowerCase()),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>
            Collections
            <span className="heading-dot" />
          </h1>
          <p>Organize your APIs. Configure the load. Find your limits.</p>
        </div>
      </div>
      <ResizableColumns
        collections={
          <aside className="panel collection-list">
            <div className="panel-title">
              <h3>
                Collections <span className="count">{ws.collections.length}</span>
              </h3>
              <IconButton
                label="New collection"
                onClick={() => {
                  setName('');
                  setNaming('new');
                }}
              >
                <FiPlus />
              </IconButton>
            </div>
            <div className="search collection-search">
              <FiSearch />
              <input
                aria-label="Search collections"
                value={collectionQuery}
                onChange={(event) => setCollectionQuery(event.target.value)}
                placeholder="Search collections…"
              />
            </div>
            <div className="collection-items">
              {filteredCollections.map((c) => (
                <button
                  key={c.id}
                  className={`collection-item ${collection?.id === c.id ? 'selected' : ''}`}
                  onClick={() => app.setCollectionId(c.id)}
                >
                  <FiFolder style={{ color: c.color }} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.apis.length} APIs</small>
                  </span>
                  <FiArrowRight className="item-arrow" />
                </button>
              ))}
              {filteredCollections.length === 0 && (
                <p className="collection-search-empty">No collections found.</p>
              )}
            </div>
          </aside>
        }
        apis={
          collection ? (
            <section className="panel api-list">
              <div className="collection-heading">
                <div>
                  <h2>
                    {collection.name}
                    <IconButton
                      label="Rename collection"
                      onClick={() => {
                        setName(collection.name);
                        setNaming('rename');
                      }}
                    >
                      <FiEdit2 />
                    </IconButton>
                  </h2>
                  <p>
                    {collection.apis.length} APIs <span>·</span> {selected} selected
                  </p>
                </div>
                <div className="actions">
                  <IconButton label="Delete collection" onClick={() => setDeleting(true)}>
                    <FiTrash2 />
                  </IconButton>
                  <Button onClick={() => setEditing(blankApi())}>
                    <FiPlus />
                    Add API
                  </Button>
                </div>
              </div>
              <div className="search">
                <FiSearch />
                <VariableInput
                  aria-label="Search APIs"
                  value={query}
                  onValueChange={(value) => setQuery(value)}
                  placeholder="Search APIs in this collection…"
                />
                <kbd>API</kbd>
              </div>
              <div className="table-scroll">
                <table className="api-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select all APIs"
                          checked={
                            collection.apis.length > 0 && selected === collection.apis.length
                          }
                          onChange={(e) =>
                            change((c) =>
                              c.apis.forEach((a) => {
                                a.selected = e.target.checked;
                              }),
                            )
                          }
                        />
                      </th>
                      <th>Method</th>
                      <th>API name / Endpoint</th>
                      <th>Configuration</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {collection.apis
                      .filter((a) =>
                        `${a.name} ${a.url} ${a.method}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((api) => (
                        <tr key={api.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${api.name}`}
                              checked={api.selected}
                              onChange={(e) =>
                                change((c) => {
                                  c.apis.find((a) => a.id === api.id)!.selected = e.target.checked;
                                })
                              }
                            />
                          </td>
                          <td>
                            <Badge
                              tone={
                                api.method === 'GET'
                                  ? 'green'
                                  : api.method === 'DELETE'
                                    ? 'red'
                                    : 'blue'
                              }
                            >
                              {api.method}
                            </Badge>
                          </td>
                          <td>
                            <button className="api-name" onClick={() => setEditing(api)}>
                              {api.name}
                            </button>
                            <div className="endpoint">{api.url.replace('{{baseUrl}}', '')}</div>
                          </td>
                          <td
                            className="api-config-cell"
                            title={
                              api.useGlobal
                                ? 'Uses the collection’s global configuration'
                                : 'Uses this API’s own load configuration'
                            }
                          >
                            <Badge tone={api.useGlobal ? 'neutral' : 'purple'}>
                              {api.useGlobal ? <FiLayers /> : <FiSliders />}
                              {api.useGlobal ? 'Global' : 'Own API'}
                            </Badge>
                          </td>
                          <td>
                            <div className="row-actions">
                              <IconButton
                                label={`Edit ${api.name}`}
                                onClick={() => setEditing(api)}
                              >
                                <FiEdit2 />
                              </IconButton>
                              <IconButton
                                label={`Delete ${api.name}`}
                                onClick={() =>
                                  change((c) => {
                                    c.apis = c.apis.filter((a) => a.id !== api.id);
                                  })
                                }
                              >
                                <FiTrash2 />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!collection.apis.length && (
                <Empty
                  icon={<FiLayers />}
                  heading="Your next test starts here"
                  action={
                    <Button onClick={() => setEditing(blankApi())}>
                      <FiPlus />
                      Add your first API
                    </Button>
                  }
                >
                  Add an endpoint to begin building this collection.
                </Empty>
              )}
              <div className="api-list-footer">
                <span className="dot green" /> HTTP / HTTPS supported{' '}
                <span>Variables resolve at run time</span>
              </div>
            </section>
          ) : (
            <Empty icon={<FiFolder />} heading="Create a collection">
              Keep related API requests together in a collection.
            </Empty>
          )
        }
        configuration={
          collection ? (
            <aside className="panel configuration">
              <div className="panel-title">
                <h3>Test configuration</h3>
                <IconButton
                  label="Save configuration"
                  onClick={() => void app.perform(() => app.save())}
                >
                  <FiSave />
                </IconButton>
              </div>
              <div className="configuration-content">
                <div className="global-banner">
                  <FiLayers />
                  <div>
                    <strong>Collection settings</strong>
                    <p>Applied to APIs using shared configuration.</p>
                  </div>
                </div>
                <div className="config-section">
                  <h4>Basic settings</h4>
                  <Field label="Environment">
                    <Select
                      value={collection.environmentId}
                      onChange={(e) =>
                        change((c) => {
                          c.environmentId = e.target.value;
                        })
                      }
                    >
                      {ws.environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <button
                    className="text-link manage-env"
                    onClick={() => app.setPage('environments')}
                  >
                    Manage environments <FiArrowRight />
                  </button>
                  <div className="radio-stack">
                    <label>
                      <input
                        type="radio"
                        name="target"
                        checked={!all}
                        onChange={() => setAll(false)}
                      />
                      Run selected APIs ({selected})
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="target"
                        checked={all}
                        onChange={() => setAll(true)}
                      />
                      Run all APIs ({collection.apis.length})
                    </label>
                  </div>
                </div>
                <LoadConfigForm
                  value={collection.config}
                  onChange={(v) =>
                    change((c) => {
                      c.config = v;
                    })
                  }
                />
                <div className="config-section helper muted">
                  Up to 1,000 users · 200 in-flight requests across all runs. Parallel requests
                  multiply each API’s iteration.
                </div>
              </div>
              <div className="configuration-footer">
                <Button
                  variant="primary"
                  disabled={app.busy || !(all ? collection.apis.length : selected)}
                  onClick={() => {
                    app.setCollectionId(collection.id);
                    void app.start(all);
                  }}
                >
                  <FiPlay />
                  Run load test ({all ? collection.apis.length : selected} APIs)
                </Button>
              </div>
            </aside>
          ) : (
            <Empty icon={<FiSliders />} heading="Test configuration">
              Select a collection to configure a load test.
            </Empty>
          )
        }
      />
      {editing && (
        <ApiModal
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSave={(api) => {
            change((c) => {
              const i = c.apis.findIndex((a) => a.id === api.id);
              if (i >= 0) c.apis[i] = api;
              else c.apis.push(api);
            });
            setEditing(undefined);
            void app.perform(() => app.save('API saved'));
          }}
        />
      )}
      {deleting && collection && (
        <Modal title={`Delete ${collection.name}?`} onClose={() => setDeleting(false)}>
          <p>
            This removes the collection and its API definitions. Saved test results will remain in
            History.
          </p>
          <div className="modal-footer">
            <Button onClick={() => setDeleting(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                app.update((w) => {
                  w.collections = w.collections.filter((c) => c.id !== collection.id);
                });
                setDeleting(false);
                void app.perform(() => app.save('Collection deleted'));
              }}
            >
              Delete collection
            </Button>
          </div>
        </Modal>
      )}
      {naming && (
        <Modal
          title={naming === 'new' ? 'New collection' : 'Rename collection'}
          onClose={() => setNaming(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              if (naming === 'new') {
                const id = uid();
                app.update((w) =>
                  w.collections.push({
                    id,
                    name: name.trim(),
                    description: '',
                    color: '#4d8dff',
                    environmentId: w.environments[0]?.id || '',
                    config: { ...defaultConfig },
                    apis: [],
                  }),
                );
                app.setCollectionId(id);
              } else
                change((c) => {
                  c.name = name.trim();
                });
              setNaming(undefined);
              void app.perform(() => app.save());
            }}
          >
            <Field label="Collection name">
              <VariableInput
                autoFocus
                required
                maxLength={200}
                value={name}
                onValueChange={(value) => setName(value)}
                placeholder="e.g. Product Catalog"
              />
            </Field>
            <div className="modal-footer">
              <Button onClick={() => setNaming(undefined)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {naming === 'new' ? 'Create collection' : 'Save name'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
