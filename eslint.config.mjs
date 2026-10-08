import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      // Standalone example projects: their install and build output, and
      // binary assets.
      'examples/*/node_modules/**',
      'examples/*/dist/**',
      'examples/*/public/data/**',
      '**/*.dat',
      '**/*.hiro',
      '**/*.map',
      'dist/',
      'node_modules/',
      'coverage/',
      'types/',
    ],
  },
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        ...globals.browser,
        // Node.js globals
        ...globals.node,
        ...globals.worker,
        // AR.js specific globals
        ArToolkitContext: 'writable',
        ArMarkerControls: 'writable',
        //modern API used in the project
        OffscreenCanvas: 'readonly',
        createImageBitmap: 'readonly',
        cancelVideoFrameCallback: 'readonly',
      },
    },
    rules: {
      // Relax rules for existing codebase patterns
      'no-empty': 'off',
      'no-unused-vars': 'off',
      'no-unused-private-class-members': 'off',
      'no-redeclare': 'off',
    },
  },
];
