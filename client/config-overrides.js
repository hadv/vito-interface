const { override, addWebpackAlias } = require('customize-cra');
const path = require('path');

module.exports = override(
  addWebpackAlias({
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@styles': path.resolve(__dirname, 'src/styles'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@pages': path.resolve(__dirname, 'src/pages'),
    '@models': path.resolve(__dirname, 'src/models'),
    '@vimUI': path.resolve(__dirname, 'src/components/vimUI')
  })
); 