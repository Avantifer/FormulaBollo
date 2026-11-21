import Chart from 'chart.js/auto';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { buildEvolutionCharts, EvolutionSeries } from './evolution-stats.charts';

describe('Evolution position chart', () => {
  const all: EvolutionSeries[] = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1, name: 'Piloto ' + (index + 1), color: '#14171B', cumulative: [21 - index, 42 - index]
  }));
  const chart = (ids: number[], series = all, mobile = false) => buildEvolutionCharts(
    [{ name: 'A' }, { name: 'B' }], series, ids, mobile,
    { ink: '#14171B', soft: '#4A525C', rule: '#DEE1E5', panel: '#FFFFFF' }
  ).find(item => item.id === 'position')!;

  it('fits four selected drivers reaching fifth place to max six, with integer ticks', () => {
    const item = chart([1, 2, 3, 4], all.map(entry => entry.id === 21 ? { ...entry, cumulative: [30, 0] } : entry));
    expect(item.data.datasets.map(dataset => dataset.data)).toEqual([[2, 1], [3, 2], [4, 3], [5, 4]]);
    expect(item.options.scales!['y']).toEqual(jasmine.objectContaining({
      reverse: true, min: 1, max: 6, ticks: jasmine.objectContaining({ precision: 0, stepSize: 1 })
    }));
  });

  it('keeps a minimum of three and caps the range at the number of all series', () => {
    expect(chart([1]).options.scales!['y']!.max).toBe(3);
    expect(chart([21]).options.scales!['y']!.max).toBe(21);
    expect(chart([1], all.slice(0, 2)).options.scales!['y']!.max).toBe(2);
    expect(chart([1], all.slice(0, 1)).options.scales!['y']!.max).toBe(1);
    expect(chart([8]).options.scales!['y']!.ticks).toEqual(jasmine.objectContaining({ stepSize: 2 }));
    expect(chart([21]).options.scales!['y']!.ticks).toEqual(jasmine.objectContaining({ stepSize: 4 }));
  });

  it('separates consecutive and tied final labels using the actual scale in both card heights', () => {
    for (const mobile of [false, true]) {
      const item = chart([1, 2, 3, 20], all.map(entry => entry.id === 3 ? { ...entry, cumulative: [19, 41] } : entry), mobile);
      const height = item.height - 76;
      const max = Number(item.options.scales!['y']!.max);
      const centers = item.data.datasets.map((dataset, datasetIndex) => {
        const options = dataset.datalabels!;
        const pixel = (value: number) => (value - 1) / (max - 1) * height;
        const context = { datasetIndex, chart: { scales: { y: { getPixelForValue: pixel } } } } as unknown as Context;
        const align = (options.align as (context: Context) => number)(context) * Math.PI / 180;
        const offset = (options.offset as (context: Context) => number)(context);
        expect(options.font).toEqual({ size: 11, lineHeight: 1 });
        expect(options.padding).toBe(0);
        return pixel(Number(dataset.data.at(-1))) + Math.sin(align) * offset;
      }).sort((a, b) => a - b);
      centers.slice(1).forEach((center, index) => expect(center - centers[index]).toBeGreaterThanOrEqual(12.99));
    }
  });

  it('renders final name and position labels without overlapping in desktop and mobile cards', () => {
    for (const mobile of [false, true]) {
      const item = chart([1, 2, 3, 20], all.map(entry => entry.id === 3 ? { ...entry, cumulative: [19, 41] } : entry), mobile);
      const canvas = document.createElement('canvas');
      canvas.width = mobile ? 260 : 540;
      canvas.height = item.height;
      document.body.append(canvas);
      const rendered = new Chart(canvas, {
        type: 'line', data: item.data, options: { ...item.options, responsive: false }, plugins: [ChartDataLabels]
      });
      try {
        // Inspect the plugin's rendered boxes, including its own anchor and offset calculations.
        const labels = (rendered as unknown as {
          $datalabels: { _labels: { $layout: { _visible: boolean; _box: { _rect: { y: number; h: number } } } }[] }
        }).$datalabels._labels.filter(label => label.$layout._visible)
          .map(label => label.$layout._box._rect).sort((a, b) => a.y - b.y);
        expect(labels.length).toBe(4);
        labels.slice(1).forEach((label, index) => expect(label.y).toBeGreaterThan(labels[index].y + labels[index].h));
      } finally {
        rendered.destroy();
        canvas.remove();
      }
    }
  });
});
