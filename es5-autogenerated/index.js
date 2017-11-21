'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp-promise');
var Prerenderer = require('prerenderer');

function PrerendererWebpackPlugin() {
  var _this = this;

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  // Normal args object.
  if (args.length === 1) {
    this._options = args[0] || {};

    // Backwards-compatibility with prerender-spa-plugin
  } else {
    var staticDir = void 0,
        routes = void 0;

    args.forEach(function (arg) {
      if (typeof arg === 'string') staticDir = arg;else if (Array.isArray(arg)) routes = arg;else if (typeof arg === 'object') _this._options = arg;
    });

    staticDir ? this._options.staticDir = staticDir : null;
    routes ? this._options.routes = routes : null;
  }

  if (!this.options) this.options = {};
  this._options.server = this._options.server || {};
}

PrerendererWebpackPlugin.prototype.apply = function (compiler) {
  var _this2 = this;

  compiler.plugin('after-emit', function (compilation, done) {
    // For backwards-compatibility with prerender-spa-plugin
    if (!_this2.routes && _this2.paths) _this2.routes = _this2.paths;

    var PrerendererInstance = new Prerenderer(_this2._options);

    PrerendererInstance.initialize().then(function () {
      return PrerendererInstance.renderRoutes(_this2._options.routes || []);
    }).then(function (renderedRoutes) {
      var route = renderedRoutes.route,
          html = renderedRoutes.html;


      if (_this2._options.postProcessHtml) {
        renderedRoutes.html = _this2._options.postProcessHtml({
          html,
          route
        });
      }

      return renderedRoutes;
    }).then(function (processedRoutes) {
      var promises = Promise.all(processedRoutes.map(function (processedRoute) {
        var outputDir = path.join(_this2._options.outputDir || _this2._options.staticDir, processedRoute.route);
        var outputFile = path.join(outputDir, 'index.html');

        return mkdirp(outputDir).then(function () {
          return new Promise(function (resolve, reject) {
            fs.writeFile(outputFile, processedRoute.html.trim(), function (err) {
              if (err) reject(`[PrerendererWebpackPlugin] Unable to write rendered route to file "${outputFile}" \n ${err}`);
            });

            resolve();
          });
        }).catch(function (err) {
          if (typeof err === 'string') {
            err = `[PrerendererWebpackPlugin] Unable to create directory ${outputDir} for route ${processedRoute.route}. \n ${err}`;
          }

          setTimeout(function () {
            throw err;
          });
        });
      }));

      return promises;
    }).then(function (r) {
      PrerendererInstance.destroy();
      done();
    }).catch(function (err) {
      PrerendererInstance.destroy();
      console.error('[PrerendererWebpackPlugin] Unable to prerender all routes!');
      setTimeout(function () {
        throw err;
      });
    });
  });
};

PrerendererWebpackPlugin.BrowserRenderer = Prerenderer.BrowserRenderer;
PrerendererWebpackPlugin.ChromeRenderer = Prerenderer.ChromeRenderer;
PrerendererWebpackPlugin.JSDOMRenderer = Prerenderer.JSDOMRenderer;

module.exports = PrerendererWebpackPlugin;