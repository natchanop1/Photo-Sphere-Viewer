import * as THREE from 'three';
import { CONSTANTS, PSVError, utils } from '../..';
import { CUBE_HASHMAP, CubemapAdapter } from '../cubemap';
import { Queue } from '../shared/Queue';
import { Task } from '../shared/Task';
import { buildErrorMaterial, createBaseTexture } from '../shared/tiles-utils';

if (!CubemapAdapter) {
  throw new PSVError('CubemapAdapter is missing, please load cubemap.js before cubemap-tiles.js');
}


/**
 * @callback TileUrl
 * @summary Function called to build a tile url
 * @memberOf PSV.adapters.CubemapTilesAdapter
 * @param {'left'|'front'|'right'|'back'|'top'|'bottom'} face
 * @param {int} col
 * @param {int} row
 * @returns {string}
 */

/**
 * @typedef {Object} PSV.adapters.CubemapTilesAdapter.Panorama
 * @summary Configuration of a tiled cubemap
 * @property {PSV.adapters.CubemapAdapter.Cubemap} [baseUrl] - low resolution panorama loaded before tiles
 * @property {int} faceSize - size of a face
 * @property {int} nbTiles - number of tiles on a side of a face
 * @property {PSV.adapters.CubemapTilesAdapter.TileUrl} tileUrl - function to build a tile url
 */

/**
 * @typedef {Object} PSV.adapters.CubemapTilesAdapter.Options
 * @property {boolean} [flipTopBottom=false] - set to true if the top and bottom faces are not correctly oriented
 * @property {boolean} [showErrorTile=true] - shows a warning sign on tiles that cannot be loaded
 * @property {boolean} [baseBlur=true] - applies a blur to the low resolution panorama
 */

/**
 * @typedef {Object} PSV.adapters.CubemapTilesAdapter.Tile
 * @private
 * @property {int} face
 * @property {int} col
 * @property {int} row
 * @property {float} angle
 */


const CUBE_SEGMENTS = 16;
const NB_VERTICES_BY_FACE = 6;
const NB_VERTICES_BY_PLANE = NB_VERTICES_BY_FACE * CUBE_SEGMENTS * CUBE_SEGMENTS;
const NB_VERTICES = 6 * NB_VERTICES_BY_PLANE;
const NB_GROUPS_BY_FACE = CUBE_SEGMENTS * CUBE_SEGMENTS;

function tileId(tile) {
  return `${tile.face}:${tile.col}x${tile.row}`;
}

const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();
const vertexPosition = new THREE.Vector3();

/**
 * @summary Adapter for tiled cubemaps
 * @memberof PSV.adapters
 */
export class CubemapTilesAdapter extends CubemapAdapter {

  static id = 'cubemap-tiles';
  static supportsTransition = false;
  static supportsPreload = false;
  static supportsDownload = false;

  /**
   * @param {PSV.Viewer} psv
   * @param {PSV.adapters.CubemapTilesAdapter.Options} options
   */
  constructor(psv, options) {
    super(psv);

    /**
     * @member {PSV.adapters.CubemapTilesAdapter.Options}
     * @private
     */
    this.config = {
      flipTopBottom: false,
      showErrorTile: true,
      baseBlur     : true,
      ...options,
    };

    /**
     * @member {external:THREE.MeshBasicMaterial[]}
     * @private
     */
    this.materials = [];

    /**
     * @member {PSV.adapters.Queue}
     * @private
     */
    this.queue = new Queue();

    /**
     * @type {Object}
     * @property {int} tileSize - size in pixels of a tile
     * @property {int} facesByTile - number of mesh faces by tile
     * @property {Record<string, boolean>} tiles - loaded tiles
     * @property {external:THREE.BoxGeometry} geom
     * @property {*} originalUvs
     * @property {external:THREE.MeshBasicMaterial} errorMaterial
     * @private
     */
    this.prop = {
      tileSize     : 0,
      facesByTile  : 0,
      tiles        : {},
      geom         : null,
      originalUvs  : null,
      errorMaterial: null,
    };

    /**
     * @member {external:THREE.ImageLoader}
     * @private
     */
    this.loader = new THREE.ImageLoader();
    if (this.psv.config.withCredentials) {
      this.loader.setWithCredentials(true);
    }
    if (this.psv.config.requestHeaders && typeof this.psv.config.requestHeaders === 'object') {
      this.loader.setRequestHeader(this.psv.config.requestHeaders);
    }

    this.psv.on(CONSTANTS.EVENTS.POSITION_UPDATED, this);
    this.psv.on(CONSTANTS.EVENTS.ZOOM_UPDATED, this);
  }

