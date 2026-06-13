import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 共有モジュールを TS ソースとして直接解決し、Vite に変換させる
      '@crossword/shared': resolve(repoRoot, 'shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    fs: {
      // ワークスペース外の shared/ を読めるよう許可
      allow: [repoRoot],
    },
  },
});
