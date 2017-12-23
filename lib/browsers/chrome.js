var puppeteer = require('puppeteer')

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

  function capture () {
    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    // if (options.captureAfterDocumentEvent) {
    //   page.evaluate(function (eventName) {
    //     console.log(eventName)
    //     return new Promise(function (resolve) {
    //       document.addEventListener(eventName, function () {
    //         console.log('yeah!')
    //         resolve(getOutput())
    //       })
    //     })
    //   }, options.captureAfterDocumentEvent)
    // }

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    if (options.captureAfterElementExists) {
      return page.evaluate(function (elementSelector) {
        return new Promise(function (resolve) {
          setInterval(function () {
            if (document.querySelector(elementSelector)) {
              var doctype = new window.XMLSerializer().serializeToString(document.doctype)
              var outerHTML = document.documentElement.outerHTML
              resolve(doctype + outerHTML)
            }
          }, 100)
        })
      }, options.captureAfterElementExists)
    }

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
    return page.evaluate(function () {
      var doctype = new window.XMLSerializer().serializeToString(document.doctype)
      var outerHTML = document.documentElement.outerHTML
      return doctype + outerHTML
    })
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
