import * as THREE from 'three';
import { PSVError } from '../PSVError';
import { bound } from './math';

/**
 * @summary Returns the plugin constructor from the imported object
 * For retrocompatibility with previous default exports
 * @memberOf PSV.utils
 * @package
 */
export function pluginInterop(plugin, target) {
  if (plugin) {
    for (const [, p] of [['_', plugin], ...Object.entries(plugin)]) {
      if (p.prototype instanceof target) {
        return p;
      }
    }
  }
  return null;
}

/**
 * @summary Builds an Error with name 'AbortError'
 * @memberOf PSV.utils
 * @return {Error}
 */
export function getAbortError() {
  const error = new Error('Loading was aborted.');
  error.name = 'AbortError';
  return error;
}

/**
 * @summary Tests if an Error has name 'AbortError'
 * @memberOf PSV.utils
 * @param {Error} err
 * @return {boolean}
 */
export function isAbortError(err) {
  return err?.name === 'AbortError';
}

/**
 * @summary Displays a warning in the console
 * @memberOf PSV.utils
 * @param {string} message
 */
export function logWarn(message) {
  console.warn(`PhotoSphereViewer: ${message}`);
}

/**
 * @summary Checks if an object is a {PSV.ExtendedPosition}, ie has x/y or longitude/latitude
 * @memberOf PSV.utils
 * @param {object} object
 * @returns {boolean}
 */
export function isExtendedPosition(object) {
  return [['x', 'y'], ['longitude', 'latitude']].some(([key1, key2]) => {
    return object[key1] !== undefined && object[key2] !== undefined;
  });
}

/**
 * @summary Returns the value of a given attribute in the panorama metadata
 * @memberOf PSV.utils
 * @param {string} data
 * @param {string} attr
 * @returns (number)
 */
