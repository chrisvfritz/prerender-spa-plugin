<p align="center"><img width="150" src="https://github.com/chrisvfritz/prerender-spa-plugin/blob/master/art/logo.png?raw=true"></p>

<p align="center">
  <a href="https://badge.fury.io/js/prerender-spa-plugin"><img src="https://badge.fury.io/js/prerender-spa-plugin.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/prerender-spa-plugin"><img src="https://img.shields.io/npm/l/prerender-spa-plugin.svg" alt="License"></a>
</p>

<h1 align="center">Prerender SPA Plugin</h1>

<p align="center"><em>highly configurable, framework-agnostic static site generation for SPAs</em></p>

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
        captureAfterTime: 5000,

        // NOTE: You can even combine strategies if you like. For example,
        // if you only _sometimes_ want to wait for an event to fire, you
        // can create a timeout by combining captureAfterTime with
        // captureAfterDocumentEvent. When combining strategies, page
        // content will be captured after the first triggered strategy.

        // Because PhantomJS occasionally runs into an intermittent issue,
        // we will retry a page capture up to 10 times by default. You may
        // raise or lower this limit if you wish.
        maxAttempts: 10,

        // Prevent PhantomJS from navigating away from the URL passed to it
        // and prevent loading embedded iframes (e.g. Disqus and Soundcloud
        // embeds), which are not ideal for SEO and may introduce JS errors.
        navigationLocked: true,

        // The options below expose configuration options for PhantomJS,
        // for the rare case that you need special settings for specific
        // systems or applications.

        // http://phantomjs.org/api/command-line.html#command-line-options
        phantomOptions: '--disk-cache=true',

        // http://phantomjs.org/api/webpage/property/settings.html
        phantomPageSettings: {
          loadImages: true
        },

        // Manually transform the HTML for each page after prerendering,
        // for example to set the page title and metadata in edge cases
        // where you cannot handle this via your routing solution.
        //
        // The function's context argument contains two properties:
        //
        // - html :: the resulting HTML after prerendering)
        // - route :: the route currently being processed
        //            e.g. "/", "/about", or "/contact")
        //
        // Whatever is returned will be printed to the prerendered file.
        postProcessHtml: function (context) {
          var titles = {
            '/': 'Home',
            '/about': 'Our Story',
            '/contact': 'Contact Us'
          }
          return context.html.replace(
            /<title>[^<]*<\/title>/i,
            '<title>' + titles[context.route] + '</title>'
          )
        }
      }
    )
  ]
}
```

#### Code Splitting

If you're using [code splitting](https://webpack.github.io/docs/code-splitting.html), visits to some prerendered pages [might throw](https://github.com/chrisvfritz/prerender-spa-plugin/issues/9): `Uncaught ReferenceError: webpackJsonp is not defined`. That just means some asynchronous chunks that Webpack injects into `<head>` are being evaluated before your main scripts, often in `<body>`.

If you're using `html-webpack-plugin`, you can resolve this by also injecting your main scripts into `<head>` with these options:

```js
new HtmlWebpackPlugin({
  // ... your other options ...
  // Ensure asynchronous chucnks are injected into <head>
  inject: 'head',
  // Ensure chunks are evaluated in correct order
  chunksSortMode: 'dependency'
})
```

If you have code that relies on the existence of `<body>` (and you almost certainly do), simply run it in a callback to the `DOMContentLoaded` event:

```js
document.addEventListener('DOMContentLoaded', function () {
  // your code
})
```

For example, if you're using Vue.js and mounting to a `<div id="app">` in `<body>`:

``` js
var root = new Vue({
  // ...
})

document.addEventListener('DOMContentLoaded', function () {
  root.$mount('#app')
})
```

### Caveats

- Only works with routing strategies using the HTML5 history API. No hash(bang) URLs.
- The frontend rendering library must be capable of taking over after prerendering
  - __Vue 1.x__: Make sure to use [`replace: false`](http://vuejs.org/api/#replace) for root components
  - __Vue 2.x__: Make sure the root component has the same id as the element it's replacing
