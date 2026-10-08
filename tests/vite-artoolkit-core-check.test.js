import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/core/components.js';
import { missingCoreEvents } from '../examples/vite-artoolkit/src/core-check.js';

describe('vite-artoolkit core check', () => {
  it('finds nothing missing in the current core', () => {
    expect(missingCoreEvents(EVENTS)).toEqual([]);
  });

  it('names the constants a core built before #21 lacks', () => {
    const { ENGINE_UPDATE } = EVENTS;
    expect(missingCoreEvents({ ENGINE_UPDATE })).toEqual([
      'MARKER_FOUND',
      'MARKER_UPDATED',
      'MARKER_LOST',
      'WORKER_READY',
      'WORKER_ERROR',
    ]);
  });

  it('treats a missing EVENTS export as nothing available', () => {
    expect(missingCoreEvents(undefined)).toHaveLength(6);
  });
});
