# Vue.js 2.0 + vue-router Prerender SPA Example

Demonstrates usage of Vuejs 2.0 with Vue Router and Webpack 3. Build will generate 3 static routes at the following paths:

- `/`
- `/about`
- `/contact`

## Build

```bash
npm install
npm run build
```

Now check the new `dist` directory for your prerendered static files!

To view the rendered files, install [http-server](https://www.npmjs.com/package/http-server) (`npm install -g http-server`) if you haven't already and run it in the dist directory.

Now visit the following routes in your browser (note the trailing slash):

- [http://localhost:8000/](http://localhost:8000/)
- [http://localhost:8000/about/](http://localhost:8000/about/)
- [http://localhost:8000/contact/](http://localhost:8000/contact/)

## Development

To edit the `prerender-spa-plugin` configuration, look for `new PrerenderSPAPlugin` in the plugins section of `webpack.config.js`.

If you're using a router or have more than one page to prerender, edit the `routes` array under that config object.

```bash
npm install
npm run dev
```
