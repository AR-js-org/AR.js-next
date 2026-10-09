# Phase B: marker event constants and an npm-based Vite example — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the core named constants and a typedef for the marker events the plugins emit. Also stamp frames with a timestamp. Then replace the example's vendored 0.1.x plugin build with a standalone Vite project that installs `@ar-js-org/arjs-plugin-artoolkit@^0.3.0` from npm.

**Architecture:** The work lands as two PRs into `dev`. **PR 1** (`feat/marker-event-constants`, Tasks 1–2) touches only `src/` and its docs. **PR 2** (`feat/npm-vite-example`, Tasks 3–6) is created from `dev` after PR 1 merges, because its `main.js` imports the new `EVENTS` constants from the core through `file:../..`. The example's per-marker display logic sits in a DOM-free module so the root vitest suite can test it.

**Tech Stack:** plain ESM JavaScript, Vite 7, vitest 4 (node environment), `@ar-js-org/arjs-plugin-artoolkit` 0.3.0, `@ar-js-org/artoolkit5-wasm` 0.4.0.

**Spec:** `docs/plans/2026-10-05-artoolkit-0.2.0-upgrade.md`, "Phase B" and its "Decisions". The folder rules in `examples/AGENTS.md` already describe the target layout.

## Global Constraints

- Node from `.nvmrc` (v22.21.1).
- Prettier settings: single quotes, `printWidth` 100, trailing commas.
- `npm run format-check`, `npm run lint`, `npm run build:vite` and `npx vitest run` must pass. CI runs all four.
- Event names, verbatim: `ar:markerFound`, `ar:markerUpdated`, `ar:markerLost`, `ar:workerReady`, `ar:workerError`.
- Marker payload, verbatim from root `AGENTS.md`:
  - found/updated: `{ markerId, type, matrix, confidence, vertex, dir, timestamp }`;
  - lost: `{ markerId, type, timestamp }`;
  - `type` is `"pattern"` or `"barcode"`; identity is `type:markerId`.
- The example takes the core from `"@ar-js-org/ar.js-next": "file:../.."` and the plugin from npm as `"@ar-js-org/arjs-plugin-artoolkit": "^0.3.0"`. It must not use a `vendor/` folder.
- WASM is imported as `import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url'`.
- Plugins are registered through `pluginManager.register/enable`. `loadMarker`/`trackBarcode` are called only once frames flow.
- `engine:update` keeps exactly two payload shapes (root `AGENTS.md`). This plan adds a field to the frame shape and does not add a third shape.
- Commits use Conventional Commits. Never pass `--author`.

## Review Focus

1. **Vite's dev pre-bundling moves the plugin's module.** The plugin builds its worker URL as `"" + new URL("assets/worker-<hash>.js", import.meta.url)`, so pre-bundling makes that worker 404. Expected behaviour: `npm run dev` reaches "Worker ready". Pinned by Task 3, Step 6, with `optimizeDeps.exclude`.
2. **`vite build` may not copy the plugin's worker asset.** The `"" +` prefix hides the URL from Vite's asset analysis. Expected behaviour: `dist/` contains `worker-*.js` and `vite preview` reaches "Worker ready". Pinned by Task 3, Step 7. If it fails, stop and open an issue on arjs-plugin-artoolkit; do not work around it in the example.
3. **`file:../..` points at an unbuilt core.** `dist/arjs-core.mjs` is missing on a fresh clone. Expected behaviour: the README says to build the root first, and CI builds the root before the example (Task 6).
4. **The video is displayed at a size other than the frame's.** Expected behaviour: outlines line up with the marker, because `vertex` is in frame pixels. Pinned by the `scaleVertex` test in Task 4.
5. **Pattern 0 and barcode 0 are in view together.** Expected behaviour: two separate HUD entries. Pinned by the `markerKey` and `applyMarkerEvent` tests in Task 4.

---

## PR 1 — `feat/marker-event-constants`

### Task 1: Marker event constants and payload typedefs

**Files:**

- Modify: `src/core/components.js` (the `EVENTS` object, plus new typedefs at the end)
- Modify: `README.md` (the "Marker events" bullets near lines 115–119)
- Modify: `AGENTS.md` (the marker events table: name the constants)
- Test: `tests/components.test.js` (new)

**Interfaces:**

