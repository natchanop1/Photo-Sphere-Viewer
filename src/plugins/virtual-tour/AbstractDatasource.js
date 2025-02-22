import { PSVError } from 'photo-sphere-viewer';

/**
 * @memberOf PSV.plugins.VirtualTourPlugin
 * @package
 */
export class AbstractDatasource {

  /**
   * @type {Record<string, PSV.plugins.VirtualTourPlugin.Node>}
   */
  nodes = {};

  /**
   * @param {PSV.plugins.VirtualTourPlugin} plugin
   */
  constructor(plugin) {
    this.plugin = plugin;
  }

  destroy() {
    delete this.plugin;
  }

  /**
   * @summary Loads a node
   * @param {string} nodeId
   * @return {Promise<PSV.plugins.VirtualTourPlugin.Node>}
   */
  loadNode(nodeId) { // eslint-disable-line no-unused-vars
    throw new PSVError('loadNode not implemented');
  }

  /**
   * @summary Loades nodes linked to another node
   * @param {string} nodeId
   * @return {Promise<void>}
   */
  loadLinkedNodes(nodeId) { // eslint-disable-line no-unused-vars
    throw new PSVError('loadLinkedNodes not implemented');
  }

}
