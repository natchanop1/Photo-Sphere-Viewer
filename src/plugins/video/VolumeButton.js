import { AbstractButton, utils } from '../..';
import { EVENTS } from './constants';
import volumeIcon from './volume.svg';

/**
 * @summary Navigation bar video volume button
 * @extends PSV.buttons.AbstractButton
 * @memberof PSV.buttons
 */
export class VolumeButton extends AbstractButton {

  static id = 'videoVolume';
  static icon = volumeIcon;

  /**
   * @param {PSV.components.Navbar} navbar
   */
  constructor(navbar) {
    super(navbar, 'psv-button--hover-scale psv-video-volume-button', true);

    /**
     * @type {PSV.plugins.VideoPlugin}
     * @private
     * @readonly
     */
    this.plugin = this.psv.getPlugin('video');

    /**
     * @type {HTMLElement}
     * @private
     * @readonly
     */
    this.rangeContainer = document.createElement('div');
    this.rangeContainer.className = 'psv-video-volume__container';
    this.container.appendChild(this.rangeContainer);

    /**
     * @type {HTMLElement}
     * @private
     * @readonly
     */
    this.progressElt = document.createElement('div');
    this.progressElt.className = 'psv-video-volume__progress';
    this.rangeContainer.appendChild(this.progressElt);

    /**
     * @type {HTMLElement}
     * @private
     * @readonly
     */
    this.handleElt = document.createElement('div');
    this.handleElt.className = 'psv-video-volume__handle';
    this.rangeContainer.appendChild(this.handleElt);


    if (this.plugin) {
      this.plugin.on(EVENTS.PLAY, this);
      this.plugin.on(EVENTS.VOLUME_CHANGE, this);

      this.__setVolume(0);
    }
  }

  /**
   * @override
   */
  destroy() {
    if (this.plugin) {
      this.plugin.off(EVENTS.PLAY, this);
      this.plugin.off(EVENTS.VOLUME_CHANGE, this);
    }

    delete this.plugin;

    super.destroy();
  }

  /**
   * @override
   */
  isSupported() {
    return !!this.plugin;
  }

  /**
   * @summary Handles events
   * @param {Event} e
   * @private
   */
  handleEvent(e) {
    /* eslint-disable */
    switch (e.type) {
      case EVENTS.PLAY:
      case EVENTS.VOLUME_CHANGE:
        this.__setVolume(this.plugin.getVolume());
        break;
    }
    /* eslint-enable */
  }

  /**
   * @override
   * @description Toggles video muted
   */
  onClick() {
    this.plugin.setMute();
  }

  /**
   * @private
   */
  __setVolume(volume) {
    let level;
    if (volume === 0) level = 0;
    else if (volume < 0.333) level = 1;
    else if (volume < 0.666) level = 2;
    else level = 3;

    utils.toggleClass(this.container, 'psv-video-volume-button--0', level === 0);
    utils.toggleClass(this.container, 'psv-video-volume-button--1', level === 1);
    utils.toggleClass(this.container, 'psv-video-volume-button--2', level === 2);
    utils.toggleClass(this.container, 'psv-video-volume-button--3', level === 3);
  }

}
