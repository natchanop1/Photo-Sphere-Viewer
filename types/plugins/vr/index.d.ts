import { Event } from 'uevent';
import { AbstractPlugin } from '../AbstractPlugin';

export const EVENTS: {
  VR_UPDATED: 'vr-updated',
};

/**
 * @summary Adds VR view on WebXR devices
 */
export class VRPlugin extends AbstractPlugin {

  /**
   * @summary Checks if the VR view is enabled
   */
  isEnabled(): boolean;

  /**
   * @summary Triggered when the VR view is enabled/disabled
   */
  on(e: 'vr-updated', cb: (e: Event, enabled: boolean) => void): this;

}
