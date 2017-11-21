const promiseLimit = require('promise-limit')
const puppeteer = require('puppeteer')

const getPageContents = function (options, originalRoute) {
  options = options || {}

  return new Promise((resolve, reject) => {
    function captureDocument () {
      const doctype = new window.XMLSerializer().serializeToString(document.doctype)
      const outerHTML = document.documentElement.outerHTML

      const result = {
        route: originalRoute,
        html: doctype + outerHTML
      }

      return JSON.stringify(result)
    }

    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.renderAfterDocumentEvent) {
      document.addEventListener(options.renderAfterDocumentEvent, () => resolve(captureDocument()))

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    } else if (options.renderAfterElementExists) {
      // TODO: Try and get something MutationObserver-based working.
      setInterval(() => {
        if (document.querySelector(options.renderAfterElementExists)) resolve(captureDocument())
      }, 100)

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    } else if (options.renderAfterTime) {
      setTimeout(() => resolve(captureDocument()), options.renderAfterTime)

    // DEFAULT: RUN IMMEDIATELY
    } else {
      resolve(captureDocument())
    }
  })
}

class PuppeteerRenderer {
  constructor (rendererOptions) {
    this._puppeteer = null
    this._rendererOptions = rendererOptions || {}

    if (this._rendererOptions.maxConcurrentRoutes == null) this._rendererOptions.maxConcurrentRoutes = 0

    if (this._rendererOptions.inject && !this._rendererOptions.injectProperty) {
      this._rendererOptions.injectProperty = '__PRERENDER_INJECTED'
    }
  }

  async initialize () {
    try {
      // Workaround for Linux SUID Sandbox issues.
      if (process.platform === 'linux') {
        if (!this._rendererOptions.args) this._rendererOptions.args = []

        if (this._rendererOptions.args.indexOf('--no-sandbox') === -1) {
          this._rendererOptions.args.push('--no-sandbox')
          this._rendererOptions.args.push('--disable-setuid-sandbox')
        }
      }

      this._puppeteer = await puppeteer.launch(this._rendererOptions)
    } catch (e) {
      console.error('[Prerenderer - PuppeteerRenderer] Unable to start Puppeteer')
      // Re-throw the error so it can be handled further up the chain. Good idea or not?
      throw e
    }

    return this._puppeteer
  }

  async renderRoutes (routes, Prerenderer) {
    const rootOptions = Prerenderer.getOptions()
    const options = this._rendererOptions

    const limiter = promiseLimit(this._rendererOptions.maxConcurrentRoutes)

    const pagePromises = Promise.all(
      routes.map(
        (route, index) => limiter(
          async () => {
            const page = await this._puppeteer.newPage()

            if (options.inject) {
              await page.evaluateOnNewDocument(`(function () { window['${options.injectProperty}'] = ${JSON.stringify(options.inject)}; })();`)
            }

            await page.goto(`http://localhost:${rootOptions.server.port}${route}`)

            const result = await page.evaluate(getPageContents, this._rendererOptions, route)
            console.log(result)

            const parsedResult = JSON.parse(result)

            await page.close()
            return Promise.resolve(parsedResult)
          }
        )
      )
    )

    return pagePromises
  }

  destroy () {
    this._puppeteer.close()
  }
}

module.exports = PuppeteerRenderer
