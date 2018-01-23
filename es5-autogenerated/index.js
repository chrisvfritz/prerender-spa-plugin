'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp-promise');
var Prerenderer = require('@prerenderer/prerenderer');
var PuppeteerRenderer = require('@prerenderer/renderer-puppeteer');

function PrerenderSPAPlugin() {
  var _this = this;

  var rendererOptions = {}; // Primarily for backwards-compatibility.

  // Normal args object.

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (args.length === 1) {
    this._options = args[0] || {};

    // Backwards-compatibility with v2
  } else {
    var staticDir = void 0,
        routes = void 0;

    args.forEach(function (arg) {
      if (typeof arg === 'string') staticDir = arg;else if (Array.isArray(arg)) routes = arg;else if (typeof arg === 'object') _this._options = arg;
    });

    staticDir ? this._options.staticDir = staticDir : null;
    routes ? this._options.routes = routes : null;
  }

  if (!this._options) this._options = {};

  // Backwards compatiblity with v2.
  if (this._options.captureAfterDocumentEvent) {
    console.warn('[Prerender-SPA-Plugin] captureAfterDocumentEvent has been renamed to renderAfterDocumentEvent and should be moved to the renderer options.');
    rendererOptions.renderAfterDocumentEvent = this._options.captureAfterDocumentEvent;
  }

  if (this._options.captureAfterDocumentEvent) {
    console.warn('[Prerender-SPA-Plugin] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.');
    rendererOptions.renderAfterElementExists = this._options.captureAfterElementExists;
  }

  if (this._options.captureAfterTime) {
    console.warn('[Prerender-SPA-Plugin] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.');
    rendererOptions.renderAfterTime = this._options.captureAfterTime;
  }

  this._options.server = this._options.server || {};
  this._options.renderer = this._options.renderer || new PuppeteerRenderer(_extends({
    headless: true
  }, rendererOptions));

  if (this._options.postProcessHtml) {
    console.warn('[Prerender-SPA-Plugin] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.');
  }
}

PrerenderSPAPlugin.prototype.apply = function (compiler) {
  var _this2 = this;

  compiler.plugin('after-emit', function (compilation, done) {
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
    }).then(function (renderedRoutes) {
      return _this2._options.postProcess ? renderedRoutes.map(function (renderedRoute) {
        return _this2._options.postProcess(renderedRoute);
      }) : renderedRoutes;
    }).then(function (processedRoutes) {
      var promises = Promise.all(processedRoutes.map(function (processedRoute) {
        var outputDir = path.join(_this2._options.outputDir || _this2._options.staticDir, processedRoute.route);
        var outputFile = path.join(outputDir, 'index.html');

        return mkdirp(outputDir).then(function () {
          return new Promise(function (resolve, reject) {
            fs.writeFile(outputFile, processedRoute.html.trim(), function (err) {
              if (err) reject(`[Prerender-SPA-Plugin] Unable to write rendered route to file "${outputFile}" \n ${err}.`);
            });

            resolve();
          });
        }).catch(function (err) {
          if (typeof err === 'string') {
            err = `[Prerender-SPA-Plugin] Unable to create directory ${outputDir} for route ${processedRoute.route}. \n ${err}`;
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
      console.error('[Prerender-SPA-Plugin] Unable to prerender all routes!');
      throw err;
    });
  });
};

PrerenderSPAPlugin.PuppeteerRenderer = PuppeteerRenderer;

module.exports = PrerenderSPAPlugin;