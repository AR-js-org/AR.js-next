/**
 * Image Source Plugin
 * Provides static image loading from local or remote image files
 * Emits source lifecycle events and provides HTMLImageElement
 */

import { EVENTS } from '../../src/core/components.js';

export const imagePlugin = {
  id: 'source:image',
  name: 'Image Source',
  type: 'source',

  // Internal state
  _imageElement: null,
  _context: null,

  /**
   * Initialize the plugin
   */
  async init(context) {
    this._context = context;
  },

  /**
   * Load an image from a file or URL
   * @param {Object} config
   * @param {string} config.sourceUrl - URL or path to image file
   * @param {number} [config.sourceWidth] - Desired image width
   * @param {number} [config.sourceHeight] - Desired image height
   * @param {number} [config.displayWidth] - Display width
   * @param {number} [config.displayHeight] - Display height
   * @param {Object} context - Engine context
   * @returns {Promise<Object>} Frame source with element
   */
  async capture(config, context) {
    const { eventBus } = context;

    if (!config.sourceUrl) {
      const error = new Error('sourceUrl is required for image source');
      eventBus.emit(EVENTS.SOURCE_ERROR, { error, source: 'image' });
      throw error;
    }

    try {
      // Create image element
      const imageElement = document.createElement('img');
      imageElement.src = config.sourceUrl;
      imageElement.setAttribute('id', 'arjs-video');

      // Set display size
      const displayWidth = config.displayWidth || 640;
      const displayHeight = config.displayHeight || 480;
      imageElement.style.width = displayWidth + 'px';
      imageElement.style.height = displayHeight + 'px';
      imageElement.style.position = 'absolute';
      imageElement.style.top = '0px';
      imageElement.style.left = '0px';
      imageElement.style.zIndex = '-2';

      // Set internal dimensions if specified
      if (config.sourceWidth) {
        imageElement.width = config.sourceWidth;
      }
      if (config.sourceHeight) {
        imageElement.height = config.sourceHeight;
      }

      // Store reference
      this._imageElement = imageElement;

      // Wait for image to load
      await new Promise((resolve, reject) => {
        imageElement.onload = () => {
          // Append to document
          document.body.appendChild(imageElement);

          // Dispatch custom event for backward compatibility
          window.dispatchEvent(
            new CustomEvent('arjs-video-loaded', {
              detail: { component: imageElement },
            }),
          );

          // Emit source events
          eventBus.emit(EVENTS.SOURCE_LOADED, {
            element: imageElement,
            source: 'image',
          });

          resolve();
        };

        // onerror receives a plain Event: no message, and no reason (404, CORS,
        // decode) is exposed to script. The URL is what identifies the failure.
        imageElement.onerror = () => {
          reject(new Error(`Failed to load image: ${config.sourceUrl}`));
        };
      });

      // Get actual image dimensions
      const actualWidth = imageElement.naturalWidth || config.sourceWidth || 640;
      const actualHeight = imageElement.naturalHeight || config.sourceHeight || 480;

      return {
        element: imageElement,
        width: actualWidth,
        height: actualHeight,
        type: 'image',
      };
    } catch (error) {
      console.error('Image capture failed:', error);

      // Emit error event
      eventBus.emit(EVENTS.SOURCE_ERROR, {
        error,
        source: 'image',
        message: error.message,
      });

      throw error;
    }
  },

  /**
   * Dispose the plugin and clean up resources
   */
  async dispose() {
    if (this._imageElement) {
      // Remove from DOM
      if (this._imageElement.parentNode) {
        this._imageElement.parentNode.removeChild(this._imageElement);
      }

      this._imageElement = null;
    }

    if (this._context && this._context.eventBus) {
      this._context.eventBus.emit(EVENTS.CAPTURE_DISPOSED, {
        source: 'image',
      });
    }
  },
};
