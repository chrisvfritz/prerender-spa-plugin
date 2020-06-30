'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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

  if (this._options.captureAfterElementExists) {
    console.warn('[prerender-spa-plugin] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.');
    rendererOptions.renderAfterElementExists = this._options.captureAfterElementExists;
  }

  if (this._options.captureAfterTime) {
    console.warn('[prerender-spa-plugin] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.');
    rendererOptions.renderAfterTime = this._options.captureAfterTime;
  }

  this._options.server = this._options.server || {};
  this._options.renderer = this._options.renderer || new PuppeteerRenderer(Object.assign({}, { headless: true }, rendererOptions));
  this._options.batchSize = this._options.batchSize || this._options.routes.length;

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

  var afterEmit = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regenerator2.default.mark(function _callee(context, compilation, done) {
      var reportProgress, routes, numBatches, batchNumber, batch, PrerendererInstance, renderedRoutes, msg;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;

              reportProgress = context && context.reportProgress || function () {};

              routes = _this2._options.routes.slice();
              numBatches = Math.ceil(routes.length / _this2._options.batchSize);
              batchNumber = 1;

            case 5:
              if (!(routes.length > 0)) {
                _context.next = 42;
                break;
              }

              batch = routes.splice(0, _this2._options.batchSize);
              PrerendererInstance = new Prerenderer(_this2._options);
              _context.prev = 8;

              reportProgress((batchNumber - 1) / numBatches, `starting batch ${batchNumber}/${numBatches}`);

              _context.next = 12;
              return PrerendererInstance.initialize();

            case 12:

              reportProgress(batchNumber / numBatches, `rendering batch ${batchNumber}/${numBatches}`);

              _context.next = 15;
              return PrerendererInstance.renderRoutes(batch || []);

            case 15:
              renderedRoutes = _context.sent;


              // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
              if (_this2._options.postProcessHtml) {
                renderedRoutes = renderedRoutes.map(function (renderedRoute) {
                  var processed = _this2._options.postProcessHtml(renderedRoute);
                  if (typeof processed === 'string') renderedRoute.html = processed;else renderedRoute = processed;
                  return renderedRoute;
                });
              }

              // Run postProcess hooks.

              if (!_this2._options.postProcess) {
                _context.next = 21;
                break;
              }

              _context.next = 20;
              return Promise.all(renderedRoutes.map(function (renderedRoute) {
                return _this2._options.postProcess(renderedRoute);
              }));

            case 20:
              renderedRoutes = _context.sent;

            case 21:
              if (renderedRoutes.every(function (r) {
                return typeof r === 'object';
              })) {
                _context.next = 23;
                break;
              }

              throw new Error('[prerender-spa-plugin] Rendered routes are empty, did you forget to return the `context` object in postProcess?');

            case 23:

              // Minify html files if specified in config.
              if (_this2._options.minify) {
                renderedRoutes.forEach(function (route) {
                  route.html = minify(route.html, _this2._options.minify);
                });
              }

              // Calculate outputPath if it hasn't been set already.
              renderedRoutes.forEach(function (rendered) {
                if (!rendered.outputPath) {
                  rendered.outputPath = path.join(_this2._options.outputDir || _this2._options.staticDir, rendered.route, 'index.html');
                }
              });

              // Create dirs and write prerendered files.
              reportProgress(batchNumber / (numBatches * 2), `writing batch ${batchNumber}/${numBatches}`);
              _context.next = 28;
              return Promise.all(renderedRoutes.map(function (route) {
                return mkdirp(path.dirname(route.outputPath)).then(function () {
                  return new Promise(function (resolve, reject) {
                    compilerFS.writeFile(route.outputPath, route.html.trim(), function (err) {
                      if (err) reject(`[prerender-spa-plugin] Unable to write rendered route to file "${route.outputPath}" \n ${err}.`);else resolve();
                    });
                  });
                }).catch(function (err) {
                  if (typeof err === 'string') {
                    err = `[prerender-spa-plugin] Unable to create directory ${path.dirname(route.outputPath)} for route ${route.route}. \n ${err}`;
                  }

                  throw err;
                });
              }));

            case 28:
              _context.next = 30;
              return PrerendererInstance.destroy();

            case 30:
              _context.next = 32;
              return new Promise(function (resolve) {
                return setTimeout(resolve, 250);
              });

            case 32:

              ++batchNumber;
              _context.next = 40;
              break;

            case 35:
              _context.prev = 35;
              _context.t0 = _context['catch'](8);
              _context.next = 39;
              return PrerendererInstance.destroy();

            case 39:
              throw _context.t0;

            case 40:
              _context.next = 5;
              break;

            case 42:
              _context.next = 50;
              break;

            case 44:
              _context.prev = 44;
              _context.t1 = _context['catch'](0);
              msg = '[prerender-spa-plugin] Unable to prerender all routes!';

              console.error(msg);
              console.error(_context.t1);
              compilation.errors.push(new Error(msg));

            case 50:
              done();

            case 51:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this2, [[0, 44], [8, 35]]);
    }));

    return function afterEmit(_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }();

  if (compiler.hooks) {
    var plugin = { name: 'PrerenderSPAPlugin', context: true };
    compiler.hooks.afterEmit.tapAsync(plugin, afterEmit);
  } else {
    compiler.plugin('after-emit', afterEmit);
  }
};

PrerenderSPAPlugin.PuppeteerRenderer = PuppeteerRenderer;

module.exports = PrerenderSPAPlugin;