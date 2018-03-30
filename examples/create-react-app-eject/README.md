# Ejected Create-React-App - Prerender SPA Example

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app) and ejected in order to allow modification of the webpack configuration.

## Build

```bash
npm install
npm run build
```

Now check the new `build` directory for your prerendered static files!

To view the rendered files, install [http-server](https://www.npmjs.com/package/http-server) (`npm install -g http-server`) if you haven't already and run it in the `build` directory.

Now visit the following route in your browser (note the trailing slash):

- [http://localhost:8000/](http://localhost:8000/)

If all went well, it should load without JavaScript.

## Development

To edit the `prerender-spa-plugin` configuration, look for `new PrerenderSPAPlugin` in the plugins section of `config/webpack.config.prod.js`.

If you're using a router or have more than one page to prerender, edit the `routes` array under that config object.

```bash
npm install
npm start
```
