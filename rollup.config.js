import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import fs from 'fs';
import path from 'path';
import localResolve from 'rollup-plugin-local-resolve';
import postcss from 'rollup-plugin-postcss';
import dts from 'rollup-plugin-dts';
import { string } from 'rollup-plugin-string';

import pkg from './package.json';

const plugins = fs.readdirSync(path.join(__dirname, 'src/plugins'))
  .filter(p => fs.lstatSync(`src/plugins/${p}`).isDirectory());

const adapters = fs.readdirSync(path.join(__dirname, 'src/adapters'))
  .filter(p => fs.lstatSync(`src/adapters/${p}`).isDirectory())
  .filter(p => p !== 'equirectangular' && p !== 'shared');

const banner = `/*!
* Photo Sphere Viewer ${pkg.version}
* @copyright 2014-2015 Jérémy Heleine
* @copyright 2015-${new Date().getFullYear()} Damien "Mistic" Sorel
* @licence MIT (https://opensource.org/licenses/MIT)
*/`;

const cssBanner = `Photo Sphere Viewer ${pkg.version}
@copyright 2014-2015 Jérémy Heleine
@copyright 2015-${new Date().getFullYear()} Damien "Mistic" Sorel
@licence MIT (https://opensource.org/licenses/MIT)`;

function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, m => m.toUpperCase())
    .replace(/(?:\W|_)/g, '');
}

const baseConfig = {
  output  : {
    format   : 'umd',
    sourcemap: true,
    interop  : false,
    banner   : banner,
    globals  : {
      'three' : 'THREE',
      'uevent': 'uEvent',
    },
  },
  external: [
    'three',
    'uevent',
  ],
  plugins : () => [
    localResolve(),
    babel({
      exclude     : 'node_modules/**',
      babelHelpers: 'bundled',
    }),
    postcss({
      extract  : true,
      sourceMap: true,
      use      : ['sass'],
      plugins  : [
        require('autoprefixer')({}),
        require('postcss-banner')({
          banner   : cssBanner,
          important: true,
        }),
      ],
    }),
    string({
      include: [
        'src/**/*.svg',
      ],
    }),
    json({
      compact: true,
    }),
  ],
};

const secondaryConfig = {
  ...baseConfig,
  output  : {
    ...baseConfig.output,
    globals: {
      ...baseConfig.output.globals,
      'photo-sphere-viewer'                      : 'PhotoSphereViewer',
      'photo-sphere-viewer/dist/adapters/cubemap': 'PhotoSphereViewer.CubemapAdapter',
    },
  },
  external: [
    ...baseConfig.external,
    'photo-sphere-viewer',
  ],
  plugins : () => [
    replace({
      delimiters           : ['', ''],
      preventAssignment    : true,
      [`from '../..'`]     : `from 'photo-sphere-viewer'`,
      [`from '../cubemap'`]: `from 'photo-sphere-viewer/dist/adapters/cubemap'`,
    }),
    ...baseConfig.plugins(),
  ],
};

const baseConfigDTS = {
  output : {
    format: 'es',
  },
  plugins: () => [
    dts(),
  ],
};

const secondaryConfigDTS = {
  ...baseConfigDTS,
  external: [
    ...secondaryConfig.external,
  ],
  plugins : () => [
    replace({
      delimiters           : ['', ''],
      preventAssignment    : true,
      [`from '../..'`]     : `from 'photo-sphere-viewer'`,
      [`from '../markers'`]: `from 'photo-sphere-viewer/dist/plugins/markers'`,
      [`from '../cubemap'`]: `from 'photo-sphere-viewer/dist/adapters/cubemap'`,
    }),
    ...baseConfigDTS.plugins(),
  ],
};

export default [
  {
    ...baseConfig,
    input  : 'src/index.js',
    output : {
      ...baseConfig.output,
      file: 'dist/photo-sphere-viewer.js',
      name: 'PhotoSphereViewer',
    },
    plugins: baseConfig.plugins(),
  },
  {
    ...baseConfigDTS,
    input  : 'types/index.d.ts',
    output : {
      ...baseConfigDTS.output,
      file: 'dist/photo-sphere-viewer.d.ts',
    },
    plugins: baseConfigDTS.plugins(),
  },
  ...plugins.map(p => ({
    ...secondaryConfig,
    input  : `src/plugins/${p}/index.js`,
    output : {
      ...secondaryConfig.output,
      file: `dist/plugins/${p}.js`,
      name: `PhotoSphereViewer.${camelize(p)}Plugin`,
    },
    plugins: secondaryConfig.plugins(),
  })),
  ...adapters.map(p => ({
    ...secondaryConfig,
    input  : `src/adapters/${p}/index.js`,
    output : {
      ...secondaryConfig.output,
      file: `dist/adapters/${p}.js`,
      name: `PhotoSphereViewer.${camelize(p)}Adapter`,
    },
    plugins: secondaryConfig.plugins(),
  })),
  ...plugins.map(p => ({
    ...secondaryConfigDTS,
    input  : `types/plugins/${p}/index.d.ts`,
    output : {
      ...secondaryConfigDTS.output,
      file: `dist/plugins/${p}.d.ts`,
    },
    plugins: secondaryConfigDTS.plugins(),
  })),
  ...adapters.map(p => ({
    ...secondaryConfigDTS,
    input  : `types/adapters/${p}/index.d.ts`,
    output : {
      ...secondaryConfigDTS.output,
      file: `dist/adapters/${p}.d.ts`,
    },
    plugins: secondaryConfigDTS.plugins(),
  }))
];
