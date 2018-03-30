# Vanilla JS - Prerender SPA Example

Demonstrates usage of `prerender-spa-plugin` with Vanilla JS and Webpack 3. Build will generate 3 static routes at the following paths:

- `/`
- `/about`
- `/some/deep/nested/route`

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
- [http://localhost:8000/some/deep/nested/route/](http://localhost:8000/some/deep/nested/route/)

You should notice that the TODOs are rendered and populated already.

## Development

To edit the `prerender-spa-plugin` configuration, look for `new PrerenderSPAPlugin` in the plugins section of `webpack.config.js`.

If you're using a router or have more than one page to prerender, edit the `routes` array under that config object.