- Produces:
  - `EVENTS.MARKER_FOUND === 'ar:markerFound'`
  - `EVENTS.MARKER_UPDATED === 'ar:markerUpdated'`
  - `EVENTS.MARKER_LOST === 'ar:markerLost'`
  - `EVENTS.WORKER_READY === 'ar:workerReady'`
  - `EVENTS.WORKER_ERROR === 'ar:workerError'`
  - JSDoc typedefs `MarkerType`, `MarkerEventPayload`, `MarkerLostPayload`, `WorkerErrorPayload`, emitted by `tsc` into `types/src/core/components.d.ts`.

- [ ] **Step 1: Write the failing test** `tests/components.test.js`

```js
import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/core/components.js';
import * as pub from '../src/index.js';

describe('marker event constants', () => {
  it('match the names the tracking plugins emit', () => {
    expect(EVENTS).toMatchObject({
      MARKER_FOUND: 'ar:markerFound',
      MARKER_UPDATED: 'ar:markerUpdated',
      MARKER_LOST: 'ar:markerLost',
      WORKER_READY: 'ar:workerReady',
      WORKER_ERROR: 'ar:workerError',
    });
  });

  it('are exported from the public entry', () => {
    expect(pub.EVENTS.MARKER_FOUND).toBe('ar:markerFound');
  });
});
```

- [ ] **Step 2: Run it and check it fails.** Command: `npx vitest run tests/components.test.js`. Expected: FAIL, because `MARKER_FOUND` is undefined.

- [ ] **Step 3: Add the five keys to `EVENTS`.** Put them under a `// Marker tracking events (emitted by detection plugins, see AGENTS.md)` comment.

- [ ] **Step 4: Add the JSDoc typedefs at the end of `components.js`.**
  - `MarkerType`: `'pattern' | 'barcode'`.
  - `MarkerEventPayload`: `markerId: number`, `type: MarkerType`, `matrix: Float32Array` (16, column-major), `confidence: number`, `vertex?: number[][]` (four `[x, y]` corners in frame pixels), `dir?: number` (0 to 3), `timestamp: number`.
  - `MarkerLostPayload`: `markerId`, `type`, `timestamp`.
  - `WorkerErrorPayload`: `{ message: string }`.
  - Each field carries the one-line meaning from root `AGENTS.md`.

- [ ] **Step 5: Run the tests and check the types build.**
  - Command: `npx vitest run`. Expected: all pass.
  - Command: `npx tsc && grep -E "export type (MarkerType|MarkerEventPayload|MarkerLostPayload|WorkerErrorPayload)" types/src/core/components.d.ts`. Expected: four lines.

- [ ] **Step 6: Fix the README event bullets.**
  - Replace the three bullets with the payloads from Global Constraints (adding `type`, `confidence`, `vertex`, `dir`) and name the `EVENTS.*` constants.
  - Add `ar:workerReady` / `ar:workerError`.
  - Drop "string|number": `markerId` is a number.
  - In root `AGENTS.md`, name the constants beside the event table.

- [ ] **Step 7: Run format and lint, then commit.**

```bash
npm run format && npm run lint && npx vitest run
git add src/core/components.js tests/components.test.js README.md AGENTS.md
git commit -m "feat: add marker event constants and payload typedefs"
```

### Task 2: Timestamp on frame-pump frames

**Files:**

- Modify: `src/systems/frame-pump-system.js` (all three `bus.emit('engine:update', …)` sites in `emitFrame`)
- Modify: `AGENTS.md` (the `engine:update` contract), `src/core/AGENTS.md` (the "Engine" bullet on frames)
- Test: `tests/frame-pump.test.js` (new)

**Interfaces:**

- Produces: frame payload `{ id, imageBitmap, width, height, timestamp }`, where `timestamp` is `Date.now()` at emit time, on the same clock as the plugins' marker `timestamp`.

- [ ] **Step 1: Write the failing test** `tests/frame-pump.test.js`

