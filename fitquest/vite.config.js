import { defineConfig } from 'vite';

/** Build statique portable (même dossier que index.html après déploiement). */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
