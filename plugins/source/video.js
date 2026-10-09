/**
 * Video Source Plugin
 * Provides video playback from local or remote video files
 * Emits source lifecycle events and provides HTMLVideoElement
 */

import { EVENTS } from '../../src/core/components.js';

export const videoPlugin = {
  id: 'source:video',
  name: 'Video Source',
  type: 'source',

  // Internal state
  _videoElement: null,
  _context: null,

  /**
   * Initialize the plugin
   */
  async init(context) {
    this._context = context;
  },

  /**
   * Capture video from a file or URL
   * @param {Object} config
   * @param {string} config.sourceUrl - URL or path to video file
   * @param {number} [config.sourceWidth] - Desired video width
   * @param {number} [config.sourceHeight] - Desired video height
   * @param {number} [config.displayWidth] - Display width
   * @param {number} [config.displayHeight] - Display height
   * @param {boolean} [config.loop] - Whether to loop the video
   * @param {boolean} [config.muted] - Whether to mute the video
   * @param {Object} context - Engine context
   * @returns {Promise<Object>} Frame source with element
   */
  async capture(config, context) {
    const { eventBus } = context;

    if (!config.sourceUrl) {
      const error = new Error('sourceUrl is required for video source');
      eventBus.emit(EVENTS.SOURCE_ERROR, { error, source: 'video' });
      throw error;
    }

    try {
      // Create video element
      const videoElement = document.createElement('video');
      videoElement.src = config.sourceUrl;
      videoElement.setAttribute('id', 'arjs-video');

      // Set video attributes
      videoElement.autoplay = true;
      videoElement.setAttribute('playsinline', '');
      videoElement.controls = false;
      videoElement.loop = config.loop !== false; // Default to true
      videoElement.muted = config.muted !== false; // Default to true

      // Set display size
      const displayWidth = config.displayWidth || 640;
      const displayHeight = config.displayHeight || 480;
      videoElement.style.width = displayWidth + 'px';
      videoElement.style.height = displayHeight + 'px';
      videoElement.style.position = 'absolute';
      videoElement.style.top = '0px';
      videoElement.style.left = '0px';
      videoElement.style.zIndex = '-2';
      videoElement.style.objectFit = 'initial';

      // Set internal dimensions
      if (config.sourceWidth) {
        videoElement.width = config.sourceWidth;
      }
      if (config.sourceHeight) {
        videoElement.height = config.sourceHeight;
      }

      // Store reference
      this._videoElement = videoElement;

      // Wait for video to load
      await new Promise((resolve, reject) => {
        videoElement.onloadeddata = () => {
          // Append to document
          document.body.appendChild(videoElement);

          // Start playback (may require user interaction on some browsers)
          videoElement
            .play()
            .then(() => {
              // Dispatch custom event for backward compatibility
              window.dispatchEvent(
                new CustomEvent('arjs-video-loaded', {
                  detail: { component: videoElement },
                }),
              );

              // Emit source events
              eventBus.emit(EVENTS.SOURCE_LOADED, {
                element: videoElement,
                source: 'video',
              });
              eventBus.emit(EVENTS.SOURCE_PLAYING, {
                element: videoElement,
                source: 'video',
              });

              resolve();
            })
            .catch((playError) => {
              // If autoplay fails, set up click handler
              console.warn('Autoplay failed, waiting for user interaction');

              const clickHandler = () => {
                videoElement.play().then(() => {
                  eventBus.emit(EVENTS.SOURCE_PLAYING, {
                    element: videoElement,
                    source: 'video',
                  });
                });
                document.body.removeEventListener('click', clickHandler);
              };

              document.body.addEventListener('click', clickHandler, {
                once: true,
              });

              resolve(); // Resolve anyway, video is loaded
            });
        };

        // onerror receives a plain Event with no message. The reason, when the
        // browser gives one, is the element's MediaError.
        videoElement.onerror = () => {
          const reason = videoElement.error?.message;
          reject(
            new Error(`Failed to load video: ${config.sourceUrl}${reason ? ` (${reason})` : ''}`),
          );
        };
      });

      // Get actual video dimensions
      const actualWidth = videoElement.videoWidth || config.sourceWidth || 640;
      const actualHeight = videoElement.videoHeight || config.sourceHeight || 480;

      return {
        element: videoElement,
        width: actualWidth,
        height: actualHeight,
        type: 'video',
      };
    } catch (error) {
      console.error('Video capture failed:', error);

      // Emit error event
      eventBus.emit(EVENTS.SOURCE_ERROR, {
        error,
        source: 'video',
        message: error.message,
      });

      throw error;
    }
  },

  /**
   * Dispose the plugin and clean up resources
   */
  async dispose() {
    if (this._videoElement) {
      // Pause and clean up
      this._videoElement.pause();
      this._videoElement.removeAttribute('src');
      this._videoElement.load();

      // Remove from DOM
      if (this._videoElement.parentNode) {
        this._videoElement.parentNode.removeChild(this._videoElement);
      }

      this._videoElement = null;
    }

    if (this._context && this._context.eventBus) {
      this._context.eventBus.emit(EVENTS.CAPTURE_DISPOSED, {
        source: 'video',
      });
    }
  },
};
