import './css/JsonTreeEditor.css';
import { useEffect, useState } from 'react';
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash2 } from 'react-icons/fi';
import {
  type JsonValue,
  type JsonPath,
  jsonType,
  emptyJsonValue,
  replaceJsonValue,
} from '../shared/jsonTree';
import { Button, IconButton, Select } from './ui';
import { VariableInput } from './VariableInput';

export function JsonTreeEditor({
  value,
  onChange,
}: {
  value: JsonValue;
  onChange: (value: JsonValue) => void;
}) {
  return (
    <div className="json-tree" aria-label="Editable JSON tree">
      <JsonNode value={value} path={[]} name="$" onChange={onChange} />
    </div>
  );
}
function JsonNode({
  value,
  path,
  name,
  onChange,
  onRemove,
  onRename,
}: {
  value: JsonValue;
  path: JsonPath;
  name: string;
  onChange: (value: JsonValue) => void;
  onRemove?: () => void;
  onRename?: (name: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [keyName, setKeyName] = useState(name);
  const [error, setError] = useState('');
  const type = jsonType(value);
  const container = type === 'object' || type === 'array';
  const label = path.length ? path.join('.') : '$';
  const rename = () => {
    if (keyName === name || !onRename) return;
    if (!onRename(keyName)) {
      setError('This key already exists.');
      setKeyName(name);
    }
  };
  const entries = container ? (Object.entries(value as object) as [string, JsonValue][]) : [];
  return (
    <div className="json-node">
      <div className="json-node-row">
        {container ? (
          <IconButton
            label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <FiChevronDown /> : <FiChevronRight />}
          </IconButton>
        ) : (
          <span className="json-node-spacer" />
        )}
        {onRename ? (
          <VariableInput
            aria-label={`Key ${label}`}
            className="json-key"
            value={keyName}
            onValueChange={(next) => {
              setKeyName(next);
              setError('');
            }}
            onBlur={rename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                rename();
              }
            }}
          />
        ) : (
          <span className="json-index">{name}</span>
        )}
        <Select
          aria-label={`Type ${label}`}
          value={type}
          onValueChange={(value) => onChange(emptyJsonValue(value))}
        >
          {['object', 'array', 'string', 'number', 'boolean', 'null'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <div className="json-value">
          {type === 'string' && (
            <VariableInput
              aria-label={`Value ${label}`}
              value={value as string}
              onValueChange={onChange}
            />
          )}
          {type === 'number' && (
            <JsonNumberInput label={`Value ${label}`} value={value as number} onChange={onChange} />
          )}
          {type === 'boolean' && (
            <Select
              aria-label={`Value ${label}`}
              value={String(value)}
              onValueChange={(value) => onChange(value === 'true')}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          )}
          {type === 'null' && <span className="muted">null</span>}
          {container && (
            <span className="muted">
              {entries.length} {type === 'array' ? 'items' : 'keys'}
            </span>
          )}
        </div>
        {onRemove ? (
          <IconButton label={`Delete ${label}`} onClick={onRemove}>
            <FiTrash2 className="delete-icon" />
          </IconButton>
        ) : (
          <span />
        )}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {container && expanded && (
        <div className="json-children">
          {entries.map(([key, item]) => (
            <JsonNode
              key={key}
              value={item}
              name={type === 'array' ? `[${key}]` : key}
              path={[...path, key]}
              onChange={(next) =>
                onChange(replaceJsonValue(value, [type === 'array' ? Number(key) : key], next))
              }
              onRemove={() =>
                onChange(
                  Array.isArray(value)
                    ? value.filter((_, i) => i !== Number(key))
                    : Object.fromEntries(entries.filter(([k]) => k !== key)),
                )
              }
              onRename={
                type === 'object'
                  ? (next) => {
                      if (next !== key && Object.hasOwn(value as object, next)) return false;
                      onChange(
                        Object.fromEntries(entries.map(([k, v]) => [k === key ? next : k, v])),
                      );
                      return true;
                    }
                  : undefined
              }
            />
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              if (Array.isArray(value)) onChange([...value, '']);
              else {
                let key = 'field';
                let i = 1;
                while (Object.hasOwn(value as object, key)) key = `field${i++}`;
                onChange(Object.fromEntries([...entries, [key, '']]));
              }
            }}
          >
            <FiPlus />
            {type === 'array' ? 'Add item' : 'Add property'}
          </Button>
        </div>
      )}
    </div>
  );
}

function JsonNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      aria-label={label}
      type="number"
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next.trim() && Number.isFinite(Number(next))) onChange(Number(next));
      }}
      onBlur={() => setDraft(String(value))}
    />
  );
}
