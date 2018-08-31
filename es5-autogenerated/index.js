'use strict';

var path = require('path');
var Prerenderer = require('@prerenderer/prerenderer');
var PuppeteerRenderer = require('@prerenderer/renderer-puppeteer');

var _require = require('html-minifier'),
    minify = _require.minify;

function PrerenderSPAPlugin() {
  var _this = this;

  var rendererOptions = {}; // Primarily for backwards-compatibility.

  this._options = {};

  // Normal args object.

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (args.length === 1) {
    this._options = args[0] || {};

    // Backwards-compatibility with v2
  } else {
    console.warn("[prerender-spa-plugin] You appear to be using the v2 argument-based configuration options. It's recommended that you migrate to the clearer object-based configuration system.\nCheck the documentation for more information.");
    var staticDir = void 0,
        routes = void 0;

    args.forEach(function (arg) {
      if (typeof arg === 'string') staticDir = arg;else if (Array.isArray(arg)) routes = arg;else if (typeof arg === 'object') _this._options = arg;
    });

    staticDir ? this._options.staticDir = staticDir : null;
    routes ? this._options.routes = routes : null;
  }

  // Backwards compatiblity with v2.
  if (this._options.captureAfterDocumentEvent) {
    console.warn('[prerender-spa-plugin] captureAfterDocumentEvent has been renamed to renderAfterDocumentEvent and should be moved to the renderer options.');
    rendererOptions.renderAfterDocumentEvent = this._options.captureAfterDocumentEvent;
  }

  if (this._options.captureAfterDocumentEvent) {
    console.warn('[prerender-spa-plugin] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.');
    rendererOptions.renderAfterElementExists = this._options.captureAfterElementExists;
  }

  if (this._options.captureAfterTime) {
    console.warn('[prerender-spa-plugin] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.');
    rendererOptions.renderAfterTime = this._options.captureAfterTime;
  }

  this._options.server = this._options.server || {};
  this._options.renderer = this._options.renderer || new PuppeteerRenderer(Object.assign({}, { headless: true }, rendererOptions));

  if (this._options.postProcessHtml) {
    console.warn('[prerender-spa-plugin] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.');
  }
}

PrerenderSPAPlugin.prototype.apply = function (compiler) {
  var _this2 = this;

  var compilerFS = compiler.outputFileSystem;

  // From https://github.com/ahmadnassri/mkdirp-promise/blob/master/lib/index.js
  var mkdirp = function mkdirp(dir, opts) {
    return new Promise(function (resolve, reject) {
      compilerFS.mkdirp(dir, opts, function (err, made) {
        return err === null ? resolve(made) : reject(err);
      });
    });
  };

  var afterEmit = function afterEmit(compilation, done) {
    var PrerendererInstance = new Prerenderer(_this2._options);

    PrerendererInstance.initialize().then(function () {
      return PrerendererInstance.renderRoutes(_this2._options.routes || []);
    })
    // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
    .then(function (renderedRoutes) {
      return _this2._options.postProcessHtml ? renderedRoutes.map(function (renderedRoute) {
        var processed = _this2._options.postProcessHtml(renderedRoute);
        if (typeof processed === 'string') renderedRoute.html = processed;else renderedRoute = processed;

        return renderedRoute;
      }) : renderedRoutes;
    })
    // Run postProcess hooks.
    .then(function (renderedRoutes) {
      return _this2._options.postProcess ? Promise.all(renderedRoutes.map(function (renderedRoute) {
        return _this2._options.postProcess(renderedRoute);
      })) : renderedRoutes;
    })
    // Check to ensure postProcess hooks returned the renderedRoute object properly.
    .then(function (renderedRoutes) {
      var isValid = renderedRoutes.every(function (r) {
        return typeof r === 'object';
      });
      if (!isValid) {
        throw new Error('[prerender-spa-plugin] Rendered routes are empty, did you forget to return the `context` object in postProcess?');
      }

      return renderedRoutes;
    })
    // Minify html files if specified in config.
    .then(function (renderedRoutes) {
      if (!_this2._options.minify) return renderedRoutes;

      renderedRoutes.forEach(function (route) {
        route.html = minify(route.html, _this2._options.minify);
      });

      return renderedRoutes;
    })
    // Calculate outputPath if it hasn't been set already.
    .then(function (renderedRoutes) {
      renderedRoutes.forEach(function (rendered) {
        if (!rendered.outputPath) {
          rendered.outputPath = path.join(_this2._options.outputDir || _this2._options.staticDir, rendered.route, 'index.html');
        }
      });

      return renderedRoutes;
    })
    // Create dirs and write prerendered files.
    .then(function (processedRoutes) {
      var promises = Promise.all(processedRoutes.map(function (processedRoute) {
        return mkdirp(path.dirname(processedRoute.outputPath)).then(function () {
          return new Promise(function (resolve, reject) {
            compilerFS.writeFile(processedRoute.outputPath, processedRoute.html.trim(), function (err) {
              if (err) reject(`[prerender-spa-plugin] Unable to write rendered route to file "${processedRoute.outputPath}" \n ${err}.`);else resolve();
            });
          });
        }).catch(function (err) {
          if (typeof err === 'string') {
            err = `[prerender-spa-plugin] Unable to create directory ${path.dirname(processedRoute.outputPath)} for route ${processedRoute.route}. \n ${err}`;
          }

          throw err;
        });
      }));

      return promises;
    }).then(function (r) {
      PrerendererInstance.destroy();
      done();
    }).catch(function (err) {
      PrerendererInstance.destroy();
      var msg = '[prerender-spa-plugin] Unable to prerender all routes!';
      console.error(msg);
      compilation.errors.push(new Error(msg));
      done();
    });
  };

  if (compiler.hooks) {
    var plugin = { name: 'PrerenderSPAPlugin' };
    compiler.hooks.afterEmit.tapAsync(plugin, afterEmit);
  } else {
    compiler.plugin('after-emit', afterEmit);
  }
};

PrerenderSPAPlugin.PuppeteerRenderer = PuppeteerRenderer;

module.exports = PrerenderSPAPlugin;