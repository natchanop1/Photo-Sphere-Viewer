import * as THREE from 'three';
import { CONSTANTS, PSVError, utils } from '../..';
import { AbstractVideoAdapter } from '../shared/AbstractVideoAdapter';


/**
 * @typedef {PSV.adapters.AbstractVideoAdapter.Options} PSV.adapters.EquirectangularVideoAdapter.Options
 * @property {number} [resolution=64] - number of faces of the sphere geometry, higher values may decrease performances
 */


/**
 * @summary Adapter for equirectangular videos
 * @memberof PSV.adapters
 */
export class EquirectangularVideoAdapter extends AbstractVideoAdapter {

  static id = 'equirectangular-video';

  /**
   * @param {PSV.Viewer} psv
   * @param {PSV.adapters.EquirectangularVideoAdapter.Options} options
   */
  constructor(psv, options) {
    super(psv, {
      resolution: 64,
      ...options,
    });

    if (!utils.isPowerOfTwo(this.config.resolution)) {
      throw new PSVError('EquirectangularVideoAdapter resolution must be power of two');
    }

    this.SPHERE_SEGMENTS = this.config.resolution;
    this.SPHERE_HORIZONTAL_SEGMENTS = this.SPHERE_SEGMENTS / 2;
  }

  /**
   * @override
   * @param {PSV.adapters.EquirectangularVideoAdapter.Video} panorama
   * @returns {Promise.<PSV.TextureData>}
   */
  loadTexture(panorama) {
    return super.loadTexture(panorama)
      .then(({ texture }) => {
        const panoData = {
          fullWidth    : texture.image.width,
          fullHeight   : texture.image.height,
          croppedWidth : texture.image.width,
          croppedHeight: texture.image.height,
          croppedX     : 0,
          croppedY     : 0,
          poseHeading  : 0,
          posePitch    : 0,
          poseRoll     : 0,
        };

        return { panorama, texture, panoData };
      });
  }

  /**
   * @override
   */
  createMesh(scale = 1) {
    const geometry = new THREE.SphereGeometry(
      CONSTANTS.SPHERE_RADIUS * scale,
      this.SPHERE_SEGMENTS,
      this.SPHERE_HORIZONTAL_SEGMENTS,
      -Math.PI / 2
    )
      .scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial();

    return new THREE.Mesh(geometry, material);
  }

  /**
   * @override
   */
  setTexture(mesh, textureData) {
    mesh.material.map?.dispose();
    mesh.material.map = textureData.texture;

    this.__switchVideo(textureData.texture);
  }

}
