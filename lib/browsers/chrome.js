var puppeteer = require('puppeteer')

var allowedResoruceTypes = [
  'document',
  'script',
  'xhr',
  'fetch',
  'websocket',
  'manifest',
  'other'
]

module.exports = function (options, port, route, callback) {
  var browser, page
  var url = 'http://localhost:' + port + route

  function openPage (newBrowser) {
    browser = newBrowser
    return newBrowser.newPage().then(function (newPage) {
      page = newPage
    })
  }

  function gotoUrl () {
    return page.goto(url)
  }

  function catchUrlLoading () {
    throw new Error('FAIL to load: ' + url)
  }

  function configure () {
    return page.setRequestInterception(true).then(function () {
      page.on('request', function (request) {
        if (allowedResoruceTypes.indexOf(request.resourceType) > -1) {
          request.continue()
        } else {
          request.abort()
        }
      })

      page.on('pageerror', function (message) {
        if (options.ignoreJSErrors) return
        var pathname = url.replace(/http:\/\/localhost:\d+/, '')
        console.error('WARNING: JavaScript error while prerendering: ' + pathname + '\n' + message)
        page.close()
      })
    })
  }

  function getOutput () {
    var doctype = new window.XMLSerializer().serializeToString(document.doctype)
    var outerHTML = document.documentElement.outerHTML
    return doctype + outerHTML
  }

  function waitForEvent (eventName) {
    return new Promise(function (resolve) {
      document.addEventListener(eventName, resolve)
    })
  }

  function capture () {
    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.captureAfterDocumentEvent) {
      return page.evaluate(waitForEvent, options.captureAfterDocumentEvent)
        .then(function () {
          return page.evaluate(getOutput)
        })
    }

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    if (options.captureAfterElementExists) {
      return page.waitForSelector(options.captureAfterElementExists).then(function () {
        return page.evaluate(getOutput)
      })
    }

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    if (options.captureAfterTime) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          page.evaluate(getOutput).then(function (out) {
            resolve(out)
          })
        }, options.captureAfterTime)
      })
    }

    // IF NO SPECIFIC CAPTURE HOOK IS SET, CAPTURE
    // IMMEDIATELY AFTER SCRIPTS EXECUTE
    return page.evaluate(getOutput)
  }

  function close () {
    return browser.close()
  }

  puppeteer.launch(options.chromeOptions)
    .then(openPage)
    .then(gotoUrl, catchUrlLoading)
    .then(configure)
    .then(capture)
    .then(function (output) {
      callback(null, output)
    }, function (error) {
      callback(error)
    })
    .then(close)
}