```js
import { describe, it, expect, vi } from 'vitest';
import { FramePumpSystem } from '../src/systems/frame-pump-system.js';
import { EventBus } from '../src/core/event-bus.js';
import { RESOURCES } from '../src/core/components.js';

function fakeContext(video) {
  const resources = new Map([[RESOURCES.FRAME_SOURCE_REF, { element: video }]]);
  return { eventBus: new EventBus(), ecs: { getResource: (k) => resources.get(k) } };
}

describe('FramePumpSystem frames', () => {
  it('carry a timestamp on the Date.now() clock', async () => {
    let step;
    const video = {
      tagName: 'VIDEO',
      videoWidth: 640,
      videoHeight: 480,
      requestVideoFrameCallback: (cb) => ((step = cb), 1),
      cancelVideoFrameCallback: () => {},
    };
    vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const ctx = fakeContext(video);
    const frames = [];
    ctx.eventBus.on('engine:update', (f) => frames.push(f));

    FramePumpSystem.start(ctx);
    await step();
    FramePumpSystem.stop(ctx);
    vi.unstubAllGlobals();

    expect(frames[0]).toMatchObject({ id: 1, width: 640, height: 480, timestamp: 1234 });
  });
});
```

- [ ] **Step 2: Run it and check it fails.** Command: `npx vitest run tests/frame-pump.test.js`. Expected: FAIL, because `timestamp` is missing.

- [ ] **Step 3: Add `timestamp: Date.now()` to the frame payload.** Route the three emit sites through one local `emitFrameEvent(payload)` helper that adds the field, so a future emit site cannot forget it.

- [ ] **Step 4: Run the tests and check they pass.** Command: `npx vitest run`. Expected: all pass.

- [ ] **Step 5: Update the docs.** In root `AGENTS.md` and `src/core/AGENTS.md`, the frame shape becomes `{ id, imageBitmap, width, height, timestamp }`, with `timestamp` described as "`Date.now()` at emit, the clock the marker events use".

- [ ] **Step 6: Commit and open PR 1.** Include this plan file in the commit.

```bash
npm run format && npm run lint && npx vitest run
git add src/systems/frame-pump-system.js tests/frame-pump.test.js AGENTS.md src/core/AGENTS.md docs/superpowers/plans/2026-10-08-phase-b-npm-vite-example.md
git commit -m "feat: timestamp the frames the frame pump emits"
```

PR into `dev`, titled `feat: marker event constants, payload typedefs and frame timestamps`, milestone `v0.2.1`.

---

## PR 2 — `feat/npm-vite-example` (create from `dev` once PR 1 is merged)

### Task 3: Standalone Vite project, vendor removed

**Files:**

- Create: `examples/vite-artoolkit/package.json`, `examples/vite-artoolkit/package-lock.json` (generated), `examples/vite-artoolkit/vite.config.js`
- Move: `examples/vite-artoolkit/data/*` → `examples/vite-artoolkit/public/data/` (`git mv`)
- Move: `examples/vite-artoolkit/main.js` → `examples/vite-artoolkit/src/main.js` (`git mv`; Task 4 rewrites its content)
- Delete: `examples/vite-artoolkit/vendor/`
- Modify: `examples/vite-artoolkit/index.html` (script `src="/src/main.js"`, title without "(CDN)")
- Modify: `.gitignore` (add `examples/*/node_modules` and `examples/*/dist`)
- Modify: `.prettierignore` and `eslint.config.mjs`. Replace the `vendor/**` and `data/**` entries with `examples/*/public/data/**` and `examples/*/dist/**`.

**Interfaces:**

- Produces:
  - `npm run dev`, `npm run build` and `npm run preview` in `examples/vite-artoolkit`;
  - assets served at `/data/camera_para.dat` and `/data/patt.hiro`.

- [ ] **Step 1: Write `package.json`.**
  - `"private": true`, `"type": "module"`.
  - Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`.
  - Dependencies:
    - `"@ar-js-org/ar.js-next": "file:../.."`
    - `"@ar-js-org/arjs-plugin-artoolkit": "^0.3.0"`
    - `"@ar-js-org/artoolkit5-wasm": "^0.4.0"` (direct, because the example imports from it)
  - devDependencies: `"vite": "^7.3.0"`.

- [ ] **Step 2: Write `vite.config.js`.**
  - `optimizeDeps: { exclude: ['@ar-js-org/arjs-plugin-artoolkit'] }`. Add a comment on why (Review Focus 1).
  - `server: { port: 5174 }`, so it does not clash with the root's 5173.

- [ ] **Step 3: Move the files and delete `vendor/`.** Update the ignore files and `.gitignore` as listed.

- [ ] **Step 4: Build the root and install the example.** Command: `npm run build && npm --prefix examples/vite-artoolkit install`. Expected: `examples/vite-artoolkit/node_modules/@ar-js-org/ar.js-next` is a link to the root, and `package-lock.json` is created.

- [ ] **Step 5: Check the core resolves from `dist`.** This exercises #12. Command: `node --input-type=module -e "import('@ar-js-org/ar.js-next').then(m => console.log(typeof m.Engine))"`, run from `examples/vite-artoolkit`. Expected: `function`.

- [ ] **Step 6: Check `npm run dev` in a browser** (built-in browser pane, no camera needed). Open `http://localhost:5174/`. Expected: the status reaches "Worker ready", and no request for `worker-*.js` returns 404.

