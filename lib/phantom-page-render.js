/* global phantom */
var defaultsDeep = require('lodash/defaultsDeep')
var system = require('system')
var page = require('webpage').create()

var url = system.args[1]
var options = JSON.parse(system.args[2])
// get localhost url
var localhost = url.match(/http:\/\/localhost:\d+/)

page.settings.loadImages = false
page.settings.localToRemoteUrlAccessEnabled = true
page.settings.resourceTimeout = 15000

page.onInitialized = function () {
  page.injectJs('../node_modules/core-js/client/core.js')
}

page.onResourceRequested = function (requestData, request) {
  if (/\.css$/i.test(requestData.url)) request.abort()

  // request abort
  if (options.phantomAbort &&
    requestData.url.indexOf(options.phantomAbort) !== -1) {
    return request.abort()
  }

  // provide alternative implementation of a remote resource
  if (options.phantomToLocal && 
    requestData.url.indexOf(options.phantomToLocal) !== -1) {
    if (options.phantomToLocal.substr(options.phantomToLocal.length - 1, 1) === '/') {
      localhost = localhost + '/'
    }

    request.changeUrl(requestData.url.replace(options.phantomToLocal, localhost))
  }
}

page.onInitilize

page.onError = function (message, trace) {
  if (options.ignoreJSErrors) return
  var pathname = url.replace(/http:\/\/localhost:\d+/, '')
  console.error('WARNING: JavaScript error while prerendering: ' + pathname + '\n' + message)
  phantom.exit(1)
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
  if (status !== 'success') {
    throw new Error('FAIL to load: ' + url)
  } else {
    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.captureAfterDocumentEvent) {
      page.onCallback = returnResult
      page.evaluate(function (eventName) {
        document.addEventListener(eventName, function () {
          var doctype = new window.XMLSerializer().serializeToString(document.doctype)
          var outerHTML = document.documentElement.outerHTML
          window.callPhantom(doctype + outerHTML)
        })
      }, options.captureAfterDocumentEvent)
    }

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    if (options.captureAfterElementExists) {
      setInterval(function () {
        var html = page.evaluate(function (elementSelector) {
          if (document.querySelector(elementSelector)) {
            var doctype = new window.XMLSerializer().serializeToString(document.doctype)
            var outerHTML = document.documentElement.outerHTML
            return doctype + outerHTML
          }
        }, options.captureAfterElementExists)
        if (html) returnResult(html)
      }, 100)
    }

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    if (options.captureAfterTime) {
      setTimeout(function () {
        var html = page.evaluate(function () {
          var doctype = new window.XMLSerializer().serializeToString(document.doctype)
          var outerHTML = document.documentElement.outerHTML
          return doctype + outerHTML
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
        var doctype = new window.XMLSerializer().serializeToString(document.doctype)
        var outerHTML = document.documentElement.outerHTML
        return doctype + outerHTML
      })
      returnResult(html)
    }
  }

  function returnResult (html) {
    console.log(html.trim())
    phantom.exit()
  }
})
