module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
    ],
    reporters: ['progress'],
    // Global CSS is served under /base/, while Angular's asset middleware
    // exposes emitted fonts at /media/. Keep the same font URLs in iframes.
    proxies: { '/base/media/': '/media/' },
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer'],
      },
    },
    singleRun: true,
    restartOnFileChange: false,
  });
};