export function getXMPValue(data, attr) {
  // XMP data are stored in children
  let result = data.match('<GPano:' + attr + '>(.*)</GPano:' + attr + '>');
  if (result !== null) {
    const val = parseInt(result[1], 10);
    return isNaN(val) ? null : val;
  }

  // XMP data are stored in attributes
  result = data.match('GPano:' + attr + '="(.*?)"');
  if (result !== null) {
    const val = parseInt(result[1], 10);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * @readonly
 * @private
 * @type {{top: string, left: string, bottom: string, center: string, right: string}}
 */
const CSS_POSITIONS = {
  top   : '0%',
  bottom: '100%',
  left  : '0%',
  right : '100%',
  center: '50%',
};

/**
 * @summary Translate CSS values like "top center" or "10% 50%" as top and left positions
 * @memberOf PSV.utils
 * @description The implementation is as close as possible to the "background-position" specification
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/background-position}
 * @param {string|PSV.Point} value
 * @returns {PSV.Point}
 */
export function parsePosition(value) {
  if (!value) {
    return { x: 0.5, y: 0.5 };
  }

  if (typeof value === 'object') {
    return value;
  }

  let tokens = value.toLocaleLowerCase().split(' ').slice(0, 2);

  if (tokens.length === 1) {
    if (CSS_POSITIONS[tokens[0]] !== undefined) {
      tokens = [tokens[0], 'center'];
    }
    else {
      tokens = [tokens[0], tokens[0]];
    }
  }

  const xFirst = tokens[1] !== 'left' && tokens[1] !== 'right' && tokens[0] !== 'top' && tokens[0] !== 'bottom';

  tokens = tokens.map(token => CSS_POSITIONS[token] || token);

  if (!xFirst) {
    tokens.reverse();
  }

  const parsed = tokens.join(' ').match(/^([0-9.]+)% ([0-9.]+)%$/);

  if (parsed) {
    return {
      x: parseFloat(parsed[1]) / 100,
      y: parseFloat(parsed[2]) / 100,
    };
  }
  else {
    return { x: 0.5, y: 0.5 };
  }
}

/**
 * @readonly
 * @private
 */
const LEFT_MAP = { 0: 'left', 0.5: 'center', 1: 'right' };
/**
 * @readonly
 * @private
 */
const TOP_MAP = { 0: 'top', 0.5: 'center', 1: 'bottom' };

/**
 * @summary Parse a CSS-like position into an array of position keywords among top, bottom, left, right and center
 * @memberOf PSV.utils
 * @param {string | string[]} value
 * @param {string} defaultValue
 * @param {boolean} [allowCenter=true]
 * @return {string[]}
 */
export function cleanPosition(value, defaultValue, allowCenter = true) {
  if (!value) {
    return defaultValue.split(' ');
  }

  if (typeof value === 'string') {
    const tempPos = parsePosition(value);

    if (!(tempPos.x in LEFT_MAP) || !(tempPos.y in TOP_MAP)) {
      throw new PSVError(`Unable to parse position "${value}"`);
    }

    value = [TOP_MAP[tempPos.y], LEFT_MAP[tempPos.x]];
  }

  if (!allowCenter && value[0] === 'center' && value[1] === 'center') {
    throw new PSVError('Unable to parse position "center center"');
  }

  return value;
}

/**
 * @summary Parses an speed
 * @memberOf PSV.utils
 * @param {string|number} speed - The speed, in radians/degrees/revolutions per second/minute
 * @returns {number} radians per second
 * @throws {PSV.PSVError} when the speed cannot be parsed
 */
export function parseSpeed(speed) {
  let parsed;

  if (typeof speed === 'string') {
    const speedStr = speed.toString().trim();

    // Speed extraction
    let speedValue = parseFloat(speedStr.replace(/^(-?[0-9]+(?:\.[0-9]*)?).*$/, '$1'));
    const speedUnit = speedStr.replace(/^-?[0-9]+(?:\.[0-9]*)?(.*)$/, '$1').trim();

    // "per minute" -> "per second"
    if (speedUnit.match(/(pm|per minute)$/)) {
      speedValue /= 60;
    }

    // Which unit?
    switch (speedUnit) {
      // Degrees per minute / second
      case 'dpm':
      case 'degrees per minute':
      case 'dps':
      case 'degrees per second':
        parsed = THREE.Math.degToRad(speedValue);
        break;

      // Radians per minute / second
      case 'rdpm':
      case 'radians per minute':
      case 'rdps':
      case 'radians per second':
        parsed = speedValue;
        break;

      // Revolutions per minute / second
      case 'rpm':
      case 'revolutions per minute':
      case 'rps':
      case 'revolutions per second':
        parsed = speedValue * Math.PI * 2;
        break;

      // Unknown unit
      default:
        throw new PSVError('Unknown speed unit "' + speedUnit + '"');
    }
  }
  else {
    parsed = speed;
  }

  return parsed;
}

/**
 * @summary Parses an angle value in radians or degrees and returns a normalized value in radians
 * @memberOf PSV.utils
 * @param {string|number} angle - eg: 3.14, 3.14rad, 180deg
 * @param {boolean} [zeroCenter=false] - normalize between -Pi - Pi instead of 0 - 2*Pi
 * @param {boolean} [halfCircle=zeroCenter] - normalize between -Pi/2 - Pi/2 instead of -Pi - Pi
 * @returns {number}
 * @throws {PSV.PSVError} when the angle cannot be parsed
 */
export function parseAngle(angle, zeroCenter = false, halfCircle = zeroCenter) {
  let parsed;

  if (typeof angle === 'string') {
    const match = angle.toLowerCase().trim().match(/^(-?[0-9]+(?:\.[0-9]*)?)(.*)$/);

    if (!match) {
      throw new PSVError('Unknown angle "' + angle + '"');
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    if (unit) {
      switch (unit) {
        case 'deg':
        case 'degs':
          parsed = THREE.Math.degToRad(value);
          break;
        case 'rad':
        case 'rads':
          parsed = value;
          break;
        default:
          throw new PSVError('Unknown angle unit "' + unit + '"');
      }
    }
    else {
      parsed = value;
    }
  }
  else if (typeof angle === 'number' && !isNaN(angle)) {
    parsed = angle;
  }
  else {
    throw new PSVError('Unknown angle "' + angle + '"');
  }

  parsed = (zeroCenter ? parsed + Math.PI : parsed) % (Math.PI * 2);

  if (parsed < 0) {
    parsed += Math.PI * 2;
  }

  return zeroCenter ? bound(parsed - Math.PI, -Math.PI / (halfCircle ? 2 : 1), Math.PI / (halfCircle ? 2 : 1)) : parsed;
}

/**
 * @summary Creates a THREE texture from an image
 * @memberOf PSV.utils
 * @param {HTMLImageElement | HTMLCanvasElement} img
 * @return {external:THREE.Texture}
 */
export function createTexture(img) {
  const texture = new THREE.Texture(img);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

const quaternion = new THREE.Quaternion();

/**
 * @summary Applies the inverse of Euler angles to a vector
 * @memberOf PSV.utils
 * @param {external:THREE.Vector3} vector
 * @param {external:THREE.Euler} euler
 */
export function applyEulerInverse(vector, euler) {
  quaternion.setFromEuler(euler).invert();
  vector.applyQuaternion(quaternion);
}
