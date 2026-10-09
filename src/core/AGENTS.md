# src/core

The engine, ECS, event bus and plugin manager. Everything here is DOM-free and
is tested under node; keep it that way.

## Plugin contract (what `PluginManager` calls)

A plugin is a plain object or class instance with any of:

| Method                   | Called by                       | Notes                           |
| ------------------------ | ------------------------------- | ------------------------------- |
| `init(context)`          | `pluginManager.enable(id, ctx)` | May be async; awaited           |
| `dispose()`              | `pluginManager.disable(id)`     | No arguments; awaited           |
| `update(deltaTime, ctx)` | `pluginManager.update(...)`     | Per frame, enabled plugins only |

There are no `enable()`/`disable()` hooks on the plugin side. External plugins
that expose their own `enable()` (arjs-plugin-artoolkit, arjs-plugin-threejs)
are called by the application, not by the manager.

`register` and `enable` **return booleans and do not throw**: a duplicate id,
a non-object plugin or a throwing `init` yields `false` (and a log). Callers
must check the result. Errors in `update` are caught per plugin.

Events: `plugin:registered` `{ pluginId, plugin }`, `plugin:enabled`,
`plugin:disabled`. `unregister` disables first and emits nothing of its own.

## Event bus

- `on(type, cb)` returns an unsubscribe function.
- `emit(type, data)` passes **one** payload, iterates a copy of the
  listeners, and catches and logs listener errors: it never throws.

## Adding an event

1. Add the name to `EVENTS` in `components.js`; do not scatter string
   literals.
2. Document its payload in the root `AGENTS.md` (and `README.md` if public).
3. If a plugin repository emits or consumes it, change both sides in the
   same milestone.

## Engine

- `getContext()` returns `{ ecs, eventBus, pluginManager, engine }`; plugins
  receive exactly this object.
- `update()` emits `engine:update` with `{ deltaTime, context }`. Frames on
  the same event name come from `FramePumpSystem` with a different shape,
  `{ id, imageBitmap, width, height, timestamp }` (`timestamp` is `Date.now()`
  at emit, the clock the marker events use); see the root `AGENTS.md`.
- `Engine.VERSION` is read from `package.json` through a JSON import.
