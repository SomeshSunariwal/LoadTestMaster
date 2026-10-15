import type { ApiRequestLog, AppState, RunLogFileInfo, StartInput, Workspace } from '../shared/schema';
import type { AppRPC } from '../shared/rpc';

type ControlInput = { id: string; action: 'pause' | 'resume' | 'stop' };
let desktop: Promise<Awaited<ReturnType<typeof connect>>> | undefined;

async function connect() {
  const { Electroview } = await import('electrobun/view');
  const rpc = Electroview.defineRPC<AppRPC>({
    maxRequestTime: 15000,
    handlers: { requests: {}, messages: {} },
  });
  new Electroview({ rpc });
  return rpc;
}

async function request<T>(method: string, input: unknown): Promise<T> {
  if (import.meta.env.VITE_DESKTOP === 'true') {
    const rpc = await (desktop ??= connect());
    return (rpc.request as unknown as Record<string, (v: unknown) => Promise<T>>)[method]!(input);
  }
  const response = await fetch(`/api/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? null),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Backend unavailable');
  return data.result;
}

export const client = {
  state: () => request<AppState>('state', undefined),
  logs: (runId: string, apiId: string) => request<ApiRequestLog[]>('logs', { runId, apiId }),
  logFiles: (runId: string) => request<RunLogFileInfo[]>('logFiles', { runId }),
  readLogChunk: (runId: string, name: string, offset: number) =>
    request<{ content: string; nextOffset: number; size: number }>('readLogChunk', {
      runId,
      name,
      offset,
    }),
  downloadLog: (runId: string, name: string) =>
    request<string>('downloadLog', { runId, name }),
  downloadCsv: (runId: string) => request<string>('downloadCsv', { runId }),
  save: (v: Workspace) => request<Workspace>('save', v),
  start: (v: StartInput) => request<string>('start', v),
  control: (v: ControlInput) => request<boolean>('control', v),
  deleteRun: (id: string) => request<boolean>('deleteRun', { id }),
};
