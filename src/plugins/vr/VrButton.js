import { AbstractButton } from '../..';
import { EVENTS } from './constants';
import vr from './vr.svg';

/**
 * @summary Navigation bar vr button class
 * @extends PSV.buttons.AbstractButton
 * @memberof PSV.buttons
 */
export class VrButton extends AbstractButton {

  static id = 'vr';
  static icon = vr;

  /**
   * @param {PSV.components.Navbar} navbar
   */
  constructor(navbar) {
    super(navbar, 'psv-button--hover-scale psv-vr-button', true);

    /**
     * @type {PSV.plugins.VrPlugin}
     * @private
     * @readonly
     */
    this.plugin = this.psv.getPlugin('vr');

    if (this.plugin) {
      this.plugin.on(EVENTS.VR_UPDATED, this);
    }
  }

  /**
   * @override
   */
  destroy() {
    if (this.plugin) {
      this.plugin.off(EVENTS.VR_UPDATED, this);
    }

    delete this.plugin;

    super.destroy();
  }

  /**
   * @override
   */
  isSupported() {
    return !this.plugin ? false : { initial: false, promise: this.plugin.prop.isSupported };
  }

  /**
   * @summary Handles events
   * @param {Event} e
   * @private
   */
  handleEvent(e) {
    if (e.type === EVENTS.VR_UPDATED) {
      this.toggleActive(e.args[0]);
    }
  }

  /**
   * @override
   * @description Toggles vr control
   */
  onClick() {
    this.plugin.__toggle();
  }

}
