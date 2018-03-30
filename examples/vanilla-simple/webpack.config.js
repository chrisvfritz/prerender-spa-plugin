const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const PrerenderSPAPlugin = require('prerender-spa-plugin')
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer

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
    // == PRERENDER SPA PLUGIN == //
    new PrerenderSPAPlugin({
      // Index.html is in the root directory.
      staticDir: path.join(__dirname, 'dist'),
      routes: [ '/', '/about', '/some/deep/nested/route' ],
      // Optional minification.
      minify: {
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        decodeEntities: true,
        keepClosingSlash: true,
        sortAttributes: true
      },

      renderer: new Renderer({
        inject: {
          foo: 'bar'
        },
        renderAfterDocumentEvent: 'render-event'
      })
    })
  ]
}
