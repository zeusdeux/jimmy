const { resolve } = require('path')
const isProd = process.env.NODE_ENV === 'production' ? true : false

module.exports = {
  entry: {
    jimmy: './jimmy.js'
  },
  target: 'node',
  node: {
    __dirname: true
  },
  output: {
    path: resolve(__dirname, 'bin'),
    filename: '[name].js'
  },
  devtool: isProd ? 'source-map' : 'eval',
  module: {
    noParse: content => /fsevents/.test(content),
    rules: [
      {
        test: /\.js$/,
        exclude: /node_moduless/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: 'css-loader'
      }
    ]
  },
  mode: isProd ? 'production' : 'development'
}
