# prerender-spa-plugin

Prerenders static HTML in a single-page application.

## Usage

### Webpack

``` js
var Path = require('path')
var PrerenderSpaPlugin = require('prerender-spa-plugin')

module.exports = {

  // ...

  plugins: [
    new PrerenderSpaPlugin(
      // (Required) Absolute path to static root
      Path.join(__dirname, 'relative/path/to/static/root'),
      // (Required) List of routes to prerender
      [ '/', '/about', '/contact' ],
      // (Optional) Options
      {
        // Number of milliseconds to wait for AJAX content to load
        wait: 5000 // Default: 0
      }
    )
  ]
}
```

### Caveats

- Only works with routing strategies using the HTML5 history API. No hash(bang) URLs.
- The frontend rendering library must be capable of taking over after prerendering
  - __Vue__: Make sure to use [`replace: false`](http://vuejs.org/api/#replace) for root components
