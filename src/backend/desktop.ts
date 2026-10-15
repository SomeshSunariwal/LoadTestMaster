import { BrowserView, BrowserWindow, Utils } from 'electrobun/main';
import type { AppRPC } from '../shared/rpc';
import { createService } from './service';

const service = await createService(Utils.paths.userData);
let rendererConnected = false;

const rpc = BrowserView.defineRPC<AppRPC>({
  handlers: {
    requests: {
      state: () => {
        if (!rendererConnected) {
          console.info('LoadMaster renderer connected over desktop RPC.');
          rendererConnected = true;
        }
        return service.state();
      },
      save: (workspace) => service.save(workspace),
      logs: (input) => service.logs(input),
      start: (input) => service.start(input),
      control: (input) => service.control(input),
      deleteRun: (input) => service.deleteRun(input),
    },
    messages: {},
  },
});

const mainWindow = new BrowserWindow({
  title: 'LoadMaster — API Load Testing',
  url: 'views://main/index.html',
  frame: { width: 1560, height: 980, x: 80, y: 60 },
  rpc,
});

mainWindow.on('close', () => service.shutdown());
