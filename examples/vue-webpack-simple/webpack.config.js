var Path = require('path')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var PrerenderSpaPlugin = require('prerender-spa-plugin')
const Renderer = PrerenderSpaPlugin.PuppeteerRenderer

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
    new PrerenderSpaPlugin({
      staticDir: path.join(__dirname, 'dist'),
      outputDir: path.join(__dirname, 'prerendered'),
      routes: [ '/' ],

      renderer: new Renderer({
        inject: {
          foo: 'bar'
        }
      })
    })
  ]
}
