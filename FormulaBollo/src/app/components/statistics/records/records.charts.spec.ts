import Chart from 'chart.js/auto';
import { ChartConfiguration, ScriptableContext, TooltipItem } from 'chart.js';
import { Context } from 'chartjs-plugin-datalabels';
import { recordsFixture } from '../statistics.fixture';
import { colorsMappings } from '../../../constants';
import { buildRecordsChart, RECORD_MARKERS, RecordsPalette } from './records.charts';

describe('records charts', () => {
  const palette: RecordsPalette = { ink: 'ink', soft: 'soft', panel: 'panel', rule: 'rule', pending: 'pending' };
  const build = (mobile = false) => {
    const data = recordsFixture();
    return buildRecordsChart(data.victoryProgress, data.seasons, mobile, palette);
  };

  it('builds five stepped continuous lines with final point markers and null future races', () => {
    const chart = build();
    expect(chart.data.datasets.length).toBe(5);
    chart.data.datasets.forEach((dataset, i) => {
      expect(dataset.borderDash).toEqual([]);
      expect(dataset.stepped).toBe('after');
      expect(dataset.spanGaps).toBeFalse();
      expect(dataset.pointStyle).toBe(RECORD_MARKERS[i]);
      expect(dataset.data.slice(-6)).toEqual(Array(6).fill(null));
      const radius = dataset.pointRadius as (context: ScriptableContext<'line'>) => number;
      expect(radius({ dataIndex: 67 } as ScriptableContext<'line'>)).toBe(4);
      expect(radius({ dataIndex: 68 } as ScriptableContext<'line'>)).toBe(0);
      expect(radius({ dataIndex: 0 } as ScriptableContext<'line'>)).toBe(0);
    });
    expect(chart.data.datasets[2].borderColor).toBe(colorsMappings['Ferrari']);
    expect(chart.data.datasets[2].borderColor).toBe(chart.data.datasets[3].borderColor);
    expect(new Set(chart.data.datasets.map(dataset => dataset.pointStyle)).size).toBe(5);
    expect(chart.options.animation).toBeFalse();
    expect(chart.options.scales!['y']!.ticks).toEqual(jasmine.objectContaining({ precision: 0 }));
  });

  it('reuses three-letter circuit codes across seasons and supplies year separators and accessible final values', () => {
    const chart = build();
    expect(chart.data.labels!.slice(0, 3)).toEqual(['MEL', 'BAR', 'SUZ']);
    expect(chart.data.labels![24]).toBe('MEL');
    expect(chart.bands).toEqual([{ start: 0, end: 23, label: 'T1 · 2023' }, { start: 24, end: 49, label: 'T2 · 2024' }, { start: 50, end: 73, label: 'T3 · 2025' }]);
    expect(chart.values.length).toBe(5);
    expect(chart.rows.length).toBe(74);
    expect(chart.rows[73].values).toEqual(Array(5).fill('Pendiente'));
    expect(chart.ariaLabel).toContain('SmokingWeed:');
    expect(build(true).options.scales!['x']!.ticks!.maxTicksLimit).toBe(6);
  });

  it('labels the last played point with name and value on separate lines and reserves room for long names', () => {
    const chart = build();
    const labels = chart.options.plugins!.datalabels!;
    const display = labels.display as (context: Context) => boolean;
    const format = labels.formatter!;
    expect(display({ dataIndex: 67, datasetIndex: 0 } as Context)).toBeTrue();
    expect(display({ dataIndex: 73, datasetIndex: 0 } as Context)).toBeFalse();
    expect(format(10, { datasetIndex: 0 } as Context)).toEqual(['SmokingWeed', String(chart.values[0].value)]);
    const data = recordsFixture();
    data.victoryProgress.series[0].driver.name = 'Piloto con un nombre muy largo para identificar';
    const long = buildRecordsChart(data.victoryProgress, data.seasons, false, palette);
    expect((long.options.layout!.padding as { right: number }).right).toBeGreaterThan((chart.options.layout!.padding as { right: number }).right);
  });

  it('provides indexed tooltip context with race, season and sorted victory values using theme tokens', () => {
    const chart = build();
    const tooltip = chart.options.plugins!.tooltip!;
    expect(tooltip).toEqual(jasmine.objectContaining({ backgroundColor: palette.panel, bodyColor: palette.ink, borderColor: palette.rule }));
    const callbacks = tooltip.callbacks!;
    expect(callbacks.title!.call({} as never, [{ dataIndex: 50 }] as TooltipItem<'line'>[])).toBe('T3 · GP 1 · Melbourne');
    expect(callbacks.label!.call({} as never, { dataset: chart.data.datasets[0], raw: 7 } as TooltipItem<'line'>)).toBe('SmokingWeed: 7 victorias');
    expect(chart.options.interaction).toEqual({ mode: 'index', intersect: false });
  });

  it('draws flat pending bands, season separators, final labels and a solid vertical cursor on a real chart', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000; canvas.height = 380;
    document.body.append(canvas);
    const data = recordsFixture();
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue('--' + name).trim();
    const chart = buildRecordsChart(data.victoryProgress, data.seasons, false, { ink: token('ink'), soft: token('ink-soft'), panel: token('panel'), rule: token('rule'), pending: token('panel-alt') });
    const instance = new Chart(canvas, { type: 'line', data: chart.data, options: { ...chart.options, responsive: false }, plugins: chart.plugins } as ChartConfiguration<'line', (number | null)[]>);
    try {
      const ctx = canvas.getContext('2d')!;
      const fills = spyOn(ctx, 'fillRect').and.callThrough();
      const text = spyOn(ctx, 'fillText').and.callThrough();
      const dashes = spyOn(ctx, 'setLineDash').and.callThrough();
      const lines = spyOn(ctx, 'lineTo').and.callThrough();
      instance.setActiveElements([{ datasetIndex: 0, index: 12 }]);
      instance.draw();
      expect(fills).toHaveBeenCalled();
      expect(text.calls.allArgs().some(args => args[0] === 'T1 · 2023')).toBeTrue();
      expect(text.calls.allArgs().some(args => args[0] === 'SmokingWeed')).toBeTrue();
      expect(lines).toHaveBeenCalledWith(instance.scales['x'].getPixelForValue(12), instance.chartArea.bottom);
      expect(dashes.calls.allArgs().every(args => (args[0] as number[]).length === 0)).toBeTrue();
    } finally { instance.destroy(); canvas.remove(); }
  });

  it('accepts empty calendar, series, seasons and entirely pending series without inventing victories', () => {
    const empty = buildRecordsChart({ races: [], series: [] }, [], true, palette);
    expect(empty.data.datasets).toEqual([]);
    expect(empty.bands).toEqual([]);
    const data = recordsFixture();
    data.victoryProgress.series.forEach(series => series.wins = series.wins.map(() => null));
    const pending = buildRecordsChart(data.victoryProgress, [], true, palette);
    expect(pending.values.every(value => value.value === 0)).toBeTrue();
    expect(pending.data.datasets[0].data.every(value => value === null)).toBeTrue();
  });
});
