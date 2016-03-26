var FS = require('fs')
var Path = require('path')
var mkdirp = require('mkdirp')
var compileToHTML = require('./lib/compile-to-html')

function SimpleHtmlPrecompiler (staticDir, paths, options) {
  this.staticDir = staticDir
  this.paths = paths
  this.options = options || {}
}

SimpleHtmlPrecompiler.prototype.apply = function (compiler) {
  var self = this
  compiler.plugin('emit', function (compilation, done) {
    self.paths.forEach(function (outputPath) {
      compileToHTML(self.staticDir, outputPath, self.options, function (prerenderedHTML) {
        var folder = Path.join(self.staticDir, outputPath)
        mkdirp(folder, function (error) {
          if (error) throw error
          FS.writeFile(
            Path.join(folder, 'index.html'),
            prerenderedHTML,
            function (error) {
              if (error) throw error
            }
          )
        })
      })
    })
    done()
  })
}

module.exports = SimpleHtmlPrecompiler
