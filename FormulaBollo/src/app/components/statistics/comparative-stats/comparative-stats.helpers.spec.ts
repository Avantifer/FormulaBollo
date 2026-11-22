import Chart from 'chart.js/auto';
import { TooltipItem, TooltipModel } from 'chart.js';
import { Context } from 'chartjs-plugin-datalabels';
import { headToHeadFixture, statisticsFixture } from '../statistics.fixture';
import { buildComparisonChart, comparisonMetricLabel, comparisonMetrics, duelHeadline, teamHeadToHead } from './comparative-stats.helpers';

describe('Comparative statistics helpers', () => {
  const data = statisticsFixture(3);
  const palette = { ink: 'var(--ink)', soft: 'var(--ink-soft)', rule: 'var(--rule)', panel: 'var(--panel)' };

  it('announces either winner, ties and insufficient data without check marks', () => {
    const rows = comparisonMetrics(data.drivers[0], data.drivers[1], false);
    expect(comparisonMetricLabel(rows[0], 'SmokingWeed', 'Moraga')).toBe('Puntos: SmokingWeed 1000, Moraga 970. Gana SmokingWeed.');
    expect(comparisonMetricLabel(rows[7], 'SmokingWeed', 'Moraga')).toContain('. Gana Moraga.');
    expect(comparisonMetricLabel({ ...rows[0], winner: '=' }, 'A', 'B')).toContain('. Empate.');
    expect(comparisonMetricLabel({ ...rows[0], winner: null }, 'A', 'B')).toContain('. Sin dato suficiente.');
    expect(rows.every(row => !comparisonMetricLabel(row, 'A', 'B').includes('✓'))).toBeTrue();
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

  it('writes headlines for either leader, ties and no comparable races', () => {
    const duel = headToHeadFixture();
    expect(duelHeadline({ ...duel, aheadA: 2 }, 'Ana', 'Bea')).toBe('Ana adelanta a Bea en 2 de 3 carreras comunes');
    expect(duelHeadline({ ...duel, aheadB: 2 }, 'Ana', 'Bea')).toBe('Bea adelanta a Ana en 2 de 3 carreras comunes');
    expect(duelHeadline(duel, 'Ana', 'Bea')).toBe('Ana y Bea van igualados: 1-1 en 3 carreras comunes');
    expect(duelHeadline({ ...duel, comparable: 0 }, 'Ana', 'Bea')).toBe('No hay carreras comunes con resultado comparable.');
  });

  const series = [
    { id: 1, name: 'Ana', color: palette.ink, cumulative: [25, 50] },
    { id: 2, name: 'Bea', color: palette.ink, cumulative: [18, 43] }
  ];
  const races = [{ name: 'Melbourne' }, { name: 'Shanghái' }];

  it('reuses evolution labels, sorted tooltip, cursor and theme, with solid circles and hollow dashed squares for teammates', () => {
    const chart = buildComparisonChart(races, series, false, palette);
    const [a, b] = chart.data.datasets;
    expect(a.borderDash).toEqual([]);
    expect(b.borderDash).toEqual([6, 3]);
    expect(a.pointStyle).toBe('circle');
    expect(b.pointStyle).toBe('rect');
    expect(a.pointBackgroundColor).toBe(palette.ink);
    expect(b.pointBackgroundColor).toBe(palette.panel);
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
    expect(tooltip.callbacks!.labelColor!.call(model, item(1))).toEqual(jasmine.objectContaining({ backgroundColor: palette.panel, borderDash: [6, 3] }));
  });

  it('renders separated final labels within mobile and desktop canvases even for equal teammate totals', () => {
    const styles = getComputedStyle(document.documentElement);
    const tokens = { ink: styles.getPropertyValue('--ink').trim(), soft: styles.getPropertyValue('--ink-soft').trim(), panel: styles.getPropertyValue('--panel').trim(), rule: styles.getPropertyValue('--rule').trim() };
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
