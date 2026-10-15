import os from 'node:os';
import { z } from 'zod';
import { workspaceSchema, type StartInput, type Workspace } from '../shared/schema';
import { LoadEngine } from './engine';
import { Storage } from './storage';

export async function createService(directory: string) {
  const storage = new Storage(directory);
  await storage.init();
  let persistenceError = '';

  const engine = new LoadEngine(() => {
    void storage
      .saveHistory(engine.runs.filter((r) => !['running', 'paused'].includes(r.status)))
      .catch((e) => {
        persistenceError = String(e);
        console.error('History persistence failed', e);
      });
  });

  engine.restore(storage.history);
  engine.setRetention(storage.workspace.retention);
  let previous = os.cpus();
  let cpu = 0;

  const sampler = setInterval(() => {
    const current = os.cpus();
    let idle = 0,
      total = 0;
    current.forEach((c, i) => {
      const p = previous[i];
      if (!p) return;
      idle += c.times.idle - p.times.idle;
      total +=
        Object.values(c.times).reduce((a, b) => a + b, 0) -
        Object.values(p.times).reduce((a, b) => a + b, 0);
    });
    cpu = total ? 100 * (1 - idle / total) : 0;
    previous = current;
  }, 1000);

  return {
    state: () => {
      if (persistenceError) throw new Error(`History could not be saved: ${persistenceError}`);
      return {
        workspace: storage.workspace,
        runs: engine.runs,
        resources: {
          cpu,
          memoryUsed: os.totalmem() - os.freemem(),
          memoryTotal: os.totalmem(),
          uptime: os.uptime(),
          platform: `${os.platform()} ${os.arch()}`,
          inFlight: engine.requestCount,
        },
      };
    },

    save: async (workspace: Workspace) => {
      const saved = await storage.saveWorkspace(workspaceSchema.parse(workspace));
      engine.setRetention(saved.retention);
      return saved;
    },

    start: (input: StartInput) => {
      const { collectionId, all } = z
        .object({ collectionId: z.string(), all: z.boolean() })
        .parse(input);
      const c = storage.workspace.collections.find((c) => c.id === collectionId);
      if (!c) throw new Error('Collection not found.');
      const env = storage.workspace.environments.find((e) => e.id === c.environmentId);
      if (!env) throw new Error('Choose an environment first.');
      return engine.start(structuredClone(c), structuredClone(env), all);
    },

    control: (input: { id: string; action: 'pause' | 'resume' | 'stop' }) => {
      const value = z
        .object({ id: z.string(), action: z.enum(['pause', 'resume', 'stop']) })
        .parse(input);
      engine.control(value.id, value.action);
      return true;
    },

    deleteRun: async ({ id }: { id: string }) => {
      engine.remove(id);
      await storage.saveHistory(
        engine.runs.filter((r) => !['running', 'paused'].includes(r.status)),
      );
      return true;
    },

    shutdown: () => {
      clearInterval(sampler);
      engine.shutdown();
    },
  };
}
