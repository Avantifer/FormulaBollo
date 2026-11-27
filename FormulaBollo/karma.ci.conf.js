module.exports = function (config) {
  require('./karma.conf')(config);

  config.set({
    reporters: ['progress'],
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
