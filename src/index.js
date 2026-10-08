// New ECS Core exports
export { Engine } from './core/engine.js';
export { ECS } from './core/ecs.js';
export { EventBus } from './core/event-bus.js';
export { PluginManager } from './core/plugin-manager.js';
export {
  COMPONENTS,
  RESOURCES,
  EVENTS,
  CAPTURE_STATES,
  SOURCE_TYPES,
  DEVICE_PROFILES,
  QUALITY_TIERS,
} from './core/components.js';

// Marker event payload types, re-exported for TypeScript consumers. JSDoc
// only: no runtime import, and tsc emits them as `export type` declarations.
/** @typedef {import('./core/components.js').MarkerType} MarkerType */
/** @typedef {import('./core/components.js').MarkerEventPayload} MarkerEventPayload */
/** @typedef {import('./core/components.js').MarkerLostPayload} MarkerLostPayload */
/** @typedef {import('./core/components.js').WorkerErrorPayload} WorkerErrorPayload */

// Systems
export { CaptureSystem } from './systems/capture-system.js';
export { FramePumpSystem } from './systems/frame-pump-system.js';

// Source plugins (exposed for examples/consumers)
export { webcamPlugin } from '../plugins/source/webcam.js';
export { videoPlugin } from '../plugins/source/video.js';
export { imagePlugin } from '../plugins/source/image.js';

// Profile plugin
export { defaultProfilePlugin } from '../plugins/profile/default-policy.js';
