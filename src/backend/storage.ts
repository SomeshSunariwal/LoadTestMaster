import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { workspaceSchema, type RunSnapshot, type Workspace } from '../shared/schema';
import { seedWorkspace } from '../shared/defaults';

export class Storage {
  workspace!: Workspace;

  history: RunSnapshot[] = [];

  private queue: Promise<void> = Promise.resolve();

  constructor(private directory: string) {}

  async init() {
    await mkdir(this.directory, { recursive: true });
    try {
      this.workspace = workspaceSchema.parse(
        JSON.parse(await readFile(join(this.directory, 'workspace.json'), 'utf8')),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error(
          'Workspace could not be read. Restore or rename workspace.json in the data folder before restarting.',
          { cause: e },
        );
      this.workspace = seedWorkspace();
    }
    const local = this.workspace.environments.find((e) => e.id === 'local');
    // Migrate the retired built-in environment without replacing custom URLs.
    if (local?.name === 'Local sandbox') {
      local.name = 'Local';
      const base = local.variables.find((v) => v.key === 'baseUrl');
      if (base && /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(base.value))
        base.value = 'http://localhost:3000';
    }
    try {
      this.history = JSON.parse(await readFile(join(this.directory, 'history.json'), 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    await this.saveWorkspace(this.workspace);
  }

  private write(name: string, data: unknown) {
    const work = this.queue
      .catch(() => {})
      .then(async () => {
        const path = join(this.directory, name);
        await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2));
        await rename(`${path}.tmp`, path);
      });
    this.queue = work;
    return work;
  }

  async saveWorkspace(input: Workspace) {
    const next = workspaceSchema.parse(input);
    await this.write('workspace.json', next);
    this.workspace = next;
    return next;
  }

  async saveHistory(history: RunSnapshot[]) {
    this.history = history.slice(0, this.workspace.retention);
    await this.write('history.json', this.history);
  }
}
