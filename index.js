var FS = require('fs')
var Path = require('path')
var mkdirp = require('mkdirp')
var asyncEach = require('async.each')

var compileToHTML = require('./lib/compile-to-html')

function SimpleHtmlPrecompiler (staticDir, paths, options) {
  this.staticDir = staticDir
  this.paths = paths
  this.options = options || {}
}

// High-order function that takes compilation context
// and generates `iteratee` function (used by async.each).
//
// The output is asynchronous function used to compile
// individual path.
function compilePathFabric (compilation, context) {
  return function (outputPath, done) {
    compileToHTML(context.staticDir, outputPath, context.options, function (prerenderedHTML) {
      var folder = Path.join(context.staticDir, outputPath)

      mkdirp(folder, function (error) {
        // In case of error propagate it back to compile
        if (error) return done(error)

        FS.writeFile(
          Path.join(folder, 'index.html'),
          prerenderedHTML,
          function (error) {
            done(error)
          })
      })
    })
  }
}

SimpleHtmlPrecompiler.prototype.apply = function (compiler) {
  var self = this
  compiler.plugin('emit', function (compilation, done) {
    asyncEach(self.paths, compilePathFabric(compilation, self), function (error) {
      if (error) throw error
      done()
    })
  })
}

module.exports = SimpleHtmlPrecompiler
