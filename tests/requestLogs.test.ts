import { expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RequestLogs, RunLogFiles } from '../src/backend/requestLogs';

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

test('writes plain-text request/response pairs and rotates after the configured pair count', async () => {
  const root = await mkdtemp(join(tmpdir(), 'loadmaster-log-test-'));
  const files = new RunLogFiles(root, 2);
  const startedAt = '2026-10-16T12:34:56.000Z';
  try {
    await Promise.all(
      [1, 2, 3].map((n) =>
        files.append('run-id', 'Checkout / API', startedAt, {
          id: `request-${n}`,
          apiId: 'api',
          requestAt: `${startedAt.slice(0, 19)}.${String(n).padStart(3, '0')}Z`,
          request: {
            method: 'POST',
            url: 'https://example.test/orders',
            headers: { 'content-type': 'application/json' },
            body: '{"item":"book"}',
          },
          responseAt: `${startedAt.slice(0, 19)}.${String(n + 3).padStart(3, '0')}Z`,
          response: {
            status: 201,
            headers: { 'content-type': 'application/json' },
            body: '{"created":true}',
            bytes: 16,
            durationMs: 3,
            error: '',
          },
        }),
      ),
    );
    await files.flush();

    const directory = join(root, 'Checkout _ API');
    const names = (await readdir(directory)).sort();
    expect(names).toEqual([
      'log.run-id.2026-10-16.12-34-56_1.txt',
      'log.run-id.2026-10-16.12-34-56_2.txt',
    ]);
    const shards = await Promise.all(
      names.map(async (name) => (await readFile(join(directory, name), 'utf8')).trim().split('\n')),
    );
    expect(shards.map((lines) => lines.length)).toEqual([4, 2]);
    expect(shards[0]![0]).toContain(':request-1:request POST https://example.test/orders');
    expect(shards[0]![1]).toContain(':request-1:response status=201');
    expect(shards[1]![0]).toContain(':request-3:request POST https://example.test/orders');
    expect(await files.list('run-id', 'Checkout / API')).toEqual(
      names.map((name, index) => ({ name, size: new TextEncoder().encode(shards[index]!.join('\n') + '\n').byteLength })),
    );
    expect(await files.read('run-id', 'Checkout / API', names[0]!)).toContain(
      ':request-1:response status=201',
    );
    const chunk = await files.readChunk('run-id', 'Checkout / API', names[0]!, 0);
    expect(chunk.content).toBe(await readFile(join(directory, names[0]!), 'utf8'));
    expect(chunk.nextOffset).toBe(chunk.size);
    const downloads = join(root, 'Downloads');
    const downloadedPath = await files.copyTo('run-id', 'Checkout / API', names[0]!, downloads);
    expect(await readFile(downloadedPath, 'utf8')).toBe(
      await readFile(join(directory, names[0]!), 'utf8'),
    );
    await expect(files.read('run-id', 'Checkout / API', '..\\outside.txt')).rejects.toThrow(
      'Log file not found.',
    );
    await expect(files.copyTo('run-id', 'Checkout / API', '..\\outside.txt', downloads)).rejects.toThrow(
      'Log file not found.',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
