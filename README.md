<p align="center"><img width="100" src="https://github.com/chrisvfritz/prerender-spa-plugin/blob/master/art/logo.png?raw=true"></p>

# Prerender SPA Plugin

highly configurable, JS framework agnostic static site generation

## Usage

### Webpack

``` js
var Path = require('path')
var PrerenderSpaPlugin = require('prerender-spa-plugin')

module.exports = {

  // ...

  plugins: [
    new PrerenderSpaPlugin(
      // (REQUIRED) Absolute path to static root
      Path.join(__dirname, 'relative/path/to/static/root'),
      // (REQUIRED) List of routes to prerender
      [ '/', '/about', '/contact' ],
      // (OPTIONAL) Options
      {
        // NOTE: Unless you are relying on asynchronously rendered content,
        // such as after an Ajax request, none of these options should be
        // necessary. All synchronous scripts are already executed before
        // capturing the page content.

        // Wait until a specific event is fired on the document.
        captureAfterDocumentEvent: 'custom-post-render-event',
        // This is how you would trigger this example event:
        // document.dispatchEvent(new Event('custom-post-render-event'))

        // Wait until a specific element is detected with
        // document.querySelector.
        captureAfterElementExists: '#content',

        // Wait until a number of milliseconds has passed after scripts
        // have been executed. It's important to note that this may
        // produce unreliable results when relying on network
        // communication or other operations with highly variable timing.
        captureAfterTime: 5000

        // NOTE: You can even combine strategies if you like. For example,
        // if you only _sometimes_ want to wait for an event to fire, you
        // can create a timeout by combining captureAfterTime with
        // captureAfterDocumentEvent. When combining strategies, page
        // content will be captured after the first triggered strategy.
      }
    )
  ]
}
```

### Caveats

- Only works with routing strategies using the HTML5 history API. No hash(bang) URLs.
- The frontend rendering library must be capable of taking over after prerendering
  - __Vue__: Make sure to use [`replace: false`](http://vuejs.org/api/#replace) for root components
