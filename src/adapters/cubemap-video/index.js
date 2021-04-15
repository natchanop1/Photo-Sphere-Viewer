import * as THREE from 'three';
import { CONSTANTS } from '../..';
import { AbstractVideoAdapter } from '../shared/AbstractVideoAdapter';


/**
 * @summary Adapter for cubemap videos
 * @memberof PSV.adapters
 */
export class CubemapVideoAdapter extends AbstractVideoAdapter {

  static id = 'cubemap-video';

  /**
   * @override
   */
  createMesh(scale = 1) {
    const cubeSize = CONSTANTS.SPHERE_RADIUS * 2 * scale;
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)
      .scale(1, 1, -1)
      .toNonIndexed();

    const uvs = geometry.getAttribute('uv');

    // columns
    const a = 0;
    const b = 1 / 3;
    const c = 2 / 3;
    const d = 1;

    // lines
    const A = 1;
    const B = 1 / 2;
    const C = 0;

    // left
    uvs.setXY(0, a, A);
    uvs.setXY(1, a, B);
    uvs.setXY(2, b, A);
    uvs.setXY(3, a, B);
    uvs.setXY(4, b, B);
    uvs.setXY(5, b, A);

    // right
    uvs.setXY(6, c, A);
    uvs.setXY(7, c, B);
    uvs.setXY(8, d, A);
    uvs.setXY(9, c, B);
    uvs.setXY(10, d, B);
    uvs.setXY(11, d, A);

    // top
    uvs.setXY(12, d, B);
    uvs.setXY(13, c, B);
    uvs.setXY(14, d, C);
    uvs.setXY(15, c, B);
    uvs.setXY(16, c, C);
    uvs.setXY(17, d, C);

    // bottom
    uvs.setXY(18, b, B);
    uvs.setXY(19, a, B);
    uvs.setXY(20, b, C);
    uvs.setXY(21, a, B);
    uvs.setXY(22, a, C);
    uvs.setXY(23, b, C);

    // back
    uvs.setXY(24, c, B);
    uvs.setXY(25, b, B);
    uvs.setXY(26, c, C);
    uvs.setXY(27, b, B);
    uvs.setXY(28, b, C);
    uvs.setXY(29, c, C);

    // front
    uvs.setXY(30, b, A);
    uvs.setXY(31, b, B);
    uvs.setXY(32, c, A);
    uvs.setXY(33, b, B);
    uvs.setXY(34, c, B);
    uvs.setXY(35, c, A);

    const materials = [];
    for (let i = 0; i < 6; i++) {
      materials.push(new THREE.MeshBasicMaterial());
    }

    return new THREE.Mesh(geometry, materials);
  }

  /**
   * @override
   */
  setTexture(mesh, textureData) {
    mesh.material[0].map?.dispose();
    for (let i = 0; i < 6; i++) {
      mesh.material[i].map = textureData.texture;
    }

    this.__switchVideo(textureData.texture);
  }

}
