/**
 * Shared component and resource keys
 * These are used to identify different types of data in the ECS
 */

// Component Keys (entity-specific data)
export const COMPONENTS = {
  // Marker or tracking target component
  TRACKING_TARGET: 'TrackingTarget',

  // Transform component (position, rotation, scale)
  TRANSFORM: 'Transform',

  // Visibility state
  VISIBLE: 'Visible',
};

// Resource Keys (global singleton data)
export const RESOURCES = {
  // Configuration for AR processing
  PROCESSING_CONFIG: 'ProcessingConfig',

  // Current state of capture (ready, error, etc.)
  CAPTURE_STATE: 'CaptureState',

  // Reference to the frame source (video element, image, etc.)
  FRAME_SOURCE_REF: 'FrameSourceRef',

  // Device profile (desktop-normal, phone-normal, etc.)
  DEVICE_PROFILE: 'DeviceProfile',

  // Enabled plugins
  ENABLED_PLUGINS: 'EnabledPlugins',
};

// Event Types
export const EVENTS = {
  // Capture lifecycle events
  CAPTURE_INIT_START: 'capture:init:start',
  CAPTURE_INIT_SUCCESS: 'capture:init:success',
  CAPTURE_INIT_ERROR: 'capture:init:error',
  CAPTURE_READY: 'capture:ready',
  CAPTURE_DISPOSED: 'capture:disposed',

  // Source lifecycle events
  SOURCE_LOADED: 'source:loaded',
  SOURCE_ERROR: 'source:error',
  SOURCE_PLAYING: 'source:playing',
  SOURCE_PAUSED: 'source:paused',

  // Frame processing events
  FRAME_PROCESSED: 'frame:processed',

  // Engine lifecycle events
  ENGINE_START: 'engine:start',
  ENGINE_STOP: 'engine:stop',
  ENGINE_UPDATE: 'engine:update',

  // Plugin lifecycle events
  PLUGIN_REGISTERED: 'plugin:registered',
  PLUGIN_ENABLED: 'plugin:enabled',
  PLUGIN_DISABLED: 'plugin:disabled',

  // Marker tracking events (emitted by detection plugins, see AGENTS.md)
  MARKER_FOUND: 'ar:markerFound',
  MARKER_UPDATED: 'ar:markerUpdated',
  MARKER_LOST: 'ar:markerLost',
  WORKER_READY: 'ar:workerReady',
  WORKER_ERROR: 'ar:workerError',
};

// Capture States
export const CAPTURE_STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
  DISPOSED: 'disposed',
};

// Source Types
export const SOURCE_TYPES = {
  WEBCAM: 'webcam',
  VIDEO: 'video',
  IMAGE: 'image',
};

// Device Profiles (legacy presets; retained for backward compatibility)
export const DEVICE_PROFILES = {
  DESKTOP_FAST: 'desktop-fast',
  DESKTOP_NORMAL: 'desktop-normal',
  PHONE_NORMAL: 'phone-normal',
  PHONE_SLOW: 'phone-slow',
};

// New capability/quality-based tiers (preferred going forward)
export const QUALITY_TIERS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  ULTRA: 'ultra',
};

/**
 * Marker family. Pattern and barcode markers have independent ID registries
 * that both start at 0, so a marker's identity is the pair `type:markerId`.
 *
 * @typedef {'pattern' | 'barcode'} MarkerType
 */

/**
 * Payload of `ar:markerFound` and `ar:markerUpdated`.
 *
 * @typedef {Object} MarkerEventPayload
 * @property {number} markerId - Marker ID within its family
 * @property {MarkerType} type - Marker family
 * @property {Float32Array} matrix - 4x4 pose, column-major, ready for
 *   `THREE.Matrix4.fromArray()`
 * @property {number} confidence - Detection confidence, 0 to 1
 * @property {number[][]} [vertex] - The detected square's four corners,
 *   `[[x, y], …]`, in the pixel coordinates of the submitted frame
 * @property {number} [dir] - Marker rotation, 0 to 3; the printed top-left
 *   corner is `vertex[(4 - dir) % 4]`
 * @property {number} timestamp - `Date.now()` when the event was emitted
 */

/**
 * Payload of `ar:markerLost`.
 *
 * @typedef {Object} MarkerLostPayload
 * @property {number} markerId - Marker ID within its family
 * @property {MarkerType} type - Marker family
 * @property {number} timestamp - `Date.now()` when the event was emitted
 */

/**
 * Payload of `ar:workerError`.
 *
 * @typedef {Object} WorkerErrorPayload
 * @property {string} message - What went wrong in the detection worker
 */
