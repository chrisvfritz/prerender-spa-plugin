**MAINTAINERS WANTED**: Ahh, so much open source! With my current workload, I simply don't have time to give this project the attention it deserves. If you're interested in becoming a maintainer, please [tweet me](https://twitter.com/chrisvfritz) to let me know!

<p align="center"><img width="150" src="https://github.com/chrisvfritz/prerender-spa-plugin/blob/master/art/logo.png?raw=true"></p>

<p align="center">
  <a href="https://badge.fury.io/js/prerender-spa-plugin"><img src="https://badge.fury.io/js/prerender-spa-plugin.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/prerender-spa-plugin"><img src="https://img.shields.io/npm/l/prerender-spa-plugin.svg" alt="License"></a>
</p>

<h1 align="center">Prerender SPA Plugin</h1>

<p align="center"><em>highly configurable, framework-agnostic static site generation for SPAs</em></p>

## Prerendering vs Server-Side Rendering (SSR)

SSR is, like, _super_ hot right now. Personally though, I think it's overrated. It can significantly increase the complexity of your application and for many use cases, prerendering is a simpler and more appropriate solution. These are the top 2 problems people are typically trying to solve with either of these strategies:

1. __SEO__: When content is loaded asynchronously, crawlers won't wait for it to be loaded.
2. __Slow clients__: When users are accessing your site on a bad Internet connection, you want to be able to show them content as soon as possible, even before all your JS is downloaded and parsed.

Prerendering can improve SEO just as well as SSR, with significantly less setup. As for slow clients, prerendering can serve content even faster and for much cheaper, as a global CDN is much less expensive than globally distributed servers.

Now, here's where prerendering _isn't_ appropriate:

- __User-specific content__: For a route like `/my-profile`, prerendering won't be effective, because the content of that page will be very different depending on who's looking at it. You can sometimes update your routing strategy to compensate, e.g. with `/users/:username/profile`, but only if these are public profiles. Otherwise, you risk leaking private information to the world.
- __Frequently changing content__: If you prerender something like a game leaderboard that's constantly updating with new player rankings, prerendering will display old content until the client-side JS takes over with the latest data. This could be jarring to users. As a potential solution, you could set your build to re-prerender every minute or so. Netlify and some other static hosts provide webhooks you can use to trigger rebuilds for purposes like this. For data that updates even more frequently every minute, you should avoid prerendering.
- __Thousands of routes__: I wouldn't recommend prerendering thousands of routes, as this could add an hour or more to your build process. Yikes!

## Usage

### Webpack (Simple)

``` js
// webpack.conf.js
var Path = require('path')
var PrerenderSpaPlugin = require('prerender-spa-plugin')

module.exports = {
  // ...
  plugins: [
    new PrerenderSpaPlugin(
      // Absolute path to compiled SPA
      Path.join(__dirname, '../dist'),
      // List of routes to prerender
      [ '/', '/about', '/contact' ]
    )
  ]
}
```

### Webpack (Advanced)

``` js
// webpack.conf.js
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

        // Instead of loudly failing on JS errors (the default), ignore them.
        ignoreJSErrors: true,
        
        // Path of index file. By default it's index.html in static root.
        indexPath: path.resolve('/dist/path/to/index.html'),

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
        
        // http://phantomjs.org/api/webpage/property/viewport-size.html
        phantomPageViewportSize: {
          width: 1280,
          height: 800
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
  // Ensure asynchronous chunks are injected into <head>
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
