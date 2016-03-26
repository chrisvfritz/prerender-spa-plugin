var Hapi = require('hapi')
var Inert = require('inert')
var Path = require('path')
var Phantom = require('phantomjs-prebuilt')
var ChildProcess = require('child_process')

var portStart = 5000
var currentPort = portStart

module.exports = function (staticDir, route, options, callback) {
  var port = currentPort++

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
      if (error) throw error

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
}
