import './ApiModal.css';
import { useState } from 'react';
import { FiCode, FiPlus, FiSave } from 'react-icons/fi';
import { apiSchema, type ApiDefinition } from '../shared/schema';
import { Button, Field, Modal, NumberField, Toggle } from './ui';
import { PairEditor } from './PairEditor';
import { LoadConfigForm } from './LoadConfigForm';
export function ApiModal({
  initial,
  onClose,
  onSave,
}: {
  initial: ApiDefinition;
  onClose: () => void;
  onSave: (api: ApiDefinition) => void;
}) {
  const [api, setApi] = useState(() => structuredClone(initial));
  const [tab, setTab] = useState('Parameters');
  const [error, setError] = useState('');
  const set = <K extends keyof ApiDefinition>(key: K, value: ApiDefinition[K]) =>
    setApi((a) => ({ ...a, [key]: value }));
  const submit = () => {
    const result = apiSchema.safeParse(api);
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Check the API fields.');
      return;
    }
    if (api.bodyType === 'json' && api.body) {
      try {
        JSON.parse(api.body);
      } catch {
        setError('Request body must be valid JSON.');
        return;
      }
    }
    onSave(result.data);
  };
  return (
    <Modal
      title={initial.name ? 'Edit API' : 'Add API to collection'}
      subtitle="Configure the request and load settings for this endpoint."
      onClose={onClose}
      wide
    >
      <div className="api-modal-grid">
        <div className="api-main">
          <section className="inset-section">
            <h3>
              <span className="step">1</span>API details
            </h3>
            <div className="api-details-grid">
              <Field label="Method">
                <select
                  value={api.method}
                  onChange={(e) => set('method', e.target.value as ApiDefinition['method'])}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="API name *">
                <input
                  autoFocus
                  value={api.name}
                  placeholder="e.g. Get products"
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Endpoint URL *"
              hint="Use {{baseUrl}} and other environment variables anywhere in your request."
            >
              <input
                value={api.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="{{baseUrl}}/api/products"
              />
            </Field>
          </section>
          <section className="inset-section">
            <h3>
              <span className="step">2</span>Request configuration
            </h3>
            <div className="tabs compact">
              {['Parameters', 'Headers', 'Auth', 'Assertions'].map((t) => (
                <button
                  type="button"
                  key={t}
                  className={tab === t ? 'active' : ''}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === 'Parameters'
                    ? ` (${api.params.length})`
                    : t === 'Headers'
                      ? ` (${api.headers.length})`
                      : ''}
                </button>
              ))}
            </div>
            {tab === 'Parameters' && (
              <PairEditor items={api.params} onChange={(v) => set('params', v)} />
            )}
            {tab === 'Headers' && (
              <PairEditor items={api.headers} onChange={(v) => set('headers', v)} />
            )}
            {tab === 'Auth' && (
              <div className="stack">
                <Field label="Authentication">
                  <select
                    value={api.auth}
                    onChange={(e) => set('auth', e.target.value as ApiDefinition['auth'])}
                  >
                    <option value="none">No authentication</option>
                    <option value="bearer">Bearer token</option>
                    <option value="basic">Basic authentication</option>
                  </select>
                </Field>
                {api.auth === 'bearer' && (
                  <Field label="Token">
                    <input
                      type="password"
                      value={api.token}
                      onChange={(e) => set('token', e.target.value)}
                      placeholder="{{authToken}}"
                    />
                  </Field>
                )}
                {api.auth === 'basic' && (
                  <div className="form-grid">
                    <Field label="Username">
                      <input
                        value={api.username}
                        onChange={(e) => set('username', e.target.value)}
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        type="password"
                        value={api.password}
                        onChange={(e) => set('password', e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
            {tab === 'Assertions' && (
              <div className="stack">
                <NumberField
                  label="Expected HTTP status (0 = any below 400)"
                  max={599}
                  value={api.expectedStatus}
                  onChange={(v) => set('expectedStatus', v)}
                />
                <Field
                  label="Response must contain"
                  hint="Searches the first 1 MB of each response. Leave empty to disable."
                >
                  <input
                    value={api.responseContains}
                    onChange={(e) => set('responseContains', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </section>
          <section className="inset-section">
            <h3>
              <span className="step">3</span>Request body
            </h3>
            <div className="body-toolbar">
              <div className="segmented">
                {['none', 'json', 'raw', 'form', 'graphql'].map((t) => (
                  <button
                    type="button"
                    className={api.bodyType === t ? 'active' : ''}
                    key={t}
                    onClick={() => set('bodyType', t as ApiDefinition['bodyType'])}
                  >
                    {t === 'json'
                      ? 'JSON'
                      : t === 'graphql'
                        ? 'GraphQL'
                        : t[0]!.toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {api.bodyType === 'json' && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    try {
                      set('body', JSON.stringify(JSON.parse(api.body), null, 2));
                      setError('');
                    } catch {
                      setError('Enter valid JSON to format it.');
                    }
                  }}
                >
                  <FiCode />
                  Format
                </Button>
              )}
            </div>
            {api.bodyType !== 'none' ? (
              <textarea
                className="code-editor"
                spellCheck={false}
                aria-label="Request body"
                value={api.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder={
                  api.bodyType === 'form'
                    ? 'productId=1&quantity=1'
                    : '{\n  "productId": "{{productId}}",\n  "quantity": 1\n}'
                }
              />
            ) : (
              <div className="body-empty">
                <FiCode />
                <span>This request has no body</span>
              </div>
            )}
          </section>
        </div>
        <div className="api-side">
          <section className="inset-section">
            <h3>
              <span className="step">4</span>Load settings
            </h3>
            <Toggle
              checked={api.useGlobal}
              onChange={(v) => set('useGlobal', v)}
              label="Use collection configuration"
            />
            {api.useGlobal ? (
              <p className="muted helper">
                This API will inherit the collection’s virtual users, timing, and request settings.
              </p>
            ) : (
              <LoadConfigForm value={api.config} onChange={(v) => set('config', v)} />
            )}
          </section>
          <section className="inset-section">
            <h3>
              <span className="step">5</span>Advanced options
            </h3>
            <Toggle
              checked={api.followRedirects}
              onChange={(v) => set('followRedirects', v)}
              label="Follow redirects"
            />
            <p className="muted helper">
              HTTPS certificates are verified. Connections use the runtime’s keep-alive pool.
            </p>
          </section>
          <section className="inset-section">
            <h3>
              <span className="step">6</span>Tags
            </h3>
            <input
              aria-label="API tags"
              value={api.tags}
              placeholder="cart, critical, checkout"
              onChange={(e) => set('tags', e.target.value)}
            />
          </section>
        </div>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>
          {initial.name ? <FiSave /> : <FiPlus />}
          {initial.name ? 'Save API' : 'Add API'}
        </Button>
      </div>
    </Modal>
  );
}
