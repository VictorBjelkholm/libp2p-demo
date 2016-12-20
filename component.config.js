var util = require('util')
var babelLoaderQuery = {
  presets: [
    'babel-preset-es2015',
    'babel-preset-react',
    'babel-preset-stage-0'
  ].map(require.resolve)
}
module.exports = {
  entry: ['./wrapper-component.js'],
  output: {
    libraryTarget: 'var',
    library: 'Libp2pAutoGraph',
    path: __dirname,
    filename: './dist/component.js'
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: util.format('react-hot!babel?%s', JSON.stringify(babelLoaderQuery))
    }, {
      test: /\.css$/,
      loader: 'style!css!postcss'
    }]
  }
}
