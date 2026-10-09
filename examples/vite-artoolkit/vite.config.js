import { defineConfig } from 'vite';

export default defineConfig({
  // The plugin starts its worker from `new URL('assets/worker-<hash>.js',
  // import.meta.url)`. Vite's dev pre-bundling moves the plugin's module into
  // node_modules/.vite/deps, where that relative URL no longer resolves, so
  // the plugin is served as published instead.
  optimizeDeps: {
    exclude: ['@ar-js-org/arjs-plugin-artoolkit'],
  },
  server: {
    // The repository root's dev server uses 5173.
    port: 5174,
  },
});
