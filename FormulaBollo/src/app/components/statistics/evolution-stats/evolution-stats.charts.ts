import { ChartData, ChartDataset, ChartOptions, ScriptableContext } from 'chart.js';
import { Context } from 'chartjs-plugin-datalabels';
import { endLabelPlacement, LINE_DASHES, LINE_PLOT_HEIGHT } from '../chart-labels';
import { StatisticsChart } from '../general-stats/general-stats.charts';

export type EvolutionPalette = Record<'ink' | 'soft' | 'rule' | 'panel', string>;
export interface EvolutionSeries { id: number; name: string; color: string; cumulative: number[] }
export interface EvolutionChart extends Omit<StatisticsChart, 'data' | 'options'> {
  data: ChartData<'line', number[]>;
  options: ChartOptions<'line'>;
}

export function buildEvolutionCharts(races: { name: string }[], all: EvolutionSeries[], selectedIds: number[], mobile: boolean, palette: EvolutionPalette): EvolutionChart[] {
  const selected = selectedIds.flatMap(id => all.filter(entry => entry.id === id));
  const leaders = races.map((_, index) => Math.max(...all.map(entry => entry.cumulative[index])));
  const format = (value: number): string => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const definitions = [
    { id: 'points', title: 'Puntos acumulados', description: 'Puntos sumados tras cada carrera disputada.', note: 'Incluye puntos de carrera, vuelta rápida y sprint.', values: (entry: EvolutionSeries) => entry.cumulative, unit: ' pts' },
    { id: 'gap', title: 'Distancia al líder', description: 'Diferencia respecto al líder de toda la clasificación en cada carrera.', note: 'Cero significa liderar la clasificación tras esa carrera.', values: (entry: EvolutionSeries) => entry.cumulative.map((value, index) => value - leaders[index]), unit: ' pts' },
    { id: 'position', title: 'Posición en el campeonato', description: 'Posición entre todos los participantes tras cada carrera.', note: 'Un empate comparte posición.', values: (entry: EvolutionSeries) => entry.cumulative.map((value, index) => 1 + all.filter(other => other.cumulative[index] > value).length), unit: 'º' }
  ];
  return definitions.map(definition => {
    const position = definition.id === 'position';
    const values = selected.map(definition.values);
    const finals = values.map(points => points.at(-1) ?? 0);
    const min = position ? 1 : definition.id === 'gap' ? Math.min(-1, ...values.flat()) : 0;
    const max = position ? Math.min(all.length, Math.max(3, ...values.flat().map(value => value + 1))) : definition.id === 'gap' ? 0 : Math.max(1, ...values.flat()) * 1.04;
    const natural = finals.map(value => (position ? (value - min) / (max - min) : (max - value) / (max - min)) * LINE_PLOT_HEIGHT);
    const labels = endLabelPlacement(natural);
    const positionLabel = (context: Context) => endLabelPlacement(finals.map(value => context.chart.scales['y'].getPixelForValue(value)))[context.datasetIndex];
    const summary = selected.map((entry, index) => ({ label: entry.name, value: format(finals[index]) + definition.unit, color: entry.color, dash: LINE_DASHES[index] }));
    const options: ChartOptions<'line'> = {
      responsive: true, maintainAspectRatio: false, animation: false, indexAxis: 'x', color: palette.ink,
      font: { family: 'Geist Variable, sans-serif', size: 11 },
      layout: { padding: { right: mobile ? 138 : 130, top: 24, bottom: 12 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: context => context.dataIndex === context.dataset.data.length - 1,
          color: palette.ink, anchor: 'end', clamp: true, font: { size: 11 },
          formatter: (value: number, context: { dataset: { label?: string } }) => context.dataset.label + ' ' + format(value)
        },
        tooltip: { callbacks: {
          title: items => races[items[0]?.dataIndex]?.name ?? '',
          label: context => context.dataset.label + ': ' + format(Number(context.raw)) + definition.unit
        } }
      },
      scales: {
        x: { grid: { color: palette.rule }, ticks: { color: palette.soft, font: { size: 11 }, maxTicksLimit: 3, maxRotation: 0, callback: (_value, index) => String(index + 1) }, title: { display: true, text: 'Carrera disputada', color: palette.soft } },
        y: {
          ...(position ? { reverse: true, min: 1, max } : definition.id === 'gap' ? { max: 0 } : { beginAtZero: true }),
          grid: { color: palette.rule },
          ticks: { color: palette.soft, font: { size: 11 }, ...(position ? { stepSize: max <= 8 ? 1 : Math.ceil(max / 6), precision: 0 } : { maxTicksLimit: 5 }) }
        }
      }
    };
    return {
      id: definition.id, title: definition.title, description: definition.description, note: definition.note,
      type: 'line', span: definition.id === 'points' ? 12 : 6, height: mobile ? 310 : 350,
      data: {
        labels: races.map((_, index) => String(index + 1)),
        datasets: selected.map<ChartDataset<'line', number[]>>((entry, index) => ({
          label: entry.name, data: values[index], borderColor: entry.color, backgroundColor: entry.color,
          borderWidth: 2, borderDash: LINE_DASHES[index], tension: 0, fill: false, stepped: position,
          pointRadius: (context: ScriptableContext<'line'>) => position || context.dataIndex === races.length - 1 ? 4 : 0,
          pointHoverRadius: 5, pointStyle: (['circle', 'rect', 'triangle'] as const)[index % 3],
          datalabels: position ? {
            anchor: 'center', padding: 0, font: { size: 11, lineHeight: 1 },
            align: context => positionLabel(context).align,
            offset: context => positionLabel(context).offset
          } : labels[index]
        }))
      },
      options, values: summary,
      ariaLabel: definition.title + '. ' + summary.map(value => value.label + ': ' + value.value).join('; ')
    };
  });
}
