/* global phantom */
var system = require('system')
var page = require('webpage').create()

var url = system.args[1]
var options = JSON.parse(system.args[2])

page.open(url, function (status) {
  if (status !== 'success') {
    console.error('FAIL to load:', url)
    phantom.exit()
  } else {
    setTimeout(function () {
      var html = page.evaluate(function () {
        return document.documentElement.outerHTML
      })
      console.log(html)
      phantom.exit()
    }, options.wait || 0)
  }
})
