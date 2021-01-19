const path = require('path')
const Prerenderer = require('@prerenderer/prerenderer')
const { minify } = require('html-minifier')

function PrerenderSPAPlugin (...args) {
  const rendererOptions = {} // Primarily for backwards-compatibility.

  this._options = {}

  // Normal args object.
  if (args.length === 1) {
    this._options = args[0] || {}

    // Backwards-compatibility with v2
  } else {
    console.warn("[prerender-spa-plugin] You appear to be using the v2 argument-based configuration options. It's recommended that you migrate to the clearer object-based configuration system.\nCheck the documentation for more information.")
    let staticDir, routes

    args.forEach(arg => {
      if (typeof arg === 'string') staticDir = arg
      else if (Array.isArray(arg)) routes = arg
      else if (typeof arg === 'object') this._options = arg
    })

    staticDir ? this._options.staticDir = staticDir : null
    routes ? this._options.routes = routes : null
  }

  // Backwards compatiblity with v2.
  if (this._options.captureAfterDocumentEvent) {
    console.warn('[prerender-spa-plugin] captureAfterDocumentEvent has been renamed to renderAfterDocumentEvent and should be moved to the renderer options.')
    rendererOptions.renderAfterDocumentEvent = this._options.captureAfterDocumentEvent
  }

  if (this._options.captureAfterElementExists) {
    console.warn('[prerender-spa-plugin] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.')
    rendererOptions.renderAfterElementExists = this._options.captureAfterElementExists
  }

  if (this._options.captureAfterTime) {
    console.warn('[prerender-spa-plugin] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.')
    rendererOptions.renderAfterTime = this._options.captureAfterTime
  }

  this._options.server = this._options.server || {}
  this._options.renderer = this._options.renderer
  this._options.batchSize = this._options.batchSize || this._options.routes.length

  if (this._options.postProcessHtml) {
    console.warn('[prerender-spa-plugin] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.')
  }
}

PrerenderSPAPlugin.prototype.apply = function (compiler) {
  const compilerFS = compiler.outputFileSystem

  // From https://github.com/ahmadnassri/mkdirp-promise/blob/master/lib/index.js
  const mkdirp = function (dir, opts) {
    return new Promise((resolve, reject) => {
      compilerFS.mkdirp(dir, opts, (err, made) => err === null ? resolve(made) : reject(err))
    })
  }

  const afterEmit = async (context, compilation, done) => {
    try {
      const reportProgress = (context && context.reportProgress) || (function () { 
        let args = Array.prototype.slice.call(arguments);
        args.unshift("\n[prerender-spa-plugin]");
        console.log(...args)
      });
      const routes = this._options.routes.slice()
      const numBatches = Math.ceil(routes.length / this._options.batchSize)
      reportProgress("Initializing prerenderer...")

      let batchNumber = 1;
      if (global.gc) {
        global.gc();
      }
      let PrerendererInstance = new Prerenderer(this._options)
      await PrerendererInstance.initialize()
      while (routes.length > 0) {
        
        const batch = routes.splice(0, this._options.batchSize)

        reportProgress("\nPreparing batch:\n", batch.join("\n"));
        try {
          //reportProgress((batchNumber - 1) / numBatches, `starting batch ${batchNumber}/${numBatches}`)
          reportProgress(Math.floor(((batchNumber / numBatches).toFixed(2) * 100)).toString() + "%", `rendering batch ${batchNumber}/${numBatches}`)

          let renderedRoutes = await PrerendererInstance.renderRoutes(batch || []);
          reportProgress("Routes rendered!");
          // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
          if (this._options.postProcessHtml) {
            renderedRoutes = renderedRoutes.map(renderedRoute => {
              const processed = this._options.postProcessHtml(renderedRoute)
              if (typeof processed === 'string') renderedRoute.html = processed
              else renderedRoute = processed
              return renderedRoute
            })
          }

          // Run postProcess hooks.
          if (this._options.postProcess) {
            reportProgress("Running post process hooks..")
            renderedRoutes = await Promise.all(renderedRoutes.map(renderedRoute => this._options.postProcess(renderedRoute)))
          }

          // Check to ensure postProcess hooks returned the renderedRoute object properly.
          if (!renderedRoutes.every(r => typeof r === 'object')) {
            throw new Error('[prerender-spa-plugin] Rendered routes are empty, did you forget to return the `context` object in postProcess?')
          }

          // Minify html files if specified in config.
          if (this._options.minify) {
            reportProgress("Minifying HTML...");
            renderedRoutes.forEach(route => {
              route.html = minify(route.html, this._options.minify)
            })
          }

          // Calculate outputPath if it hasn't been set already.
          renderedRoutes.forEach(rendered => {
            if (!rendered.outputPath) {
              rendered.outputPath = path.join(this._options.outputDir || this._options.staticDir, rendered.route, 'index.html')
            }
          })

          // Create dirs and write prerendered files.
          //don't await, need to focus on rendering, writing can be done async
          Promise.all(renderedRoutes.map(async route => {
            const paths = [route.outputPath]
            if (Array.isArray(route.alternateOutputPaths)) {
              paths.push(...route.alternateOutputPaths)
            }

            return await Promise.all(
              paths.map(async outputPath => {
                try {
                  await mkdirp(path.dirname(outputPath))
                }
                catch(err) {
                  if (typeof err === 'string') {
                    err = `[prerender-spa-plugin] Unable to create directory ${path.dirname(outputPath)} for route ${route.route}. \n ${err}`
                  }

                  throw err
                }
                return await new Promise((resolve, reject) => {
                  compilerFS.writeFile(outputPath, route.html.trim(), err => {
                    if (err) reject(`[prerender-spa-plugin] Unable to write rendered route to file "${outputPath}" \n ${err}.`)
                    else resolve()
                  })
                })
              }));
            }))
            .then(r => reportProgress((Math.floor(((batchNumber) / (numBatches)).toFixed(2) * 100)).toString() + '%', `batch ${batchNumber}/${numBatches} written`))
            .catch(e => {throw e})

          // Force post-batch garbage collection
          renderedRoutes = null

          ++batchNumber
        } catch (err) {
          console.log("Failed rendering", err, "continuing...")
          continue;
        }
        finally {
          if (global.gc) global.gc();
        }
      }
      await PrerendererInstance.destroy();
      reportProgress("Prerender complete!");
      
    } catch (err) {
      const msg = '[prerender-spa-plugin] Unable to prerender all routes!'
      reportProgress(msg, err);
      compilation.errors.push(new Error(msg))
    }
    done()
  }

  if (compiler.hooks) {
    const plugin = { name: 'PrerenderSPAPlugin', context: true }
    compiler.hooks.afterEmit.tapAsync(plugin, afterEmit)
  } else {
    compiler.plugin('after-emit', afterEmit)
  }
}

module.exports = PrerenderSPAPlugin
