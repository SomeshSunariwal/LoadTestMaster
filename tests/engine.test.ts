import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { blankApi, defaultConfig, pair, seedWorkspace } from '../src/shared/defaults';
import { LoadEngine } from '../src/backend/engine';
import { prepareRequest, variableResolver } from '../src/backend/variables';
import type { Collection, Environment } from '../src/shared/schema';

let server: ReturnType<typeof Bun.serve>;
let env: Environment;
beforeAll(() => {
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/slow') {
        await Bun.sleep(300);
        return Response.json({ ok: true });
      }
      if (url.pathname === '/error') return new Response('failure', { status: 503 });
      return Response.json({
        ok: true,
        method: req.method,
        auth: req.headers.get('Authorization'),
        query: url.searchParams.get('id'),
        body: await req.text(),
      });
    },
  });
  env = {
    id: 'test',
    name: 'Test',
    color: '#fff',
    variables: [
      pair('baseUrl', `http://127.0.0.1:${server.port}`),
      pair('token', 'secret'),
      pair('nested', '{{token}}'),
    ],
  };
});
afterAll(() => server.stop(true));
function collection(path = '/', overrides: Partial<Collection['config']> = {}): Collection {
  return {
    id: 'test',
    name: 'Integration',
    description: '',
    color: '#fff',
    environmentId: 'test',
    config: {
      ...defaultConfig,
      users: 2,
      duration: 3,
      rampUp: 0,
      iterations: 2,
      delay: 0,
      thinkTime: false,
      rateLimit: 0,
      ...overrides,
    },
    apis: [{ ...blankApi(), name: 'Request', url: `{{baseUrl}}${path}` }],
  };
}
async function complete(engine: LoadEngine, id: string) {
  for (let i = 0; i < 100; i++) {
    const run = engine.runs.find((r) => r.id === id)!;
    if (['completed', 'stopped'].includes(run.status)) return run;
    await Bun.sleep(50);
  }
  throw new Error('Run did not finish');
}

