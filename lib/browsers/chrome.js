var puppeteer = require('puppeteer')

module.exports = function (options, port, route, callback) {
  var page
  var url = 'http://localhost:' + port + route

  function openPage (browser) {
    return browser.newPage().then(function (newPage) {
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
    // TODO:
    // page.settings.localToRemoteUrlAccessEnabled = true
    // page.settings.resourceTimeout = 15000
    // block css
    // block navigation and iframe
    // set viewport

    page.on('request', function (request) {
      if (request.resourceType() === 'image') {
        request.abort()
      } else {
        request.continue()
      }
    })

    page.on('pageerror', function (message) {
      if (options.ignoreJSErrors) return
      var pathname = url.replace(/http:\/\/localhost:\d+/, '')
      console.error('WARNING: JavaScript error while prerendering: ' + pathname + '\n' + message)
      page.close()
    })
  }

  function getOutput () {
    var doctype = new window.XMLSerializer().serializeToString(document.doctype)
    var outerHTML = document.documentElement.outerHTML
    return doctype + outerHTML
  }

  function capture () {
    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    // if (options.captureAfterDocumentEvent) {
    //   page.onCallback = returnResult
    //   return page.evaluate(function (eventName) {
    //     document.addEventListener(eventName, getOutput)
    //   }, options.captureAfterDocumentEvent)
    // }

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    // if (options.captureAfterElementExists) {
    //   setInterval(function () {
    //     var html = page.evaluate(function (elementSelector) {
    //       if (document.querySelector(elementSelector)) {
    //         var doctype = new window.XMLSerializer().serializeToString(document.doctype)
    //         var outerHTML = document.documentElement.outerHTML
    //         return doctype + outerHTML
    //       }
    //     }, options.captureAfterElementExists)
    //     if (html) returnResult(html)
    //   }, 100)
    // }

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    // if (options.captureAfterTime) {
    //   setTimeout(function () {
    //     var html = page.evaluate(function () {
    //       var doctype = new window.XMLSerializer().serializeToString(document.doctype)
    //       var outerHTML = document.documentElement.outerHTML
    //       return doctype + outerHTML
    //     })
    //     returnResult(html)
    //   }, options.captureAfterTime)
    // }

    // IF NO SPECIFIC CAPTURE HOOK IS SET, CAPTURE
    // IMMEDIATELY AFTER SCRIPTS EXECUTE
    return page.evaluate(getOutput)
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
}
