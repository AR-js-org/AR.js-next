# examples

- `npm run dev:vite` at the repository root serves `examples/index.html` on
  :5173. Examples that import `../../dist/arjs-core.mjs` need `npm run build`
  first.
- Camera access requires `localhost` or HTTPS.
- `data/` folders hold binary assets (`camera_para.dat`, `.patt` files) and
  are excluded from prettier and eslint. Do not reformat them.

## Plugin packages come from npm, not from copies

Examples that use arjs-plugin-artoolkit or arjs-plugin-threejs are standalone
Vite projects with their own `package.json`:

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "@ar-js-org/ar.js-next": "file:../..",
    "@ar-js-org/arjs-plugin-artoolkit": "^0.3.0"
  },
  "devDependencies": { "vite": "^7" }
}
```

- The core comes from `file:../..`, so the example always exercises the local
  code; the plugins come from the registry.
- Never vendor a built copy of a plugin into `vendor/`. That is what the
  old `vite-artoolkit/vendor/` did, and it silently drifted from the
  published API (see `docs/plans/2026-10-05-artoolkit-0.2.0-upgrade.md`).
- The ARToolKit WASM binary is resolved by the bundler:

  ```js
  import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url';
  new ArtoolkitPlugin({ wasmUrl, cameraParametersUrl });
  ```

- Register plugins through `pluginManager.register/enable`, and call
  `loadMarker`/`trackBarcode` only once frames are flowing.
- Key any per-marker state on `type:markerId`.
