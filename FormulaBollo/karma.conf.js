module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('node:path').join(__dirname, 'coverage', 'formulabollo'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    // Layout/focus specs are flaky in a visible window that loses focus; use --browsers=Chrome to watch.
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
    // Global CSS is served under /base/, while Angular's asset middleware
    // exposes emitted fonts at /media/. Keep the same font URLs in iframes.
    proxies: { '/base/media/': '/media/' },
  });
};
