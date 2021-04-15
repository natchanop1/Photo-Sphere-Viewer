import * as THREE from 'three';
import { AbstractAdapter, CONSTANTS, PSVError } from '../..';

/**
 * @typedef {Object} PSV.adapters.AbstractVideoAdapter.Video
 * @summary Object defining a video
 * @property {string} source
 */

/**
 * @typedef {Object} PSV.adapters.AbstractVideoAdapter.Options
 * @property {boolean} [autoplay=false] - automatically start the video
 * @property {boolean} [muted=autoplay] - initially mute the video
 * @property {number} [volume=1] - initial volume of the video
 */

/**
 * @summary Base video adapters class
 * @memberof PSV.adapters
 * @abstract
 * @private
 */
export class AbstractVideoAdapter extends AbstractAdapter {

  static supportsTransition = false;
  static supportsPreload = false;
  static supportsDownload = true;

  constructor(psv, options) {
    super(psv);

    /**
     * @member {PSV.adapters.AbstractVideoAdapter.Options}
     * @private
     */
    this.config = {
      autoplay: false,
      muted   : options?.autoplay ?? false,
      volume  : 1,
      ...options,
    };

    /**
     * @member {HTMLVideoElement}
     * @private
     */
    this.video = null;

    this.psv.on(CONSTANTS.EVENTS.BEFORE_RENDER, this);
  }

  /**
   * @override
   */
  destroy() {
    this.psv.off(CONSTANTS.EVENTS.BEFORE_RENDER, this);

    this.__removeVideo();

    super.destroy();
  }

  /**
   * @private
   */
  handleEvent(e) {
    /* eslint-disable */
    switch (e.type) {
      case CONSTANTS.EVENTS.BEFORE_RENDER:
        if (this.video) {
          this.psv.needsUpdate();
        }
        break;
    }
    /* eslint-enable */
  }

  /**
   * @override
   * @param {PSV.adapters.AbstractVideoAdapter.Video} panorama
   * @returns {Promise.<PSV.TextureData>}
   */
  loadTexture(panorama) {
    if (typeof panorama !== 'object' || !panorama.source) {
      return Promise.reject(new PSVError('Invalid panorama configuration, are you using the right adapter?'));
    }

    const video = this.__createVideo(panorama.source);

    return this.__videoLoadPromise(video)
      .then(() => {
        const texture = new THREE.VideoTexture(video);
        return { panorama, texture };
      });
  }

  /**
   * @override
   */
  __switchVideo(texture) {
    this.__removeVideo();
    this.video = texture.image;

    if (this.config.autoplay) {
      this.video.play();
    }
  }

  /**
   * @override
   */
  disposeTexture(textureData) {
    if (textureData.texture) {
      const video = textureData.texture.image;
      video.stop();
      this.psv.container.removeChild(video);
    }
    textureData.texture?.dispose();
  }

  /**
   * @summary Removes the current video element
   * @private
   */
  __removeVideo() {
    if (this.video) {
      this.video.stop();
      this.psv.container.removeChild(this.video);
      delete this.video;
    }
  }

  /**
   * @summary Creates a new video element
   * @memberOf PSV.adapters
   * @param {string} src
   * @return {HTMLVideoElement}
   * @private
   */
  __createVideo(src) {
    const video = document.createElement('video');
    video.crossorigin = this.psv.config.withCredentials ? 'use-credentials' : 'anonymous';
    video.loop = true;
    video.style.display = 'none';
    video.muted = this.config.muted;
    video.volume = this.config.volume;
    video.src = src;

    this.psv.container.appendChild(video);

    video.load();

    return video;
  }

  /**
   * @memberOf PSV.adapters
   * @private
   */
  __videoLoadPromise(video) {
    return new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', function onLoaded(e) {
        resolve(e);
        video.removeEventListener('loadeddata', onLoaded);
      });

      video.addEventListener('error', function onError(err) {
        reject(err);
        video.removeEventListener('error', onError);
      });
    });
  }


}
