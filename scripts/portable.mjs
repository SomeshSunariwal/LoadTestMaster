import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';

export async function preparePortable() {
  const buildRoot = resolve('build');
  await mkdir(buildRoot, { recursive: true });
  const staging = await mkdtemp(join(buildRoot, 'portable-stage-'));
  try {
    await new Promise((done, reject) => {
      const child = spawn(
        'tar',
        ['-xf', resolve('artifacts/stable-win-x64-LoadMaster.tar.zst'), '-C', staging],
        { stdio: 'inherit', windowsHide: true },
      );
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0 ? done() : reject(new Error(`Portable extraction failed (${code}).`)),
      );
    });
    let target = resolve('build/portable/LoadMaster');
    const copyOptions = {
      recursive: true,
      filter: async (source, destination) => {
        const sourceInfo = await stat(source);
        if (sourceInfo.isDirectory()) return true;
        try {
          const destinationInfo = await stat(destination);
          if (sourceInfo.size !== destinationInfo.size) return true;
          const [incoming, existing] = await Promise.all([readFile(source), readFile(destination)]);
          // Windows locks running executables. Leave identical runtime files in
          // place while updating the app's changed assets and configuration.
          return !incoming.equals(existing);
        } catch (error) {
          if (error.code === 'ENOENT') return true;
          throw error;
        }
      },
    };
    try {
      await cp(join(staging, 'LoadMaster'), target, copyOptions);
    } catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
      // A changed runtime/icon cannot replace a running Windows executable.
      // Produce a complete side-by-side app without interrupting that session.
      const ready = await mkdtemp(join(buildRoot, 'portable-ready-'));
      target = join(ready, 'LoadMaster');
      await cp(join(staging, 'LoadMaster'), target, { recursive: true });
      console.log('The existing portable app is open; the updated app is in a separate folder.');
    }
    console.log(`Portable app ready: ${target}/bin/launcher.exe`);
    return target;
  } finally {
    if (!resolve(staging).startsWith(`${buildRoot}${sep}portable-stage-`))
      throw new Error('Unexpected portable staging path.');
    await rm(staging, { recursive: true, force: true });
  }
}
