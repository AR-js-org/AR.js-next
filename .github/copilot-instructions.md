# GitHub Copilot instructions

The canonical instructions for this repository are in [AGENTS.md](../AGENTS.md),
with folder-specific rules in `src/core/AGENTS.md`, `plugins/AGENTS.md` and
`examples/AGENTS.md`. The essentials are repeated here because Copilot does
not follow includes.

- `@ar-js-org/ar.js-next` is the ECS core of AR.js-next: `Engine`, `ECS`,
  `EventBus`, `PluginManager`, capture and frame-pump systems, built-in source
  plugins. ECS-only; the legacy `Source`/`Profile` API is gone.
- Plugins receive `{ ecs, eventBus, pluginManager, engine }` in
  `init(context)`; the manager calls `init`, `dispose` and `update` only.
  `register`/`enable` return booleans, they do not throw.
- Marker events: `ar:markerFound`/`ar:markerUpdated` carry
  `{ markerId, type, matrix, confidence, vertex, dir, timestamp }`,
  `ar:markerLost` carries `{ markerId, type, timestamp }`. Identity is
  `type:markerId`.
- Core code stays DOM-free (tests run under node).
- Examples install plugins from npm and the core via `file:../..`; never
  vendor plugin builds.
- Conventional Commits; feature branch → `dev` → `main`; never commit to
  `main`.
