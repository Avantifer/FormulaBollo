import Chart from 'chart.js/auto';
import { ScriptableContext, TooltipItem, TooltipModel } from 'chart.js';
import { Context } from 'chartjs-plugin-datalabels';
import { buildEvolutionChart, EvolutionSeries } from './evolution-stats.charts';

describe('Evolution points chart', () => {
  const palette = { ink: '#14171B', soft: '#4A525C', rule: '#DEE1E5', panel: '#FFFFFF' };
  const all: EvolutionSeries[] = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1, name: 'Piloto ' + (index + 1), color: '#14171B', cumulative: [25 - index, 50 - index]
  }));
  const races = [{ name: 'Melbourne' }, { name: 'Shanghái' }];
  const chart = (series = all, mobile = false) => buildEvolutionChart(races, series, series.map(entry => entry.id), mobile, palette);
  const tooltipItem = (datasetIndex: number, dataIndex: number): TooltipItem<'line'> => ({
    datasetIndex, dataIndex, raw: all[datasetIndex].cumulative[dataIndex], dataset: { label: all[datasetIndex].name }
  } as TooltipItem<'line'>);

  it('keeps cumulative datasets in selection order, six distinct dashes and only final markers', () => {
    const item = buildEvolutionChart(races, all, [3, 1, 6], false, palette);
    expect(item.data.datasets.map(dataset => dataset.data)).toEqual([[23, 48], [25, 50], [20, 45]]);
    expect(item.data.datasets.map(dataset => dataset.label)).toEqual(['Piloto 3', 'Piloto 1', 'Piloto 6']);
    expect(item.values.map(value => value.label)).toEqual(['Piloto 1', 'Piloto 3', 'Piloto 6']);
    expect(item.values.map(value => value.gain)).toEqual(Array(3).fill('+25 en la última'));
    expect(new Set(chart().data.datasets.map(dataset => JSON.stringify(dataset.borderDash))).size).toBe(6);
    const labels = item.options.plugins!.datalabels!;
    const display = labels.display as (context: Context) => boolean;
    expect(display({ dataIndex: 0, dataset: item.data.datasets[0] } as Context)).toBeFalse();
    expect(display({ dataIndex: 1, dataset: item.data.datasets[0] } as Context)).toBeTrue();
    expect(labels.formatter!(48, { datasetIndex: 0 } as Context)).toEqual(['Piloto 3 48']);
    for (const dataset of item.data.datasets) {
      expect(dataset.borderWidth).toBe(2.5);
      expect(dataset.fill).toBeFalse();
      const radius = dataset.pointRadius as (context: ScriptableContext<'line'>) => number;
      expect(radius({ dataIndex: 0 } as ScriptableContext<'line'>)).toBe(0);
      expect(radius({ dataIndex: 1 } as ScriptableContext<'line'>)).toBe(4);
      expect(dataset.pointHoverRadius).toBe(4);
    }
  });

  it('uses full race names, descending points and race gains including the first race in tooltips', () => {
    const tooltip = chart().options.plugins!.tooltip!;
    const callbacks = tooltip.callbacks!;
    const model = {} as TooltipModel<'line'>;
    expect(callbacks.title!.call(model, [tooltipItem(0, 1)])).toBe('Carrera 2 · Shanghái');
    expect(callbacks.title!.call(model, [tooltipItem(0, 0)])).toBe('Carrera 1 · Melbourne');
    expect(callbacks.title!.call(model, [])).toBe('');
    expect(callbacks.label!.call(model, tooltipItem(0, 1))).toBe('Piloto 1: 50 pts (+25)');
    expect(callbacks.label!.call(model, tooltipItem(1, 0))).toBe('Piloto 2: 24 pts (+24)');
    expect(tooltip.itemSort!(tooltipItem(1, 1), tooltipItem(0, 1), chart().data)).toBe(1);
    expect(tooltip.itemSort!(tooltipItem(0, 1), tooltipItem(1, 1), chart().data)).toBe(-1);
    expect(tooltip.usePointStyle).toBeTrue();
    expect(callbacks.labelColor!.call(model, tooltipItem(1, 0))).toEqual({ borderColor: all[1].color, backgroundColor: all[1].color });
    expect(tooltip).toEqual(jasmine.objectContaining({ backgroundColor: palette.panel, borderColor: palette.rule, borderWidth: 1, titleColor: palette.ink, bodyColor: palette.ink }));
  });

  it('derives uppercase accent-free codes and extends colliding prefixes only as far as needed', () => {
    const names = ['Melbourne', 'Shanghái', 'Suzuka', 'Bahréin', 'Bakú', 'Barcelona', 'Baréin'];
    const item = buildEvolutionChart(names.map(name => ({ name })), [], [], false, palette);
    expect(item.data.labels).toEqual(['MEL', 'SHA', 'SUZ', 'BAH', 'BAK', 'BARC', 'BARE']);
    const repeated = buildEvolutionChart([{ name: 'México' }, { name: 'México' }], [], [], false, palette);
    expect(new Set(repeated.data.labels).size).toBe(2);
    for (const mobile of [false, true]) {
      const options = chart(all, mobile).options;
      expect(options.animation).toBeFalse();
      expect(options.interaction).toEqual({ mode: 'index', intersect: false });
      expect(options.events).toContain('touchstart');
      expect(options.events).toContain('touchmove');
      expect(options.scales!['x']!.ticks).toEqual(jasmine.objectContaining({ autoSkip: true, maxTicksLimit: mobile ? 6 : 14, minRotation: 0, maxRotation: 0 }));
      expect(options.scales!['x']!.title!.text).toBe('Carrera disputada');
      expect(options.scales!['y']).toEqual(jasmine.objectContaining({ beginAtZero: true, grace: '12%', ticks: jasmine.objectContaining({ maxTicksLimit: 6 }) }));
      expect(options.scales!['y']!.title!.text).toBe('Puntos');
      expect(options.scales!['y']!.grid).toEqual({ color: palette.rule, lineWidth: 1 });
    }
  });

  it('estimates right padding from the longest final label with desktop and mobile bounds', () => {
    expect(chart(all.slice(0, 1)).options.layout!.padding).toEqual(jasmine.objectContaining({ right: 96 }));
    const longer = [{ ...all[0], name: 'Max Verstappen' }];
    expect(chart(longer).options.layout!.padding).toEqual(jasmine.objectContaining({ right: ('Max Verstappen 50'.length * 6.5 + 24) }));
    const longest = [{ ...all[0], name: 'Piloto con un nombre muy largo para comparar' }];
    expect(chart(longest).options.layout!.padding).toEqual(jasmine.objectContaining({ right: 260 }));
    expect(chart(longest, true).options.layout!.padding).toEqual(jasmine.objectContaining({ right: 160 }));
  });

  it('draws a dashed cursor only at the active index, with the soft token and restored canvas state', () => {
    const plugin = chart().plugins.find(plugin => plugin.id === 'evolutionCursor')!;
    const ctx = jasmine.createSpyObj<CanvasRenderingContext2D>('context', ['save', 'beginPath', 'setLineDash', 'moveTo', 'lineTo', 'stroke', 'restore']);
    const active = jasmine.createSpy('active').and.returnValue([]);
    const pixel = jasmine.createSpy('pixel').and.returnValue(125);
    const simulated = { ctx, chartArea: { top: 30, bottom: 280 }, scales: { x: { getPixelForValue: pixel } }, getActiveElements: active } as unknown as Chart<'line'>;
    plugin.afterDatasetsDraw!(simulated, {}, {}, false);
    expect(ctx.stroke).not.toHaveBeenCalled();
    active.and.returnValue([{ index: 1 }]);
    plugin.afterDatasetsDraw!(simulated, {}, {}, false);
    expect(pixel).toHaveBeenCalledOnceWith(1);
    expect(ctx.setLineDash).toHaveBeenCalledOnceWith([3, 4]);
    expect(ctx.moveTo).toHaveBeenCalledOnceWith(125, 30);
    expect(ctx.lineTo).toHaveBeenCalledOnceWith(125, 280);
    expect(ctx.strokeStyle).toBe(palette.soft);
    expect(ctx.lineWidth).toBe(1);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('renders six final name/value labels within the canvas without overlaps at mobile and desktop widths', () => {
    const scenarios = [Array(6).fill(50), [1000, 0, 0, 0, 0, 0], Array(6).fill(0)];
    for (const { width, finals } of [254, 324, 688, 944, 1216].flatMap(width => scenarios.map(finals => ({ width, finals })))) {
      const mobile = width < 640;
      const series = all.map((entry, index) => ({ ...entry, name: index ? 'Piloto ' + index : 'Piloto con un nombre muy largo para comparar', cumulative: [Math.min(25, finals[index]), finals[index]] }));
      const item = chart(series, mobile);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = mobile ? 320 : 420;
      document.body.append(canvas);
      const rendered = new Chart(canvas, { type: 'line', data: item.data, options: { ...item.options, responsive: false }, plugins: item.plugins });
      try {
        const labels = (rendered as unknown as {
          $datalabels: { _labels: { $layout: { _visible: boolean; _box: { _rect: { x: number; y: number; w: number; h: number } } } }[] }
        }).$datalabels._labels.filter(label => label.$layout._visible)
          .map(label => label.$layout._box._rect).sort((a, b) => a.y - b.y);
        expect(labels.length).withContext(String(width)).toBe(6);
        labels.forEach(label => {
          expect(label.x).withContext(width + '/left').toBeGreaterThanOrEqual(0);
          expect(label.x + label.w).withContext(width + '/right').toBeLessThanOrEqual(width);
          expect(label.y).withContext(width + '/top').toBeGreaterThanOrEqual(0);
          expect(label.y + label.h).withContext(width + '/bottom').toBeLessThanOrEqual(canvas.height);
        });
        labels.slice(1).forEach((label, index) => expect(label.y).withContext(width + '/overlap').toBeGreaterThan(labels[index].y + labels[index].h));
        const point = rendered.getDatasetMeta(0).data[0];
        const active = rendered.getElementsAtEventForMode({ type: 'touchstart', x: point.x, y: rendered.chartArea.bottom, native: null } as unknown as Event, 'index', { intersect: false }, false);
        expect(active.length).withContext(width + '/touch-index').toBe(6);
        expect(active.every(item => item.index === 0)).toBeTrue();
        rendered.setActiveElements(active);
        rendered.update('none');
        rendered.data.datasets.forEach((_, index) => expect((rendered.getDatasetMeta(index).data[0].options as { radius: number }).radius).toBe(4));
        rendered.setActiveElements([]);
        rendered.update('none');
        expect((rendered.getDatasetMeta(0).data[0].options as { radius: number }).radius).toBe(0);
      } finally {
        rendered.destroy();
        canvas.remove();
      }
    }
  });
});
