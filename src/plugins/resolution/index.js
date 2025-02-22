import { AbstractPlugin, CONSTANTS, DEFAULTS, PSVError } from '../..';
import { EVENTS } from './constants';
import { deepEqual } from './utils';


/**
 * @typedef {Object} PSV.plugins.ResolutionPlugin.Resolution
 * @property {string} id
 * @property {string} label
 * @property {*} panorama
 */

/**
 * @typedef {Object} PSV.plugins.ResolutionPlugin.Options
 * @property {PSV.plugins.ResolutionPlugin.Resolution[]} resolutions - list of available resolutions
 */


DEFAULTS.lang.resolution = 'Quality';


export { EVENTS } from './constants';


/**
 * @summary Adds a setting to choose between multiple resolutions of the panorama.
 * @extends PSV.plugins.AbstractPlugin
 * @memberof PSV.plugins
 */
export class ResolutionPlugin extends AbstractPlugin {

  static id = 'resolution';

  /**
   * @deprecated use the EVENTS constants of the module
   */
  static EVENTS = EVENTS;

  /**
   * @param {PSV.Viewer} psv
   * @param {PSV.plugins.ResolutionPlugin.Options} options
   */
  constructor(psv, options) {
    super(psv);

    /**
     * @type {PSV.plugins.SettingsPlugin}
     * @readonly
     * @private
     */
    this.settings = null;

    /**
     * @summary Available resolutions
     * @member {PSV.plugins.ResolutionPlugin.Resolution[]}
     */
    this.resolutions = [];

    /**
     * @summary Available resolutions
     * @member {Object.<string, PSV.plugins.ResolutionPlugin.Resolution>}
     * @private
     */
    this.resolutionsById = {};

    /**
     * @type {Object}
     * @property {string} resolution - Current resolution
     * @private
     */
    this.prop = {
      resolution: null,
    };

    /**
     * @type {PSV.plugins.ResolutionPlugin.Options}
     */
    this.config = {
      ...options,
    };
  }

  /**
   * @package
   */
  init() {
    super.init();

    this.settings = this.psv.getPlugin('settings');

    if (!this.settings) {
      throw new PSVError('Resolution plugin requires the Settings plugin');
    }

    this.settings.addSetting({
      id     : ResolutionPlugin.id,
      type   : 'options',
      label  : this.psv.config.lang.resolution,
      current: () => this.prop.resolution,
      options: () => this.__getSettingsOptions(),
      apply  : resolution => this.setResolution(resolution),
    });

    this.psv.on(CONSTANTS.EVENTS.PANORAMA_LOADED, this);

    if (this.config.resolutions) {
      this.setResolutions(this.config.resolutions);
      delete this.config.resolutions;
    }
  }

  /**
   * @package
   */
  destroy() {
    this.psv.off(CONSTANTS.EVENTS.PANORAMA_LOADED, this);

    this.settings.removeSetting(ResolutionPlugin.id);

    super.destroy();
  }

  /**
   * @summary Handles events
   * @param {Event} e
   * @private
   */
  handleEvent(e) {
    if (e.type === CONSTANTS.EVENTS.PANORAMA_LOADED) {
      this.__refreshResolution();
    }
  }

  /**
   * @summary Changes the available resolutions
   * @param {PSV.plugins.ResolutionPlugin.Resolution[]} resolutions
   */
  setResolutions(resolutions) {
    this.resolutions = resolutions;
    this.resolutionsById = {};

    resolutions.forEach((resolution) => {
      if (!resolution.id) {
        throw new PSVError('Missing resolution id');
      }
      this.resolutionsById[resolution.id] = resolution;
    });

    this.__refreshResolution();
  }

  /**
   * @summary Changes the current resolution
   * @param {string} id
   */
  setResolution(id) {
    if (!this.resolutionsById[id]) {
      throw new PSVError(`Resolution ${id} unknown`);
    }

    return this.psv.setPanorama(this.resolutionsById[id].panorama, { transition: false, showLoader: false });
  }

  /**
   * @summary Returns the current resolution
   * @return {string}
   */
  getResolution() {
    return this.prop.resolution;
  }

  /**
   * @summary Updates current resolution on panorama load
   * @private
   */
  __refreshResolution() {
    const resolution = this.resolutions.find(r => deepEqual(this.psv.config.panorama, r.panorama));
    if (this.prop.resolution !== resolution?.id) {
      this.prop.resolution = resolution?.id;
      this.trigger(EVENTS.RESOLUTION_CHANGED, this.prop.resolution);
    }
  }

  /**
   * @summary Returns options for Settings plugin
   * @return {PSV.plugins.SettingsPlugin.Option[]}
   * @private
   */
  __getSettingsOptions() {
    return this.resolutions
      .map(resolution => ({
        id   : resolution.id,
        label: resolution.label,
      }));
  }

}
