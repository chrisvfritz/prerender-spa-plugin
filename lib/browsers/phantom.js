var Path = require('path')
var Phantom = require('phantomjs-prebuilt')
var ChildProcess = require('child_process')

module.exports = function (options, port, route, callback) {
  var maxAttempts = options.maxAttempts || 5
  var attemptsSoFar = 0

  var phantomArguments = [
    Path.join(__dirname, 'phantom-page-render.js'),
    'http://localhost:' + port + route,
    JSON.stringify(options)
  ]

  if (options.phantomOptions) {
    phantomArguments.unshift(options.phantomOptions)
  }

  function capturePage () {
    attemptsSoFar += 1

    ChildProcess.execFile(
      Phantom.path,
      phantomArguments,
      {maxBuffer: 1048576},
      function (error, stdout, stderr) {
        if (error || stderr) {
          // Retry if we haven't reached the max number of capture attempts
          if (attemptsSoFar <= maxAttempts) {
            return capturePage()
          } else {
            callback(error || stderr)
          }
        } else {
          callback(null, stdout)
        }
      }
    )
  }
  capturePage()
}
