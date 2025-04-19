const path = require('path');

module.exports = {
  // ... 其他配置 ...
  
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      // ... 其他規則 ...
    ],
  },
  
  ignoreWarnings: [
    {
      module: /html5-qrcode/,
      message: /Failed to parse source map/,
    },
  ],
}; 