/**
 * Minimal Example App
 * Demonstrates the new ECS architecture with plugins
 */

import {
  Engine,
  CaptureSystem,
  webcamPlugin,
  videoPlugin,
  imagePlugin,
  defaultProfilePlugin,
  EVENTS,
  RESOURCES,
  SOURCE_TYPES,
} from '../../dist/arjs-core.mjs';

// Create the engine
const engine = new Engine();

// Get references to UI elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const deviceProfileText = document.getElementById('device-profile');
const sourceTypeText = document.getElementById('source-type');
const fpsText = document.getElementById('fps');
const errorMessage = document.getElementById('error-message');
const btnWebcam = document.getElementById('btn-webcam');
const btnStop = document.getElementById('btn-stop');

// FPS tracking
let frameCount = 0;
let lastFpsUpdate = performance.now();

// Register plugins
engine.pluginManager.register(webcamPlugin.id, webcamPlugin);
engine.pluginManager.register(videoPlugin.id, videoPlugin);
engine.pluginManager.register(imagePlugin.id, imagePlugin);
engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);

// Enable profile plugin immediately
await engine.pluginManager.enable(defaultProfilePlugin.id, engine.getContext());

// Display device profile
const profile = engine.ecs.getResource(RESOURCES.DEVICE_PROFILE);
if (profile) {
  deviceProfileText.textContent = profile.label;
}

// Set up event listeners
engine.eventBus.on(EVENTS.CAPTURE_INIT_START, () => {
  updateStatus('loading', 'Initializing capture...');
  errorMessage.textContent = '';
});

engine.eventBus.on(EVENTS.CAPTURE_READY, ({ frameSource }) => {
  updateStatus('ready', 'Capture ready');
  sourceTypeText.textContent = frameSource.type;
  btnWebcam.disabled = true;
  btnStop.disabled = false;
});

engine.eventBus.on(EVENTS.CAPTURE_INIT_ERROR, ({ error }) => {
  updateStatus('error', 'Capture failed');
  errorMessage.textContent = `Error: ${error.message || 'Unknown error'}`;
  btnWebcam.disabled = false;
  btnStop.disabled = true;
});

engine.eventBus.on(EVENTS.CAPTURE_DISPOSED, () => {
  updateStatus('loading', 'Capture stopped');
  sourceTypeText.textContent = 'N/A';
  btnWebcam.disabled = false;
  btnStop.disabled = true;
});

// Add a simple system to count FPS
engine.addSystem((deltaTime, context) => {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    fpsText.textContent = frameCount.toString();
    frameCount = 0;
    lastFpsUpdate = now;
  }
});

// Button event handlers
btnWebcam.addEventListener('click', async () => {
  try {
    const profile = engine.ecs.getResource(RESOURCES.DEVICE_PROFILE);
    await CaptureSystem.initialize(
      {
        sourceType: SOURCE_TYPES.WEBCAM,
        sourceWidth: profile?.sourceWidth || 640,
        sourceHeight: profile?.sourceHeight || 480,
        displayWidth: 640,
        displayHeight: 480,
      },
      engine.getContext(),
    );

    // Start the engine
    engine.start();
  } catch (error) {
    console.error('Failed to start webcam:', error);
  }
});

btnStop.addEventListener('click', async () => {
  try {
    // Stop the engine
    engine.stop();

    // Dispose capture system
    await CaptureSystem.dispose(engine.getContext());
  } catch (error) {
    console.error('Failed to stop:', error);
  }
});

// Helper function to update status indicator
function updateStatus(state, text) {
  statusIndicator.className = `status ${state}`;
  statusText.textContent = text;
}

// Initial state
btnStop.disabled = true;
updateStatus('loading', 'Ready to start');

console.log('AR.js-next initialized with ECS architecture');
console.log('Registered plugins:', engine.pluginManager.getRegisteredPlugins());
console.log('Device profile:', profile);
