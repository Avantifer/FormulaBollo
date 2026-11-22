import { ChartData, ChartDataset, ChartOptions, Plugin, ScriptableContext } from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { endLabelPlacement, LINE_DASHES } from '../chart-labels';

export type EvolutionPalette = Record<'ink' | 'soft' | 'rule' | 'panel', string>;
export interface EvolutionSeries { id: number; name: string; color: string; cumulative: number[] }
export interface EvolutionChart {
  data: ChartData<'line', number[]>;
  options: ChartOptions<'line'>;
  plugins: Plugin<'line'>[];
  values: { label: string; value: string; gain: string; color: string; dash: number[] }[];
  rows: { race: string; points: string[] }[];
  ariaLabel: string;
}

function raceCodes(races: { name: string }[]): string[] {
  const names = races.map(race => race.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '') || 'GP');
  const unique = names.map((name, index) => names.filter(other => other === name).length > 1 ? name + (index + 1) : name);
  return unique.map((name, index) => {
    let length = Math.min(3, name.length);
    while (length < name.length && unique.some((other, otherIndex) => otherIndex !== index && other.slice(0, length) === name.slice(0, length))) length++;
    return name.slice(0, length);
  });
}

export function buildEvolutionChart(races: { name: string }[], all: EvolutionSeries[], selectedIds: number[], mobile: boolean, palette: EvolutionPalette): EvolutionChart {
  const selected = selectedIds.flatMap(id => all.filter(entry => entry.id === id));
  const format = (value: number): string => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const gain = (entry: EvolutionSeries, index: number): number => (entry.cumulative[index] ?? 0) - (entry.cumulative[index - 1] ?? 0);
  const finals = selected.map(entry => entry.cumulative.at(-1) ?? 0);
  const texts = selected.map((entry, index) => entry.name + ' ' + format(finals[index]));
  const right = Math.min(mobile ? 160 : 260, Math.max(96, ...texts.map(text => text.length * 6.5 + 24)));
  const labelLength = Math.floor((right - 24) / 6.5);
  const labels = texts.map(text => text.match(new RegExp('.{1,' + labelLength + '}(?:\\s|$)|.{1,' + labelLength + '}', 'g'))!.map(line => line.trim()));
  const spacing = Math.max(13, ...labels.map(lines => lines.length * 11 + 4));
  const placement = (context: Context) => {
    const { scales, chartArea } = context.chart;
    const natural = finals.map(value => scales['y'].getPixelForValue(value));
    const placed = endLabelPlacement(natural.map(value => value * 13 / spacing));
    const centers = placed.map((label, index) => natural[index] + Math.sin(label.align * Math.PI / 180) * label.offset * spacing / 13);
    const order = natural.map((_, index) => index).sort((a, b) => natural[a] - natural[b]);
    for (let index = order.length - 1; index >= 0; index--) {
      const limit = index === order.length - 1 ? chartArea.bottom - spacing / 2 : centers[order[index + 1]] - spacing;
      centers[order[index]] = Math.min(centers[order[index]], limit);
    }
    const shift = centers[context.datasetIndex] - natural[context.datasetIndex];
    return { align: Math.atan2(shift, 18) * 180 / Math.PI, offset: Math.hypot(shift, 18) };
  };
  const cursor: Plugin<'line'> = {
    id: 'evolutionCursor',
    afterDatasetsDraw(chart) {
      const active = chart.getActiveElements()[0];
      if (!active) return;
      const { ctx, chartArea } = chart;
      const x = chart.scales['x'].getPixelForValue(active.index);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = palette.soft;
      ctx.lineWidth = 1;
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    }
  };
  const values = selected.map((entry, index) => ({ entry, index }))
    .sort((a, b) => finals[b.index] - finals[a.index] || a.entry.name.localeCompare(b.entry.name, 'es'))
    .map(({ entry, index }) => ({
      label: entry.name, value: format(finals[index]) + ' pts', gain: '+' + format(gain(entry, races.length - 1)) + ' en la última',
      color: entry.color, dash: LINE_DASHES[index]
    }));
  const leader = [...all].sort((a, b) => (b.cumulative.at(-1) ?? 0) - (a.cumulative.at(-1) ?? 0) || a.name.localeCompare(b.name, 'es'))[0];
  return {
    plugins: [ChartDataLabels as Plugin<'line'>, cursor],
    values,
    rows: races.map((race, index) => ({ race: 'Carrera ' + (index + 1) + ' · ' + race.name, points: selected.map(entry => format(entry.cumulative[index])) })),
    ariaLabel: 'Puntos acumulados tras ' + races.length + ' carreras. Líder: ' + (leader ? leader.name + ' con ' + format(leader.cumulative.at(-1) ?? 0) + ' pts. ' : '') + values.map(value => value.label + ': ' + value.value).join('; '),
    data: {
      labels: raceCodes(races),
      datasets: selected.map<ChartDataset<'line', number[]>>((entry, index) => ({
        label: entry.name, data: entry.cumulative, borderColor: entry.color, backgroundColor: entry.color,
        borderWidth: 2.5, borderDash: LINE_DASHES[index], tension: 0, fill: false,
        pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === races.length - 1 ? 4 : 0,
        pointHoverRadius: 4, pointStyle: (['circle', 'rect', 'triangle'] as const)[index % 3],
        datalabels: { align: context => placement(context).align, offset: context => placement(context).offset }
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, indexAxis: 'x', color: palette.ink,
      interaction: { mode: 'index', intersect: false },
      events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
      font: { family: 'Geist Variable, sans-serif', size: 11 },
      layout: { padding: { right, top: Math.max(32, spacing / 2), bottom: 12 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: context => context.dataIndex === context.dataset.data.length - 1,
          color: palette.ink, anchor: 'center', clamp: true, padding: 0, font: { size: 11, lineHeight: 1 },
          formatter: (_value: number, context: Context) => labels[context.datasetIndex]
        },
        tooltip: {
          backgroundColor: palette.panel, borderColor: palette.rule, borderWidth: 1,
          titleColor: palette.ink, bodyColor: palette.ink, footerColor: palette.ink,
          usePointStyle: true, cornerRadius: 4, padding: 12,
          itemSort: (a, b) => Number(b.raw) - Number(a.raw),
          callbacks: {
            title: items => items.length ? 'Carrera ' + (items[0].dataIndex + 1) + ' · ' + races[items[0].dataIndex].name : '',
            label: context => context.dataset.label + ': ' + format(Number(context.raw)) + ' pts (+' + format(gain(selected[context.datasetIndex], context.dataIndex)) + ')',
            labelColor: context => ({ borderColor: selected[context.datasetIndex].color, backgroundColor: selected[context.datasetIndex].color })
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: palette.soft, font: { size: 11 }, autoSkip: true, maxTicksLimit: mobile ? 6 : 14, minRotation: 0, maxRotation: 0 },
          title: { display: true, text: 'Carrera disputada', color: palette.soft }
        },
        y: {
          beginAtZero: true, grace: '12%',
          grid: { color: palette.rule, lineWidth: 1 },
          ticks: { color: palette.soft, font: { size: 11 }, maxTicksLimit: 6 },
          title: { display: true, text: 'Puntos', color: palette.soft }
        }
      }
    }
  };
}
