import type {
  ApiDefinition,
  Collection,
  Environment,
  LoadConfig,
  RunSnapshot,
} from '../shared/schema';
import { prepareRequest } from './variables';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const bounds = [25, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000, 30000, Infinity];

// A fixed histogram keeps memory bounded even for runs with millions of requests.
class Histogram {
  buckets = new Map<number, number>();
  count = 0;
  total = 0;
  add(ms: number) {
    const bucket = Math.ceil(ms / 5) * 5;
    this.buckets.set(bucket, (this.buckets.get(bucket) ?? 0) + 1);
    this.count++;
    this.total += ms;
  }
  percentile(p: number) {
    let seen = 0;
    for (const [ms, n] of [...this.buckets].sort((a, b) => a[0] - b[0])) {
      seen += n;
      if (seen >= this.count * p) return ms;
    }
    return 0;
  }
  get avg() {
    return this.count ? this.total / this.count : 0;
  }
}

interface ActiveRun {
  snapshot: RunSnapshot;
  histogram: Histogram;
  endpoints: Map<string, Histogram>;
  controllers: Set<AbortController>;
  workers: Set<number>;
  pausedAt: number;
  pausedMs: number;
  started: number;
  lastRequests: number;
  lastTick: number;
  timer: ReturnType<typeof setInterval>;
}

