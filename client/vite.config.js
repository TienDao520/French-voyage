import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Content lives OUTSIDE client/, at the repo root, because the same JSON
      // feeds the React app, the validator and (step 17) the SQLite seeder.
      '@content': fileURLToPath(new URL('../content', import.meta.url)),
    },
  },
  base: '/French-voyage/',
  css: {
    preprocessorOptions: {
      scss: {
        // Silences deprecation warnings from DEPENDENCIES only —
        // deprecations in OUR theme.scss still print, which we want.
        quietDeps: true,
      },
    },
  },
});
