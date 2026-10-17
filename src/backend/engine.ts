import type {
  ApiDefinition,
  ApiRequestLog,
  Collection,
  Environment,
  LoadConfig,
  RunSnapshot,
} from '../shared/schema';
import { prepareRequest } from './variables';
import { RequestLogs, RunLogFiles, logHeaders, logPreviewLimit } from './requestLogs';
import { configSchema } from '../shared/schema';
import { tpsTimeAt, tpsVolumeAt } from './tps';
import { LIVE_UPDATE_MS } from '../shared/timing';
import { RequestRates } from './requestRates';
import { compactChartHistory } from '../shared/chartHistory';

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
  rates: RequestRates;
  timer: ReturnType<typeof setInterval>;
}

export class LoadEngine {
  private logs = new RequestLogs();
  private runLogFiles?: RunLogFiles;
  private logWriteErrorReported = false;
  getLogs(runId: string, apiId: string) {
    return this.logs.get(runId, apiId);
  }
  getRunSnapshot(runId: string) {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) throw new Error('Run not found.');
    return structuredClone(run);
  }
  async getLogFiles(runId: string) {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) throw new Error('Run not found.');
    return (await this.runLogFiles?.list(run.id, run.name)) ?? [];
  }
  async readLogChunk(runId: string, name: string, offset: number) {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) throw new Error('Run not found.');
    if (!this.runLogFiles) throw new Error('Log files are unavailable.');
    return this.runLogFiles.readChunk(run.id, run.name, name, offset);
  }
  async downloadLog(runId: string, name: string, destinationDirectory: string) {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) throw new Error('Run not found.');
    if (!this.runLogFiles) throw new Error('Log files are unavailable.');
    return this.runLogFiles.copyTo(run.id, run.name, name, destinationDirectory);
  }
  private active = new Map<string, ActiveRun>();
  private archived: RunSnapshot[] = [];
  private inFlight = 0;
  private retention = 30;
  private cpuUtilization?: number;

  setCpuUtilization(value: number) {
    this.cpuUtilization = Math.max(0, Math.min(100, value));
  }

  constructor(
    private onComplete: (run: RunSnapshot) => void = () => {},
    logDirectory?: string,
  ) {
    if (logDirectory) this.runLogFiles = new RunLogFiles(logDirectory);
  }

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
    this.logs.retain([...this.active.keys(), ...this.archived.map((r) => r.id)]);
  }

  remove(id: string) {
    if (this.active.has(id)) throw new Error('Stop the run before deleting it.');
    this.archived = this.archived.filter((r) => r.id !== id);
    this.logs.retain([...this.active.keys(), ...this.archived.map((r) => r.id)]);
  }

  start(collection: Collection, environment: Environment, all: boolean) {
    if (this.active.size >= 4) throw new Error('Up to four concurrent runs are supported.');
    collection = { ...collection, config: configSchema.parse(collection.config) };
    const apis = collection.apis
      .filter((a) => all || a.selected)
      .map((api) => ({
        ...api,
        config: configSchema.parse(api.config),
      }));
    if (!apis.length) throw new Error('Select at least one API to run.');
    const prepared = new Map(apis.map((api) => [api.id, prepareRequest(api, environment)]));
    const configs = apis.map((api) => (api.useGlobal ? collection.config : api.config));
    const userApis = apis.filter((_, index) => configs[index]!.loadMode === 'users');
    const users = Math.max(0, ...configs.filter((c) => c.loadMode === 'users').map((c) => c.users));
    const tpsGroups = new Map<string, { config: LoadConfig; apis: ApiDefinition[] }>();
    for (const api of apis) {
      const config = api.useGlobal ? collection.config : api.config;
      if (config.loadMode !== 'tps') continue;
      const key = api.useGlobal ? 'global' : api.id;
      const group = tpsGroups.get(key) ?? { config, apis: [] };
      group.apis.push(api);
      tpsGroups.set(key, group);
    }
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
      loadMode: tpsGroups.size ? (userApis.length ? 'mixed' : 'tps') : 'users',
      targetTps: [...tpsGroups.values()].reduce((sum, group) => sum + group.config.targetTps, 0),
      startedRequests: 0,
      startRps: 0,
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
      rates: new RequestRates(),
      timer: undefined!,
    };

    this.active.set(snapshot.id, run);
    run.timer = setInterval(() => {
      this.tick(run);
      if (snapshot.elapsed >= duration) this.finish(run, 'completed');
    }, LIVE_UPDATE_MS);

    const rateSlots = new Map<string, number>();
    const worker = async (user: number) => {
      const completed = new Map<string, number>();
      while (this.active.has(snapshot.id)) {
        if (snapshot.status === 'paused') {
          await sleep(50);
          continue;
        }
        let eligible = false;
        for (const api of userApis) {
          const c = api.useGlobal ? collection.config : api.config;
          if (
            user >= c.users ||
            (c.iterations !== -1 && (completed.get(api.id) ?? 0) >= c.iterations) ||
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
                if (snapshot.status === 'paused') {
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
    const jobs = [
      ...Array.from({ length: users }, (_, i) => worker(i)),
      ...[...tpsGroups.values()].map((group) =>
        this.runTargetTps(run, group.apis, group.config, prepared),
      ),
    ];
    void Promise.all(jobs).then(() => {
      if (this.active.has(snapshot.id)) this.finish(run, 'completed');
    });
    return snapshot.id;
  }

  private elapsed(r: ActiveRun) {
    return ((r.pausedAt || Date.now()) - r.started - r.pausedMs) / 1000;
  }

  private async runTargetTps(
    run: ActiveRun,
    apis: ApiDefinition[],
    config: LoadConfig,
    prepared: Map<string, ReturnType<typeof prepareRequest>>,
  ) {
    // In parallel mode, start one second's target volume together. Requests
    // from earlier groups may still be in flight; each request has its own timeout.
    const batchSize = config.tpsParallel ? Math.ceil(config.targetTps) : 1;
    const duration = Math.min(config.duration, run.snapshot.duration);
    const pending = new Set<Promise<void>>();
    let endpoint = 0;
    // During ramp-up, accumulate a whole batch's worth of traffic before firing it.
    let nextVolume = config.rampUp > 0 ? batchSize : 0;
    while (this.active.has(run.snapshot.id)) {
      if (run.snapshot.status === 'paused') {
        await sleep(10);
        continue;
      }
      const now = this.elapsed(run);
      if (now >= duration) break;
      const due = tpsTimeAt(nextVolume, config.targetTps, config.rampUp);
      if (now < due) {
        await sleep(Math.min(25, Math.max(1, (due - now) * 1000)));
        continue;
      }
      // Discard missed slots after a long event-loop stall instead of producing
      // an oversized catch-up burst.
      // Pause time is excluded by elapsed(), so resuming never builds rate credits.
      if (now - due > 0.025) {
        nextVolume = Math.max(nextVolume, tpsVolumeAt(now, config.targetTps, config.rampUp));
      }
      for (let i = 0; i < batchSize; i++) {
        const api = apis[endpoint++ % apis.length]!;
        const task = this.request(run, api, config, prepared.get(api.id)!);
        pending.add(task);
        void task.then(
          () => pending.delete(task),
          () => pending.delete(task),
        );
      }
      nextVolume += batchSize;
    }
    await Promise.all(pending);
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
    run.snapshot.startedRequests = (run.snapshot.startedRequests ?? 0) + 1;
    run.rates.record('starts');
    const timeout = setTimeout(() => controller.abort(), c.timeout * 1000);
    const start = performance.now();
    const log: ApiRequestLog = {
      id: crypto.randomUUID(),
      apiId: api.id,
      requestAt: new Date().toISOString(),
      request: {
        method: api.method,
        url: prepared.url,
        headers: logHeaders(prepared.options.headers),
        body: (prepared.options.body ?? '').slice(0, logPreviewLimit).toString(),
      },
    };
    this.logs.add(run.snapshot.id, log);
    let responseStatus: number | undefined;
    let responseHeaders: Record<string, string> = {};
    let responsePreview = '';
    let failed = false,
      size = 0,
      error = '';
    try {
      const response = await fetch(prepared.url, {
        ...prepared.options,
        signal: controller.signal,
      });
      const reader = response.body?.getReader();
      responseStatus = response.status;
      responseHeaders = logHeaders(response.headers);
      // Drain the full response for accurate timing and byte counts; retain only assertion text.
      let text = '';
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          const decoded = decoder.decode(chunk.value, { stream: true });
          if (responsePreview.length < logPreviewLimit)
            responsePreview += decoded.slice(0, logPreviewLimit - responsePreview.length);
          if (api.responseContains && text.length < 1048576) text += decoded;
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
      log.responseAt = new Date().toISOString();
      log.response = {
        status: responseStatus,
        headers: responseHeaders,
        body: responsePreview,
        bytes: size,
        durationMs: performance.now() - start,
        error,
      };
      if (this.runLogFiles) {
        void this.runLogFiles
          .append(run.snapshot.id, run.snapshot.name, run.snapshot.startedAt, log)
          .catch((e) => {
            if (!this.logWriteErrorReported) {
              this.logWriteErrorReported = true;
              console.error('Request log file could not be written', e);
            }
          });
      }
    }
    if (!this.active.has(run.snapshot.id)) return;
    const ms = performance.now() - start,
      s = run.snapshot;
    s.requests++;
    if (s.status === 'running') run.rates.record('completions');
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
    const rates = run.rates.read();
    s.rps = s.status === 'paused' ? 0 : rates.completions;
    s.startRps = s.status === 'paused' ? 0 : rates.starts;
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
      const pointSecond = Math.round(s.elapsed * 10) / 10;
      const second = Math.floor(pointSecond);
      const last = s.points.at(-1);
      const sameSecond = last && Math.floor(last.second) === second;
      const point = {
        second: pointSecond,
        timestamp: Date.now(),
        outstandingRequests: run.controllers.size,
        cpu: this.cpuUtilization,
        rps: s.rps,
        startRps: s.startRps,
        users: s.activeUsers,
        avg: s.avg,
        p95: s.p95,
        p99: s.p99,
      };
      // Refresh the current second, preserving the full run in compact older buckets.
      if (sameSecond)
        s.points[s.points.length - 1] = point;
      else {
        s.points.push(point);
        s.points = compactChartHistory(s.points, s.elapsed);
      }
    }
  }

  control(id: string, action: 'pause' | 'resume' | 'stop') {
    const r = this.active.get(id);
    if (!r) throw new Error('This run is no longer active.');
    if (action === 'stop') return this.finish(r, 'stopped');
    if (action === 'pause' && r.snapshot.status === 'running') {
      r.pausedAt = Date.now();
      r.snapshot.status = 'paused';
      r.rates.clear();
      r.snapshot.rps = 0;
      r.snapshot.startRps = 0;
    }
    if (action === 'resume' && r.snapshot.status === 'paused') {
      r.pausedMs += Date.now() - r.pausedAt;
      r.pausedAt = 0;
      r.rates.clear();
      r.snapshot.status = 'running';
    }
  }

  private finish(r: ActiveRun, status: 'completed' | 'stopped') {
    this.tick(r);
    r.snapshot.status = status;
    r.snapshot.activeUsers = 0;
    r.snapshot.rps = r.snapshot.requests / Math.max(0.001, r.snapshot.elapsed);
    r.snapshot.startRps = (r.snapshot.startedRequests ?? 0) / Math.max(0.001, r.snapshot.elapsed);
    clearInterval(r.timer);
    this.active.delete(r.snapshot.id);
    for (const c of r.controllers) c.abort();
    this.archived.unshift(structuredClone(r.snapshot));
    this.archived = this.archived.slice(0, this.retention);
    this.logs.retain([...this.active.keys(), ...this.archived.map((run) => run.id)]);
    this.onComplete(r.snapshot);
  }

  async shutdown() {
    for (const r of this.active.values()) this.finish(r, 'stopped');
    while (this.inFlight > 0) await sleep(10);
    await this.runLogFiles?.flush();
  }
}
