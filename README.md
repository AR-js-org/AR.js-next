# AR.js-next

[![npm version](https://badge.fury.io/js/%40ar-js-org%2Far.js-next.svg)](https://badge.fury.io/js/%40ar-js-org%2Far.js-next)
[![CI](https://github.com/AR-js-org/AR.js-next/actions/workflows/ci.yml/badge.svg)](https://github.com/AR-js-org/AR.js-next/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/AR-js-org/AR.js-next.svg)](https://github.com/AR-js-org/AR.js-next/issues)
[![GitHub forks](https://img.shields.io/github/forks/AR-js-org/AR.js-next.svg)](https://github.com/AR-js-org/AR.js-next/network/members)
[![GitHub stars](https://img.shields.io/github/stars/AR-js-org/AR.js-next.svg)](https://github.com/AR-js-org/AR.js-next/stargazers)

A renderer-agnostic AR library built on a modern Entity-Component-System (ECS) architecture with a plugin system.

What changed in each release, including every breaking change, is in [CHANGELOG.md](CHANGELOG.md).

## 🚀 Installing

Install from npm (recommended):

```bash
npm install @ar-js-org/ar.js-next
```

Notes:

- GitHub installs clone the repository and execute the `prepare` script, which builds `dist/` on the fly.
- Ensure devDependencies are installed; avoid `npm install --production` when consuming from GitHub.
- Prefer the npm registry release for reproducible installations.
- The `dist/` directory is generated during installations and is not committed to the repository.

## ✨ ECS-Only Core

As of 0.2.x, AR.js-next is ECS-only. Legacy classes (Source, Profile, Session, SessionDebugUI) have been removed to focus on:

- Modular design with a clean plugin system
- Data‑oriented ECS for efficient processing
- Event‑driven architecture with pub/sub messaging
- Renderer‑agnostic foundation for AR.js‑next

Renderer integrations live in external repositories:

- [arjs-plugin-threejs](https://github.com/AR-js-org/arjs-plugin-threejs)

If you need the legacy API, use 0.1.x or migrate to the ECS architecture below.

## 🏁 Quick Start (ECS)

```js
import {
  Engine,
  CaptureSystem,
  SOURCE_TYPES,
  defaultProfilePlugin,
  webcamPlugin,
} from '@ar-js-org/ar.js-next';

const engine = new Engine();
const ctx = engine.getContext();

// Register and enable core plugins
engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
engine.pluginManager.register(webcamPlugin.id, webcamPlugin);
await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
await engine.pluginManager.enable(webcamPlugin.id, ctx);

// Initialize capture and start engine
await CaptureSystem.initialize(
  { sourceType: SOURCE_TYPES.WEBCAM, sourceWidth: 640, sourceHeight: 480 },
  ctx,
);

engine.start();
```

## 🖼️ Frame Pump + Video Viewport

Detection plugins (e.g., arjs-plugin-artoolkit) consume frames as ImageBitmap during engine:update. The webcam plugin provides a playing <video> but does not emit frames itself.

Basic flow:

```js
import { CaptureSystem, SOURCE_TYPES, FramePumpSystem } from '@ar-js-org/ar.js-next';

// 1) Start capture
await CaptureSystem.initialize({ sourceType: SOURCE_TYPES.WEBCAM }, ctx);

// 2) Show live video (optional UI)
const { element: videoEl } = CaptureSystem.getFrameSource(ctx);
document.getElementById('viewport').appendChild(videoEl);

// 3) Pump frames to detection plugins
FramePumpSystem.start(ctx);

// 4) Stop when done
FramePumpSystem.stop(ctx);
```

Why separate from the webcam plugin?

- The webcam plugin owns media capture; pumping frames and showing UI are cross‑cutting concerns shared by multiple detection plugins.

## 🔧 Core (AR.js-next) vs Plugin Responsibilities

This section clarifies where key behaviors belong.

- Axis transform (coordinate conventions)
  - Responsibility: detection plugin
  - Core defines a canonical world frame used across the ecosystem:
    - Right‑handed, Y‑up, camera looks down -Z (Three.js‑friendly)
    - 4×4 matrices are column‑major Float32Array(16), units in meters
  - Detection plugins must emit marker transforms in this canonical frame (or internally convert from their native coordinates). Renderer plugins should not fix coordinate handedness—just apply the matrix.

- Projection matrix (intrinsics)
  - Responsibility: detection plugin emits; renderer plugin listens
  - Event: ar:cameraProjectionChanged
    - payload: { projectionMatrix: Float32Array(16), width: number, height: number, near?: number, far?: number, timestamp?: number }
  - Core provides the event bus; defaultProfilePlugin may seed a fallback projection, but the detection plugin should publish accurate intrinsics when available.

- Marker events
  - Emitted by detection plugins; subscribe through the `EVENTS` constants rather than string literals. Payload types are the `MarkerEventPayload`, `MarkerLostPayload` and `WorkerErrorPayload` typedefs.
    - `EVENTS.MARKER_FOUND` (`ar:markerFound`) and `EVENTS.MARKER_UPDATED` (`ar:markerUpdated`): `{ markerId: number, type: 'pattern' | 'barcode', matrix: Float32Array(16), confidence: number, vertex?: number[][], dir?: number, timestamp: number }`
    - `EVENTS.MARKER_LOST` (`ar:markerLost`): `{ markerId: number, type: 'pattern' | 'barcode', timestamp: number }`
    - `EVENTS.WORKER_READY` (`ar:workerReady`): `{}`; `EVENTS.WORKER_ERROR` (`ar:workerError`): `{ message: string }`
  - A marker's identity is `type:markerId`: pattern and barcode IDs both start at 0. `vertex` holds the detected square's corners in the pixel coordinates of the submitted frame.

- Example UI toggles (e.g., show/hide video, axis helpers)
  - Responsibility: examples (recommended)
  - Plugins may expose options or simple debug hooks, but UI is not part of core.

- Rendering
  - Responsibility: renderer plugins (e.g., arjs-plugin-threejs)
  - Renderer plugins attach a canvas, render a scene, and consume marker/projection events.

## 📝 TypeScript Definitions

AR.js-next ships TypeScript declaration files (.d.ts). Editors will pick them up automatically.

- Importing types in TS:

```ts
import type { Engine, PluginManager, CaptureSystem } from '@ar-js-org/ar.js-next';

import type {
  COMPONENTS,
  RESOURCES,
  EVENTS,
  SOURCE_TYPES,
  CAPTURE_STATES,
  DEVICE_PROFILES,
  QUALITY_TIERS,
} from '@ar-js-org/ar.js-next';
```

- Key exported types (names may vary by file):
  - Engine, PluginManager, EventBus
  - Components/Resources registries
  - System APIs like CaptureSystem and FramePumpSystem
  - Enums/consts: SOURCE_TYPES, CAPTURE_STATES, QUALITY_TIERS, etc.

If your toolchain requires an explicit types path, ensure your resolver honors the package’s types entry. No additional configuration is typically necessary.

## ⭐ Features

- Core ECS with queries and resources
- Event Bus for decoupled communication
- Plugin system for capture, detection, and more
- Capture System for webcam, video, and image sources
- Profile policies for device capability tuning

## 📦 Distribution and Imports

AR.js-next ships ESM and CJS bundles:

- ESM (recommended): dist/arjs-core.mjs
- CJS: dist/arjs-core.js

Examples:

```js
// ESM
import { Engine, CaptureSystem, webcamPlugin } from '@ar-js-org/ar.js-next';

// CJS
const { Engine, CaptureSystem, webcamPlugin } = require('@ar-js-org/ar.js-next');

// Direct (local dev only)
import { Engine } from './node_modules/@ar-js-org/ar.js-next/dist/arjs-core.mjs';
```

## 🛠️ Development

### Building

Run a full build:

```bash
npm run build
```

This generates TypeScript declarations in `types/` and bundles in `dist/`.

The build also runs automatically when you:

- package or publish (`npm pack`, `npm publish`) via the `prepack` script
- install from GitHub (source checkout) via the `prepare` script

You do not need to commit `dist/`; it is recreated for each build or publish cycle.

## 🏃 Running Examples

You can use Vite (recommended) during development.

Vite:

```bash
npm install
npm run dev:vite
npm run build:vite
npm run serve:vite
```

- Examples index: examples/index.html
- Minimal ECS example: examples/minimal/index.html

If the camera doesn’t start, click to allow autoplay. On Safari, prefer HTTPS in dev.

## 🤝 Contributing

We welcome all contributions! Before you begin, please review our **[CONTRIBUTING.md](https://github.com/AR-js-org/AR.js-core/blob/main/CONTRIBUTING.md)** for guidelines and our **[CODE_OF_CONDUCT.md](https://github.com/AR-js-org/AR.js-core/blob/main/CODE_OF_CONDUCT.md)**. A great way to get started is by exploring open issues and pull requests.

## ❓ Troubleshooting (Common)

- Worker/assets 404 with vendor ESMs: co‑locate the ESM with its assets/ folder or import from CDN.
- No detections: start FramePumpSystem after capture; verify engine:update ticks.
- Video is not visible: attach the webcam <video> to a visible container and override offscreen styles.
- Autoplay/permissions: set video.muted = true; add playsinline; use HTTPS on mobile.

## 🚚 Migration to ECS‑Only Core

- Legacy API (Source/Profile/Session/SessionDebugUI) removed from the core.
- Core focuses on ECS + plugins; renderer integrations live externally (e.g., arjs-plugin-threejs).
- Import from the bundled library (ESM .mjs or CJS .js) as shown above.
