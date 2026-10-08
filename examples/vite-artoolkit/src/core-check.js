// The core is linked from this repository (file:../..) and loaded from its
// built dist/, which can be older than the source: a build made before the
// marker event constants existed leaves them undefined, and subscribing to an
// undefined event name fails silently - the page would wait for "Worker
// ready" forever. main.js checks first and says what to do instead.

/** The `EVENTS` keys this example subscribes to. */
const REQUIRED = [
  'ENGINE_UPDATE',
  'MARKER_FOUND',
  'MARKER_UPDATED',
  'MARKER_LOST',
  'WORKER_READY',
  'WORKER_ERROR',
];

/**
 * The required `EVENTS` keys the loaded core does not define.
 *
 * @param {Record<string, string> | undefined} events - The core's `EVENTS`
 * @returns {string[]} Missing keys, in `REQUIRED` order; empty when all exist
 */
export function missingCoreEvents(events) {
  return REQUIRED.filter((key) => typeof events?.[key] !== 'string');
}
