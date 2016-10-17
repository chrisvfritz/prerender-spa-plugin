/* global phantom */
var defaultsDeep = require('lodash/defaultsDeep')
var system = require('system')
var page = require('webpage').create()

var url = system.args[1]
var options = JSON.parse(system.args[2])

page.settings.loadImages = false
page.settings.localToRemoteUrlAccessEnabled = true
page.settings.resourceTimeout = 15000

page.onResourceRequested = function (requestData, request) {
  if (/\.css$/i.test(requestData.url)) request.abort()
}

// PREVENT <iframe> LOADS & UNWANTED NAVIGATION AWAY FROM PAGE
if (options.navigationLocked) {
  page.onLoadStarted = function () {
    page.navigationLocked = true
  }
}

if (options.phantomPageSettings) {
  page.settings = defaultsDeep(options.phantomPageSettings, page.settings)
}

page.open(url, function (status) {
  function returnResult (html) {
    console.log(html.trim())
    phantom.exit()
  }

  if (status !== 'success') {
    throw new Error('FAIL to load: ' + url)
  } else {
    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.captureAfterDocumentEvent) {
      page.onCallback = returnResult
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
        if (html) returnResult(html)
      }, 100)
    }

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    if (options.captureAfterTime) {
      setTimeout(function () {
        var html = page.evaluate(function () {
          return document.documentElement.outerHTML
        })
        returnResult(html)
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
      returnResult(html)
    }
  }
})
