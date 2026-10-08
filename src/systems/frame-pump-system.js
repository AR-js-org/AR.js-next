/**
 * FramePumpSystem
 * Emits engine:update with ImageBitmap frames from the active video source.
 * - Prefers HTMLVideoElement.requestVideoFrameCallback when available
 * - Falls back to requestAnimationFrame
 * - Uses createImageBitmap(video) when possible (fast path)
 * - Falls back to drawing to a canvas and createImageBitmap(canvas)
 */
import { RESOURCES } from '../core/components.js';

export class FramePumpSystem {
  static start(context) {
    if (!context) throw new Error('FramePumpSystem.start requires a context');
    const bus = context.eventBus;
    const ref = context.ecs.getResource(RESOURCES.FRAME_SOURCE_REF);

    if (!ref?.element) {
      console.warn(
        '[FramePumpSystem] No frame source element found; did you call CaptureSystem.initialize?',
      );
      return false;
    }
    const video = ref.element;
    if (String(video.tagName).toUpperCase() !== 'VIDEO') {
      console.warn('[FramePumpSystem] Frame source is not a <video> element; skipping frame pump.');
      return false;
    }

    // Keep state on context to allow stop()
    context.__framePump = context.__framePump || {};
    const state = context.__framePump;
    if (state.running) return true;
    state.running = true;
    state._fid = 0;
    state._raf = 0;
    state._rvfc = 0;

    // Optional canvas fallback
    let offscreen = null;
    let ctx2d = null;

    function ensureCanvas(w, h) {
      if (offscreen && offscreen.width === w && offscreen.height === h) return;
      try {
        if (typeof globalThis.OffscreenCanvas !== 'undefined') {
          offscreen = new globalThis.OffscreenCanvas(w, h);
          ctx2d = offscreen.getContext('2d', { willReadFrequently: true });
        } else {
          const c = globalThis.document?.createElement?.('canvas');
          if (!c) {
            offscreen = null;
            ctx2d = null;
            return;
          }
          c.width = w;
          c.height = h;
          c.style.display = 'none';
          try {
            globalThis.document?.body?.appendChild?.(c);
          } catch {}
          offscreen = c;
          ctx2d = c.getContext('2d', { willReadFrequently: true });
        }
      } catch {
        offscreen = null;
        ctx2d = null;
      }
    }

    // Every frame goes out through here, so none can miss its timestamp:
    // Date.now(), the clock the tracking plugins stamp marker events with.
    function emitFrameEvent(payload) {
      bus.emit('engine:update', { id: ++state._fid, ...payload, timestamp: Date.now() });
    }

    async function emitFrame() {
      const w = video.videoWidth || ref.width || 640;
      const h = video.videoHeight || ref.height || 480;
      if (!w || !h) return;

      // Fast path: ImageBitmap directly from video
      try {
        if (typeof globalThis.createImageBitmap === 'function') {
          const imageBitmap = await globalThis.createImageBitmap(video);
          emitFrameEvent({ imageBitmap, width: w, height: h });
          return;
        }
      } catch {
        // fall through to canvas path
      }

      // Canvas fallback
      try {
        ensureCanvas(w, h);
        if (!offscreen || !ctx2d) return;

        ctx2d.clearRect(0, 0, w, h);
        ctx2d.drawImage(video, 0, 0, w, h);

        if (typeof globalThis.createImageBitmap === 'function') {
          const imageBitmap = await globalThis.createImageBitmap(offscreen);
          emitFrameEvent({ imageBitmap, width: w, height: h });
        } else {
          // As a last resort, emit without ImageBitmap (worker will try a slower fallback)
          emitFrameEvent({ width: w, height: h });
        }
      } catch {
        // ignore transient failures
      }
    }

    // Use requestVideoFrameCallback when available
    if (typeof video.requestVideoFrameCallback === 'function') {
      const step = async () => {
        if (!state.running) return;
        await emitFrame();
        state._rvfc = video.requestVideoFrameCallback(step);
      };
      state._rvfc = video.requestVideoFrameCallback(step);
    } else {
      const raf = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
      const loop = async () => {
        if (!state.running) return;
        await emitFrame();
        state._raf = raf(loop);
      };
      state._raf = raf(loop);
    }

    return true;
  }

  static stop(context) {
    const state = context?.__framePump;
    const ref = context?.ecs?.getResource?.(RESOURCES.FRAME_SOURCE_REF);
    const video = ref?.element;
    if (!state || !state.running) return;

    state.running = false;

    // Cancel RVFC via the video element
    if (video && typeof video.cancelVideoFrameCallback === 'function' && state._rvfc) {
      try {
        video.cancelVideoFrameCallback(state._rvfc);
      } catch {}
    }

    // Cancel RAF/timeout
    const caf =
      globalThis.cancelAnimationFrame ||
      ((id) => {
        try {
          clearTimeout(id);
        } catch {}
      });
    if (state._raf) {
      try {
        caf(state._raf);
      } catch {}
    }

    context.__framePump = undefined;
  }
}