describe('API request logs', () => {
  test('records cancellation responses after stopping an in-flight request', async () => {
    const engine = new LoadEngine();
    const c = collection('/slow', { users: 1, iterations: 1 });
    const id = engine.start(c, env, true);
    engine.control(id, 'stop');
    for (let i = 0; i < 20; i++) {
      if (engine.getLogs(id, c.apis[0]!.id)[0]?.response) break;
      await Bun.sleep(10);
    }
    expect(engine.getLogs(id, c.apis[0]!.id)[0]?.response?.error).toBe(
      'Request cancelled or timed out',
    );
    engine.shutdown();
  });
  test('records live requests and correlates successful responses by UUID', async () => {
    const engine = new LoadEngine();
    const c = collection('/slow', { users: 1, iterations: 1 });
    const id = engine.start(c, env, true);
    try {
      const pending = engine.getLogs(id, c.apis[0]!.id);
      expect(pending).toHaveLength(1);
      expect(pending[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(pending[0]!.response).toBeUndefined();
      await complete(engine, id);
      const logs = engine.getLogs(id, c.apis[0]!.id);
      expect(logs[0]!.id).toBe(pending[0]!.id);
      expect(logs[0]!.response?.status).toBe(200);
      expect(logs[0]!.response?.body).toContain('"ok":true');
      expect(Date.parse(logs[0]!.responseAt!)).toBeGreaterThanOrEqual(
        Date.parse(logs[0]!.requestAt),
      );
      expect(engine.getLogs(id, 'another-api')).toEqual([]);
      engine.remove(id);
      expect(engine.getLogs(id, c.apis[0]!.id)).toEqual([]);
    } finally {
      engine.shutdown();
    }
  });

  test('records HTTP failures and masks sensitive headers', async () => {
    const engine = new LoadEngine();
    const c = collection('/error', { users: 1, iterations: 1 });
    c.apis[0]!.auth = 'bearer';
    c.apis[0]!.token = '{{token}}';
    try {
      const id = engine.start(c, env, true);
      await complete(engine, id);
      const log = engine.getLogs(id, c.apis[0]!.id)[0]!;
      expect(log.request.headers.authorization).toBe('[redacted]');
      expect(log.response?.status).toBe(503);
      expect(log.response?.error).toBe('HTTP 503');
      expect(log.response?.body).toBe('failure');
    } finally {
      engine.shutdown();
    }
  });
});
describe('environment variables', () => {
  test('resolves nested variables and reports missing or circular references', () => {
    expect(variableResolver(env)('{{nested}}')).toBe('secret');
    expect(() => variableResolver(env)('{{missing}}')).toThrow('Missing');
    expect(() =>
      variableResolver({ ...env, variables: [pair('a', '{{b}}'), pair('b', '{{a}}')] })('{{a}}'),
    ).toThrow('Circular');
  });
  test('prepares body, query, and authorization', async () => {
    const api = {
      ...blankApi(),
      method: 'POST' as const,
      url: '{{baseUrl}}/',
      auth: 'bearer' as const,
      token: '{{token}}',
      params: [pair('id', '42')],
      bodyType: 'json' as const,
      body: '{"hello":"{{nested}}"}',
    };
    const p = prepareRequest(api, env);
    const response = await fetch(p.url, p.options);
    const data = await response.json();
    expect(data.auth).toBe('Bearer secret');
    expect(data.query).toBe('42');
    expect(JSON.parse(data.body)).toEqual({ hello: 'secret' });
  });
  test('rejects unsupported protocols and invalid JSON', () => {
    expect(() => prepareRequest({ ...blankApi(), url: 'file:///etc/passwd' }, env)).toThrow(
      'Only HTTP',
    );
    expect(() =>
      prepareRequest(
        { ...blankApi(), method: 'POST', url: '{{baseUrl}}', bodyType: 'json', body: 'no' },
        env,
      ),
    ).toThrow();
  });
});
describe('load engine', () => {
  test('executes exact iteration count and records latency, bytes, and successful responses', async () => {
    const engine = new LoadEngine();
    try {
      const id = engine.start(collection(), env, false);
      const run = await complete(engine, id);
      expect(run.status).toBe('completed');
      expect(run.requests).toBe(4);
      expect(run.errors).toBe(0);
      expect(run.bytes).toBeGreaterThan(0);
      expect(run.avg).toBeGreaterThan(0);
      expect(run.endpoints[0]!.requests).toBe(4);
      expect(run.distribution.reduce((a, b) => a + b.count, 0)).toBe(4);
    } finally {
      engine.shutdown();
    }
  });
  test('records HTTP and response assertion failures', async () => {
    const engine = new LoadEngine();
    try {
      let id = engine.start(collection('/error'), env, false);
      expect((await complete(engine, id)).errors).toBe(4);
      const c = collection();
      c.apis[0]!.responseContains = 'not-present';
      id = engine.start(c, env, false);
      expect((await complete(engine, id)).endpoints[0]!.lastError).toContain('assertion');
    } finally {
      engine.shutdown();
    }
  });
  test('pause freezes test time, resume continues, stop cancels in-flight traffic', async () => {
    const engine = new LoadEngine();
    try {
      const id = engine.start(collection('/slow', { iterations: 100, duration: 10 }), env, false);
      await Bun.sleep(100);
      engine.control(id, 'pause');
      await Bun.sleep(1100);
      const elapsed = engine.runs[0]!.elapsed;
      await Bun.sleep(1100);
      expect(engine.runs[0]!.elapsed).toBeCloseTo(elapsed, 1);
      engine.control(id, 'resume');
      await Bun.sleep(350);
      engine.control(id, 'stop');
      const run = await complete(engine, id);
      expect(run.status).toBe('stopped');
      expect(run.elapsed).toBeLessThan(2);
      await Bun.sleep(100);
      expect(engine.requestCount).toBe(0);
    } finally {
      engine.shutdown();
    }
  });
  test('validates selection and environment variables before starting', () => {
    const engine = new LoadEngine();
    const c = collection();
    c.apis[0]!.selected = false;
    expect(() => engine.start(c, env, false)).toThrow('Select');
    c.apis[0]!.selected = true;
    c.apis[0]!.url = '{{unknown}}';
    expect(() => engine.start(c, env, false)).toThrow('Missing');
    expect(engine.runs.length).toBe(0);
  });
  test('honors per-API user and iteration overrides', async () => {
    const engine = new LoadEngine();
    try {
      const c = collection();
      c.apis[0]!.useGlobal = false;
      c.apis[0]!.config = { ...c.config, users: 1, iterations: 3 };
      const run = await complete(engine, engine.start(c, env, false));
      expect(run.requests).toBe(3);
    } finally {
      engine.shutdown();
    }
  });
  test('enforces configured global rate limit', async () => {
    const engine = new LoadEngine();
    try {
      const run = await complete(
        engine,
        engine.start(collection('/', { users: 1, iterations: 4, rateLimit: 4 }), env, false),
      );
      expect(run.elapsed).toBeGreaterThanOrEqual(0.7);
    } finally {
      engine.shutdown();
    }
  });
  test('parallel requests share the rate limit instead of multiplying it', async () => {
    const engine = new LoadEngine();
    try {
      const run = await complete(
        engine,
        engine.start(
          collection('/', { users: 1, iterations: 2, parallel: 2, rateLimit: 4 }),
          env,
          false,
        ),
      );
      expect(run.requests).toBe(4);
      expect(run.errors).toBe(0);
      expect(run.elapsed).toBeGreaterThanOrEqual(0.7);
    } finally {
      engine.shutdown();
    }
  });
  test('pausing a rate-limited run preserves remaining iterations', async () => {
    const engine = new LoadEngine();
    try {
      const id = engine.start(
        collection('/', { users: 1, iterations: 4, rateLimit: 5 }),
        env,
        false,
      );
      await Bun.sleep(75);
      engine.control(id, 'pause');
      await Bun.sleep(150);
      engine.control(id, 'resume');
      const run = await complete(engine, id);
      expect(run.requests).toBe(4);
      expect(run.errors).toBe(0);
    } finally {
      engine.shutdown();
    }
  });
});
