const { resolve } = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

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
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  mode: isProd ? 'production' : 'development'
}
