# MarkersPlugin

<ApiButton page="PSV.plugins.MarkersPlugin.html"/>

> Displays various markers/hotspots on the viewer.

This plugin is available in the core `photo-sphere-viewer` package in `dist/plugins/markers.js` and `dist/plugins/markers.css`.

[[toc]]

## Usage

The plugin provides a powerful markers system allowing to define points of interest on the panorama with optional tooltip and description. Markers can be dynamically added/removed and you can react to user click/tap.

There are four types of markers :

- **HTML** defined with the `html` attribute
- **Images** defined with the `image` or `imageLayer` attribute
- **SVGs** defined with the `rect`, `circle`, `ellipse` or `path` attribute
- **Dynamic polygons & polylines** defined with the `polygonPx`/`polygonRad`/`polylinePx`/`polylineRad` attribute

Markers can be added at startup with the `markers` option or after load with the various methods.

```js
const viewer = new PhotoSphereViewer.Viewer({
  plugins: [
    [PhotoSphereViewer.MarkersPlugin, {
      markers: [
        {
          id: 'new-marker',
          longitude: '45deg',
          latitude: '0deg',
          image: 'assets/pin-red.png',
        },
      ],
    }],
  ],
});

const markersPlugin = viewer.getPlugin(PhotoSphereViewer.MarkersPlugin);

markersPlugin.on('select-marker', (e, marker) => {
  markersPlugin.updateMarker({
    id: marker.id,
    image: 'assets/pin-blue.png'
  });
});
```


## Example

The following example contains all types of markers. Click anywhere on the panorama to add a red marker, right-click to change it's color and double-click to remove it.

<iframe style="width: 100%; height: 500px;" src="//jsfiddle.net/mistic100/kdpqLey2/embedded/result,js,html/dark" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

::: tip
You can try markers live in [the playground](../playground.md).
:::


## Markers definition

One of these options is required.

| Name | Type | Description |
|---|---|---|
| `image` | `string` | Path to the image representing the marker. Requires `width` and `height` to be defined. |
| `imageLayer` | `string` | Path to the image representing the marker. Requires `width` and `height` to be defined. |
| `html` | `string` | HTML content of the marker. It is recommended to define `width` and `height`. |
| `square` | `integer` | Size of the square. |
| `rect` | `integer[2] |`<br>`{width:int,height:int}` | Size of the rectangle. |
| `circle` | `integer` | Radius of the circle. |
| `ellipse` | `integer[2] |`<br>`{cx:int,cy:int}` | Radiuses of the ellipse. |
| `path` | `string` | Definition of the path (0,0 will be placed at the defined x/y or longitude/latitude). |
| `polygonPx` | `integer[2][]` |Array of points defining the polygon in pixel coordinates on the panorama image. |
| `polygonRad` | `double[2][]` | Same as above but coordinates are in longitude and latitude. |
| `polylinePx` | `integer[2][]` | Same as `polygonPx` but generates a polyline. |
| `polylineRad` | `double[2][]` | Same as `polygonRad` but generates a polyline. |

**Examples :**

```js
{
  image: 'pin-red.png',
  imageLayer: 'pin-blue.png',
  html: 'Click here',
  square: 10,
  rect: [10, 5],
  rect: {width: 10, height: 5},
  circle: 10,
  ellipse: [10, 5],
  ellipse: {cx: 10, cy: 5},
  path: 'M 0 0 L 60 60 L 60 0 L 0 60 L 0 0',
  polygonPx: [[100, 200], [150, 300], [300, 200]],
  polygonRad: [[0.2, 0.4], [0.9, 1.1], [1.5, 0.7]],
  polylinePx: [[100, 200], [150, 300]],
  polylineRad: [[0.2, 0.4], [0.9, 1.1]],
}
```

::: tip What is the difference between "image" and "imageLayer" ?
Both allows to display an image but the difference is in the rendering technique.
And `image` marker is rendered flat above the viewer but and `imageLayer` is rendered inside the panorama itself, this allows for more natural movements and scaling.
:::

::: warning
Texture coordinates are not applicable to cubemaps.
:::



## Markers options

#### `id` (required)
- type: `string`

Unique identifier of the marker.

#### `x` & `y` or `latitude` & `longitude` (required for all but polygons/polylines)
- type: `integer` or `double`

Position of the marker in **texture coordinates** (pixels) or **spherical coordinates** (radians).
_(This option is ignored for polygons and polylines)._

#### `width` & `height` (required for images, recommended for html)
- type: `integer`

Size of the marker in pixels.
_(This option is ignored for polygons and polylines)._

#### `scale`
- type: `double[] | { zoom: double[], longitude: [] }`
- default: no scalling

Configures the scale of the marker depending on the zoom level and/or the longitude offset. This aims to give a natural feeling to the size of the marker as the users zooms and moves.
_(This option is ignored for polygons, polylines and imageLayer)._

Scales depending on zoom level, the array contains `[scale at minimum zoom, scale at maximum zoom]` :
```js
scale: {
  // the marker is twice smaller on the minimum zoom level
  zoom: [0.5, 1]
}

// same thing
scale: [0.5, 1]
```

