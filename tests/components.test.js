import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/core/components.js';
import * as pub from '../src/index.js';

describe('marker event constants', () => {
  it('match the names the tracking plugins emit', () => {
    expect(EVENTS).toMatchObject({
      MARKER_FOUND: 'ar:markerFound',
      MARKER_UPDATED: 'ar:markerUpdated',
      MARKER_LOST: 'ar:markerLost',
      WORKER_READY: 'ar:workerReady',
      WORKER_ERROR: 'ar:workerError',
    });
  });

  it('are exported from the public entry', () => {
    expect(pub.EVENTS.MARKER_FOUND).toBe('ar:markerFound');
  });
});
