const { resolve } = require('path')
const isProd = process.env.NODE_ENV === 'production' ? true : false

module.exports = {
  entry: {
    app: './App/Main.js'
  },
  output: {
    path: resolve(__dirname, 'public/assets/'),
    filename: '[name].js'
  },
  devtool: isProd ? 'source-map' : 'eval',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  mode: isProd ? 'production' : 'development'
}
