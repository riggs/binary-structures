export default {
  input: './dist/index.js',
  output: [{
    file: './dist/cjs-bundle.js',
    format: 'cjs'
  }, {
    file: './dist/es-bundle.js',
    format: 'es'
  }],
  sourcemap: true,
  interop: false
};