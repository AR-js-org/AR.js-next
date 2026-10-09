import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    setupFiles: ['tests/setup.js'],
    // Make tests more deterministic across platforms
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
    // Run in a single thread to avoid timer/env leakage between workers
    threads: {
      singleThread: true,
    },
    coverage: {
      // The library only. Without this the report counted package.json and the
      // example's modules that tests import, and left out files no test loads.
      include: ['src/**/*.js', 'plugins/**/*.js'],
      // lcov is what CI uploads to Codecov; html for reading locally.
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
