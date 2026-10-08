// Example: AR.js-next ECS + ArtoolkitPlugin with Start/Stop/Load buttons.
// The core comes from this repository (file:../..), the plugin from npm.

import {
  Engine,
  CaptureSystem,
  FramePumpSystem,
  SOURCE_TYPES,
  webcamPlugin,
  defaultProfilePlugin,
} from '@ar-js-org/ar.js-next';
import { ArtoolkitPlugin } from '@ar-js-org/arjs-plugin-artoolkit';
import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url';

// UI
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const loadBtn = document.getElementById('loadBtn');
const viewport = document.getElementById('viewport');

function attachVideoToViewport(ctx) {
  const frameSource = CaptureSystem.getFrameSource(ctx);
  const videoEl = frameSource?.element;
  if (!videoEl) return;

  const viewport = document.getElementById('viewport');
  if (!viewport) return;

  try {
    if (videoEl.parentNode && videoEl.parentNode !== viewport) {
      videoEl.parentNode.removeChild(videoEl);
    }
  } catch {}

  try {
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('autoplay', '');
    videoEl.muted = true;
    videoEl.controls = false;
  } catch {}

  Object.assign(videoEl.style, {
    position: 'relative',
    top: '0px',
    left: '0px',
    zIndex: '1',
    width: '100%',
    height: 'auto',
    display: 'block',
  });

  viewport.innerHTML = '';
  viewport.appendChild(videoEl);
}

function log(message) {
  const ts = new Date().toISOString();
  const el = document.createElement('div');
  el.textContent = `[${ts}] ${message}`;
  logEl.appendChild(el);
  logEl.scrollTop = logEl.scrollHeight;
  console.log(message);
}

function setStatus(msg, type = 'normal') {
  statusEl.textContent = msg;
  statusEl.className = 'status';
  if (type === 'success') statusEl.classList.add('success');
  if (type === 'error') statusEl.classList.add('error');
}

// Engine/plugin state
let engine;
let ctx;
let artoolkit;
let pumping = false;
let cameraStarted = false;

async function bootstrap() {
  engine = new Engine();

  // Register core/source plugins from the bundled lib
  engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
  engine.pluginManager.register(webcamPlugin.id, webcamPlugin);

  // Set up UI listeners BEFORE enable to avoid missing early 'ready'
  engine.eventBus.on('ar:workerReady', () => {
    log('Worker ready');
    setStatus('Worker ready. You can start the webcam and load the marker.', 'success');
    loadBtn.disabled = false;
  });
  engine.eventBus.on('ar:workerError', (e) => {
    log(`workerError: ${JSON.stringify(e)}`);
    setStatus('Worker error (see console)', 'error');
  });
  engine.eventBus.on('ar:markerFound', (d) => log(`markerFound: ${JSON.stringify(d)}`));
  engine.eventBus.on('ar:markerUpdated', (d) => log(`markerUpdated: ${JSON.stringify(d)}`));
  engine.eventBus.on('ar:markerLost', (d) => log(`markerLost: ${JSON.stringify(d)}`));

  // Enable core plugins via manager
  ctx = engine.getContext();
  await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
  await engine.pluginManager.enable(webcamPlugin.id, ctx);

  // Create ARToolKit plugin and wire it to this engine context
  artoolkit = new ArtoolkitPlugin({
    wasmUrl,
    cameraParametersUrl: '/data/camera_para.dat',
    minConfidence: 0.6,
  });
  await artoolkit.init(ctx);
  await artoolkit.enable();

  // Start ECS loop (systems/plugins tick)
  engine.start();

  // Fallback: if worker became ready during enable, honor it
  if (artoolkit.workerReady) {
    log('Worker was already ready (post-enable).');
    setStatus('Worker ready. You can start the webcam and load the marker.', 'success');
    loadBtn.disabled = false;
  } else {
    setStatus('Plugin initialized. Waiting for worker…', 'normal');
  }

  // UI initial state
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

async function startWebcam() {
  if (cameraStarted) return;
  try {
    startBtn.disabled = true;
    stopBtn.disabled = true;
    setStatus('Starting webcam…', 'normal');
    log('Initializing webcam capture');

    // Initialize webcam capture
    await CaptureSystem.initialize(
      {
        sourceType: SOURCE_TYPES.WEBCAM,
        sourceWidth: 640,
        sourceHeight: 480,
      },
      ctx,
    );

    attachVideoToViewport(ctx);

    // Start frame pump (streams ImageBitmap frames into engine:update)
    if (!pumping) {
      FramePumpSystem.start(ctx);
      pumping = true;
    }

    cameraStarted = true;
    setStatus('Webcam started. You can now show the marker.', 'success');
    log('Webcam started.');
    stopBtn.disabled = false;
  } catch (err) {
    log('Camera error: ' + (err?.message || err));
    setStatus('Camera error (see console)', 'error');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function stopWebcam() {
  if (!cameraStarted) return;
  try {
    setStatus('Stopping webcam…', 'normal');
    log('Stopping frame pump and capture');

    if (pumping) {
      FramePumpSystem.stop(ctx);
      pumping = false;
    }
    await CaptureSystem.dispose(ctx);
    if (viewport) viewport.innerHTML = '';
    cameraStarted = false;

    setStatus('Webcam stopped.', 'success');
    log('Webcam stopped.');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  } catch (err) {
    log('Stop error: ' + (err?.message || err));
    setStatus('Stop error (see console)', 'error');
  }
}

async function loadMarker() {
  if (!artoolkit) return;
  try {
    loadBtn.disabled = true;
    setStatus('Loading marker…', 'normal');

    const patternUrl = '/data/patt.hiro';
    const res = await artoolkit.loadMarker(patternUrl, 1);
    log(`loadMarker result: ${JSON.stringify(res)}`);
    setStatus(`Marker loaded (id=${res.markerId}). Show the marker to the camera.`, 'success');
  } catch (err) {
    log('loadMarker failed: ' + (err?.message || err));
    setStatus('Failed to load marker', 'error');
  } finally {
    loadBtn.disabled = false;
  }
}

// Wire up UI events
startBtn.addEventListener('click', () => startWebcam());
stopBtn.addEventListener('click', () => stopWebcam());
loadBtn.addEventListener('click', () => loadMarker());

// Bootstrap on load
bootstrap().catch((e) => {
  console.error('[artoolkit] bootstrap error:', e);
  setStatus('Initialization error', 'error');
});
