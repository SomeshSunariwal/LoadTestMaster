import { VariableInput } from './VariableInput';
import './css/ApiModal.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { FiPlus, FiSave } from 'react-icons/fi';
import { apiSchema, type ApiDefinition } from '../shared/schema';
import { Button, Field, Modal, NumberField, Toggle, Select } from './ui';
import { PairEditor } from './PairEditor';
import { LoadConfigForm } from './LoadConfigForm';
import { RequestBodyEditor } from './RequestBodyEditor';
import { parseMultipartFields } from '../shared/multipart';
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
  const configTabsRef = useRef<HTMLDivElement>(null);
  const [configTabIndicator, setConfigTabIndicator] = useState({ left: 0, width: 0 });
  const [configTabIndicatorReady, setConfigTabIndicatorReady] = useState(false);
  useLayoutEffect(() => {
    const tabs = configTabsRef.current;
    const update = () => {
      const activeTab = tabs?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (activeTab) {
        setConfigTabIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
        setConfigTabIndicatorReady(activeTab.offsetWidth > 0);
      }
    };
    update();
    if (!tabs) return;
    const observer = new ResizeObserver(update);
    observer.observe(tabs);
    return () => observer.disconnect();
  }, [tab, api.params.length, api.headers.length]);
  const set = <K extends keyof ApiDefinition>(key: K, value: ApiDefinition[K]) =>
    setApi((a) => ({ ...a, [key]: value }));
  const submit = () => {
    if (api.bodyType === 'multipart') {
      try {
        parseMultipartFields(api.body);
      } catch {
        setError('Create a valid multipart form before saving.');
        return;
      }
    }
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
      className="api-editor-modal"
    >
      <div className="api-modal-grid">
        <div className="api-main">
          <section className="inset-section">
            <h3>API details</h3>
            <div className="api-details-grid">
              <Field label="Method">
                <Select
                  value={api.method}
                  onChange={(e) => set('method', e.target.value as ApiDefinition['method'])}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="API name *">
                <VariableInput
                  autoFocus
                  value={api.name}
                  placeholder="e.g. Get products"
                  onValueChange={(value) => set('name', value)}
                />
              </Field>
            </div>
            <Field
              label="Endpoint URL *"
              hint="Use {{baseUrl}} and other environment variables anywhere in your request."
            >
              <VariableInput
                value={api.url}
                onValueChange={(value) => set('url', value)}
                placeholder="{{baseUrl}}/api/products"
              />
            </Field>
          </section>
          <section className="inset-section">
            <h3>Request configuration</h3>
            <div
              ref={configTabsRef}
              className={`tabs compact ${configTabIndicatorReady ? 'indicator-ready' : ''}`}
              role="tablist"
              aria-label="Request configuration"
            >
              {['Parameters', 'Headers', 'Auth'].map((t) => (
                <button
                  type="button"
                  role="tab"
                  key={t}
                  className={tab === t ? 'active' : ''}
                  aria-selected={tab === t}
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
              <span
                className="config-tab-indicator"
                aria-hidden="true"
                style={{ left: configTabIndicator.left, width: configTabIndicator.width }}
              />
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
                  <Select
                    value={api.auth}
                    onChange={(e) => set('auth', e.target.value as ApiDefinition['auth'])}
                  >
                    <option value="none">No authentication</option>
                    <option value="bearer">Bearer token</option>
                    <option value="basic">Basic authentication</option>
                  </Select>
                </Field>
                {api.auth === 'bearer' && (
                  <Field label="Token">
                    <VariableInput
                      type="password"
                      value={api.token}
                      onValueChange={(value) => set('token', value)}
                      placeholder="{{authToken}}"
                    />
                  </Field>
                )}
                {api.auth === 'basic' && (
                  <div className="form-grid">
                    <Field label="Username">
                      <VariableInput
                        value={api.username}
                        onValueChange={(value) => set('username', value)}
                      />
                    </Field>
                    <Field label="Password">
                      <VariableInput
                        type="password"
                        value={api.password}
                        onValueChange={(value) => set('password', value)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="inset-section">
            <h3>Load settings</h3>
            <Toggle
              checked={api.useGlobal}
              onChange={(v) => set('useGlobal', v)}
              label="Use collection configuration"
            />
            {api.useGlobal ? (
              <p className="muted helper">
                This API will inherit the collection’s load mode, timing, and request settings.
              </p>
            ) : (
              <LoadConfigForm value={api.config} onChange={(v) => set('config', v)} />
            )}
          </section>
          <section className="inset-section">
            <h3>Advanced options</h3>
            <Toggle
              checked={api.followRedirects}
              onChange={(v) => set('followRedirects', v)}
              label="Follow redirects"
            />
            <p className="muted helper">
              HTTPS certificates are verified. Connections use the runtime’s keep-alive pool.
            </p>
            <details className="api-assertions">
              <summary>Response assertions</summary>
              <NumberField
                label="Expected HTTP status (0 = any below 400)"
                max={599}
                value={api.expectedStatus}
                onChange={(v) => set('expectedStatus', v)}
              />
              <Field label="Response must contain" hint="Leave empty to disable.">
                <VariableInput
                  value={api.responseContains}
                  onValueChange={(value) => set('responseContains', value)}
                />
              </Field>
            </details>
          </section>
          <section className="inset-section">
            <h3>Tags</h3>
            <VariableInput
              aria-label="API tags"
              value={api.tags}
              placeholder="cart, critical, checkout"
              onValueChange={(value) => set('tags', value)}
            />
          </section>
        </div>
        <div className="api-side">
          <RequestBodyEditor
            type={api.bodyType}
            value={api.body}
            onTypeChange={(v) =>
              setApi((current) => ({
                ...current,
                bodyType: v,
                headers: current.headers.map((header) =>
                  header.key.toLowerCase() === 'content-type' &&
                  [
                    'application/json',
                    'application/xml',
                    'application/x-www-form-urlencoded',
                  ].includes(header.value) &&
                  ['json', 'xml', 'form'].includes(v)
                    ? {
                        ...header,
                        value:
                          v === 'xml'
                            ? 'application/xml'
                            : v === 'json'
                              ? 'application/json'
                              : 'application/x-www-form-urlencoded',
                      }
                    : header,
                ),
              }))
            }
            onChange={(v) => set('body', v)}
          />
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
