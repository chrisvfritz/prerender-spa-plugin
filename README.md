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
        }
      }
    )
  ]
}
```

### Caveats

- Only works with routing strategies using the HTML5 history API. No hash(bang) URLs.
- The frontend rendering library must be capable of taking over after prerendering
  - __Vue 1.x__: Make sure to use [`replace: false`](http://vuejs.org/api/#replace) for root components
  - __Vue 2.x__: Make sure the root component has the same id as the element it's replacing


##### Out-of-Order Webpack Chunks

Generate and visit a prerendered endpoint. If the debug console reads `Uncaught ReferenceError: webpackJsonp is not defined`, then you likely have out-of-order webpack chunks.

Depending on your project's complexity, `webpack` may dynamically inject additional chunks into the document as PhantomJS visits each endpoint. These `async` chunks [can be problematic](https://github.com/chrisvfritz/prerender-spa-plugin/issues/9), as there is no guarantee critical manifest scripts will be evaluated first.

###### Solution

Async-injected chunks are expected behavior for webpack and furthermore, the library is [hardcoded](https://github.com/webpack/webpack/blob/1.0/lib/JsonpMainTemplate.js#L70) to only inject into `<head>`, so we must configure `html-webpack-plugin` and use `inject: 'head'`

```js
// file: webpack.prod.conf.js

// ...

new HtmlWebpackPlugin({
  filename: process.env.NODE_ENV === 'testing'
    ? 'index.html'
    : config.build.index,
  template: 'index.html',

  // Ensure all webpack <scripts> are injected into <head>
  inject: 'head',
  // Ensure chunks are evaluated in correct order
  chunksSortMode: 'dependency'

}),

```

Now, critical scripts will be evaluated before the DOM is fully parsed, so we listen for `DOMContentLoaded` _before_ mounting Vue:

```js
// file: main.js

import Vue from 'vue'
import App from './App.vue'

document.addEventListener('DOMContentLoaded', () => {

  // simple
  new Vue({
    el: '#app',
    render: h => h(App)
  })

  // vue-router (2.x)
  new Vue({
  router,
  template: `
    <div id="app">
      <router-view class="view"></router-view>
    </div>
    `
  }).$mount('#app')

  // vue-router (1.x)
  router.start(App, '#app')

})

```
