import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// GITHUB_PAGES=true のとき /CrossWord/ をベースパスにする（GitHub Pages 用）
const base = process.env.GITHUB_PAGES === 'true' ? '/CrossWord/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
  resolve: {
    alias: {
      '@crossword/shared': resolve(repoRoot, 'shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
});
