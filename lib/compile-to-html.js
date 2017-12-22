var Hapi = require('hapi')
var Inert = require('inert')
var Path = require('path')
var PortFinder = require('portfinder')
var PhantomBrowser = require('./browsers/phantom')

module.exports = function (staticDir, route, options, callback) {
  function serveAndPrerenderRoute () {
    PortFinder.getPort(function (error, port) {
      if (error) throw error

      var Server = new Hapi.Server({
        connections: {
          routes: {
            files: {
              relativeTo: staticDir
            }
          }
        }
      })

      Server.connection({ port: port })

      Server.register(Inert, function (error) {
        if (error) throw error
        var indexPath = options.indexPath ? options.indexPath : Path.join(staticDir, 'index.html')

        Server.route({
          method: 'GET',
          path: route,
          handler: function (request, reply) {
            reply.file(
              indexPath
            )
          }
        })

        Server.route({
          method: 'GET',
          path: '/{param*}',
          handler: {
            directory: {
              path: '.',
              redirectToSlash: true,
              index: true,
              showHidden: true
            }
          }
        })

        Server.start(function (error) {
          // If port is already bound, try again with another port
          if (error) return serveAndPrerenderRoute()

          function browserCallback (error, output) {
            if (error) throw error
            callback(output)
            Server.stop()
          }

          if (options.browser === 'chrome') {
          } else {
            PhantomBrowser(options, port, route, browserCallback)
          }
        })
      })
    })
  }
  serveAndPrerenderRoute()
}
