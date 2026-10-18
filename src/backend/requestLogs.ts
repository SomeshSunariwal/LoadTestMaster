import type { ApiRequestLog } from '../shared/schema';
import { open, mkdir, readdir, readFile, stat, copyFile, unlink, rmdir, rename } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip, createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
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
  private deleted = new Set<string>();
  private runs = new Map<
    string,
    {
      directory: string;
      date: string;
      time: string;
      index: number;
      pairs: number;
      handle?: FileHandle;
      file?: string;
      queue: Promise<void>;
    }
  >();

  constructor(
    private root: string,
    private maxPairsPerFile = 100_000,
  ) {}

  append(runId: string, collectionName: string, startedAt: string, log: ApiRequestLog) {
    // Aborted requests may settle after a stopped run has been deleted.
    if (this.deleted.has(runId)) return Promise.resolve();
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
        if (current.file) await this.compress(current.file);
        current.index++;
        current.pairs = 0;
      }
      if (!current.handle) {
        await mkdir(current.directory, { recursive: true });
        const file = `log.${runId}.${current.date}.${current.time}_${current.index}.txt`;
        current.file = join(current.directory, file);
        current.handle = await open(current.file, 'wx');
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

  private async compress(file: string) {
    const temporary = `${file}.gz.tmp`;
    try {
      const input = createReadStream(file);
      const output = createWriteStream(temporary);
      const inputClosed = new Promise<void>((resolve) => input.once('close', resolve));
      const outputClosed = new Promise<void>((resolve) => output.once('close', resolve));
      try {
        await pipeline(input, createGzip({ level: 6 }), output);
      } finally {
        // Windows cannot rename/delete files until stream handles are closed.
        await Promise.all([inputClosed, outputClosed]);
      }
      await rename(temporary, `${file}.gz`);
      await unlink(file);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      // The original text remains available if compression fails.
      console.error('Log compression failed; original text retained', error);
    }
  }

  async finalize(runId: string) {
    if (this.deleted.has(runId)) return;
    const state = this.runs.get(runId);
    if (!state) return;
    state.queue = state.queue.catch(() => {}).then(async () => {
      await state.handle?.close();
      state.handle = undefined;
      if (state.file) {
        const file = state.file;
        state.file = undefined;
        await this.compress(file);
      }
    });
    await state.queue;
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
    const files = names.filter((name) => name.startsWith(prefix) && /\.txt(?:\.gz)?$/.test(name));
    return Promise.all(
      files
        .map((name) => ({ name, index: Number(name.match(/_(\d+)\.txt(?:\.gz)?$/)?.[1] ?? 0) }))
        .sort((a, b) => a.index - b.index)
        .map(async ({ name }) => ({ name, size: (await stat(join(directory, name))).size })),
    );
  }

  async remove(runId: string, collectionName: string) {
    this.deleted.add(runId);
    const state = this.runs.get(runId);
    // Drain already queued writes before closing the Windows file handle.
    await state?.queue.catch(() => {});
    if (state) state.queue = Promise.resolve();
    await state?.handle?.close();
    if (state) state.handle = undefined;
    const directory = join(this.root, safeCollectionName(collectionName));
    const files = await this.list(runId, collectionName);
    for (const file of files) {
      try { await unlink(join(directory, file.name)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    this.runs.delete(runId);
    try { await rmdir(directory); }
    catch (error) {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
    }
  }

  async read(runId: string, collectionName: string, name: string) {
    const files = await this.list(runId, collectionName);
    if (!files.some((file) => file.name === name)) throw new Error('Log file not found.');
    const file = join(this.root, safeCollectionName(collectionName), name);
    if (!name.endsWith('.gz')) return readFile(file, 'utf8');
    const chunks: Buffer[] = [];
    for await (const chunk of createReadStream(file).pipe(createGunzip())) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
  }

  async readChunk(runId: string, collectionName: string, name: string, offset: number) {
    const escapedId = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`^log\\.${escapedId}\\.\\d{4}-\\d{2}-\\d{2}\\.\\d{2}-\\d{2}-\\d{2}_\\d+\\.txt(?:\\.gz)?$`).test(name))
      throw new Error('Log file not found.');
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid log download offset.');
    const file = join(this.root, safeCollectionName(collectionName), name);
    if (name.endsWith('.gz')) {
      // Offsets refer to uncompressed text. Keep memory bounded during downloads.
      const chunks: Buffer[] = [];
      let size = 0;
      const limit = offset + 1_048_576;
      for await (const value of createReadStream(file).pipe(createGunzip())) {
        const chunk = Buffer.from(value);
        const end = size + chunk.length;
        if (end > offset && size < limit)
          chunks.push(chunk.subarray(Math.max(0, offset - size), Math.min(chunk.length, limit - size)));
        size = end;
      }
      if (offset > size) throw new Error('Invalid log download offset.');
      const view = Buffer.concat(chunks);
      const lastLine = view.lastIndexOf(10);
      const length = lastLine >= 0 ? lastLine + 1 : view.length;
      return { content: view.subarray(0, length).toString('utf8'), nextOffset: offset + length, size };
    }
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

