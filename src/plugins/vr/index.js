import { AbstractPlugin, CONSTANTS, DEFAULTS, registerButton } from '../..';
import { EVENTS } from './constants';
import { VrButton } from './VrButton';


// add vr button
DEFAULTS.navbar.splice(-1, 0, VrButton.id);
DEFAULTS.lang[VrButton.id] = 'Enter VR';
registerButton(VrButton);


export { EVENTS } from './constants';


/**
 * @summary Adds VR view on WebXR devices
 * @extends PSV.plugins.AbstractPlugin
 * @memberof PSV.plugins
 */
export class VrPlugin extends AbstractPlugin {

  static id = 'vr';

  /**
   * @param {PSV.Viewer} psv
   */
  constructor(psv) {
    super(psv);


    this.prop = {
      isSupported: this.__checkSupport(),
      session    : null,
    };

    this.psv.renderer.renderer.xr.enabled = true;

    this.psv.on(CONSTANTS.EVENTS.BEFORE_RENDER, this);
  }

  /**
   * @package
   */
  destroy() {
    this.psv.off(CONSTANTS.EVENTS.BEFORE_RENDER, this);

    this.prop.session?.end();

    super.destroy();
  }

  /**
   * @private
   */
  handleEvent(e) {
    switch (e.type) {
      case CONSTANTS.EVENTS.BEFORE_RENDER:
        if (this.prop.session) {
          this.psv.needsUpdate();
        }
        break;
      default:
        break;
    }
  }

  /**
   * @summary Checks if the VR view is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return !!this.prop.session;
  }

  /**
   * @private
   */
  __toggle() {
    if (!this.prop.session) {
      const sessionInit = { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] };
      navigator.xr.requestSession('immersive-vr', sessionInit)
        .then((session) => {
          this.prop.session = session;
          session.addEventListener('end', () => {
            this.prop.session = null;
            this.trigger(EVENTS.VR_UPDATED, false);
          });
          this.psv.renderer.renderer.xr.setSession(session);
          this.trigger(EVENTS.VR_UPDATED, true);
        });
    }
    else {
      this.prop.session.end();
    }
  }

  /**
   * @summary Detects if the XR API is supported
   * @returns {Promise<boolean>}
   * @private
   */
  __checkSupport() {
    if ('xr' in navigator) {
      return navigator.xr.isSessionSupported('immersive-vr');
    }
    else {
      return Promise.resolve(false);
    }
  }

}
