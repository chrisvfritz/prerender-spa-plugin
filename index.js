var FS = require('fs')
var Path = require('path')
var mkdirp = require('mkdirp')
var compileToHTML = require('./lib/compile-to-html')
var _ = require('lodash')

function SimpleHtmlPrecompiler (staticDir, paths, options) {
  this.staticDir = staticDir
  this.paths = paths
  this.options = options || {}
}

SimpleHtmlPrecompiler.prototype.apply = function (compiler) {
  var self = this
  var nbWorkers = self.options.nbWorkers || self.paths.length
  var waves = Math.max(1, Math.floor(self.paths.length / nbWorkers))

  var prerender = function (outputPath) {
    return new Promise(function (resolve, reject) {
      compileToHTML(self.staticDir, outputPath, self.options, function (prerenderedHTML) {
        if (self.options.postProcessHtml) {
          prerenderedHTML = self.options.postProcessHtml({
          html: prerenderedHTML,
          route: outputPath
          })
        }
        var folder = Path.join(self.staticDir, outputPath)
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
          })
        })
      })
    })
  }
  
  compiler.plugin('after-emit', function (compilation, done) {
	
    _.chain(self.paths)
      .groupBy(function (val) { return _.indexOf(self.paths, val) % waves})
      .reduce(function (memo, tab, indx) { return memo.then(function () { return Promise.all(tab.map(function (route) { return prerender(route)})) }) }, new Promise(function (resolve) { return resolve() }))
      .value()
      .then(function () { done() })
      .catch(function (error) {
        // setTimeout prevents the Promise from swallowing the throw
        setTimeout(function () { throw error })
      })
  })
}

module.exports = SimpleHtmlPrecompiler
