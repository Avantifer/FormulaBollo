import Chart from 'chart.js/auto';
import {
  chartGridColor,
  chartLabelColor,
  getBarMobileChartOptions,
  getLineChartOptions,
  getPieChartOptions,
} from './constants';

describe('Chart theme', () => {
  for (const mobile of [false, true]) {
    it(`renders Spanish decimal ticks and tooltip values in ${mobile ? 'horizontal bars' : 'lines'}`, () => {
      const canvas = document.createElement('canvas');
      const chart = new Chart(canvas, {
        type: mobile ? 'bar' : 'line',
        data: { labels: ['Primera', 'Segunda'], datasets: [{ label: 'Media', data: [2.41, 7.34] }] },
        options: {
          ...(mobile ? getBarMobileChartOptions(false) : getLineChartOptions(false)),
          responsive: false,
          animation: false
        }
      });
      try {
        chart.tooltip!.setActiveElements([{ datasetIndex: 0, index: 0 }], { x: 0, y: 0 });
        expect(chart.tooltip!.dataPoints[0].formattedValue).toBe('2,41');
        chart.tooltip!.setActiveElements([{ datasetIndex: 0, index: 1 }], { x: 0, y: 0 });
        expect(chart.tooltip!.dataPoints[0].formattedValue).toBe('7,34');
        const scale = chart.scales[mobile ? 'x' : 'y'];
        expect(scale.getLabelForValue(2.41)).toBe('2,41');
      } finally {
        chart.destroy();
      }
    });
  }

  function luminance(hex: string): number {
    const value = hex.slice(1);
    const expanded = value.length === 3 ? [...value].map(channel => channel + channel).join('') : value;
    const channels = [0, 2, 4].map(offset => {
      const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  for (const isDarkMode of [false, true]) {
    describe(isDarkMode ? 'dark' : 'light', () => {
      beforeEach(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
      });

      it('matches the computed label and grid tokens exactly', () => {
        const styles = getComputedStyle(document.documentElement);
        expect(chartLabelColor(isDarkMode).toLowerCase())
          .toBe(styles.getPropertyValue('--ink-soft').trim().toLowerCase());
        expect(chartGridColor(isDarkMode).toLowerCase())
          .toBe(styles.getPropertyValue('--rule').trim().toLowerCase());
      });

      it('meets WCAG AA label contrast against the panel', () => {
        const styles = getComputedStyle(document.documentElement);
        const label = luminance(chartLabelColor(isDarkMode));
        const panel = luminance(styles.getPropertyValue('--panel').trim());
        const contrast = (Math.max(label, panel) + 0.05) / (Math.min(label, panel) + 0.05);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });

      for (const factory of [
        getBarMobileChartOptions,
        getPieChartOptions,
        getLineChartOptions,
      ]) {
        it(`uses semantic colors throughout ${factory.name}`, () => {
          const options = factory(isDarkMode);
          expect(options.locale).toBe('es-ES');
          const serialized = JSON.stringify(options);
          for (const legacy of ['rgb(150', 'rgb(220', 'rgba(200']) {
            expect(serialized).withContext(legacy).not.toContain(legacy);
          }
          const expectedLabel = chartLabelColor(isDarkMode);
          if (options.scales) {
            expect(options.scales.x.ticks.color).toBe(expectedLabel);
            expect(options.scales.y.ticks.color).toBe(expectedLabel);
            for (const axis of ['x', 'y']) {
              if (options.scales[axis].grid.color) {
                expect(options.scales[axis].grid.color).toBe(chartGridColor(isDarkMode));
              }
            }
          }
          if (options.plugins.legend.labels) {
            expect(options.plugins.legend.labels.color).toBe(expectedLabel);
          }
        });
      }
    });
  }
});
