import type { ApiRequestLog } from '../shared/schema';

export const logPreviewLimit = 4096;
export function logHeaders(headers: Headers) {
  return Object.fromEntries(
    [...headers].map(([key, value]) => [
      key,
      /authorization|cookie|api-key|token|secret/i.test(key) ? '[redacted]' : value,
    ]),
  );
}

// Keep diagnostics separate from metric snapshots and bound memory during long runs.
export class RequestLogs {
  private runs = new Map<string, ApiRequestLog[]>();
  add(runId: string, log: ApiRequestLog) {
    const logs = this.runs.get(runId) ?? [];
    logs.push(log);
    if (logs.length > 200) logs.shift();
    this.runs.set(runId, logs);
  }
  get(runId: string, apiId: string) {
    return structuredClone(
      (this.runs.get(runId) ?? []).filter((l) => l.apiId === apiId).slice(-100),
    );
  }
  retain(ids: string[]) {
    const keep = new Set(ids);
    for (const id of this.runs.keys()) if (!keep.has(id)) this.runs.delete(id);
  }
}
