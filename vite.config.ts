import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { electrobunViteAliases } from './.hutch/devkit/api/config/electrobun-vite.ts';

export default defineConfig(() => {
  const devkit = resolve('.hutch/devkit');
  const aliases = electrobunViteAliases(devkit);

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: { alias: aliases },
    server: {
      port: 5173,
      strictPort: true,
      watch: { ignored: ['**/build/**', '**/artifacts/**', '**/.hutch/**', '**/.data/**'] },
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.LOADMASTER_PORT || 4319}`,
          headers: { Authorization: `Bearer ${process.env.LOADMASTER_TOKEN || ''}` },
        },
      },
    },
    build: { outDir: 'dist', chunkSizeWarningLimit: 800 },
  };
});
