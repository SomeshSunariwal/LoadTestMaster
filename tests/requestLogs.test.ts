import { expect, test } from 'bun:test';
import { RequestLogs } from '../src/backend/requestLogs';

test('log retention is bounded, API-scoped, and isolated from callers', () => {
  const store = new RequestLogs();
  for (let i = 0; i < 250; i++)
    store.add('run', {
      id: String(i),
      apiId: i % 2 ? 'a' : 'b',
      requestAt: new Date().toISOString(),
      request: { method: 'GET', url: '/', headers: {}, body: '' },
    });
  const logs = store.get('run', 'a');
  expect(logs).toHaveLength(100);
  expect(logs[0]!.id).toBe('51');
  logs[0]!.request.url = 'mutated';
  expect(store.get('run', 'a')[0]!.request.url).toBe('/');
  store.retain([]);
  expect(store.get('run', 'a')).toEqual([]);
});