export class LoadEngine {
  private active = new Map<string, ActiveRun>();
  private archived: RunSnapshot[] = [];
  private inFlight = 0;
  private retention = 30;
  constructor(private onComplete: (run: RunSnapshot) => void = () => {}) {}
  get requestCount() {
    return this.inFlight;
  }
  get runs() {
    return [...this.active.values()].map((r) => structuredClone(r.snapshot)).concat(this.archived);
  }
  restore(runs: RunSnapshot[]) {
    this.archived = runs;
  }
  setRetention(count: number) {
    this.retention = count;
    this.archived = this.archived.slice(0, count);
  }
  remove(id: string) {
    if (this.active.has(id)) throw new Error('Stop the run before deleting it.');
    this.archived = this.archived.filter((r) => r.id !== id);
  }
  start(collection: Collection, environment: Environment, all: boolean) {
    if (this.active.size >= 4) throw new Error('Up to four concurrent runs are supported.');
    const apis = collection.apis.filter((a) => all || a.selected);
    if (!apis.length) throw new Error('Select at least one API to run.');
    if (collection.config.thinkMax < collection.config.thinkMin)
      throw new Error('Maximum think time must be at least the minimum.');
    const prepared = new Map(apis.map((api) => [api.id, prepareRequest(api, environment)]));
    const configs = apis.map((api) => (api.useGlobal ? collection.config : api.config));
    const users = Math.max(...configs.map((c) => c.users));
    const duration = collection.config.duration;
    const snapshot: RunSnapshot = {
      id: crypto.randomUUID(),
      collectionId: collection.id,
      name: collection.name,
      environment: environment.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      elapsed: 0,
      duration,
      users,
      activeUsers: 0,
      requests: 0,
      errors: 0,
      bytes: 0,
      avg: 0,
      p95: 0,
      p99: 0,
      rps: 0,
      points: [],
      endpoints: apis.map((a) => ({
        id: a.id,
        name: a.name,
        method: a.method,
        url: a.url,
        requests: 0,
        errors: 0,
        totalMs: 0,
        avg: 0,
        p95: 0,
        p99: 0,
        lastError: '',
      })),
      distribution: bounds.map((n, i) => ({
        range: n === Infinity ? '>30s' : `${i ? bounds[i - 1] : 0}–${n}ms`,
        count: 0,
      })),
    };
    const now = Date.now();
    const run: ActiveRun = {
      snapshot,
      histogram: new Histogram(),
      endpoints: new Map(apis.map((a) => [a.id, new Histogram()])),
      controllers: new Set(),
      workers: new Set(),
      pausedAt: 0,
      pausedMs: 0,
      started: now,
      lastRequests: 0,
      lastTick: now,
      timer: undefined!,
    };
    this.active.set(snapshot.id, run);
    run.timer = setInterval(() => {
      this.tick(run);
      if (snapshot.elapsed >= duration) this.finish(run, 'completed');
    }, 1000);
    const rateSlots = new Map<string, number>();
    const worker = async (user: number) => {
      const completed = new Map<string, number>();
      while (this.active.has(snapshot.id)) {
        if (snapshot.status === 'paused') {
          await sleep(50);
          continue;
        }
        let eligible = false;
        for (const api of apis) {
          const c = api.useGlobal ? collection.config : api.config;
          if (
            user >= c.users ||
            (completed.get(api.id) ?? 0) >= c.iterations ||
            this.elapsed(run) >= c.duration
          )
            continue;
          eligible = true;
          if (this.elapsed(run) < (c.rampUp * user) / c.users) continue;
          run.workers.add(user);
          await Promise.all(
            Array.from({ length: c.parallel }, async () => {
              // Reserve a start slot immediately before fetch. A stalled request or
              // pause never accumulates rate credits that could produce a burst.
              const rateKey = api.useGlobal ? 'global' : api.id;
              while (this.active.has(snapshot.id)) {
                if (this.inFlight >= 200 || snapshot.status === 'paused') {
                  await sleep(10);
                  continue;
                }
                const now = this.elapsed(run) * 1000;
                const wait = (rateSlots.get(rateKey) ?? 0) - now;
                if (c.rateLimit > 0 && wait > 0) {
                  await sleep(Math.min(25, wait));
                  continue;
                }
                if (c.rateLimit > 0) rateSlots.set(rateKey, now + 1000 / c.rateLimit);
                break;
              }
              if (
                !this.active.has(snapshot.id) ||
                snapshot.status !== 'running' ||
                this.elapsed(run) >= duration
              )
                return;
              await this.request(run, api, c, prepared.get(api.id)!);
            }),
          );
          completed.set(api.id, (completed.get(api.id) ?? 0) + 1);
          const delay =
            c.delay +
            (c.thinkTime ? c.thinkMin + Math.random() * Math.max(0, c.thinkMax - c.thinkMin) : 0);
          const until = Date.now() + delay;
          while (Date.now() < until && this.active.has(snapshot.id))
            await sleep(Math.min(50, until - Date.now()));
        }
        if (!eligible) break;
        await sleep(5);
      }
      run.workers.delete(user);
    };
    void Promise.all(Array.from({ length: users }, (_, i) => worker(i))).then(() => {
      if (this.active.has(snapshot.id)) this.finish(run, 'completed');
    });
    return snapshot.id;
  }
  private elapsed(r: ActiveRun) {
    return ((r.pausedAt || Date.now()) - r.started - r.pausedMs) / 1000;
  }
  private async request(
    run: ActiveRun,
    api: ApiDefinition,
    c: LoadConfig,
    prepared: ReturnType<typeof prepareRequest>,
  ) {
    const controller = new AbortController();
    run.controllers.add(controller);
    this.inFlight++;
    const timeout = setTimeout(() => controller.abort(), c.timeout * 1000);
    const start = performance.now();
    let failed = false,
      size = 0,
      error = '';
    try {
      const response = await fetch(prepared.url, {
        ...prepared.options,
        signal: controller.signal,
      });
      const reader = response.body?.getReader();
      // Drain the full response for accurate timing and byte counts; retain only assertion text.
      let text = '';
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (api.responseContains && text.length < 1048576)
            text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
      }
      failed = api.expectedStatus ? response.status !== api.expectedStatus : response.status >= 400;
      if (failed) error = `HTTP ${response.status}`;
      if (api.responseContains && !text.includes(api.responseContains)) {
        failed = true;
        error = 'Response assertion failed (first 1 MB searched)';
      }
    } catch (e) {
      failed = true;
      error = controller.signal.aborted
        ? 'Request cancelled or timed out'
        : e instanceof Error
          ? e.message
          : 'Request failed';
    } finally {
      clearTimeout(timeout);
      run.controllers.delete(controller);
      this.inFlight--;
    }
    if (!this.active.has(run.snapshot.id)) return;
    const ms = performance.now() - start,
      s = run.snapshot;
    s.requests++;
    s.bytes += size;
    if (failed) s.errors++;
    run.histogram.add(ms);
    run.endpoints.get(api.id)!.add(ms);
    const endpoint = s.endpoints.find((e) => e.id === api.id)!;
    endpoint.requests++;
    endpoint.totalMs += ms;
    if (failed) {
      endpoint.errors++;
      endpoint.lastError = error;
    }
    s.distribution[bounds.findIndex((n) => ms <= n)]!.count++;
  }
  private tick(run: ActiveRun, recordPoint = true) {
    const s = run.snapshot;
    s.elapsed = Math.min(s.duration, this.elapsed(run));
    const now = Date.now();
    s.rps =
      s.status === 'paused'
        ? 0
        : (s.requests - run.lastRequests) / Math.max(0.001, (now - run.lastTick) / 1000);
    run.lastTick = now;
    run.lastRequests = s.requests;
    s.avg = run.histogram.avg;
    s.p95 = run.histogram.percentile(0.95);
    s.p99 = run.histogram.percentile(0.99);
    s.activeUsers = s.status === 'running' ? run.workers.size : 0;
    for (const e of s.endpoints) {
      const h = run.endpoints.get(e.id)!;
      e.avg = h.avg;
      e.p95 = h.percentile(0.95);
      e.p99 = h.percentile(0.99);
    }
    if (s.status === 'running' && recordPoint) {
      s.points.push({
        second: Math.round(s.elapsed),
        rps: s.rps,
        users: s.activeUsers,
        avg: s.avg,
        p95: s.p95,
        p99: s.p99,
      });
      if (s.points.length > 600) s.points.splice(0, 1);
    }
  }
  control(id: string, action: 'pause' | 'resume' | 'stop') {
    const r = this.active.get(id);
    if (!r) throw new Error('This run is no longer active.');
    if (action === 'stop') return this.finish(r, 'stopped');
    if (action === 'pause' && r.snapshot.status === 'running') {
      r.pausedAt = Date.now();
      r.snapshot.status = 'paused';
    }
    if (action === 'resume' && r.snapshot.status === 'paused') {
      r.pausedMs += Date.now() - r.pausedAt;
      r.pausedAt = 0;
      r.lastTick = Date.now();
      r.lastRequests = r.snapshot.requests;
      r.snapshot.status = 'running';
    }
  }
  private finish(r: ActiveRun, status: 'completed' | 'stopped') {
    this.tick(r, false);
    r.snapshot.status = status;
    r.snapshot.activeUsers = 0;
    r.snapshot.rps = r.snapshot.requests / Math.max(0.001, r.snapshot.elapsed);
    clearInterval(r.timer);
    this.active.delete(r.snapshot.id);
    for (const c of r.controllers) c.abort();
    this.archived.unshift(structuredClone(r.snapshot));
    this.archived = this.archived.slice(0, this.retention);
    this.onComplete(r.snapshot);
  }
  shutdown() {
    for (const r of this.active.values()) this.finish(r, 'stopped');
  }
}
