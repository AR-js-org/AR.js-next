// Example: AR.js-next ECS + ArtoolkitPlugin. Tracks the Hiro pattern and the
// 3x3 barcode 0, outlines them over the video and lists them in a HUD.
// The core comes from this repository (file:../..), the plugin from npm.

import {
  Engine,
  CaptureSystem,
  FramePumpSystem,
  SOURCE_TYPES,
  EVENTS,
  webcamPlugin,
  defaultProfilePlugin,
} from '@ar-js-org/ar.js-next';
import { ArtoolkitPlugin } from '@ar-js-org/arjs-plugin-artoolkit';
import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url';
import { markerKey, scaleVertex, upsertMarker, removeMarker } from './markers.js';
import { missingCoreEvents } from './core-check.js';

const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const loadBtn = document.getElementById('loadBtn');
const viewport = document.getElementById('viewport');
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');

function log(message) {
  const el = document.createElement('div');
  el.textContent = `[${new Date().toISOString()}] ${message}`;
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

let engine;
let ctx;
let artoolkit;
let cameraStarted = false;
let workerReady = false;
let framesFlowing = false;
let markersLoaded = false;

/** Markers in view, keyed `type:markerId`. */
const markers = new Map();
/** Size of the frames the plugin analyses; `vertex` is in these pixels. */
let frameSize = { width: 640, height: 480 };

// "Load markers" needs the worker and at least one frame: the plugin creates
// its detector from the first frame's dimensions.
function updateLoadButton() {
  loadBtn.disabled = !(workerReady && framesFlowing) || markersLoaded;
}

function videoElement() {
  return CaptureSystem.getFrameSource(ctx)?.element;
}

function attachVideoToViewport() {
  const videoEl = videoElement();
  if (!videoEl) return;
  videoEl.remove();
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('autoplay', '');
  videoEl.muted = true;
  videoEl.controls = false;
  Object.assign(videoEl.style, {
    position: 'relative',
    top: '0px',
    left: '0px',
    zIndex: '1',
    width: '100%',
    height: 'auto',
    display: 'block',
  });
  viewport.insertBefore(videoEl, overlay);
}

// Redraw outlines and the HUD list from `markers`.
function render() {
  const videoEl = videoElement();
  const display = {
    width: videoEl?.clientWidth || viewport.clientWidth,
    height: videoEl?.clientHeight || viewport.clientHeight,
  };
  if (overlay.width !== display.width) overlay.width = display.width;
  if (overlay.height !== display.height) overlay.height = display.height;

  const g = overlay.getContext('2d');
  g.clearRect(0, 0, overlay.width, overlay.height);
  g.lineWidth = 3;
  g.font = '14px monospace';
  for (const m of markers.values()) {
    if (!m.vertex) continue;
    const corners = scaleVertex(m.vertex, frameSize, display);
    g.strokeStyle = m.type === 'barcode' ? '#ffb000' : '#9ef01a';
    g.beginPath();
    corners.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.stroke();
    const [lx, ly] = corners[0];
    g.fillStyle = g.strokeStyle;
    g.fillText(`${markerKey(m)} ${m.confidence?.toFixed(2) ?? ''}`, lx + 4, ly - 6);
  }

  hud.replaceChildren(
    ...[...markers.values()].map((m) => {
      const li = document.createElement('li');
      li.textContent = `${markerKey(m)}  confidence ${m.confidence?.toFixed(2) ?? '?'}`;
      return li;
    }),
  );
}

async function bootstrap() {
  // A core built before the marker event constants existed would leave them
  // undefined, and the page would wait for "Worker ready" forever.
  const missing = missingCoreEvents(EVENTS);
  if (missing.length) {
    throw new Error(
      `The core build is older than this example (EVENTS lacks ${missing.join(', ')}). ` +
        'Run `npm run build` at the repository root, then reload.',
    );
  }

  engine = new Engine();
  ctx = engine.getContext();

  engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
  engine.pluginManager.register(webcamPlugin.id, webcamPlugin);

  // Listeners first, so an early ready is not missed.
  engine.eventBus.on(EVENTS.WORKER_READY, () => {
    workerReady = true;
    log('Worker ready');
    setStatus('Worker ready. Start the webcam, then load the markers.', 'success');
    updateLoadButton();
  });
  engine.eventBus.on(EVENTS.WORKER_ERROR, (e) => {
    log(`workerError: ${e.message}`);
    setStatus('Worker error (see the log)', 'error');
  });
  engine.eventBus.on(EVENTS.MARKER_FOUND, (e) => {
    log(`found ${markerKey(e)} confidence ${e.confidence.toFixed(2)}`);
    upsertMarker(markers, e);
    render();
  });
  engine.eventBus.on(EVENTS.MARKER_UPDATED, (e) => {
    upsertMarker(markers, e);
    render();
  });
  engine.eventBus.on(EVENTS.MARKER_LOST, (e) => {
    log(`lost ${markerKey(e)}`);
    removeMarker(markers, e);
    render();
  });
  // Frames carry the size `vertex` is measured in.
  engine.eventBus.on(EVENTS.ENGINE_UPDATE, (frame) => {
    // A frame produced while the webcam was stopping must not mark frames as
    // flowing again: "Load markers" would enable with no camera.
    if (!cameraStarted || !frame?.imageBitmap) return;
    frameSize = { width: frame.width, height: frame.height };
    if (!framesFlowing) {
      framesFlowing = true;
      updateLoadButton();
    }
  });

  await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
  await engine.pluginManager.enable(webcamPlugin.id, ctx);

  artoolkit = new ArtoolkitPlugin({
    wasmUrl,
    cameraParametersUrl: '/data/camera_para.dat',
    // Patterns and barcodes in the same frame.
    detectionMode: 'color_and_matrix',
    matrixCodeType: '3x3',
  });
  // register/enable return booleans and never throw.
  if (!engine.pluginManager.register('artoolkit', artoolkit)) {
    throw new Error('Could not register the ARToolKit plugin');
  }
  if (!(await engine.pluginManager.enable('artoolkit', ctx))) {
    throw new Error('Could not initialise the ARToolKit plugin');
  }
  // The plugin's own enable() starts its worker; the manager does not call it.
  await artoolkit.enable();

  engine.start();
  if (!workerReady) setStatus('Plugin initialised. Waiting for the worker…');
  startBtn.disabled = false;
}

async function startWebcam() {
  if (cameraStarted) return;
  startBtn.disabled = true;
  setStatus('Starting the webcam…');
  try {
    await CaptureSystem.initialize(
      { sourceType: SOURCE_TYPES.WEBCAM, sourceWidth: 640, sourceHeight: 480 },
      ctx,
    );
    attachVideoToViewport();
    FramePumpSystem.start(ctx);
    cameraStarted = true;
    stopBtn.disabled = false;
    setStatus('Webcam started. Load the markers, then show them to the camera.', 'success');
    log('Webcam started');
  } catch (err) {
    log(`Camera error: ${err?.message || err}`);
    setStatus('Camera error (see the log)', 'error');
    startBtn.disabled = false;
  }
}

async function stopWebcam() {
  if (!cameraStarted) return;
  // Stopped first, so a frame still in flight is ignored by the listener.
  cameraStarted = false;
  framesFlowing = false;
  // Taken before dispose, which removes the frame-source resource the
  // element is looked up from.
  const videoEl = videoElement();
  FramePumpSystem.stop(ctx);
  await CaptureSystem.dispose(ctx);
  videoEl?.remove();
  markers.clear();
  render();
  stopBtn.disabled = true;
  startBtn.disabled = false;
  updateLoadButton();
  setStatus('Webcam stopped.', 'success');
  log('Webcam stopped');
}

async function loadMarkers() {
  loadBtn.disabled = true;
  setStatus('Loading markers…');
  try {
    const hiro = await artoolkit.loadMarker('/data/patt.hiro', 1);
    log(`loadMarker hiro: ${JSON.stringify(hiro)}`);
    const barcode = await artoolkit.trackBarcode(0, 1);
    log(`trackBarcode 0: ${JSON.stringify(barcode)}`);
    markersLoaded = true;
    setStatus('Markers loaded: show the Hiro pattern or barcode 0 to the camera.', 'success');
  } catch (err) {
    log(`Loading markers failed: ${err?.message || err}`);
    setStatus('Loading markers failed (see the log)', 'error');
  } finally {
    updateLoadButton();
  }
}

startBtn.addEventListener('click', () => startWebcam());
stopBtn.addEventListener('click', () => stopWebcam());
loadBtn.addEventListener('click', () => loadMarkers());
window.addEventListener('resize', () => render());

startBtn.disabled = true;
bootstrap().catch((e) => {
  console.error('[vite-artoolkit] bootstrap error:', e);
  log(`Initialisation error: ${e?.message || e}`);
  setStatus(`Initialisation error: ${e?.message || e}`, 'error');
});
