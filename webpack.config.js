module.exports = {
  context: __dirname, // to automatically find tsconfig.json
  devtool: 'source-map',
  entry: './src/index.ts',
  output: { filename: "dist/bundle.js" },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [
        {
          loader: 'ts-loader',
        }
      ]
    }]
  },
  resolve: {
    extensions: [ '.ts', '.tsx', 'js' ]
  }
};
