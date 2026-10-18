import type { ElectrobunConfig } from 'electrobun';

export default {
  app: { name: 'LoadMaster', identifier: 'com.loadmaster.desktop', version: '1.0.0' },
  build: {
    mainProcess: 'bun',
    bun: { entrypoint: 'src/backend/desktop.ts' },
    copy: { dist: 'views/main', 'assets/loadmaster.ico': 'assets/loadmaster.ico' },
    win: { bundleCEF: false, icon: 'assets/loadmaster.ico' },
  },
  runtime: { exitOnLastWindowClosed: true },
} satisfies ElectrobunConfig;
