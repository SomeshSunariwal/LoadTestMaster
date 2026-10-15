import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { preparePortable } from './portable.mjs';

const env = { ...process.env };
// Hutch invokes Windows PowerShell for ZIP packaging. PowerShell 7 module paths
// inherited from a development terminal can prevent Archive from loading in 5.1.
if (process.platform === 'win32') {
  env.PSModulePath = [
    join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/Modules'),
    join(process.env.ProgramFiles || 'C:\\Program Files', 'WindowsPowerShell/Modules'),
  ].join(';');
}
const child = spawn(
  process.execPath,
  [resolve('node_modules/electrobun/bin/electrobun.cjs'), 'build', '--env=stable'],
  { env, stdio: 'inherit', windowsHide: true },
);
child.on('exit', async (code) => {
  if (code !== 0) process.exit(code ?? 1);
  if (process.platform !== 'win32') return;
  // Release output is a distribution wrapper. Extract the update archive too,
  // giving local development a portable runnable app with the real launcher.
  try {
    await preparePortable();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