- [ ] **Step 7: Check the build and the preview.**
  - Command: `npm --prefix examples/vite-artoolkit run build && ls examples/vite-artoolkit/dist/assets`. Expected: a `worker-*.js` and an `artoolkit5-*.wasm`.
  - Command: `npm --prefix examples/vite-artoolkit run preview`. Expected: "Worker ready" on the preview URL.
  - If the worker asset is missing, stop and report (Review Focus 2).

- [ ] **Step 8: Commit.**

```bash
git add -A examples/vite-artoolkit .gitignore .prettierignore eslint.config.mjs
git commit -m "feat(examples): make vite-artoolkit a standalone npm-based Vite project"
```

### Task 4: Example app on plugin 0.3.0, with a marker HUD

**Files:**

- Create: `examples/vite-artoolkit/src/markers.js` (DOM-free marker state and geometry)
- Modify: `examples/vite-artoolkit/src/main.js` (rewrite), `examples/vite-artoolkit/index.html` (overlay canvas over `#viewport`, HUD list, one "Load markers" button)
- Test: `tests/vite-artoolkit-markers.test.js` (new; the root vitest config already includes `tests/**/*.test.js`)

**Interfaces:**

- Consumes: `EVENTS.MARKER_FOUND/UPDATED/LOST`, `EVENTS.WORKER_READY/ERROR`, and the `timestamp` on frames (from Tasks 1–2).
- Produces, in `markers.js`:
  - `markerKey({ type, markerId }) → string`, returning `` `${type}:${markerId}` ``.
  - `scaleVertex(vertex, frame, display) → number[][]`, where `frame` and `display` are `{ width, height }`.
  - `applyMarkerEvent(state, eventName, payload) → Map`. `state` is a `Map` keyed by `markerKey`. Found and updated set `{ type, markerId, confidence, vertex, dir }`; lost deletes the entry. The function returns `state`.

- [ ] **Step 1: Write the failing tests** `tests/vite-artoolkit-markers.test.js`

```js
import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/core/components.js';
import {
  markerKey,
  scaleVertex,
  applyMarkerEvent,
} from '../examples/vite-artoolkit/src/markers.js';

describe('vite-artoolkit marker helpers', () => {
  it('keys pattern 0 and barcode 0 apart', () => {
    expect(markerKey({ type: 'pattern', markerId: 0 })).toBe('pattern:0');
    expect(markerKey({ type: 'barcode', markerId: 0 })).toBe('barcode:0');
  });

  it('scales frame-pixel corners to the displayed size', () => {
    const v = [
      [0, 0],
      [640, 0],
      [640, 480],
      [0, 480],
    ];
    expect(scaleVertex(v, { width: 640, height: 480 }, { width: 320, height: 240 })).toEqual([
      [0, 0],
      [320, 0],
      [320, 240],
      [0, 240],
    ]);
  });

  it('tracks found/updated and drops lost, per type:markerId', () => {
    const s = new Map();
    applyMarkerEvent(s, EVENTS.MARKER_FOUND, { type: 'pattern', markerId: 0, confidence: 0.9 });
    applyMarkerEvent(s, EVENTS.MARKER_FOUND, { type: 'barcode', markerId: 0, confidence: 0.8 });
    applyMarkerEvent(s, EVENTS.MARKER_LOST, { type: 'pattern', markerId: 0 });
    expect([...s.keys()]).toEqual(['barcode:0']);
  });
});
```

- [ ] **Step 2: Run it and check it fails.** Command: `npx vitest run tests/vite-artoolkit-markers.test.js`. Expected: FAIL, because the module is not found.

- [ ] **Step 3: Implement `markers.js`** with the three exports from the Interfaces block. Keep it DOM-free.

- [ ] **Step 4: Run it and check it passes.** Command: `npx vitest run tests/vite-artoolkit-markers.test.js`. Expected: PASS.

