import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { Pair } from '../shared/schema';
import { pair } from '../shared/defaults';
import { Button, IconButton } from './ui';
export function PairEditor({
  items,
  onChange,
  secret = false,
  scrollable = false,
}: {
  items: Pair[];
  onChange: (items: Pair[]) => void;
  secret?: boolean;
  scrollable?: boolean;
}) {
  const change = (id: string, key: keyof Pair, value: string | boolean) =>
    onChange(items.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  return (
    <div className={`pair-editor ${scrollable ? 'scrollable-pair-editor' : ''}`}>
      <div className="pair-row pair-heading">
        <span />
        <span>Name</span>
        <span>Value</span>
        <span />
      </div>
      <div className="pair-rows">
        {items.map((item, i) => (
          <div className="pair-row" key={item.id}>
            <input
              type="checkbox"
              aria-label={`Enable variable ${i + 1}`}
              checked={item.enabled}
              onChange={(e) => change(item.id, 'enabled', e.target.checked)}
            />
            <input
              aria-label={`Name ${i + 1}`}
              placeholder="variableName"
              value={item.key}
              onChange={(e) => change(item.id, 'key', e.target.value)}
            />
            <input
              aria-label={`Value ${i + 1}`}
              type={secret && /password|secret|token/i.test(item.key) ? 'password' : 'text'}
              placeholder="Value or {{variable}}"
              value={item.value}
              onChange={(e) => change(item.id, 'value', e.target.value)}
            />
            <IconButton
              label={`Delete ${item.key || 'row'}`}
              onClick={() => onChange(items.filter((p) => p.id !== item.id))}
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
      </div>
      <Button variant="ghost" onClick={() => onChange([...items, pair()])}>
        <FiPlus />
        Add item
      </Button>
    </div>
  );
}
