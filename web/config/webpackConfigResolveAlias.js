var path = require('path');
var cwd = process.cwd();

module.exports = {
  'react-dom': '@hot-loader/react-dom',
  '@path/common': path.resolve(cwd, 'src/common'),
  '@path/components': path.resolve(cwd, 'src/components'),
  '@path/Auth': path.resolve(cwd, 'src/components/Auth'),
  '@path/Layout': path.resolve(cwd, 'src/components/Layout'),
  '@path/Exception': path.resolve(cwd, 'src/components/Exception'),
  '@path/BaseComponent': path.resolve(cwd, 'src/components/BaseComponent/index.jsx'),
  '@path/LayoutBreadcrumb': path.resolve(cwd, 'src/components/Layout/LayoutBreadcrumb.jsx'),
  '@path/LayoutNsShow': path.resolve(cwd, 'src/components/Layout/LayoutNsShow.jsx'),
  '@path/ModalControl': path.resolve(cwd, 'src/components/ModalControl/index.jsx'),
  '@path/clipboard': path.resolve(cwd, 'src/common/clipboard.jsx'),
};