  destroy() {
    this.psv.off(CONSTANTS.EVENTS.POSITION_UPDATED, this);
    this.psv.off(CONSTANTS.EVENTS.ZOOM_UPDATED, this);

    this.__cleanup();

    this.prop.errorMaterial?.map?.dispose();
    this.prop.errorMaterial?.dispose();

    delete this.queue;
    delete this.loader;
    delete this.prop.geom;
    delete this.prop.originalUvs;
    delete this.prop.errorMaterial;

    super.destroy();
  }

  handleEvent(e) {
    /* eslint-disable */
    switch (e.type) {
      case CONSTANTS.EVENTS.POSITION_UPDATED:
      case CONSTANTS.EVENTS.ZOOM_UPDATED:
        this.__refresh();
        break;
    }
    /* eslint-enable */
  }

  /**
   * @summary Clears loading queue, dispose all materials
   * @private
   */
  __cleanup() {
    this.queue.clear();
    this.prop.tiles = {};

    this.materials.forEach((mat) => {
      mat?.map?.dispose();
      mat?.dispose();
    });
    this.materials.length = 0;
  }

  /**
   * @override
   * @param {PSV.adapters.CubemapTilesAdapter.Panorama} panorama
   * @returns {Promise.<PSV.TextureData>}
   */
  loadTexture(panorama) {
    if (typeof panorama !== 'object' || !panorama.faceSize || !panorama.nbTiles || !panorama.tileUrl) {
      return Promise.reject(new PSVError('Invalid panorama configuration, are you using the right adapter?'));
    }
    if (panorama.nbTiles > CUBE_SEGMENTS) {
      return Promise.reject(new PSVError(`Panorama nbTiles must not be greater than ${CUBE_SEGMENTS}.`));
    }
    if (!utils.isPowerOfTwo(panorama.nbTiles)) {
      return Promise.reject(new PSVError('Panorama nbTiles must be power of 2.'));
    }

    this.prop.tileSize = panorama.faceSize / panorama.nbTiles;
    this.prop.facesByTile = CUBE_SEGMENTS / panorama.nbTiles;

    if (this.prop.geom) {
      this.prop.geom.setAttribute('uv', this.prop.originalUvs.clone());
    }

    if (panorama.baseUrl) {
      return super.loadTexture(panorama.baseUrl)
        .then(textureData => ({
          panorama: panorama,
          texture : textureData.texture,
        }));
    }
    else {
      return Promise.resolve({ panorama });
    }
  }

  /**
   * @override
   */
  createMesh(scale = 1) {
    const cubeSize = CONSTANTS.SPHERE_RADIUS * 2 * scale;
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize, CUBE_SEGMENTS, CUBE_SEGMENTS, CUBE_SEGMENTS)
      .scale(1, 1, -1)
      .toNonIndexed();

    geometry.clearGroups();
    for (let i = 0, k = 0; i < NB_VERTICES; i += NB_VERTICES_BY_FACE) {
      geometry.addGroup(i, NB_VERTICES_BY_FACE, k++);
    }

    this.prop.geom = geometry;
    this.prop.originalUvs = geometry.getAttribute('uv').clone();

