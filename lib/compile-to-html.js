var Hapi = require('hapi')
var Inert = require('inert')
var Path = require('path')
var Phantom = require('phantomjs-prebuilt')
var ChildProcess = require('child_process')
var PortFinder = require('portfinder')

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

        Server.route({
          method: 'GET',
          path: route,
          handler: function (request, reply) {
            reply.file(
              Path.join(staticDir, 'index.html')
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
              index: true
            }
          }
        })

        Server.start(function (error) {
          // If port is already bound, try again with another port
          if (error) return serveAndPrerenderRoute()

          ChildProcess.execFile(
            Phantom.path,
            [
              Path.join(__dirname, 'phantom-page-render.js'),
              'http://localhost:' + port + route,
              JSON.stringify(options)
            ],
            function (error, stdout, stderr) {
              if (error) throw error
              if (stderr) throw stderr
              callback(stdout)
              Server.stop()
            }
          )
        })
      })
    })
  }
  serveAndPrerenderRoute()
}