Scales depending on position, the array contains `[scale on center, scale on the side]` :
```js
scale: {
  // the marker is twice bigger when on the side of the screen
  longitude: [1, 2]
}
```

Of course the two configurations can be combined :
```js
scale: {
  zoom: [0.5, 1],
  longitude: [1, 1.5]
}
```

#### `className`
- type: `string`

CSS class(es) added to the marker element.
_(This option is ignored for imageLayer markers)._

#### `style`
- type: `object`

CSS properties to set on the marker (background, border, etc.).
_(This option is ignored for imageLayer markers)._

```js
style: {
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  cursor         : 'help'
}
```

#### `svgStyle`
- type: `object`

SVG properties to set on the marker (fill, stroke, etc.).
_(Only for polygons, polylines and svg markers)._

```js
svgStyle: {
  fill       : 'rgba(0, 0, 0, 0.5)',
  stroke     : '#ff0000',
  strokeWidth: '2px'
}
```

::: tip Image and pattern background
You can define complex SVG backgrounds such as images by using a pattern definition.

First declare the pattern somewhere in your page :

```html
<svg id="patterns">
  <defs>
    <!-- define pattern origin on its center -->
    <pattern id="image" x="256" y="256" width="512" height="512" patternUnits="userSpaceOnUse">
      <image href="my-image.jpg" x="0" y="0" width="512" height="512"/>
    </pattern>
  </defs>
</svg>
```

And use it in your marker : `fill: 'url(#image)'`.
:::

#### `anchor`
- type: `string`
- default: `'center center'`

Defines where the marker is placed toward its defined position. Any CSS position is valid like `bottom center` or `20% 80%`.
_(This option is ignored for polygons and polylines)._

#### `visible`
- type: `boolean`
- default: `true`

Initial visibility of the marker.

#### `tooltip`
- type: `string | {content: string, position: string}`
- default: `{content: null, position: 'top center'}`

Tooltip content and position. Accepted positions are combinations of `top`, `center`, `bottom` and `left`, `center`, `right` with the exception of `center center`.

```js
tooltip: 'This is a marker' // tooltip with default position

tooltip: { // tooltip with custom position
  content : 'This is marker',
  position: 'bottom left'
}
```

#### `listContent`
- type: `string`

The name that appears in the list of markers. If not provided, the tooltip content will be used.

#### `content`
- type: `string`

HTML content that will be displayed on the side panel when the marker is clicked.

#### `hideList`
- type: `boolean`
- default: `false`

Hide the marker in the markers list.

#### `data`
- type: `any`

Any custom data you want to attach to the marker. You may access this data in the various [events](#events).


## Configuration

#### `lang`
- type: `object`
- default:
```js
lang: {
  markers    : 'Markers',
  markersList: 'Markers list',
}
```

_Note: this option is not part of the plugin but is merged with the main [`lang`](../guide/config.md#lang) object._

#### `clickEventOnMarker`
- type: `boolean`
- default: `false`

If a `click` event is triggered on the viewer additionally to the `select-marker` event.


## Methods

#### `addMarker(properties)`

Adds a new marker to the viewer.

```js
markersPlugin.addMarker({
  id: 'new-marker',
  longitude: '45deg',
  latitude: '0deg',
  image: 'assets/pin-red.png',
});
```

#### `clearMarkers()`

Removes all markers.

#### `getCurrentMarker(): Marker`

Returns the last marker clicked by the user.

#### `gotoMarker(id, speed): Animation`

Moves the view to center a specific marker, with optional [animation](../guide/methods.md#animate-options-animation).

```js
markersPlugin.gotoMarker('marker-1', 1500)
  .then(() => /* animation complete */);
```

#### `hideMarker(id)` | `showMarker(id)` | `toggleMarker(id)`

Changes the visiblity of a marker.

#### `removeMarker(id)` | `removeMarkers(ids)`

Removes a marker.

#### `setMarkers(properties[])`

Replaces all markers by new ones.

#### `updateMarker(properties)`

Updates a marker with new properties. The type of the marker cannot be changed.

```js
markersPlugin.updateMarker({
  id: 'existing-marker',
  image: 'assets/pin-blue.png',
});
```


## Events

#### `over-marker(marker)` | `leave-marker(marker)`

Triggered when the user puts the cursor hover or away a marker.

```js
markersPlugin.on('over-marker', (e, marker) => {
  console.log(`Cursor is over marker ${marker.id}`);
});
```

#### `select-marker(marker, data)`

Triggered when the user clicks on a marker. The `data` object indicates if the marker was selected with a double a click on a right click.

#### `unselect-marker(marker)`

Triggered when a marker was selected and the user clicks elsewhere.


## Buttons

This plugin adds buttons to the default navbar:
- `markers` allows to hide/show all markers
- `markersList` allows to open a list of all markers on the left panel

If you use a [custom navbar](../guide/navbar.md) you will need to manually add the buttons to the list.
