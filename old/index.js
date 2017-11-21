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
  compiler.plugin('after-emit', function (compilation, done) {
    Promise.all(
      self.paths.map(function (outputPath) {
        return new Promise(function (resolve, reject) {
          compileToHTML(self.staticDir, outputPath, self.options, function (prerenderedHTML) {
            if (self.options.postProcessHtml) {
              prerenderedHTML = self.options.postProcessHtml({
                html: prerenderedHTML,
                route: outputPath
              })
            }
            var folder = Path.join(self.options.outputDir || self.staticDir, outputPath)
            mkdirp(folder, function (error) {
              if (error) {
                return reject('Folder could not be created: ' + folder + '\n' + error)
              }
              var file = Path.join(folder, 'index.html')
              FS.writeFile(
                file,
                prerenderedHTML,
                function (error) {
                  if (error) {
                    return reject('Could not write file: ' + file + '\n' + error)
                  }
                  resolve()
                }
              )
            })
          })
        })
      })
    )
    .then(function () { done() })
    .catch(function (error) {
      // setTimeout prevents the Promise from swallowing the throw
      setTimeout(function () { throw error })
    })
  })
}

module.exports = SimpleHtmlPrecompiler
