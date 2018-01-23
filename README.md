<h1 align="center">Prerender SPA Plugin</h1>
<p align="center">
  <em>Flexible, framework-agnostic static site generation for sites and SPAs built with webpack.</em>
</p>

<p align="center"><img width="300" src="/assets/logo.png?raw=true"></p>

---

<div align="center">

[![npm version](https://img.shields.io/npm/v/prerender-spa-plugin.svg)]()
[![npm downloads](https://img.shields.io/npm/dt/prerender-spa-plugin.svg)]()
[![Dependency Status](https://img.shields.io/david/chrisvfritz/prerender-spa-plugin.svg)](https://david-dm.org/chrisvfritz/prerender-spa-plugin)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)
[![license](https://img.shields.io/github/license/chrisvfritz/prerender-spa-plugin.svg)]()

</div>

---

<div align="center">

[![NPM](https://nodei.co/npm/prerender-spa-plugin.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/prerender-spa-plugin/)

</div>

## About prerender-spa-plugin
:construction: Note: This is the work-in-progress v3 version of `prerender-spa-plugin`. If you're looking for the stable version, head over to the [master branch](https://github.com/chrisvfritz/prerender-spa-plugin/tree/master).

The goal of this plugin is to provide a simple prerendering solution that is easily extensible and usable for any site or single-page-app built with webpack.

It's implemented as a webpack wrapper for [prerenderer](https://github.com/tribex/prerenderer).
For more up-to-date and complete documentation, see that repository.

Plugins for other task runners and build systems are planned.

## Example Usage (`webpack.config.js`)
```js
const path = require('path')
const PrerenderSPAPlugin = require('prerender-spa-plugin')

module.exports = {
  plugins: [
    ...
    new PrerenderSPAPlugin({
      // Required - The path to the webpack-outputted app to prerender.
      staticDir: path.join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: [ '/', '/about', '/some/deep/nested/route' ],
    })
  ]
}
```

## Advanced Usage (`webpack.config.js`)

```js
const path = require('path')
const PrerenderSPAPlugin = require('prerender-spa-plugin')
const Renderer = PrerendererWebpackPlugin.PuppeteerRenderer

module.exports = {
  plugins: [
    ...
    new PrerenderSPAPlugin({
      // Required - The path to the webpack-outputted app to prerender.
      staticDir: path.join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: [ '/', '/about', '/some/deep/nested/route' ],

      renderer: new Renderer()
    })
  ]
}
```

## v2.x Compability
Most usages of `prerender-spa-plugin` v2.x should be compatible with v3.x.
The exception being advanced configuration options that controlled PhantomJS. These have been replaced by pluggable renderers with their own specific configuration options.

If you use this format, you will be greeted with a warning prompting you to migrate to the new object-based configuration format, but it should still function for the time being.

```js
const path = require('path')
const PrerenderSPAPlugin = require('prerender-spa-plugin')

module.exports = {

  // ...

  plugins: [
    new PrerenderSPAPlugin(
      // (REQUIRED) Absolute path to static root
      path.join(__dirname, 'relative/path/to/static/root'),
      // (REQUIRED) List of routes to prerender
      [ '/', '/about', '/contact' ],
      // (OPTIONAL) Compatible options from v2.
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
        
        // path of index file. By default it's index.html in static root.
        indexPath: path.resolve('/dist/path/to/index.html'),

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
        // NOTE: this has been deprecated in favor of the `postProcess` option.
        // See the documentation below.
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

### Additional Changes
- It is no longer possible to use multiple `renderAfterX` (`captureAfterX`) options at the same time. Only one may be selected. The reason for this removal is to prevent ambiguity.
- 

Now, if you're not familiar with the concept of *prerendering*, you might predictably ask...

## What is Prerendering?

Recently, SSR (Server Side Rendering) has taken the JavaScript front-end world by storm. The fact that you can now render your sites and apps on the server before sending them to your clients is an absolutely *revolutionary* idea (and totally not what everyone was doing before JS client-side apps got popular in the first place...)

However, the same criticisms that were valid for PHP, ASP, JSP, (and such) sites are valid for server-side rendering today. It's slow, breaks fairly easily, and is difficult to implement properly.

Thing is, despite what everyone might be telling you, you probably don't *need* SSR. You can get almost all the advantages of it (without the disadvantages) by using **prerendering.** Prerendering is basically firing up a headless browser, loading your app's routes, and saving the results to a static HTML file. You can then serve it with whatever static-file-serving solution you were using previously. It *just works* with HTML5 navigation and the likes. No need to change your code or add server-side rendering workarounds.

In the interest of transparency, there are some use-cases where prerendering might not be a great idea.

- **Tons of routes** - If your site has hundreds or thousands of routes, prerendering will be really slow. Sure you only have to do it once per update, but it could take ages. Most people don't end up with thousands of static routes, but just in-case...
- **Dynamic Content** - If your render routes that have content that's specific to the user viewing it or other dynamic sources, you should make sure you have placeholder components that can display until the dynamic content loads on the client-side. Otherwise it might be a tad weird.

## Available Renderers
- `@prerenderer/renderer-jsdom` - Uses [jsdom](https://npmjs.com/package/jsdom). Extremely fast, but unreliable and cannot handle advanced usages. May not work with all front-end frameworks and apps.
- `@prerenderer/renderer-puppeteer` - Uses [puppeteer](https://github.com/GoogleChrome/puppeteer) to render pages in headless Chrome.

### Which renderer should I use?

**Use `@prerenderer/renderer-puppeteer` if:** You're prerendering up to a couple hundred pages (bye-bye RAM!).

**Use `@prerenderer/renderer-jsdom` if:** You need to prerender thousands upon thousands of pages, but quality isn't all that important, and you're willing to work around issues for more advanced cases. (Programmatic SVG support, etc.)

## Documentation

### Plugin Options

| Option      | Type                                      | Required? | Default                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|-------------|-------------------------------------------|-----------|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| staticDir   | String                                    | Yes       | None                      | The root path to serve your app from.                                                                                                                                                                                                                                                                                                                                                                                                                |
| ouputDir    | String                                    | No        | None                      | Where the prerendered pages should be output. If not set, defaults to staticDir.                                                                                                                                                                                                                                                                                                                                                                     |
| indexPath   | String                                    | No        | `staticDir/index.html`    | The index file to fall back on for SPAs.                                                                                                                                                                                                                                                                                                                                                                                                             |
| postProcess | Function(Object context): Object          | No        | None                      | Passes in an object in the format ```javascript {   route: String, // The prerendered route, after following redirects.   originalRoute: String, // The original route passed, before redirects.   html: String // The resulting HTML for the route. } ```  You can modify `html` to change what gets written to the prerendered files, or modify `route` to change the output location. (Make sure to return the object once you're done with it.)  |
| server      | Object                                    | No        | None                      | App server configuration options (See below)                                                                                                                                                                                                                                                                                                                                                                                                         |
| renderer    | Renderer Instance or Configuration Object | No        | `new PuppeteerRenderer()` | The renderer you'd like to use to prerender the app. It's recommended that you specify this, but if not it will default to `@prerenderer/renderer-puppeteer`.                                                                                                                                                                                                                                                                                        |
#### Server Options

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |

---

---

### `@prerenderer/renderer-jsdom` options

| Option                   | Type                   | Required? | Default                  | Description                                                                                                                                                                                         |
|--------------------------|------------------------|-----------|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| maxConcurrentRoutes      | Number                 | No        | 0 (No limit)             | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                               |
| inject                   | Object                 | No        | None                     | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty           | String                 | No        | `__PRERENDER_INJECTED` | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent | String                 | No        | None                     | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists | String (Selector)      | No        | None                     | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime          | Integer (Milliseconds) | No        | None                     | Wait to render until a certain amount of time has passed.                                                                                                                                           |

### `@prerenderer/renderer-puppeteer` options

| Option                                                                                                                | Type                   | Required? | Default                | Description                                                                                                                                                                                         |
|-----------------------------------------------------------------------------------------------------------------------|------------------------|-----------|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| maxConcurrentRoutes                                                                                                   | Number                 | No        | 0 (No limit)           | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                               |
| inject                                                                                                                | Object                 | No        | None                   | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty                                                                                                        | String                 | No        | `__PRERENDER_INJECTED` | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent                                                                                              | String                 | No        | None                   | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists                                                                                              | String (Selector)      | No        | None                   | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime                                                                                                       | Integer (Milliseconds) | No        | None                   | Wait to render until a certain amount of time has passed.                                                                                                                                           |
| [[Puppeteer Launch Options]](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions) | ?                      | No        | None                   | Any additional options will be passed to `puppeteer.launch()`, such as `headless: false`.                                                                                                                                        |

---

## Tips & Troubleshooting

### Code Splitting

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

### JS not firing before prerender?

If you have code that relies on the existence of `<body>` (and you almost certainly do), simply run it in a callback to the `DOMContentLoaded` event:
*(Otherwise you'll find that `prerender-spa-plugin` will output the contents of your page before your JS runs.)*

```js
document.addEventListener('DOMContentLoaded', function () {
  // your code
})
```

For example, if you're using Vue.js and mounting to a `<div id="app">` in `<body>`:

``` js
const root = new Vue({
  // ...
})

document.addEventListener('DOMContentLoaded', function () {
  root.$mount('#app')
})
```

### Inline Styles

If you rely on inline CSS, i.e. you do not extract CSS from your bundle and, thus, experience duplicate CSS style tags, consider using [extract-text-webpack-plugin](https://github.com/webpack-contrib/extract-text-webpack-plugin) to extract CSS into a separate file and then either inject CSS back into a `template.html` file using [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) or just call it as an external CSS file.

Either way, there will not be any unnecessary styles inside JS.

### Caveats

- For obvious reasons, `prerender-spa-plugin` only works for SPAs that route using the HTML5 history API. `index.html#/hash/route` URLs will unfortunately not work.
- Whatever client-side rendering library you're using should be able to at least replace any server-rendered content or diff with it.
  - For **Vue.js 1** use [`replace: false`](http://vuejs.org/api/#replace) on root components.
  - For **Vue.js 2**  Ensure your root component has the same id as the prerendered element it's replacing. Otherwise you'll end up with duplicated content.

## License (MIT)

```
Copyright (c) 2017 Chris Fritz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Maintainers

<table>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://github.com/chrisvfritz">
          <img width="150" height="150" src="https://github.com/chrisvfritz.png?v=3&s=150">
          </br>
          Chris Fritz
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/drewlustro">
          <img width="150" height="150" src="https://github.com/drewlustro.png?v=3&s=150">
          </br>
          Drew Lustro
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/tribex">
          <img width="150" height="150" src="https://github.com/tribex.png?v=3&s=150">
          </br>
          Joshua Bemenderfer
        </a>
      </td>
    </tr>
  <tbody>
</table>
