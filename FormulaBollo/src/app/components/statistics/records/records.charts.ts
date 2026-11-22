import { ChartData, ChartDataset, ChartOptions, Plugin, ScriptableContext } from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { StatisticsRecords } from '../../../../shared/models/statistics';
import { colorsMappings } from '../../../constants';
import { endLabelPlacement } from '../chart-labels';
import { raceCodes } from '../evolution-stats/evolution-stats.charts';
import { finalWins, recordValue, victoryLeaders } from './records.helpers';

export type RecordsPalette = Record<'ink' | 'soft' | 'rule' | 'panel' | 'pending', string>;
export const RECORD_MARKERS = ['circle', 'rect', 'triangle', 'rectRot', 'cross'] as const;

export function buildRecordsChart(progress: StatisticsRecords['victoryProgress'], seasons: StatisticsRecords['seasons'], mobile: boolean, palette: RecordsPalette) {
  const { races, series } = progress;
  const finals = series.map(entry => finalWins(entry.wins));
  const last = series.map(entry => entry.wins.reduce((last, value, index) => value === null ? last : index, -1));
  const colors = series.map(entry => colorsMappings[entry.driver.team.name] ?? palette.soft);
  const right = Math.min(mobile ? 125 : 250, Math.max(96, ...series.map(entry => entry.driver.name.length * 6.5 + 32)));
  const labelLength = Math.max(8, Math.floor((right - 24) / 6.5));
  const labels = series.map(entry => entry.driver.name.match(new RegExp('.{1,' + labelLength + '}(?:\\s|$)|.{1,' + labelLength + '}', 'g'))!.map(line => line.trim()));
  const spacing = Math.max(26, ...labels.map(lines => (lines.length + 1) * 12 + 4));
  const placement = (context: Context) => {
    const natural = finals.map(value => context.chart.scales['y'].getPixelForValue(value));
    const placed = endLabelPlacement(natural.map(value => value * 13 / spacing));
    const centers = placed.map((label, index) => natural[index] + Math.sin(label.align * Math.PI / 180) * label.offset * spacing / 13);
    const order = natural.map((_, index) => index).sort((a, b) => natural[a] - natural[b]);
    for (let i = order.length - 1; i >= 0; i--) {
      centers[order[i]] = Math.min(centers[order[i]], i === order.length - 1 ? context.chart.chartArea.bottom - spacing / 2 : centers[order[i + 1]] - spacing);
    }
    const shift = centers[context.datasetIndex] - natural[context.datasetIndex];
    return { align: Math.atan2(shift, 18) * 180 / Math.PI, offset: Math.hypot(shift, 18) };
  };
  const bands = seasons.flatMap(season => {
    const start = races.findIndex(race => race.season === season.number);
    const end = races.reduce((last, race, index) => race.season === season.number ? index : last, -1);
    return start < 0 ? [] : [{ start, end, label: 'T' + season.number + ' · ' + season.year }];
  });
  const chronology: Plugin<'line'> = {
    id: 'recordsChronology',
    beforeDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const x = (index: number) => scales['x'].getPixelForValue(index);
      const step = races.length > 1 ? x(1) - x(0) : chartArea.width;
      ctx.save();
      ctx.fillStyle = palette.pending;
      races.forEach((race, index) => {
        if (race.played) return;
        const left = Math.max(chartArea.left, x(index) - step / 2);
        ctx.fillRect(left, chartArea.top, Math.min(chartArea.right, x(index) + step / 2) - left, chartArea.height);
      });
      ctx.restore();
    },
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      ctx.save();
      ctx.strokeStyle = palette.rule;
      ctx.fillStyle = palette.soft;
      ctx.font = '11px Geist Variable, sans-serif';
      ctx.textAlign = 'center';
      bands.forEach(band => {
        const start = scales['x'].getPixelForValue(band.start);
        const end = scales['x'].getPixelForValue(band.end);
        if (band.start) {
          const boundary = (start + scales['x'].getPixelForValue(band.start - 1)) / 2;
          ctx.beginPath(); ctx.moveTo(boundary, chartArea.top); ctx.lineTo(boundary, chartArea.bottom); ctx.stroke();
        }
        ctx.fillText(band.label, (start + end) / 2, chartArea.top - 16, Math.max(1, end - start + 20));
      });
      ctx.restore();
    }
  };
  const cursor: Plugin<'line'> = {
    id: 'recordsCursor',
    afterDatasetsDraw(chart) {
      const active = chart.getActiveElements()[0];
      if (!active) return;
      const { ctx, chartArea } = chart;
      const x = chart.scales['x'].getPixelForValue(active.index);
      ctx.save(); ctx.beginPath(); ctx.strokeStyle = palette.soft; ctx.lineWidth = 1;
      ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke(); ctx.restore();
    }
  };
  const uniqueRaces = [...new Set(races.map(entry => entry.race.name))];
  const codes = raceCodes(uniqueRaces.map(name => ({ name }))).map(code => code.slice(0, 3));
  const data: ChartData<'line', (number | null)[]> = {
    labels: races.map(entry => codes[uniqueRaces.indexOf(entry.race.name)]),
    datasets: series.map<ChartDataset<'line', (number | null)[]>>((entry, index) => ({
      label: entry.driver.name, data: entry.wins, borderColor: colors[index], backgroundColor: colors[index],
      borderWidth: 2.5, borderDash: [], stepped: 'after', tension: 0, fill: false, spanGaps: false,
      pointStyle: RECORD_MARKERS[index % RECORD_MARKERS.length],
      pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === last[index] ? 4 : 0,
      pointHoverRadius: 4,
      datalabels: { align: context => placement(context).align, offset: context => placement(context).offset }
    }))
  };
  const options: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false, animation: false, color: palette.ink,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { right, top: Math.max(38, spacing / 2), bottom: 8 } },
    font: { family: 'Geist Variable, sans-serif', size: 11 },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: context => context.dataIndex === last[context.datasetIndex],
        color: palette.ink, anchor: 'center', padding: 0, font: { size: 11, lineHeight: 1.1 },
        formatter: (_value: number, context: Context) => [...labels[context.datasetIndex], recordValue(finals[context.datasetIndex])]
      },
      tooltip: {
        backgroundColor: palette.panel, borderColor: palette.rule, borderWidth: 1,
        titleColor: palette.ink, bodyColor: palette.ink, cornerRadius: 4, padding: 12, usePointStyle: true,
        itemSort: (a, b) => Number(b.raw) - Number(a.raw),
        callbacks: {
          title: items => {
            const race = races[items[0]?.dataIndex];
            return race ? 'T' + race.season + ' · GP ' + race.order + ' · ' + race.race.name : '';
          },
          label: context => context.dataset.label + ': ' + recordValue(Number(context.raw)) + ' victorias',
          labelColor: context => ({ borderColor: colors[context.datasetIndex], backgroundColor: colors[context.datasetIndex] })
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.soft, autoSkip: true, maxTicksLimit: mobile ? 6 : 18, minRotation: 0, maxRotation: 0 } },
      y: { beginAtZero: true, grace: '15%', title: { display: true, text: 'Victorias', color: palette.soft }, grid: { color: palette.rule }, ticks: { color: palette.soft, precision: 0 } }
    }
  };
  return {
    data, options, plugins: [chronology, ChartDataLabels as Plugin<'line'>, cursor], bands,
    values: series.map((entry, index) => ({ name: entry.driver.name, value: finals[index], color: colors[index], marker: RECORD_MARKERS[index % RECORD_MARKERS.length] })),
    rows: races.map((entry, index) => ({ label: 'T' + entry.season + ' · GP ' + entry.order + ' · ' + entry.race.name, values: series.map(series => series.wins[index] === null ? 'Pendiente' : recordValue(series.wins[index])) })),
    ariaLabel: 'Victorias acumuladas por carrera. ' + victoryLeaders(series) + ' ' + series.map((entry, index) => entry.driver.name + ': ' + finals[index]).join('; ')
  };
}
