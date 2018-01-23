const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const PrerenderSpaPlugin = require('../../index.js')
const Renderer = PrerenderSpaPlugin.PuppeteerRenderer

module.exports = {
  entry: [ './src/main.js' ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new CopyWebpackPlugin([{
      from: 'src/static',
      to: '.'
    }]),
    new PrerenderSpaPlugin(
      path.join(__dirname, 'dist'),
      [ '/', '/about', '/some/deep/nested/route' ],
      {
        outputDir: path.join(__dirname, 'prerendered'),
      }
    )
  ]
}