    return new THREE.Mesh(geometry, this.materials);
  }

  /**
   * @summary Applies the base texture and starts the loading of tiles
   * @override
   */
  setTexture(mesh, textureData) {
    this.__cleanup();

    if (textureData.texture) {
      for (let i = 0; i < 6; i++) {
        const texture = textureData.texture[i];

        if (this.config.flipTopBottom && (i === 2 || i === 3)) {
          texture.center = new THREE.Vector2(0.5, 0.5);
          texture.rotation = Math.PI;
        }

        const material = new THREE.MeshBasicMaterial({ map: texture });

        for (let j = 0; j < NB_GROUPS_BY_FACE; j++) {
          this.materials.push(material);
        }
      }
    }
    else {
      const material = new THREE.MeshBasicMaterial({ opacity: 0, transparent: true });

      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < NB_GROUPS_BY_FACE; j++) {
          this.materials.push(material);
        }
      }
    }

    // this.psv.renderer.scene.add(createWireFrame(this.prop.geom));

    setTimeout(() => this.__refresh(true));
  }

  /**
   * @summary Compute visible tiles and load them
   * @private
   */
  __refresh(init = false) { // eslint-disable-line no-unused-vars
    const panorama = this.psv.config.panorama;

    if (!panorama) {
      return;
    }

    const camera = this.psv.renderer.camera;
    camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const verticesPosition = this.prop.geom.getAttribute('position');
    const tilesToLoad = [];

    for (let face = 0; face < 6; face++) {
      for (let col = 0; col < panorama.nbTiles; col++) {
        for (let row = 0; row < panorama.nbTiles; row++) {
          // for each tile, find the vertices corresponding to the four corners
          // if at least one vertex is visible, the tile must be loaded
          // for larger tiles we also test the four edges centers and the tile center
          const verticesIndex = [];

          // top-left
          const v0 = face * NB_VERTICES_BY_PLANE
            + row * this.prop.facesByTile * CUBE_SEGMENTS * NB_VERTICES_BY_FACE
            + col * this.prop.facesByTile * NB_VERTICES_BY_FACE;

          // bottom-left
          const v1 = v0 + CUBE_SEGMENTS * NB_VERTICES_BY_FACE * (this.prop.facesByTile - 1) + 1;

          // bottom-right
          const v2 = v1 + this.prop.facesByTile * NB_VERTICES_BY_FACE - 3;

          // top-right
          const v3 = v0 + this.prop.facesByTile * NB_VERTICES_BY_FACE - 1;

          verticesIndex.push(v0, v1, v2, v3);

          if (this.prop.facesByTile >= CUBE_SEGMENTS / 2) {
            // top-center
            const v4 = v0 + this.prop.facesByTile / 2 * NB_VERTICES_BY_FACE - 1;

            // bottom-center
            const v5 = v1 + this.prop.facesByTile / 2 * NB_VERTICES_BY_FACE - 3;

            // left-center
            const v6 = v0 + CUBE_SEGMENTS * NB_VERTICES_BY_FACE * (this.prop.facesByTile / 2 - 1) + 1;

            // right-center
            const v7 = v6 + this.prop.facesByTile * NB_VERTICES_BY_FACE - 3;

            // center-center
            const v8 = v6 + this.prop.facesByTile / 2 * NB_VERTICES_BY_FACE;

            verticesIndex.push(v4, v5, v6, v7, v8);
          }

          // if (init && face === 5 && col === 0 && row === 0) {
          //   verticesIndex.forEach((vertexIdx) => {
          //     this.psv.renderer.scene.add(createDot(
          //       verticesPosition.getX(vertexIdx),
          //       verticesPosition.getY(vertexIdx),
          //       verticesPosition.getZ(vertexIdx)
          //     ));
          //   });
          // }

          const vertexVisible = verticesIndex.some((vertexIdx) => {
            vertexPosition.set(
              verticesPosition.getX(vertexIdx),
              verticesPosition.getY(vertexIdx),
              verticesPosition.getZ(vertexIdx)
            );
            vertexPosition.applyEuler(this.psv.renderer.meshContainer.rotation);
            return frustum.containsPoint(vertexPosition);
          });

          if (vertexVisible) {
            const angle = vertexPosition.angleTo(this.psv.prop.direction);
            tilesToLoad.push({ face, col, row, angle });
          }
        }
      }
    }

    this.__loadTiles(tilesToLoad);
  }

  /**
   * @summary Loads tiles and change existing tiles priority
   * @param {PSV.adapters.CubemapTilesAdapter.Tile[]} tiles
   * @private
   */
  __loadTiles(tiles) {
    this.queue.disableAllTasks();

    tiles.forEach((tile) => {
      const id = tileId(tile);

      if (this.prop.tiles[id]) {
        this.queue.setPriority(id, tile.angle);
      }
      else {
        this.prop.tiles[id] = true;
        this.queue.enqueue(new Task(id, tile.angle, task => this.__loadTile(tile, task)));
      }
    });

    this.queue.start();
  }

  /**
   * @summary Loads and draw a tile
   * @param {PSV.adapters.CubemapTilesAdapter.Tile} tile
   * @param {PSV.adapters.Task} task
   * @return {Promise}
   * @private
   */
  __loadTile(tile, task) {
    const panorama = this.psv.config.panorama;

    let { col, row } = tile;
    if (this.config.flipTopBottom && (tile.face === 2 || tile.face === 3)) {
      col = panorama.nbTiles - col - 1;
      row = panorama.nbTiles - row - 1;
    }
    const url = panorama.tileUrl(CUBE_HASHMAP[tile.face], col, row);

    if (this.psv.config.requestHeaders && typeof this.psv.config.requestHeaders === 'function') {
      this.loader.setRequestHeader(this.psv.config.requestHeaders(url));
    }

    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    })
      .then((image) => {
        if (!task.isCancelled()) {
          const material = new THREE.MeshBasicMaterial({ map: utils.createTexture(image) });
          this.__swapMaterial(tile.face, tile.col, tile.row, material);
          this.psv.needsUpdate();
        }
      })
      .catch(() => {
        if (!task.isCancelled() && this.config.showErrorTile) {
          if (!this.prop.errorMaterial) {
            this.prop.errorMaterial = buildErrorMaterial(this.prop.tileSize, this.prop.tileSize);
          }
          this.__swapMaterial(tile.face, tile.col, tile.row, this.prop.errorMaterial);
          this.psv.needsUpdate();
        }
      });
  }

  /**
   * @summary Applies a new texture to the faces
   * @param {int} face
   * @param {int} col
   * @param {int} row
   * @param {external:THREE.MeshBasicMaterial} material
   * @private
   */
  __swapMaterial(face, col, row, material) {
    const uvs = this.prop.geom.getAttribute('uv');

    for (let c = 0; c < this.prop.facesByTile; c++) {
      for (let r = 0; r < this.prop.facesByTile; r++) {
        // position of the face (two triangles of the same square)
        const faceCol = col * this.prop.facesByTile + c;
        const faceRow = row * this.prop.facesByTile + r;

        // first vertex for this face (6 vertices in total)
        const firstVertex = NB_VERTICES_BY_PLANE * face + 6 * (CUBE_SEGMENTS * faceRow + faceCol);

        // swap material
        const matIndex = this.prop.geom.groups.find(g => g.start === firstVertex).materialIndex;
        this.materials[matIndex] = material;

        // define new uvs
        let top = 1 - r / this.prop.facesByTile;
        let bottom = 1 - (r + 1) / this.prop.facesByTile;
        let left = c / this.prop.facesByTile;
        let right = (c + 1) / this.prop.facesByTile;

        if (this.config.flipTopBottom && (face === 2 || face === 3)) {
          top = 1 - top;
          bottom = 1 - bottom;
          left = 1 - left;
          right = 1 - right;
        }

        uvs.setXY(firstVertex, left, top);
        uvs.setXY(firstVertex + 1, left, bottom);
        uvs.setXY(firstVertex + 2, right, top);
        uvs.setXY(firstVertex + 3, left, bottom);
        uvs.setXY(firstVertex + 4, right, bottom);
        uvs.setXY(firstVertex + 5, right, top);
      }
    }

    uvs.needsUpdate = true;
  }

  /**
   * @summary Create the texture for the base image
   * @param {HTMLImageElement} img
   * @return {external:THREE.Texture}
   * @override
   * @private
   */
  __createCubemapTexture(img) {
    if (img.width !== img.height) {
      utils.logWarn('Invalid base image, the width should equals the height');
    }

    return createBaseTexture(img, this.config.baseBlur, w => w);
  }

}
