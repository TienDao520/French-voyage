import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/French-voyage/', //GitHub Pages serves your project site from a subpath — https://tiendao520.github.io/French-voyage/, not the domain root
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
