# Vue.js 2.0 Webpack Simple Template - Prerender SPA Example

Demonstrates usage of Vuejs 2.0 with Webpack 3. Build will populate `dist/index.html` with the prerendered page.

## Build

```bash
npm install
npm run build
```

Now check the new `dist` directory for your prerendered static files!

To view the rendered files, install [http-server](https://www.npmjs.com/package/http-server) (`npm install -g http-server`) if you haven't already and run it in the dist directory.

Now visit the following route in your browser (note the trailing slash):

- [http://localhost:8000/](http://localhost:8000/)

## Development

To edit the `prerender-spa-plugin` configuration, look for `new PrerenderSpaPlugin` in the plugins section of `webpack.config.js`.

If you're using a router or have more than one page to prerender, edit the `routes` array under that config object.

```bash
npm install
npm run dev
```
