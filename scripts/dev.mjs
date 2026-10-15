import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const env = { ...process.env, LOADMASTER_TOKEN: randomBytes(32).toString('hex') };
const children = [];
function run(command, args) {
  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  children.push(child);
  child.on('exit', () => stop());
  return child;
}
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === 'win32')
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    else child.kill('SIGTERM');
  }
  process.exit();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
run(
  resolve(
    process.platform === 'win32' ? 'node_modules/bun/bin/bun.exe' : 'node_modules/bun/bin/bun',
  ),
  ['src/backend/server.ts'],
);
run(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1']);
