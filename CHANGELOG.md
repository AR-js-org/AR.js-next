# Changelog

All notable changes to `@ar-js-org/ar.js-next` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/). Before 1.0, a minor version may break the
API; every breaking change is marked **Breaking** and says what consumers must change.

## [Unreleased]

## [0.2.1] - 2026-10-09

No breaking changes.

### Added

- `EVENTS.MARKER_FOUND`, `EVENTS.MARKER_UPDATED`, `EVENTS.MARKER_LOST`, `EVENTS.WORKER_READY`
  and `EVENTS.WORKER_ERROR`: the names of the events detection plugins emit (`ar:markerFound`,
  …), so consumers stop repeating string literals (#21).
- `MarkerType`, `MarkerEventPayload`, `MarkerLostPayload` and `WorkerErrorPayload` types for
  those payloads, exported from the package entry (#21).
- `timestamp` on the frames `FramePumpSystem` emits on `engine:update`: `Date.now()` at emit,
  the clock marker events use (#21).

### Changed

- `examples/vite-artoolkit` is a standalone Vite project. It installs
  `@ar-js-org/arjs-plugin-artoolkit` 0.3.0 from npm instead of a vendored 0.1.x build, and
  tracks the Hiro pattern and barcode 0 with an outline HUD (#22).

### Fixed

- TypeScript found no declarations for the package under `moduleResolution` `"bundler"` or
  `"node16"`, because `exports` had no `types` condition, and typed it as `any` (#21).
- The README's marker event payloads described the 0.1.x shape; they now match the contract
  (`markerId`, `type`, `matrix`, `confidence`, `vertex`, `dir`, `timestamp`) (#21).
- `FramePumpSystem` no longer emits a frame after `stop()`: a frame whose `ImageBitmap` was
  still being created when the pump stopped is dropped and its bitmap closed (#24).
- `imagePlugin` and `videoPlugin` load errors name the URL that failed, instead of always
  reading `Failed to load image: Unknown error`. The video error also gives the browser's
  `MediaError` message when there is one (#34).
- The package's `repository`, `homepage` and `bugs` links point at AR.js-next. `repository`
  still named the old AR.js-core repository, so npm linked there (#36).

### Development

- Agent instructions (`AGENTS.md`), Claude Code hooks that refuse commits and pushes to `main`
  and format edited files, a maintainers guide and a release issue template (#19).
- CI type-checks the public declarations as a consumer imports them, and builds the
  `vite-artoolkit` example (#21, #22).
- Node 24 LTS (`.nvmrc` v24.21.0) for development and CI. Dev dependencies are updated, eslint
  to 10 since 9 is no longer supported, and `npm audit` reports no vulnerabilities, down from 21
  (#26).
- vite 8 (Rolldown) and vitest 5. The published files export the same names, and the
  declarations are unchanged (#29).
- TypeScript 6 builds the declarations. They are unchanged, except that `Engine.VERSION` and
  `Engine.REVISION` are typed `string` instead of `any` (#31).

## [0.2.0] - 2026-01-09

First release as `@ar-js-org/ar.js-next`.

### Added

- ECS core: `Engine`, `ECS`, `EventBus` and `PluginManager`, with `CaptureSystem` and
  `FramePumpSystem`, which streams `ImageBitmap` frames on `engine:update`.
- Source plugins (`webcamPlugin`, `videoPlugin`, `imagePlugin`) and `defaultProfilePlugin`.
- ESM and CommonJS builds with TypeScript declarations.

### Removed

- **Breaking:** the legacy `Source`/`Profile`/`Session` API. Build on the ECS `Engine` and
  plugins instead.

[Unreleased]: https://github.com/AR-js-org/AR.js-next/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/AR-js-org/AR.js-next/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/AR-js-org/AR.js-next/releases/tag/v0.2.0
