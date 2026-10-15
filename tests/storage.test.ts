import { test, expect } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Storage } from '../src/backend/storage';
test('workspace edits and custom local URLs persist; invalid input is rejected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loadmaster-test-'));
  try {
    const store = new Storage(directory);
    await store.init();
    store.workspace.collections[0]!.name = 'Saved collection';
    store.workspace.environments[0]!.variables[0]!.value = 'http://localhost:5678';
    await store.saveWorkspace(store.workspace);
    const next = new Storage(directory);
    await next.init();
    expect(next.workspace.collections[0]!.name).toBe('Saved collection');
    expect(next.workspace.environments[0]!.variables[0]!.value).toBe('http://localhost:5678');
    const invalid = structuredClone(next.workspace);
    invalid.collections[0]!.config.users = -1;
    await expect(next.saveWorkspace(invalid)).rejects.toThrow();
    expect(
      JSON.parse(await readFile(join(directory, 'workspace.json'), 'utf8')).collections[0].name,
    ).toBe('Saved collection');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('retired sandbox environment migrates without discarding collections or custom URLs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loadmaster-migration-'));
  try {
    const store = new Storage(directory);
    await store.init();
    store.workspace.environments[0]!.name = 'Local sandbox';
    store.workspace.environments[0]!.variables[0]!.value = 'http://127.0.0.1:54321';
    await store.saveWorkspace(store.workspace);
    const next = new Storage(directory);
    await next.init();
    expect(next.workspace.environments[0]!.name).toBe('Local');
    expect(next.workspace.environments[0]!.variables[0]!.value).toBe('http://localhost:3000');
    expect(next.workspace.collections[0]!.environmentId).toBe('local');
    next.workspace.environments[0]!.name = 'Local sandbox';
    next.workspace.environments[0]!.variables[0]!.value = 'https://my-api.example.com';
    await next.saveWorkspace(next.workspace);
    const custom = new Storage(directory);
    await custom.init();
    expect(custom.workspace.environments[0]!.variables[0]!.value).toBe(
      'https://my-api.example.com',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
