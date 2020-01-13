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
      const reportProgress = (context && context.reportProgress) || (() => { })
      const routes = this._options.routes.slice()
      const numBatches = Math.ceil(routes.length / this._options.batchSize)
      let batchNumber = 1
      while (routes.length > 0) {
        const batch = routes.splice(0, this._options.batchSize)
        const PrerendererInstance = new Prerenderer(this._options)

        try {
          reportProgress((batchNumber - 1) / numBatches, `starting batch ${batchNumber}/${numBatches}`)

          await PrerendererInstance.initialize()

          reportProgress(batchNumber / numBatches, `rendering batch ${batchNumber}/${numBatches}`)

          let renderedRoutes = await PrerendererInstance.renderRoutes(batch || [])

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
            renderedRoutes = await Promise.all(renderedRoutes.map(renderedRoute => this._options.postProcess(renderedRoute)))
          }

          // Check to ensure postProcess hooks returned the renderedRoute object properly.
          if (!renderedRoutes.every(r => typeof r === 'object')) {
            throw new Error('[prerender-spa-plugin] Rendered routes are empty, did you forget to return the `context` object in postProcess?')
          }

          // Minify html files if specified in config.
          if (this._options.minify) {
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
          reportProgress((batchNumber) / (numBatches * 2), `writing batch ${batchNumber}/${numBatches}`)
          await Promise.all(renderedRoutes.map(route => {
            return mkdirp(path.dirname(route.outputPath))
              .then(() => {
                return new Promise((resolve, reject) => {
                  compilerFS.writeFile(route.outputPath, route.html.trim(), err => {
                    if (err) reject(`[prerender-spa-plugin] Unable to write rendered route to file "${route.outputPath}" \n ${err}.`)
                    else resolve()
                  })
                })
              })
              .catch(err => {
                if (typeof err === 'string') {
                  err = `[prerender-spa-plugin] Unable to create directory ${path.dirname(route.outputPath)} for route ${route.route}. \n ${err}`
                }

                throw err
              })
          }))

          await PrerendererInstance.destroy()

          // small time padding to allow system to fully free server resources
          await new Promise(resolve => setTimeout(resolve, 250))

          ++batchNumber
        } catch (err) {
          await PrerendererInstance.destroy()
          throw err
        }
      }
    } catch (err) {
      const msg = '[prerender-spa-plugin] Unable to prerender all routes!'
      console.error(msg)
      console.error(err)
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

PrerenderSPAPlugin.PuppeteerRenderer = PuppeteerRenderer

module.exports = PrerenderSPAPlugin
