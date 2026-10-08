// Marker state and geometry for the example's HUD. DOM-free, so the root
// test suite can exercise it; main.js wires it to the event bus and canvas.

/**
 * A marker's identity. Pattern and barcode IDs both start at 0, so the family
 * is part of the key.
 *
 * @param {{ type: string, markerId: number }} marker
 * @returns {string} `type:markerId`
 */
export function markerKey({ type, markerId }) {
  return `${type}:${markerId}`;
}

/**
 * Scale corners from the pixels of the submitted frame to the size the video
 * is displayed at. `vertex` is in frame pixels, which differ from display
 * pixels whenever the video is not shown at its native size.
 *
 * @param {number[][]} vertex - `[[x, y], …]` in frame pixels
 * @param {{ width: number, height: number }} frame - Submitted frame size
 * @param {{ width: number, height: number }} display - Displayed size
 * @returns {number[][]} The same corners in display pixels
 */
export function scaleVertex(vertex, frame, display) {
  const sx = display.width / frame.width;
  const sy = display.height / frame.height;
  return vertex.map(([x, y]) => [x * sx, y * sy]);
}

/**
 * Record a marker from an `ar:markerFound` or `ar:markerUpdated` payload,
 * replacing any earlier pose of the same marker.
 *
 * @param {Map<string, Object>} state - Markers in view, by `markerKey`
 * @param {{ type: string, markerId: number, confidence?: number,
 *   vertex?: number[][], dir?: number }} payload
 * @returns {Map<string, Object>} `state`
 */
export function upsertMarker(state, { type, markerId, confidence, vertex, dir }) {
  state.set(markerKey({ type, markerId }), { type, markerId, confidence, vertex, dir });
  return state;
}

/**
 * Forget a marker on `ar:markerLost`.
 *
 * @param {Map<string, Object>} state - Markers in view, by `markerKey`
 * @param {{ type: string, markerId: number }} payload
 * @returns {Map<string, Object>} `state`
 */
export function removeMarker(state, payload) {
  state.delete(markerKey(payload));
  return state;
}
