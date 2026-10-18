import './css/BodyGenerators.css';
import { useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { BodyGenerator } from '../shared/schema';
import { Button, IconButton, Select } from './ui';
import { uid } from '../shared/defaults';

export function BodyGenerators({
  items,
  onChange,
  disabled = false,
  invalidFields = new Set<string>(),
}: {
  items: BodyGenerator[];
  onChange: (items: BodyGenerator[]) => void;
  disabled?: boolean;
  invalidFields?: ReadonlySet<string>;
}) {
  const [editing, setEditing] = useState<string>();
  const [list, setList] = useState('');
  const set = (id: string, changes: Partial<BodyGenerator>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  return (
    <section className="inset-section body-generators">
      <div className="generator-heading">
        <h3 style={{ marginBottom: '2px' }}>Request body generators</h3>
      </div>
      <p className="helper muted">
        Use {'{{gen.key}}'} in JSON, XML, or GraphQL. Values change with every request.
      </p>
      <fieldset
        className="generator-fields"
        disabled={disabled}
        aria-label="Request body generators"
      >
        <div className="generator-columns" aria-hidden="true">
          <span>Key <span className="required-marker">*</span></span>
          <span>Type</span>
          <span>Configuration</span>
          <span />
        </div>
        <div className="generator-rows">
          {items.map((item, index) => (
            <div className="generator-row" key={item.id}>
              <input
                aria-label="Generator key"
                aria-required="true"
                aria-invalid={invalidFields.has(`generators.${index}.key`) || invalidFields.has('generators')}
                value={item.key}
                placeholder="key"
                onChange={(e) => set(item.id, { key: e.target.value })}
              />
              <Select
                aria-label={`Type for ${item.key || 'generator'}`}
                value={item.type}
                onValueChange={(value) => set(item.id, { type: value as BodyGenerator['type'] })}
              >
                <option value="increment">Increment</option>
                <option value="uuid">UUID</option>
                <option value="list">List</option>
              </Select>
              <div className="generator-settings">
                {item.type === 'increment' ? (
                  <>
                    <label>
                      <span>Start</span>
                      <input
                        type="number"
                        min={0}
                        max={Number.MAX_SAFE_INTEGER}
                        step={1}
                        aria-label={`Start for ${item.key}`}
                        aria-invalid={invalidFields.has(`generators.${index}.start`)}
                        value={item.start}
                        onChange={(e) => {
                          if (e.target.value !== '')
                            set(item.id, {
                              start: Math.max(
                                0,
                                Math.min(
                                  Number.MAX_SAFE_INTEGER,
                                  Math.trunc(Number(e.target.value)),
                                ),
                              ),
                            });
                        }}
                      />
                    </label>
                    <label>
                      <span>Step</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        aria-label={`Step for ${item.key}`}
                        aria-invalid={invalidFields.has(`generators.${index}.step`)}
                        value={item.step}
                        onChange={(e) => {
                          if (e.target.value !== '')
                            set(item.id, {
                              step: Math.max(1, Math.min(50, Math.trunc(Number(e.target.value)))),
                            });
                        }}
                      />
                    </label>
                  </>
                ) : item.type === 'uuid' ? (
                  <span className="generator-auto">Auto · UUID v4</span>
                ) : (
                  <button
                    type="button"
                    className="generator-list"
                    aria-invalid={invalidFields.has(`generators.${index}`) || [...invalidFields].some((path) => path.startsWith(`generators.${index}.values`))}
                    onClick={() => {
                      setEditing(item.id);
                      setList(item.values.join('\n'));
                    }}
                  >
                    <span>{item.values.join(', ') || 'Add values'}</span>
                    <small>{item.values.length} values · Edit</small>
                  </button>
                )}
              </div>
              <IconButton
                label={`Delete ${item.key || 'generator'}`}
                onClick={() => {
                  onChange(items.filter((g) => g.id !== item.id));
                  if (editing === item.id) setEditing(undefined);
                }}
              >
                <FiTrash2 className="delete-icon" />
              </IconButton>
            </div>
          ))}
        </div>
        {editing && items.some((item) => item.id === editing && item.type === 'list') && (
          <div className="generator-list-editor">
            <label>
              List values · one value per line
              <textarea
                aria-label="Generator list values"
                value={list}
                onChange={(e) => setList(e.target.value)}
              />
            </label>
            <div className="actions">
              <Button onClick={() => setEditing(undefined)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  set(editing, { values: list.split(/\r?\n/).filter((value) => value.trim()) });
                  setEditing(undefined);
                }}
              >
                Apply list
              </Button>
            </div>
          </div>
        )}
        <div className="generator-actions">
          <Button
            variant="ghost"
            className="compact-add-action"
            disabled={items.length >= 100}
            onClick={() =>
              onChange([
                ...items,
                { id: uid(), key: '', type: 'increment', start: 0, step: 1, values: [] },
              ])
            }
          >
            <FiPlus /> Add generator
          </Button>
        </div>
      </fieldset>
    </section>
  );
}