- [ ] **Step 5: Rewrite `main.js`.**
  - **Imports:** `Engine`, `CaptureSystem`, `FramePumpSystem`, `SOURCE_TYPES`, `EVENTS`, `webcamPlugin` and `defaultProfilePlugin` from `'@ar-js-org/ar.js-next'`; `ArtoolkitPlugin` from `'@ar-js-org/arjs-plugin-artoolkit'`; `wasmUrl` as in Global Constraints.
  - **Plugin options:** `new ArtoolkitPlugin({ wasmUrl, cameraParametersUrl: '/data/camera_para.dat', detectionMode: 'color_and_matrix', matrixCodeType: '3x3' })`.
  - **Startup:** `pluginManager.register('artoolkit', plugin)`, then `await pluginManager.enable('artoolkit', ctx)`. Check both booleans, because they do not throw. Then `await plugin.enable()`.
  - **"Load markers" button:** enabled only after `EVENTS.WORKER_READY` **and** the first frame `engine:update` that carries an `imageBitmap`. It calls `loadMarker('/data/patt.hiro', 1)` and `trackBarcode(0, 1)`, and logs both results.
  - **HUD:** subscribe with the `EVENTS.*` constants and feed every event to `applyMarkerEvent`. On each change, redraw the overlay canvas, sized to the displayed video. Per marker, draw the `scaleVertex` outline, with the frame size from the latest frame's `width`/`height`. Draw a `type:markerId confidence` label, and list the same entries in the HUD.
  - **Remove** the `ar:getMarker` listener and all vendor-import code.

- [ ] **Step 6: Check in the browser.**
  - `npm --prefix examples/vite-artoolkit run dev`, then open the page. Expected: "Worker ready". After starting the webcam the button enables, and the two load results appear in the log. Camera checks (Hiro and barcode 0 both outlined, lost after leaving the view) are left to the user, who has the printed markers.
  - `npx vitest run`, `npm run lint`, `npm run format-check`. Expected: all pass.

- [ ] **Step 7: Commit.**

```bash
git add examples/vite-artoolkit tests/vite-artoolkit-markers.test.js
git commit -m "feat(examples): track Hiro and barcode 0 on plugin 0.3.0 with a marker HUD"
```

### Task 5: Example docs

**Files:**

- Modify: `examples/vite-artoolkit/README.md` (rewrite)
- Modify: `examples/index.html` (the `vite-artoolkit` entry)

- [ ] **Step 1: Rewrite the example README.**
  - Prerequisites: run `npm install && npm run build` at the root first (Review Focus 3).
  - Then `cd examples/vite-artoolkit && npm install && npm run dev`.
  - What the page does; the printable Hiro and 3x3 barcode 0 (link the collection the plugin's `simple-marker` example uses).
  - A troubleshooting section with the three failure modes from the Review Focus.
  - Delete the vendor and CDN sections.

- [ ] **Step 2: Rewrite the entry in `examples/index.html`.** Make it say the example is standalone and runs with its own dev server. Keep the link for when it is served that way, and note the commands, since the root server cannot apply its `optimizeDeps` setting.

- [ ] **Step 3: Format, check and commit.**

```bash
npm run format && npm run format-check
git add examples/vite-artoolkit/README.md examples/index.html
git commit -m "docs(examples): document the npm-based vite-artoolkit example"
```

### Task 6: CI builds the example

**Files:**

- Modify: `.github/workflows/ci.yml` (a step after "Build (Vite)")

- [ ] **Step 1: Add the step.** Name: "Build vite-artoolkit example". Commands: `npm --prefix examples/vite-artoolkit ci` and `npm --prefix examples/vite-artoolkit run build`. It must run after `npm run build:vite`, because the example links `dist/`. Leave the path-filter drift alone (root `AGENTS.md` "Known drift").

- [ ] **Step 2: Push and check CI.** Push the branch. Expected: the new step passes on the PR.

- [ ] **Step 3: Commit and open PR 2.**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build the vite-artoolkit example"
```

PR into `dev`, titled `feat(examples): npm-based vite-artoolkit example on plugin 0.3.0`, milestone `v0.2.1`. Its body states:

- what Task 3, Step 5 found about #12;
- that the vendored artoolkit5-js build is gone, so the AR.js-next part of #18 is done.

**Out of scope here:** the same update for `AR.js-next-examples/vite-example`, step 7 of the spec's Phase B. That is a separate repository, and it gets its own plan once PR 2 has settled the layout.
