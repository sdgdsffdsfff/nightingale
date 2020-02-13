module.exports = {
  webpackDevConfig: 'config/webpack.dev.config.js',
  webpackBuildConfig: 'config/webpack.build.config.js',
  webpackDllConfig: 'config/webpack.dll.config.js',
  proxyConfig: 'config/proxy.config.js',
  theme: 'config/theme.js',
  template: 'src/index.html',
  favicon: 'src/assets/favicon.ico',
  output: '../pub',
  eslintFix: true,
  hmr: true,
  port: 8010,
  extraBabelPlugins: [
    [
      'babel-plugin-import',
      {
        libraryName: 'antd',
        style: true,
      },
    ],
  ],
  devServer: {
    inline: true,
    proxy: {
      '/api/portal': '10.86.92.17:8058',
      '/api/transfer': '10.86.92.17:8057',
      '/api/index': '10.86.92.17:8059',
    },
    historyApiFallback: true,
  },
};
