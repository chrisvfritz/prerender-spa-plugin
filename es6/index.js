const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp-promise')
const Prerenderer = require('@prerenderer/prerenderer')
const PuppeteerRenderer = require('@prerenderer/renderer-puppeteer')
const { minify } = require('html-minifier')

function PrerenderSPAPlugin (...args) {
  const rendererOptions = {} // Primarily for backwards-compatibility.

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

  if (!this._options) this._options = {}

  // Backwards compatiblity with v2.
  if (this._options.captureAfterDocumentEvent) {
    console.warn('[prerender-spa-plugin] captureAfterDocumentEvent has been renamed to renderAfterDocumentEvent and should be moved to the renderer options.')
    rendererOptions.renderAfterDocumentEvent = this._options.captureAfterDocumentEvent
  }

  if (this._options.captureAfterDocumentEvent) {
    console.warn('[prerender-spa-plugin] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.')
    rendererOptions.renderAfterElementExists = this._options.captureAfterElementExists
  }

  if (this._options.captureAfterTime) {
    console.warn('[prerender-spa-plugin] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.')
    rendererOptions.renderAfterTime = this._options.captureAfterTime
  }

  this._options.server = this._options.server || {}
  this._options.renderer = this._options.renderer || new PuppeteerRenderer(Object.assign({}, { headless: true }, rendererOptions))

  if (this._options.postProcessHtml) {
    console.warn('[prerender-spa-plugin] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.')
  }
}

PrerenderSPAPlugin.prototype.apply = function (compiler) {
  compiler.plugin('after-emit', (compilation, done) => {
    const PrerendererInstance = new Prerenderer(this._options)

    PrerendererInstance.initialize()
    .then(() => {
      return PrerendererInstance.renderRoutes(this._options.routes || [])
    })
    // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
    .then(renderedRoutes => this._options.postProcessHtml
      ? renderedRoutes.map(renderedRoute => {
        const processed = this._options.postProcessHtml(renderedRoute)
        if (typeof processed === 'string') renderedRoute.html = processed
        else renderedRoute = processed

        return renderedRoute
      })
      : renderedRoutes
    )
    .then(renderedRoutes => this._options.postProcess
      ? renderedRoutes.map(renderedRoute => this._options.postProcess(renderedRoute))
      : renderedRoutes
    )
    .then(renderedRoutes => {
      if (!this._options.minify) return renderedRoutes

      return renderedRoutes.map(route => {
        route.html = minify(route.html, this._options.minify)
        return route
      })
    })
    .then(processedRoutes => {
      const promises = Promise.all(processedRoutes.map(processedRoute => {
        const outputDir = path.join(this._options.outputDir || this._options.staticDir, processedRoute.route)
        const outputFile = path.join(outputDir, 'index.html')

        return mkdirp(outputDir)
        .then(() => {
          return new Promise((resolve, reject) => {
            fs.writeFile(outputFile, processedRoute.html.trim(), err => {
              if (err) reject(`[prerender-spa-plugin] Unable to write rendered route to file "${outputFile}" \n ${err}.`)
            })

            resolve()
          })
        })
        .catch(err => {
          if (typeof err === 'string') {
            err = `[prerender-spa-plugin] Unable to create directory ${outputDir} for route ${processedRoute.route}. \n ${err}`
          }

          throw err
        })
      }))

      return promises
    })
    .then(r => {
      PrerendererInstance.destroy()
      done()
    })
    .catch(err => {
      PrerendererInstance.destroy()
      console.error('[prerender-spa-plugin] Unable to prerender all routes!')
      console.error(err)
    })
  })
}

PrerenderSPAPlugin.PuppeteerRenderer = PuppeteerRenderer

module.exports = PrerenderSPAPlugin
