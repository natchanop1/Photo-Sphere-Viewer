import { AbstractPlugin, CONSTANTS, DEFAULTS, PSVError, registerButton } from '../..';
import { EVENTS } from './constants';
import { ProgressBar } from './ProgressBar';
import { PlayPauseButton } from './PlayPauseButton';
import { VolumeButton } from './VolumeButton';
import './style.scss';


/**
 * @typedef {Object} PSV.plugins.VideoPlugin.Options
 * @property {boolean} [progressbar=true] - displays a progressbar on top of the navbar
 */


// add video buttons
DEFAULTS.lang[PlayPauseButton.id] = 'Play/Pause';
DEFAULTS.lang[VolumeButton.id] = 'Volume';
registerButton(PlayPauseButton, 'start');
registerButton(VolumeButton, `${PlayPauseButton.id}:right`);


export { EVENTS } from './constants';


/**
 * @summary Controls a video adapter
 * @extends PSV.plugins.AbstractPlugin
 * @memberof PSV.plugins
 */
export class VideoPlugin extends AbstractPlugin {

  static id = 'video';

  /**
   * @param {PSV.Viewer} psv
   * @param {PSV.plugins.VideoPlugin.Options} options
   */
  constructor(psv, options) {
    super(psv);

    if (this.psv.adapter.constructor.id.indexOf('video') === -1) {
      throw new PSVError('VideoPlugin can only be used with a video adapter.');
    }

    /**
     * @member {Object}
     * @private
     */
    this.prop = {};

    /**
     * @member {PSV.plugins.VideoPlugin.Options}
     * @private
     */
    this.config = {
      progressbar: true,
      ...options,
    };

    if (this.config.progressbar) {
      this.progressbar = new ProgressBar(this);
    }
  }

  /**
   * @package
   */
  init() {
    super.init();

    this.psv.on(CONSTANTS.EVENTS.PANORAMA_LOADED, this);
  }

  /**
   * @package
   */
  destroy() {
    this.psv.off(CONSTANTS.EVENTS.PANORAMA_LOADED, this);

    super.destroy();
  }

  /**
   * @private
   */
  handleEvent(e) {
    /* eslint-disable */
    // @formatter:off
    switch (e.type) {
      case CONSTANTS.EVENTS.PANORAMA_LOADED:
        this.__bindVideo(e.args[0]);
        this.progressbar?.show();
        break;
      case 'play':         this.trigger(EVENTS.PLAY); break;
      case 'pause':        this.trigger(EVENTS.PAUSE); break;
      case 'progress':     this.trigger(EVENTS.BUFFER, this.getBufferProgress()); break;
      case 'volumechange': this.trigger(EVENTS.VOLUME_CHANGE, this.getVolume()); break;
      case 'timeupdate':
        this.trigger(EVENTS.PROGRESS, {
          time    : this.getTime(),
          duration: this.getDuration(),
          progress: this.getProgress(),
        });
        break;
    }
    // @formatter:on
    /* eslint-enable */
  }

  __bindVideo(textureData) {
    this.video = textureData.texture.image;

    this.video.addEventListener('play', this);
    this.video.addEventListener('pause', this);
    this.video.addEventListener('progress', this);
    this.video.addEventListener('volumechange', this);
    this.video.addEventListener('timeupdate', this);
  }

  getDuration() {
    return this.video?.duration ?? 0;
  }

  getTime() {
    return this.video?.currentTime ?? 0;
  }

  getProgress() {
    return this.video ? this.video.currentTime / this.video.duration : 0;
  }

  isPlaying() {
    return this.video ? !this.video.paused : false;
  }

  getVolume() {
    return this.video?.muted ? 0 : this.video?.volume ?? 0;
  }

  playPause() {
    if (this.video) {
      if (this.video.paused) {
        this.video.play();
      }
      else {
        this.video.pause();
      }
    }
  }

  play() {
    if (this.video && this.video.paused) {
      this.video.play();
    }
  }

  pause() {
    if (this.video && !this.video.paused) {
      this.video.pause();
    }
  }

  setVolume(volume) {
    if (this.video) {
      if (volume <= 0) {
        this.setMute(true);
      }
      else {
        this.video.muted = false;
        this.video.volume = volume;
      }
    }
  }

  setMute(mute) {
    if (this.video) {
      this.video.muted = mute === undefined ? !this.video.muted : mute;
    }
  }

  setTime(time) {
    if (this.video) {
      this.video.currentTime = time;
    }
  }

  setProgress(progress) {
    if (this.video) {
      this.video.currentTime = this.video.duration * progress;
    }
  }

  getBufferProgress() {
    if (this.video) {
      let maxBuffer = 0;

      const buffer = this.video.buffered;

      for (let i = 0, l = buffer.length; i < l; i++) {
        if (buffer.start(i) <= this.video.currentTime && buffer.end(i) >= this.video.currentTime) {
          maxBuffer = buffer.end(i);
          break;
        }
      }

      return Math.max(this.video.currentTime, maxBuffer) / this.video.duration;
    }
    else {
      return 0;
    }
  }

}
