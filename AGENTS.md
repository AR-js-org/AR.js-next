# AGENTS.md

Instructions for coding agents working in this repository. This is the single
source of truth; `CLAUDE.md` and `.github/copilot-instructions.md` point here.
Folders with their own rules carry a nested `AGENTS.md`: read the one closest
to the file you are changing.

## What this is

`@ar-js-org/ar.js-next` is the core of **AR.js-next**: a renderer-agnostic AR
library built on an ECS architecture with a plugin system. The core owns the
engine loop, the ECS store, the event bus and the plugin manager, plus the
capture/frame-pump systems and the built-in source and profile plugins.

Tracking and rendering live in separate packages that talk to the core only
through the event bus:

| Package                            | Role                                                   |
| ---------------------------------- | ------------------------------------------------------ |
| `@ar-js-org/arjs-plugin-artoolkit` | Marker detection; emits `ar:markerFound/Updated/Lost`  |
| `@ar-js-org/arjs-plugin-threejs`   | Renderer; one `THREE.Group` anchor per `type:markerId` |

As of 0.2.x the core is **ECS-only**: the legacy `Source`/`Profile`/`Session`
API was removed in #11. Do not reintroduce it.

## Commands

```bash
npm test              # vitest (watch); `npx vitest run` for a single pass
npm run test:coverage # vitest run --coverage
npm run build         # vite library build + tsc declarations (types/)
npm run dev:vite      # vite dev server on :5173, opens /examples/index.html
npm run format        # prettier --write .
npm run format-check  # prettier --check .   (hyphen, not colon)
npm run lint          # eslint (flat config in eslint.config.mjs)
```

Node is pinned in `.nvmrc` (v22.21.1). CI (`.github/workflows/ci.yml`) runs
`npm ci`, `format-check`, `lint`, `build:vite` and `test:coverage` on every
push and PR; keep all of them green.

`npm install` triggers `prepare`, which runs husky **and a full build**.

## Architecture

| Module                                  | Responsibility                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `src/core/engine.js`                    | `Engine`: owns ECS, event bus, plugin manager, systems; rAF loop; `getContext()` |
| `src/core/ecs.js`                       | `ECS`: entities, components, resources, `query(...)`                             |
| `src/core/event-bus.js`                 | `EventBus`: `on` (returns unsubscribe), `once`, `off`, `emit`, `clear`           |
| `src/core/plugin-manager.js`            | `PluginManager`: register/enable/disable, per-frame `update`                     |
| `src/core/components.js`                | `COMPONENTS`, `RESOURCES`, `EVENTS` and other constants                          |
| `src/systems/capture-system.js`         | Static `CaptureSystem`: capture lifecycle through resources and events           |
| `src/systems/frame-pump-system.js`      | Static `FramePumpSystem`: grabs `ImageBitmap`s from the video, emits frames      |
| `plugins/source/*`, `plugins/profile/*` | Built-in webcam/video/image sources and the default device profile               |
| `src/index.js`                          | Public entry; also re-exports everything in `plugins/`                           |

`src/core/AGENTS.md`, `plugins/AGENTS.md` and `examples/AGENTS.md` hold the
contracts and rules for those folders.

## Contracts other packages depend on

These are consumed by the plugin repositories. Changing any of them is a
cross-repo change: update the plugins (or open issues there) in the same
milestone.

- **Context** passed to `plugin.init(context)`: `{ ecs, eventBus, pluginManager, engine }`.
- **Event bus:** single payload argument; `emit` never throws (listener
  errors are caught and logged).
- **`engine:update` has two payload shapes** on the same event name. The
  engine emits `{ deltaTime, context }`; `FramePumpSystem` emits frames
  `{ id, imageBitmap, width, height }`. Detection plugins read the frame
  shape and ignore the other. Do not add a third.
- **Marker events** (emitted by tracking plugins, consumed by renderers):

  | Event              | Payload                                                          |
  | ------------------ | ---------------------------------------------------------------- |
  | `ar:markerFound`   | `{ markerId, type, matrix, confidence, vertex, dir, timestamp }` |
  | `ar:markerUpdated` | `{ markerId, type, matrix, confidence, vertex, dir, timestamp }` |
  | `ar:markerLost`    | `{ markerId, type, timestamp }`                                  |
  | `ar:workerReady`   | `{}`                                                             |
  | `ar:workerError`   | `{ message }`                                                    |

  `matrix` is a `Float32Array(16)`, column-major, ready for
  `THREE.Matrix4.fromArray()`. `type` is `"pattern"` or `"barcode"`, and a
  marker's identity is the pair `type:markerId`: pattern and barcode IDs both
  start at 0.

## Conventions

- ESM only.
- Prettier config is `.prettierrc.json`: single quotes, `printWidth` 100,
  trailing commas. husky + lint-staged format and lint staged files on commit.
- JSDoc on exported classes, functions and public methods.
- Committed docs are written in English.

## Testing

Vitest in the **node** environment (`vitest.config.mjs`, setup in
`tests/setup.js`, which polyfills rAF and `CustomEvent`). Tests live in
`tests/*.test.js` and import from `../src/...` directly. Create fresh
`EventBus`/`PluginManager` instances per test; assert payloads with
`toMatchObject`.

Core code must stay DOM-free so it runs under node. Browser-only code
(`getUserMedia`, `<video>`, `OffscreenCanvas`) lives in `plugins/` and in
`FramePumpSystem`, behind guards.

## Known drift (do not "fix" in passing; each needs its own change)

- Naming still says "core" in places: `Engine.NAME` is
  `'@ar-js-org/ar.js-core'`, the repository URL points at `AR.js-core.git`,
  the build outputs `dist/arjs-core.*`.
- `docs/ECS_ARCHITECTURE.md` and `docs/IMPLEMENTATION_SUMMARY.md` still
  describe the legacy classes removed in #11.
- `ci.yml`'s path filter lists `vitest.config.js`; the file is
  `vitest.config.mjs`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`,
`docs`, `chore`, `refactor`, `test`, `ci`, `perf`. Imperative, lower case, no
trailing period. Breaking changes take `!` and a `BREAKING CHANGE:` footer.

## Git

- Branch flow: feature branch → `dev` → `main`, through pull requests. Never
  commit directly to `main`; the `.claude` hook refuses it.
- Never pass `--author` or `-c user.name=…` to `git commit`.
- Releases follow `MAINTAINERS.md`.
