import { colorsMappings } from '../../../constants';
import Chart from 'chart.js/auto';
import { TooltipItem, TooltipModel } from 'chart.js';
import { Context } from 'chartjs-plugin-datalabels';
import { headToHeadFixture, statisticsFixture } from '../statistics.fixture';
import { buildComparisonChart, mixHex, MUTED_TEAM_WEIGHT, comparisonMetricLabel, comparisonMetrics, duelHeadline, teamHeadToHead } from './comparative-stats.helpers';

describe('Comparative statistics helpers', () => {
  const data = statisticsFixture(3);
  const palette = { ink: '#14171B', soft: '#4A525C', rule: '#DEE1E5', panel: '#FFFFFF', flat: '#646D79' };

  it('keeps every muted team mark distinct and above 3:1 against light and dark panels', () => {
    const channels = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    const luminance = (hex: string) => channels(hex).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    for (const [flat, panel] of [['#646D79', '#FFFFFF'], ['#8E96A1', '#1D2127']]) {
      for (const [team, full] of Object.entries(colorsMappings)) {
        const muted = mixHex(full, flat);
        const ratio = (Math.max(luminance(muted), luminance(panel)) + .05) / (Math.min(luminance(muted), luminance(panel)) + .05);
        expect(ratio).withContext(team + '/' + panel).toBeGreaterThanOrEqual(3);
        expect(muted).not.toBe(full.toLowerCase());
        expect(muted).not.toBe(flat.toLowerCase());
      }
    }
  });

  it('mixes opaque hex channels with rounding, endpoints and the contrast-safe default', () => {
    expect(MUTED_TEAM_WEIGHT).toBe(.35);
    expect(mixHex('#ffffff', '#000000', .55)).toBe('#8c8c8c');
    expect(mixHex('#f58020', '#646D79')).toBe('#97745a');
    expect(mixHex('#3671c6', '#8E96A1', 0)).toBe('#8e96a1');
    expect(mixHex('#3671c6', '#8E96A1', 1)).toBe('#3671c6');
  });

  it('keeps different team colors full with continuous circle/square series', () => {
    const selected = [{ id: 1, name: 'A', color: '#f58020', cumulative: [25] }, { id: 2, name: 'B', color: '#3671c6', cumulative: [18] }];
    const chart = buildComparisonChart([{ name: 'Melbourne' }], selected, false, palette);
    expect(chart.data.datasets.map(dataset => dataset.borderColor)).toEqual(selected.map(entry => entry.color));
    expect(chart.data.datasets.map(dataset => dataset.borderDash)).toEqual([[], []]);
    expect(chart.data.datasets.map(dataset => dataset.pointStyle)).toEqual(['circle', 'rect']);
  });

  it('announces either winner, ties and insufficient data without check marks', () => {
    const rows = comparisonMetrics(data.drivers[0], data.drivers[1], false);
    expect(comparisonMetricLabel(rows[0], 'SmokingWeed', 'Moraga')).toBe('Puntos: SmokingWeed 1000, Moraga 970. Gana SmokingWeed.');
    expect(comparisonMetricLabel(rows[7], 'SmokingWeed', 'Moraga')).toContain('. Gana Moraga.');
    expect(comparisonMetricLabel({ ...rows[0], winner: '=' }, 'SmokingWeed', 'Moraga')).toBe('Puntos: SmokingWeed 1000, Moraga 970. Empate.');
    expect(comparisonMetricLabel({ ...rows[0], winner: null }, 'McLaren', 'Mercedes')).toBe('Puntos: McLaren 1000, Mercedes 970. Sin dato suficiente.');
    for (const row of rows) {
      expect(comparisonMetricLabel(row, 'SmokingWeed', 'Moraga')).not.toMatch(/\b[AB]\b|✓/);
    }
    expect(comparisonMetricLabel(rows[0], 'McLaren', 'Mercedes')).toBe('Puntos: McLaren 1000, Mercedes 970. Gana McLaren.');
  });

  it('uses the specified driver order, units, precision and a separate scale for every metric', () => {
    const rows = comparisonMetrics(data.drivers[0], data.drivers[1], false);
    expect(rows.map(row => row.label)).toEqual(['Puntos', 'Media de puntos', 'Victorias', 'Podios', 'Poles', 'Vueltas rápidas', 'Carreras terminadas', 'Penalizaciones', 'Hat-tricks', 'Racha de podios', 'Regularidad']);
    expect(rows[0]).toEqual(jasmine.objectContaining({ a: '1000', b: '970', winner: 'A', widthA: 100, widthB: 97, unit: 'pts · incluye sprint' }));
    expect(rows[1].a).toBe('142,86');
    expect(rows[1].b).toBe('121,25');
    expect(rows[4]).toEqual(jasmine.objectContaining({ a: '2', b: '4', winner: 'B', widthA: 50, widthB: 100 }));
    expect(rows[7].winner).toBe('B');
    expect(rows[10]).toEqual(jasmine.objectContaining({ a: '1,0', b: '1,1', winner: 'A', unit: 'σ de posición · menos es mejor' }));
  });

  it('handles ties, zeros, missing regularity and no finished races without division by zero', () => {
    const a = { ...data.drivers[0], penalties: 0, totalPoints: 0, racesFinished: 0, posStd: null };
    const b = { ...data.drivers[1], penalties: 0, totalPoints: 0 };
    const rows = comparisonMetrics(a, b, false);
    expect(rows[0]).toEqual(jasmine.objectContaining({ widthA: 0, widthB: 0, winner: '=' }));
    expect(rows[1].a).toBe('0,00');
    expect(rows[7]).toEqual(jasmine.objectContaining({ winner: '=', widthA: 0, widthB: 0 }));
    expect(rows[10]).toEqual(jasmine.objectContaining({ a: '—', winner: null, widthA: 0, widthB: 100 }));
    expect(comparisonMetrics(b, a, false)[10]).toEqual(jasmine.objectContaining({ b: '—', winner: null, widthA: 100, widthB: 0 }));
    expect(comparisonMetrics(a, a, false)[10]).toEqual(jasmine.objectContaining({ a: '—', b: '—', winner: null, widthA: 0, widthB: 0 }));
  });

  it('uses all D2 team metrics, including reliability from participations and retirements', () => {
    const rows = comparisonMetrics(data.teams[0], data.teams[1], true);
    expect(rows.map(row => row.key)).toEqual(['totalPoints', 'avgPoints', 'victories', 'podiums', 'poles', 'fastlaps', 'racesFinished', 'penalties', 'doublePoints', 'doublePodiums', 'pointsShare', 'reliability']);
    expect(rows[1].a).toBe('25,00');
    expect(rows[6].unit).toBe('llegadas de pilotos');
    expect(rows[9].winner).toBe('=');
    expect(rows[10].a).toBe('10,0 %');
    expect(rows[11].a).toBe('83,3 %');
    expect(rows[11].winner).toBe('A');
    expect(comparisonMetrics({ ...data.teams[0], races: 0 }, data.teams[1], true)[11].winner).toBeNull();
  });

  it('derives team duels from consecutive cumulative values, counts ties and omits missing series', () => {
    const overview = statisticsFixture(3);
    overview.teamEvolution.races.push({ id: 3, name: 'Suzuka', season: 3 });
    overview.teamEvolution.series[0].cumulative = [40, 70, 75];
    overview.teamEvolution.series[1].cumulative = [25, 65, 70];
    const duel = teamHeadToHead(overview, 1, 2);
    expect(duel.races.map(row => [row.positionA, row.positionB, row.result])).toEqual([[40, 25, 'A'], [30, 40, 'B'], [5, 5, 'NONE']]);
    expect(duel).toEqual(jasmine.objectContaining({ a: 'McLaren', b: 'Mercedes', aheadA: 1, aheadB: 1, comparable: 3, bothDnf: 0, pointsA: 75, pointsB: 70 }));
    expect(teamHeadToHead(overview, 2, 1).races[0].result).toBe('B');
    expect(teamHeadToHead(overview, 1, 99).comparable).toBe(0);
  });

  it('writes natural driver headlines for wins, sweeps, one race, ties and no comparable races', () => {
    const duel = headToHeadFixture();
    expect(duelHeadline({ ...duel, aheadA: 2 }, 'Ana', 'Bea')).toBe('Ana terminó por delante de Bea en 2 de las 3 carreras que corrieron juntos.');
    expect(duelHeadline({ ...duel, aheadB: 2 }, 'Ana', 'Bea')).toBe('Bea terminó por delante de Ana en 2 de las 3 carreras que corrieron juntos.');
    expect(duelHeadline({ ...duel, aheadA: 3, aheadB: 0 }, 'Ana', 'Bea')).toBe('Ana terminó por delante de Bea en las 3 carreras que corrieron juntos.');
    expect(duelHeadline({ ...duel, aheadA: 1, aheadB: 0, comparable: 1 }, 'Ana', 'Bea')).toBe('Ana terminó por delante de Bea en la única carrera que corrieron juntos.');
    expect(duelHeadline(duel, 'Ana', 'Bea')).toBe('Ana y Bea están igualados: cada uno terminó por delante en 1 de las 3 carreras que corrieron juntos.');
    expect(duelHeadline({ ...duel, comparable: 0 }, 'Ana', 'Bea')).toBe('No hay ninguna carrera en la que ambos hayan corrido y se pueda saber quién terminó por delante.');
  });

  it('writes natural team headlines for wins, sweeps, ties and no comparable races', () => {
    const duel = headToHeadFixture();
    expect(duelHeadline({ ...duel, aheadA: 2 }, 'McLaren', 'Mercedes', true)).toBe('McLaren sumó más puntos que Mercedes en 2 de las 3 carreras de la temporada.');
    expect(duelHeadline({ ...duel, aheadB: 2 }, 'McLaren', 'Mercedes', true)).toBe('Mercedes sumó más puntos que McLaren en 2 de las 3 carreras de la temporada.');
    expect(duelHeadline({ ...duel, aheadA: 3, aheadB: 0 }, 'McLaren', 'Mercedes', true)).toBe('McLaren sumó más puntos que Mercedes en las 3 carreras de la temporada.');
    expect(duelHeadline(duel, 'McLaren', 'Mercedes', true)).toBe('McLaren y Mercedes están igualadas: cada una sumó más puntos en 1 de las 3 carreras de la temporada.');
    expect(duelHeadline({ ...duel, comparable: 0 }, 'McLaren', 'Mercedes', true)).toBe('Todavía no hay carreras en las que se pueda comparar a las dos escuderías.');
  });

  const series = [
    { id: 1, name: 'Ana', color: palette.ink, cumulative: [25, 50] },
    { id: 2, name: 'Bea', color: palette.ink, cumulative: [18, 43] }
  ];
  const races = [{ name: 'Melbourne' }, { name: 'Shanghái' }];

  it('reuses evolution labels, sorted tooltip, cursor and theme, with solid circles and muted solid squares for teammates', () => {
    const chart = buildComparisonChart(races, series, false, palette);
    const [a, b] = chart.data.datasets;
    expect(a.borderDash).toEqual([]);
    expect(b.borderDash).toEqual([]);
    expect(a.pointStyle).toBe('circle');
    expect(b.pointStyle).toBe('rect');
    expect(a.pointBackgroundColor).toBe(palette.ink);
    expect(b.pointBackgroundColor).toBe(mixHex(palette.ink, palette.flat));
    expect(b.borderColor).toBe(mixHex(palette.ink, palette.flat));
    expect(chart.values.every(value => value.dash.length === 0)).toBeTrue();
    expect(chart.data.labels).toEqual(['MEL', 'SHA']);
    expect(chart.plugins.map(plugin => plugin.id)).toContain('evolutionCursor');
    expect(chart.options.plugins!.datalabels!.formatter!(50, { datasetIndex: 0 } as Context)).toEqual(['Ana 50']);
    expect(chart.options.plugins!.datalabels!.formatter!(43, { datasetIndex: 1 } as Context)).toEqual(['Bea 43']);
    expect(chart.options.color).toBe(palette.ink);
    expect(chart.options.scales!['y']!.grid!.color).toBe(palette.rule);
    expect(chart.options.animation).toBeFalse();
    const tooltip = chart.options.plugins!.tooltip!;
    const item = (index: number) => ({ datasetIndex: index, dataIndex: 1, raw: series[index].cumulative[1], dataset: { label: series[index].name } } as TooltipItem<'line'>);
    const model = {} as TooltipModel<'line'>;
    expect(tooltip.itemSort!(item(1), item(0), chart.data)).toBe(7);
    expect(tooltip.callbacks!.title!.call(model, [item(0)])).toBe('Carrera 2 · Shanghái');
    expect(tooltip.callbacks!.label!.call(model, item(1))).toBe('Bea: 43 pts (+25)');
    expect(tooltip.callbacks!.labelColor!.call(model, item(1))).toEqual(jasmine.objectContaining({ backgroundColor: mixHex(palette.ink, palette.flat), borderColor: mixHex(palette.ink, palette.flat) }));
  });

  it('renders separated final labels within mobile and desktop canvases even for equal teammate totals', () => {
    const styles = getComputedStyle(document.documentElement);
    const tokens = { ink: styles.getPropertyValue('--ink').trim(), soft: styles.getPropertyValue('--ink-soft').trim(), panel: styles.getPropertyValue('--panel').trim(), rule: styles.getPropertyValue('--rule').trim(), flat: styles.getPropertyValue('--sector-flat').trim() };
    for (const width of [230, 300, 700, 1200]) {
      const selected = series.map(entry => ({ ...entry, color: tokens.ink, cumulative: [25, 50] }));
      const chart = buildComparisonChart(races, selected, width < 640, tokens);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = 320;
      document.body.append(canvas);
      const rendered = new Chart(canvas, { type: 'line', data: chart.data, options: { ...chart.options, responsive: false }, plugins: chart.plugins });
      try {
        const labels = (rendered as unknown as {
          $datalabels: { _labels: { $layout: { _visible: boolean; _box: { _rect: { x: number; y: number; w: number; h: number } } } }[] }
        }).$datalabels._labels.filter(label => label.$layout._visible).map(label => label.$layout._box._rect).sort((a, b) => a.y - b.y);
        expect(labels.length).toBe(2);
        expect(labels[1].y).toBeGreaterThan(labels[0].y + labels[0].h);
        for (const label of labels) {
          expect(label.x).toBeGreaterThanOrEqual(0);
          expect(label.x + label.w).toBeLessThanOrEqual(width);
          expect(label.y).toBeGreaterThanOrEqual(0);
          expect(label.y + label.h).toBeLessThanOrEqual(320);
        }
      } finally { rendered.destroy(); canvas.remove(); }
    }
  });
});
