import { PSVError, utils } from 'photo-sphere-viewer';
import { AbstractDatasource } from './AbstractDatasource';
import { checkLink, checkNode } from './utils';

/**
 * @memberOf PSV.plugins.VirtualTourPlugin
 * @package
 */
export class ClientSideDatasource extends AbstractDatasource {

  loadNode(nodeId) {
    if (this.nodes[nodeId]) {
      return Promise.resolve(this.nodes[nodeId]);
    }
    else {
      return Promise.reject(new PSVError(`Node ${nodeId} not found`));
    }
  }

  loadLinkedNodes(nodeId) {
    if (!this.nodes[nodeId]) {
      return Promise.reject(new PSVError(`Node ${nodeId} not found`));
    }
    else {
      return Promise.resolve();
    }
  }

  setNodes(rawNodes) {
    if (!rawNodes?.length) {
      throw new PSVError('No nodes provided');
    }

    const nodes = {};
    const linkedNodes = {};

    rawNodes.forEach((node) => {
      checkNode(node, this.plugin.isGps());

      if (nodes[node.id]) {
        throw new PSVError(`Duplicate node ${node.id}`);
      }
      if (!node.links) {
        utils.logWarn(`Node ${node.id} has no links`);
        nodes.links = [];
      }

      nodes[node.id] = node;
    });

    rawNodes.forEach((node) => {
      node.links.forEach((link) => {
        checkLink(node, link, this.plugin.isGps());

        if (!nodes[link.nodeId]) {
          throw new PSVError(`Target node ${link.nodeId} of node ${node.id} does not exists`);
        }

        // copy essential data
        link.position = link.position || nodes[link.nodeId].position;
        link.name = link.name || nodes[link.nodeId].name;

        linkedNodes[link.nodeId] = true;
      });
    });

    rawNodes.forEach((node) => {
      if (!linkedNodes[node.id]) {
        utils.logWarn(`Node ${node.id} is never linked to`);
      }
    });

    this.nodes = nodes;
  }

}
