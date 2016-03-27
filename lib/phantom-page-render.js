/* global phantom */
var system = require('system')
var page = require('webpage').create()

var url = system.args[1]
var options = JSON.parse(system.args[2])

page.open(url, function (status) {
  if (status !== 'success') {
    throw new Error('FAIL to load: ' + url)
  } else {
    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.captureAfterDocumentEvent) {
      page.onCallback = function (html) {
        console.log(html)
        phantom.exit()
      }
      page.evaluate(function (eventName) {
        document.addEventListener(eventName, function () {
          window.callPhantom(document.documentElement.outerHTML)
        })
      }, options.captureAfterDocumentEvent)
    }

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    if (options.captureAfterElementExists) {
      setInterval(function () {
        var html = page.evaluate(function (elementSelector) {
          if (document.querySelector(elementSelector)) {
            return document.documentElement.outerHTML
          }
        }, options.captureAfterElementExists)
        if (html) {
          console.log(html)
          phantom.exit()
        }
      }, 100)
    }

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    if (options.captureAfterTime) {
      setTimeout(function () {
        var html = page.evaluate(function () {
          return document.documentElement.outerHTML
        })
        console.log(html)
        phantom.exit()
      }, options.captureAfterTime)
    }

    // IF NO SPECIFIC CAPTURE HOOK IS SET, CAPTURE
    // IMMEDIATELY AFTER SCRIPTS EXECUTE
    if (
      !options.captureAfterDocumentEvent &&
      !options.captureAfterElementExists &&
      !options.captureAfterTime
    ) {
      var html = page.evaluate(function () {
        return document.documentElement.outerHTML
      })
      console.log(html)
      phantom.exit()
    }
  }
})
