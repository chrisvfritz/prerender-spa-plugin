var Path = require('path')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var PrerenderSpaPlugin = require('prerender-spa-plugin')

module.exports = {
  entry: [ './src/main.js' ],
  output: {
    path: './dist',
    filename: '[name].js'
  },
  plugins: [
    new CopyWebpackPlugin([{
      from: 'src/static',
      to: '.'
    }]),
    new PrerenderSpaPlugin(
      Path.join(__dirname, 'dist'),
      [ '/' ]
    )
  ]
}
