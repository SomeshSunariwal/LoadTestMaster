import './css/RequestBodyEditor.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FiCode, FiCornerDownLeft, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { bodyGeneratorsSchema, type ApiDefinition, type BodyGenerator } from '../shared/schema';
import {
  createBodyPreview,
  supportsBodyGenerators,
  formatJsonTemplate,
} from '../shared/bodyGenerators';
import { variableResolver } from '../shared/environmentVariables';
import { useApp } from '../hooks/useApp';
import type { JsonValue } from '../shared/jsonTree';
import { Button } from './ui';
import { VariableTextarea } from './VariableInput';
import { JsonTreeEditor } from './JsonTreeEditor';
import { JsonCodeEditor } from './JsonCodeEditor';
import { MultipartBodyEditor } from './MultipartBodyEditor';

export function RequestBodyEditor({
  type,
  value,
  onTypeChange,
  onChange,
  generators = [],
  validationError = '',
}: {
  type: ApiDefinition['bodyType'];
  value: string;
  onTypeChange: (type: ApiDefinition['bodyType']) => void;
  onChange: (value: string) => void;
  generators?: BodyGenerator[];
  validationError?: string;
}) {
  const [view, setView] = useState<'text' | 'tree'>('text');
  const [error, setError] = useState('');
  const template = /\{\{\s*gen\./.test(value);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const supported = supportsBodyGenerators(type);
  const previewing = supported && template && previewIndex !== null;
  const app = useApp();
  const workspace = app.state?.workspace;
  const collection =
    workspace?.collections.find((c) => c.id === app.collectionId) ?? workspace?.collections[0];
  const environment = workspace?.environments.find((e) => e.id === collection?.environmentId);
  const generatorsKey = JSON.stringify(generators);
  const environmentKey = JSON.stringify(
    environment ?? { id: '', name: '', color: '', variables: [] },
  );
  const getPreview = useMemo(
    () =>
      createBodyPreview(
        value,
        JSON.parse(generatorsKey),
        variableResolver(JSON.parse(environmentKey)),
        supportsBodyGenerators(type) ? type : 'json',
      ),
    [value, generatorsKey, environmentKey, type],
  );
  useEffect(() => setPreviewIndex(null), [value, type, generatorsKey, environmentKey]);
  let previewBody = '',
    previewError = '';
  if (previewing) {
    try {
      previewBody = getPreview(previewIndex);
    } catch (error) {
      const validated = bodyGeneratorsSchema.safeParse(generators);
      previewError = !validated.success
        ? validated.error.issues[0]!.message
        : error instanceof Error
          ? error.message
          : 'Could not preview this body.';
    }
  }
  const [wrapText, setWrapText] = useState(true);
  const bodyTabsRef = useRef<HTMLDivElement>(null);
  const [bodyTabIndicator, setBodyTabIndicator] = useState({ left: 0, width: 0 });
  const [bodyTabIndicatorReady, setBodyTabIndicatorReady] = useState(false);
  useLayoutEffect(() => {
    const tabs = bodyTabsRef.current;
    const activeTab = tabs?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (activeTab) {
      setBodyTabIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
      setBodyTabIndicatorReady(activeTab.offsetWidth > 0);
    }
  }, [type]);
  let parsed: JsonValue = null;
  let valid = true;
  try {
    parsed = JSON.parse(value || '{}');
  } catch {
    valid = false;
  }
  return (
    <section className="inset-section request-body-section">
      <h3>
        Request body{' '}
        {previewing && (
          <span className="body-preview-status" role="status">
            Preview · Request {previewIndex + 1}
          </span>
        )}
      </h3>
      <div className="body-toolbar">
        <div
          ref={bodyTabsRef}
          className={`tabs body-type-tabs ${bodyTabIndicatorReady ? 'indicator-ready' : ''}`}
          role="tablist"
          aria-label="Request body type"
        >
          {['none', 'json', 'xml', 'raw', 'multipart', 'graphql'].map((t) => (
            <button
              type="button"
              role="tab"
              key={t}
              className={type === t ? 'active' : ''}
              aria-selected={type === t}
              onClick={() => {
                onTypeChange(t as ApiDefinition['bodyType']);
                setError('');
              }}
            >
              {t === 'json'
                ? 'JSON'
                : t === 'xml'
                  ? 'XML'
                  : t === 'multipart'
                    ? 'Multipart Form'
                    : t === 'graphql'
                      ? 'GraphQL'
                      : t === 'raw'
                        ? 'Text'
                        : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <span
            className="body-type-tab-indicator"
            aria-hidden="true"
            style={{ left: bodyTabIndicator.left, width: bodyTabIndicator.width }}
          />
        </div>
        <div className="body-editor-actions">
          {type === 'json' && (
            <Button
              variant="ghost"
              disabled={!value.trim() || previewing}
              title="Format JSON"
              onClick={() => {
                try {
                  onChange(formatJsonTemplate(value));
                  setError('');
                } catch {
                  setError(
                    'Enter valid JSON to format it. Generator and environment references are supported.',
                  );
                }
              }}
            >
              <FiCode />
              Format
            </Button>
          )}
          {type !== 'none' && type !== 'multipart' && (
            <Button variant="ghost" aria-pressed={wrapText} onClick={() => setWrapText(!wrapText)}>
              <FiCornerDownLeft />
              Wrap text
            </Button>
          )}
        </div>
      </div>
      <div
        aria-invalid={!!validationError}
        className={`body-editor-box ${type === 'none' ? 'body-editor-none' : ''} ${type === 'json' ? 'body-editor-json' : ''}`}
      >
        {supported && (
          <div className="body-bottom-controls">
            {template && (
              <div className="body-preview-controls" role="group" aria-label="Request body preview">
                {previewing ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous request preview"
                      title="Previous request"
                      disabled={previewIndex === 0}
                      onClick={() => setPreviewIndex((index) => Math.max(0, (index ?? 0) - 1))}
                    >
                      <FiChevronLeft />
                    </button>
                    <button
                      type="button"
                      aria-label="Next request preview"
                      title="Next request"
                      onClick={() => setPreviewIndex((index) => (index ?? 0) + 1)}
                    >
                      <FiChevronRight />
                    </button>
                    <button
                      type="button"
                      aria-label="Close preview"
                      title="Close preview"
                      onClick={() => setPreviewIndex(null)}
                    >
                      <FiX />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setPreviewIndex(0)}>
                    Preview
                  </button>
                )}
              </div>
            )}
            {type === 'json' && (
              <div
                className="body-view-tabs"
                data-view={previewing ? 'text' : view}
                role="group"
                aria-label="JSON editor view"
              >
                <button
                  disabled={previewing}
                  aria-pressed={previewing || view === 'text'}
                  type="button"
                  onClick={() => setView('text')}
                >
                  Text
                </button>
                <button
                  disabled={template || previewing}
                  title={template ? 'Use Text view for generator templates.' : undefined}
                  aria-pressed={!previewing && view === 'tree'}
                  type="button"
                  onClick={() => setView('tree')}
                >
                  Tree
                </button>
              </div>
            )}
          </div>
        )}
        {type === 'none' ? (
          <div className="body-empty">
            <FiCode />
            <span>This request has no body</span>
          </div>
        ) : previewing ? (
          previewError ? (
            <p role="alert" className="form-error">
              {previewError}
            </p>
          ) : type === 'json' ? (
            <JsonCodeEditor value={previewBody} wrap={wrapText} onChange={() => {}} readOnly />
          ) : (
            <textarea
              className="code-editor"
              aria-label="Request body preview"
              value={previewBody}
              readOnly
              wrap={wrapText ? 'soft' : 'off'}
              spellCheck={false}
            />
          )
        ) : type === 'multipart' ? (
          <MultipartBodyEditor value={value} onChange={onChange} />
        ) : type === 'json' && view === 'tree' && !template ? (
          valid ? (
            <JsonTreeEditor
              value={parsed}
              onChange={(next) => {
                onChange(JSON.stringify(next, null, 2));
                setError('');
              }}
            />
          ) : (
            <p role="alert" className="form-error">
              Fix invalid JSON in Text view before editing the tree.
            </p>
          )
        ) : type === 'json' ? (
          <JsonCodeEditor
            generators={generators}
            value={value}
            wrap={wrapText}
            onChange={(next) => {
              onChange(next);
              setError('');
            }}
          />
        ) : (
          <VariableTextarea
            generatorNames={supported ? generators.map((g) => `gen.${g.key}`) : []}
            className="code-editor"
            wrap={wrapText ? 'soft' : 'off'}
            spellCheck={false}
            aria-label="Request body"
            value={value}
            onValueChange={(next) => {
              onChange(next);
              setError('');
            }}
            placeholder={
              type === 'xml'
                ? '<request>\n  <productId>{{productId}}</productId>\n</request>'
                : type === 'graphql'
                  ? 'query {\n  product(id: "{{productId}}") {\n    id\n    name\n  }\n}'
                  : type === 'form'
                    ? 'productId={{productId}}&quantity=1'
                    : 'Enter request text here…\nUse {{variable}} for environment variables.'
            }
          />
        )}
      </div>
      {(error || validationError) && (
        <p role="alert" className="form-error">
          {error || validationError}
        </p>
      )}
    </section>
  );
}
