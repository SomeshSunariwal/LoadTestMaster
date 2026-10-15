import './css/RequestBodyEditor.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { FiCode, FiCornerDownLeft } from 'react-icons/fi';
import type { ApiDefinition } from '../shared/schema';
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
}: {
  type: ApiDefinition['bodyType'];
  value: string;
  onTypeChange: (type: ApiDefinition['bodyType']) => void;
  onChange: (value: string) => void;
}) {
  const [view, setView] = useState<'text' | 'tree'>('text');
  const [error, setError] = useState('');
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
      <h3>Request body</h3>
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
              disabled={!value.trim()}
              onClick={() => {
                if (valid) {
                  onChange(JSON.stringify(parsed, null, 2));
                  setError('');
                } else setError('Enter valid JSON to format it.');
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
        className={`body-editor-box ${type === 'none' ? 'body-editor-none' : ''} ${type === 'json' ? 'body-editor-json' : ''}`}
      >
        {type === 'json' && (
          <div
            className="body-view-tabs"
            data-view={view}
            role="group"
            aria-label="JSON editor view"
          >
            <button aria-pressed={view === 'text'} type="button" onClick={() => setView('text')}>
              Text
            </button>
            <button aria-pressed={view === 'tree'} type="button" onClick={() => setView('tree')}>
              Tree
            </button>
          </div>
        )}
        {type === 'none' ? (
          <div className="body-empty">
            <FiCode />
            <span>This request has no body</span>
          </div>
        ) : type === 'multipart' ? (
          <MultipartBodyEditor value={value} onChange={onChange} />
        ) : type === 'json' && view === 'tree' ? (
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
            value={value}
            wrap={wrapText}
            onChange={(next) => {
              onChange(next);
              setError('');
            }}
          />
        ) : (
          <VariableTextarea
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
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
