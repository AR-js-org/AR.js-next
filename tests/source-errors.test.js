import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../src/core/event-bus.js';
import { EVENTS } from '../src/core/components.js';
import { imagePlugin } from '../plugins/source/image.js';
import { videoPlugin } from '../plugins/source/video.js';

// An <img> that fails the way a browser's does: onerror receives an Event,
// which has a type but no message.
function stubFailingImageDom() {
  vi.stubGlobal('document', {
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
    createElement: () => {
      const el = {
        style: {},
        setAttribute: vi.fn(),
        onload: null,
        onerror: null,
        set src(value) {
          this._src = value;
          setTimeout(() => this.onerror?.({ type: 'error' }), 0);
        },
        get src() {
          return this._src;
        },
      };
      return el;
    },
  });
}

describe('imagePlugin load errors (#28)', () => {
  const url = 'https://example.com/missing.jpg';
  let eventBus;
  let context;

  beforeEach(() => {
    stubFailingImageDom();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    eventBus = new EventBus();
    context = { eventBus };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the URL in the rejection', async () => {
    await expect(imagePlugin.capture({ sourceUrl: url }, context)).rejects.toThrow(
      `Failed to load image: ${url}`,
    );
  });

  it('names the URL in the source:error payload', async () => {
    const onError = vi.fn();
    eventBus.on(EVENTS.SOURCE_ERROR, onError);

    await imagePlugin.capture({ sourceUrl: url }, context).catch(() => {});

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      source: 'image',
      message: `Failed to load image: ${url}`,
    });
  });
});

// A <video> that fails the way a browser's does: onerror receives an Event,
// and the reason is on the element as a MediaError.
function stubFailingVideoDom(mediaError) {
  vi.stubGlobal('document', {
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
    createElement: () => {
      const el = {
        style: {},
        error: null,
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        onerror: null,
        set src(value) {
          this._src = value;
          setTimeout(() => {
            this.error = mediaError;
            this.onerror?.({ type: 'error' });
          }, 0);
        },
        get src() {
          return this._src;
        },
      };
      return el;
    },
  });
}

describe('videoPlugin load errors', () => {
  const url = 'https://example.com/missing.mp4';

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the URL and the MediaError in the rejection', async () => {
    stubFailingVideoDom({ code: 4, message: 'MEDIA_ELEMENT_ERROR: Format error' });
    const context = { eventBus: new EventBus() };

    await expect(videoPlugin.capture({ sourceUrl: url }, context)).rejects.toThrow(
      `Failed to load video: ${url} (MEDIA_ELEMENT_ERROR: Format error)`,
    );
  });

  it('names the URL alone when the element reports no MediaError', async () => {
    stubFailingVideoDom(null);
    const context = { eventBus: new EventBus() };

    const error = await videoPlugin.capture({ sourceUrl: url }, context).catch((e) => e);
    expect(error.message).toBe(`Failed to load video: ${url}`);
  });
});
