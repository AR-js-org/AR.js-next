# plugins

Built-in plugins shipped with the core package: `source/webcam.js`,
`source/video.js`, `source/image.js` and `profile/default-policy.js`. They are
published (`package.json` `files`) and re-exported from `src/index.js`.

## Shape

```js
export const webcamPlugin = {
  id: 'source:webcam', // 'category:name'
  name: 'Webcam Source',
  type: 'source',
  async init(context) {},
  async dispose() {},
};
```

See `src/core/AGENTS.md` for when `init`, `dispose` and `update` are called.

## Rules

- Share state through ECS resources (`RESOURCES.FRAME_SOURCE_REF`,
  `RESOURCES.CAPTURE_STATE`, `RESOURCES.DEVICE_PROFILE`) and events from
  `EVENTS`, not through module-level globals.
- Browser APIs (`getUserMedia`, `<video>`, `document`) must be guarded so the
  smoke tests in `tests/plugins-smoke.test.js` still run under node.
- A new plugin must be exported from **both** `plugins/index.js` and
  `src/index.js`.
- Tracking and rendering plugins do not belong here; they are separate
  packages (arjs-plugin-artoolkit, arjs-plugin-threejs).
