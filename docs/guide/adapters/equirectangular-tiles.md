# Equirectangular tiles

> Reduce the initial loading time and used bandwidth by slicing big equirectangular panoramas into many small tiles.

This adapter is available in the core `photo-sphere-viewer` package in `dist/adapters/equirectangular-tiles.js`.

```js
new PhotoSphereViewer.Viewer({
  adapter: PhotoSphereViewer.EquirectangularTilesAdapter,
  panorama: {
    width: 12000,
    cols: 16,
    rows: 8,
    baseUrl: 'panorama_low.jpg',
    tileUrl: (col, row) => {
      return `panorama_${col}_${row}.jpg`;
    },
  },
});
```

::: warning
This adapter does not use `panoData` option. You can use `sphereCorrection` if the tilt/roll/pan needs to be corrected.
:::


## Example

<iframe style="width: 100%; height: 600px;" src="//jsfiddle.net/mistic100/419yhpek/embedded/result,js/dark" allowfullscreen="allowfullscreen" frameborder="0"></iframe>


## Configuration

#### `baseBlur`
- type: `boolean`
- default: `true`

Applies a 1px blur to the base image (option `baseUrl`).

#### `showErrorTile`
- type: `boolean`
- default: `true`

Shows a warning sign on tiles that cannot be loaded.

#### `resolution`
- type: `number`
- default: `64`

The number of faces of the sphere geometry used to display the panorama, higher values can reduce deformations on straight lines at the cost of performances. 

_Note: the actual number of faces is `resolution² / 2`._


## Panorama options

When using this adapter the `panorama` option and the `setPanorama()` method accept an object to configure the tiles.

#### `width` (required)
- type: `number`

Total width of the panorama, the height is always width / 2.

#### `cols` (required)
- type: `number`

Number of columns, must be power of two (4, 8, 16, 32, 64) and the maximum value is 64.

#### `rows` (required)
- type: `number`

Number of rows, must be power of two (2, 4, 8, 16, 32) and the maximum value is 32.

#### `tileUrl` (required)
- type: `function: (col, row) => string`

Function used to build the URL of a tile.

#### `baseUrl` (recommended)
- type: `string`

URL of a low resolution complete panorama image to display while the tiles are loading.


## Preparing the panorama

The tiles can be easily generated using [ImageMagick](https://imagemagick.org) tool.

Let's say you have a 12.000x6.000 pixels panorama you want to split in 16 columns and 8 rows, use the following command:

```
magick.exe panorama.jpg \
  -crop 750x750 \
  -set filename:tile "%[fx:page.x/750]_%[fx:page.y/750]" \
  -set filename:orig %t \
  %[filename:orig]_%[filename:tile].jpg
```

You can also use this [online tool](https://pinetools.com/split-image).


::: tip Performances
It is recommanded to not exceed tiles with a size of 1024x1024 pixels, thus limiting the maximum panorama size to 65.536x32.768 pixels (2 Gigapixels).
:::
