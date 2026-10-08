# AR.js-next + arjs-plugin-artoolkit (Vite)

Tracks the Hiro pattern and the 3x3 barcode 0 with
[`@ar-js-org/arjs-plugin-artoolkit`](https://www.npmjs.com/package/@ar-js-org/arjs-plugin-artoolkit)
installed from npm. Each marker in view is outlined over the webcam and listed with its
`type:markerId` and confidence.

This is a standalone Vite project. The core comes from this repository (`file:../..`), so the
example always runs the local code. The plugin comes from the registry.

## Run it

1. Build the core at the repository root. The example links the root's `dist/`, which a fresh
   clone does not have:

   ```bash
   npm install
   npm run build
   ```

2. Install and start the example:

   ```bash
   cd examples/vite-artoolkit
   npm install
   npm run dev
   ```

3. Open http://localhost:5174/. Camera access needs `localhost` or HTTPS.
4. Wait for "Worker ready", click **Start Webcam**, then **Load markers**. The button enables
   once the first frame has reached the plugin, which builds its detector from that frame's
   size.
5. Show the [Hiro marker](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png)
   and a 3x3 **barcode 0**, for example from the
   [artoolkit-barcode-markers-collection](https://github.com/nicolocarpignoli/artoolkit-barcode-markers-collection).
   Pattern 0 and barcode 0 are different markers, which is why the HUD shows `pattern:0` and
   `barcode:0`.

`npm run build` and `npm run preview` produce and serve a production build in `dist/`.

## How it is wired

- `src/main.js`:
  - registers `ArtoolkitPlugin` through `pluginManager.register/enable` and checks both results,
    which never throw;
  - subscribes with the core's `EVENTS.MARKER_FOUND/UPDATED/LOST` and
    `EVENTS.WORKER_READY/ERROR`.
- `src/markers.js` keeps the markers in view, keyed `type:markerId`, and scales `vertex` from
  frame pixels to the displayed video size. It is DOM-free and tested from the root suite
  (`tests/vite-artoolkit-markers.test.js`).
- The ARToolKit WASM binary is imported with Vite's `?url`:
  `import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url'`.
- `public/data/` holds `camera_para.dat` and `patt.hiro`, served at `/data/`.

## Troubleshooting

- **The page never reaches "Worker ready", and a `worker-*.js` request 404s under
  `node_modules/.vite/deps/`.** Vite pre-bundled the plugin, which moves it away from its
  worker. `vite.config.js` excludes it with `optimizeDeps.exclude`; keep that entry, and
  delete `node_modules/.vite` after changing it.
- **`Missing "./dist/artoolkit5.wasm" specifier in "@ar-js-org/artoolkit5-wasm"`.**
  `@ar-js-org/artoolkit5-wasm` 0.4.0 ships the binary but does not export it. The alias in
  `vite.config.js` maps the import to the file; keep it until the package exports
  `./dist/artoolkit5.wasm`.
- **`Failed to resolve import "@ar-js-org/ar.js-next"`, or a missing `dist/arjs-core.mjs`.**
  The core is not built. Run `npm run build` at the repository root (step 1).
- **"Initialisation error: The core build is older than this example".** `dist/` was built
  from a commit without the marker event constants, for example before switching to this
  branch: the example would otherwise wait for "Worker ready" forever. Run `npm run build` at
  the repository root again and reload. Rebuild whenever you switch branches.
- **"Load markers" stays disabled.** It needs both "Worker ready" and a running webcam.
- **Outlines sit off the markers.** `vertex` is in the pixels of the frame the plugin analysed.
  `src/markers.js` scales it to the displayed size, so check that the overlay canvas covers
  exactly the video element.
