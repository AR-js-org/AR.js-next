import { describe, it, expect, vi } from 'vitest';
import { FramePumpSystem } from '../src/systems/frame-pump-system.js';
import { EventBus } from '../src/core/event-bus.js';
import { RESOURCES } from '../src/core/components.js';

function fakeContext(video) {
  const resources = new Map([[RESOURCES.FRAME_SOURCE_REF, { element: video }]]);
  return { eventBus: new EventBus(), ecs: { getResource: (k) => resources.get(k) } };
}

describe('FramePumpSystem frames', () => {
  it('carry a timestamp on the Date.now() clock', async () => {
    let step;
    const video = {
      tagName: 'VIDEO',
      videoWidth: 640,
      videoHeight: 480,
      requestVideoFrameCallback: (cb) => ((step = cb), 1),
      cancelVideoFrameCallback: () => {},
    };
    vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const ctx = fakeContext(video);
    const frames = [];
    ctx.eventBus.on('engine:update', (f) => frames.push(f));

    FramePumpSystem.start(ctx);
    await step();
    FramePumpSystem.stop(ctx);
    vi.unstubAllGlobals();

    expect(frames[0]).toMatchObject({ id: 1, width: 640, height: 480, timestamp: 1234 });
  });
});
