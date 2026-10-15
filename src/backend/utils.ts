import os from 'node:os';
import { join } from 'node:path';

/** Shared app data location used by packaged and development backends. */
export function getDataDirectory() {
  const root = process.env.APPDATA || join(os.homedir(), 'AppData', 'Roaming');
  return join(root, 'LoadMaster');
}
