import { defineConfig } from 'vite';

// Library build that produces:
// - dist/arjs-core.mjs (ESM)  -> package.json "module" and "exports.import"
// - dist/arjs-core.js (CJS)   -> package.json "main" and "exports.require"
export default defineConfig({
  server: {
    // For local camera access, HTTP on localhost generally works in Chrome.
    // If you need HTTPS (Safari/stricter policies), enable and provide certs:
    // https: true,
    port: 5173,
    open: '/examples/index.html',
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    lib: {
      entry: 'src/index.js',
      name: 'ARJSCore', // used for UMD/IIFE only; kept for completeness
    },
    // Rolldown (vite 8). No `interop`: Rolldown does not support it, and with
    // no externals there is nothing to interoperate with.
    rolldownOptions: {
      external: [],
      output: [
        {
          format: 'es',
          entryFileNames: 'arjs-core.mjs',
          exports: 'named',
          dir: 'dist',
        },
        {
          format: 'cjs',
          entryFileNames: 'arjs-core.js',
          exports: 'named',
          dir: 'dist',
        },
      ],
    },
    emptyOutDir: true,
  },
});
