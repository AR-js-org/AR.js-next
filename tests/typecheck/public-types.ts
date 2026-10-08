// Compiled by `npm run test:types`, never run. Every line must type-check
// as written; the @ts-expect-error lines must fail to.
import { EVENTS } from '@ar-js-org/ar.js-next';
import type {
  MarkerType,
  MarkerEventPayload,
  MarkerLostPayload,
  WorkerErrorPayload,
} from '@ar-js-org/ar.js-next';

const type: MarkerType = 'barcode';
// @ts-expect-error: only 'pattern' and 'barcode' are marker families
const notAType: MarkerType = 'qr';

const found: MarkerEventPayload = {
  markerId: 0,
  type,
  matrix: new Float32Array(16),
  confidence: 0.9,
  vertex: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
  dir: 2,
  timestamp: 0,
};
// @ts-expect-error: matrix is required
const noMatrix: MarkerEventPayload = { markerId: 0, type, confidence: 1, timestamp: 0 };

const lost: MarkerLostPayload = { markerId: 0, type: 'pattern', timestamp: 0 };
const error: WorkerErrorPayload = { message: 'wasm 404' };
const eventName: string = EVENTS.MARKER_FOUND;

export { notAType, found, noMatrix, lost, error, eventName };
