import { describe, it, expect } from 'vitest';
import {
  markerKey,
  scaleVertex,
  upsertMarker,
  removeMarker,
} from '../examples/vite-artoolkit/src/markers.js';

describe('vite-artoolkit marker helpers', () => {
  it('keys pattern 0 and barcode 0 apart', () => {
    expect(markerKey({ type: 'pattern', markerId: 0 })).toBe('pattern:0');
    expect(markerKey({ type: 'barcode', markerId: 0 })).toBe('barcode:0');
  });

  it('scales frame-pixel corners to the displayed size', () => {
    const v = [
      [0, 0],
      [640, 0],
      [640, 480],
      [0, 480],
    ];
    expect(scaleVertex(v, { width: 640, height: 480 }, { width: 320, height: 240 })).toEqual([
      [0, 0],
      [320, 0],
      [320, 240],
      [0, 240],
    ]);
  });

  it('tracks found/updated and drops lost, per type:markerId', () => {
    const s = new Map();
    upsertMarker(s, { type: 'pattern', markerId: 0, confidence: 0.9 });
    upsertMarker(s, { type: 'barcode', markerId: 0, confidence: 0.8 });
    removeMarker(s, { type: 'pattern', markerId: 0 });
    expect([...s.keys()]).toEqual(['barcode:0']);
    expect(s.get('barcode:0')).toMatchObject({ type: 'barcode', markerId: 0, confidence: 0.8 });
  });

  it('keeps the latest pose of a marker that updates', () => {
    const s = new Map();
    upsertMarker(s, { type: 'pattern', markerId: 3, confidence: 0.7, dir: 0 });
    upsertMarker(s, { type: 'pattern', markerId: 3, confidence: 0.9, dir: 2 });
    expect(s.size).toBe(1);
    expect(s.get('pattern:3')).toMatchObject({ confidence: 0.9, dir: 2 });
  });
});
