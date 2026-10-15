import type { ApiRequestLog } from '../shared/schema';
import { open, mkdir, readdir, readFile, stat, copyFile } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { join } from 'node:path';

export const logPreviewLimit = 4096;
export function logHeaders(headers: Headers) {
  return Object.fromEntries(
    [...headers].map(([key, value]) => [
      key,
      /authorization|cookie|api-key|token|secret/i.test(key) ? '[redacted]' : value,
    ]),
  );
}

const inline = (value: string) => value.replace(/\r\n|\r|\n/g, '\\n').replace(/\t/g, '\\t');
const printableHeaders = (headers: Record<string, string>) =>
  Object.entries(headers)
    .map(([key, value]) => `${inline(key)}: ${inline(value)}`)
    .join('; ') || '(none)';

function safeCollectionName(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '') || 'collection';
}

/** Persists complete request/response pairs as two plain-text lines per pair. */
export class RunLogFiles {
  private runs = new Map<
    string,
    {
      directory: string;
      date: string;
      time: string;
      index: number;
      pairs: number;
      handle?: FileHandle;
      queue: Promise<void>;
    }
  >();

  constructor(
    private root: string,
    private maxPairsPerFile = 100_000,
  ) {}

  append(runId: string, collectionName: string, startedAt: string, log: ApiRequestLog) {
    let state = this.runs.get(runId);
    if (!state) {
      const safeName = safeCollectionName(collectionName);
      const started = new Date(startedAt).toISOString();
      state = {
        directory: join(this.root, safeName),
        date: started.slice(0, 10),
        time: started.slice(11, 19).replaceAll(':', '-'),
        index: 1,
        pairs: 0,
        queue: Promise.resolve(),
      };
      this.runs.set(runId, state);
    }

    const current = state;
    const headers = printableHeaders(log.request.headers);
    const body = inline(log.request.body) || '(empty)';
    const requestLine = `${log.requestAt}:${log.id}:request ${log.request.method} ${inline(log.request.url)} | headers=${headers} | body=${body}`;
    const response = log.response;
    const responseLine = `${log.responseAt ?? new Date().toISOString()}:${log.id}:response status=${response?.status ?? 'none'} durationMs=${response?.durationMs ?? 0} bytes=${response?.bytes ?? 0} error=${inline(response?.error ?? '') || '(none)'} | headers=${printableHeaders(response?.headers ?? {})} | body=${inline(response?.body ?? '') || '(empty)'}`;
    const pair = `${requestLine}\n${responseLine}\n`;

    current.queue = current.queue.catch(() => {}).then(async () => {
      if (current.pairs >= this.maxPairsPerFile) {
        await current.handle?.close();
        current.handle = undefined;
        current.index++;
        current.pairs = 0;
      }
      if (!current.handle) {
        await mkdir(current.directory, { recursive: true });
        const file = `log.${runId}.${current.date}.${current.time}_${current.index}.txt`;
        current.handle = await open(join(current.directory, file), 'wx');
      }
      await current.handle.writeFile(pair, 'utf8');
      current.pairs++;
    });
    return current.queue;
  }

  async flush() {
    await Promise.all([...this.runs.values()].map((state) => state.queue));
    await Promise.all(
      [...this.runs.values()].flatMap((state) => (state.handle ? [state.handle.sync()] : [])),
    );
  }

  async list(runId: string, collectionName: string) {
    await this.runs.get(runId)?.queue;
    const directory = join(this.root, safeCollectionName(collectionName));
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const prefix = `log.${runId}.`;
    const files = names.filter((name) => name.startsWith(prefix) && name.endsWith('.txt'));
    return Promise.all(
      files
        .map((name) => ({ name, index: Number(name.match(/_(\d+)\.txt$/)?.[1] ?? 0) }))
        .sort((a, b) => a.index - b.index)
        .map(async ({ name }) => ({ name, size: (await stat(join(directory, name))).size })),
    );
  }

  async read(runId: string, collectionName: string, name: string) {
    const files = await this.list(runId, collectionName);
    if (!files.some((file) => file.name === name)) throw new Error('Log file not found.');
    return readFile(join(this.root, safeCollectionName(collectionName), name), 'utf8');
  }

  async readChunk(runId: string, collectionName: string, name: string, offset: number) {
    const escapedId = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`^log\\.${escapedId}\\.\\d{4}-\\d{2}-\\d{2}\\.\\d{2}-\\d{2}-\\d{2}_\\d+\\.txt$`).test(name))
      throw new Error('Log file not found.');
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid log download offset.');
    const file = join(this.root, safeCollectionName(collectionName), name);
    const handle = await open(file, 'r');
    try {
      const { size } = await handle.stat();
      if (offset > size) throw new Error('Invalid log download offset.');
      const buffer = Buffer.allocUnsafe(Math.min(1_048_576, Math.max(1, size - offset)));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
      const view = buffer.subarray(0, bytesRead);
      const lastLine = view.lastIndexOf(10);
      const length = lastLine >= 0 ? lastLine + 1 : bytesRead;
      return {
        content: view.subarray(0, length).toString('utf8'),
        nextOffset: offset + length,
        size,
      };
    } finally {
      await handle.close();
    }
  }

  async copyTo(runId: string, collectionName: string, name: string, destinationDirectory: string) {
    const files = await this.list(runId, collectionName);
    if (!files.some((file) => file.name === name)) throw new Error('Log file not found.');
    await mkdir(destinationDirectory, { recursive: true });
    const destination = join(destinationDirectory, name);
    await copyFile(join(this.root, safeCollectionName(collectionName), name), destination);
    return destination;
  }
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
