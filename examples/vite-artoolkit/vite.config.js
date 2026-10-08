import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: [
      {
        // @ar-js-org/artoolkit5-wasm 0.4.0 ships dist/artoolkit5.wasm but its
        // `exports` map only exposes ".", so the specifier main.js imports is
        // refused. Point it at the file until the package exports the binary;
        // the `?url` query is kept by the regex replacement.
        find: /^@ar-js-org\/artoolkit5-wasm\/dist\/artoolkit5\.wasm/,
        replacement: fileURLToPath(
          new URL(
            './node_modules/@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm',
            import.meta.url,
          ),
        ),
      },
    ],
  },
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
