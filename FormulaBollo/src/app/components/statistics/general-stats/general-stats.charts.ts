import { ChartData, ChartDataset, ChartOptions, ChartType, Plugin, ScriptableContext } from 'chart.js';
import { DriverStats, StatisticsOverview, TeamStats } from '../../../../shared/models/statistics';
import { colorsMappings, getBarMobileChartOptions, getLineChartOptions, getPieChartOptions } from '../../../constants';

interface CenterTextOptions { value: string; label: string; color: string; soft: string }

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    centerText?: TType extends 'doughnut' ? CenterTextOptions : never;
  }
}

export const centerTextPlugin: Plugin<'doughnut', CenterTextOptions> = {
  id: 'centerText',
  afterDraw(chart, _args, options) {
    if (!options?.value) return;
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.color;
    ctx.font = '700 32px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.fillText(options.value, x, y - 8);
    ctx.fillStyle = options.soft;
    ctx.font = '12px "Geist Variable", sans-serif';
    ctx.fillText(options.label, x, y + 16);
    ctx.restore();
  }
};

const LINE_PLOT_HEIGHT = 274;
const LINE_LABEL_GAP = 13;
const LINE_LABEL_OFFSET = 10;

type Entry = DriverStats | TeamStats;
export type StatisticsPalette = Record<'ink' | 'soft' | 'rule' | 'panel' | 'up' | 'down' | 'best' | 'gold' | 'silver' | 'bronze', string>;

export interface StatisticsChart {
  id: string;
  title: string;
  description: string;
  note: string;
  span: number;
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
  height: number;
  values: { label: string; value: string }[];
  ariaLabel: string;
}

export const isVacant = (name: string): boolean => /^vacante\d*$/i.test(name.trim());
const name = (entry: Entry): string => 'driver' in entry ? entry.driver.name.trim() : entry.team.name.trim();
const rate = (entry: Entry): number => entry.races ? entry.dnfs / entry.races : 0;
const average = (entry: Entry): number => entry.racesFinished ? entry.totalPoints / entry.racesFinished : 0;
const format = (value: number): string => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
function rank<T extends Entry>(entries: T[], value: (entry: T) => number, ascending = false): T[] {
  return [...entries].sort((a, b) => (ascending ? value(a) - value(b) : value(b) - value(a)) || name(a).localeCompare(name(b), 'es'));
}

export function buildStatisticsCharts(overview: StatisticsOverview, teams: boolean, mobile: boolean, dark: boolean, palette: StatisticsPalette): StatisticsChart[] {
  const n = mobile ? 5 : 8;
  const drivers = overview.drivers.filter(entry => !isVacant(entry.driver.name));
  const constructors = rank(overview.teams, entry => entry.totalPoints);
  const cards: StatisticsChart[] = [];
  const color = (entry: Entry): string => colorsMappings['driver' in entry ? entry.driver.team.name : entry.team.name] ?? palette.soft;
  const summary = (entries: Entry[], value: (entry: Entry) => number, suffix = '') =>
    entries.slice(0, 5).map(entry => ({ label: name(entry), value: format(value(entry)) + suffix }));

  function options(kind: ChartType = 'bar', stacked = false, percent = false): ChartOptions {
    const base = kind === 'line' ? getLineChartOptions(dark, false) : kind === 'doughnut' ? getPieChartOptions(dark) : getBarMobileChartOptions(dark);
    return {
      ...base,
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      color: palette.ink,
      font: { family: 'Geist Variable, sans-serif', size: 11 },
      layout: { padding: { right: kind === 'bar' ? 32 : 0 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: context => kind === 'bar' && !stacked && context.dataset.type !== 'scatter',
          color: palette.ink, anchor: 'end', align: 'right', clamp: true,
          font: { size: 11 }, formatter: (value: number | number[]) => Array.isArray(value) ? '' : format(Math.abs(value)) + (percent ? ' %' : '')
        },
        tooltip: { callbacks: { label: context => {
          const raw = context.raw;
          const value = typeof raw === 'number' ? format(Math.abs(raw)) + (percent ? ' %' : '') : Array.isArray(raw) ? raw.map(format).join(' – ') : format((raw as { x: number }).x);
          return (context.dataset.label ? context.dataset.label + ': ' : '') + value;
        } } }
      },
      scales: kind === 'doughnut' ? {} : {
        x: { stacked, beginAtZero: true, max: percent ? 100 : undefined, grid: { color: palette.rule }, ticks: { color: palette.soft, font: { size: 11 }, maxTicksLimit: 5 } },
        y: { stacked, grid: { display: false }, ticks: { color: palette.ink, font: { size: 11 }, autoSkip: false } }
      }
    };
  }

  function add(id: string, title: string, description: string, data: ChartData, values: StatisticsChart['values'], config: { type?: ChartType; span?: number; note?: string; stacked?: boolean; percent?: boolean; height?: number } = {}): StatisticsChart {
    const type = config.type ?? 'bar';
    const card: StatisticsChart = {
      id, title, description, data, values, type, span: config.span ?? 6, note: config.note ?? '',
      height: config.height ?? Math.max(240, (data.labels?.length ?? 5) * 38 + 45),
      options: options(type, config.stacked, config.percent),
      ariaLabel: title + '. ' + (values[0] ? values[0].label + ': ' + values[0].value : 'Sin datos suficientes.')
    };
    cards.push(card);
    return card;
  }

  function bars(id: string, title: string, description: string, all: Entry[], value: (entry: Entry) => number, note = '', percent = false): StatisticsChart {
    const entries = all.filter(entry => value(entry) > 0);
    return add(id, title, description, { labels: entries.map(name), datasets: [{ label: title, data: entries.map(value), backgroundColor: entries.map(color), borderRadius: 0, barThickness: 14 }] }, summary(entries, value, percent ? ' %' : ''), { note, percent });
  }

  function grouped(id: string, title: string, description: string, all: Entry[], series: { label: string; value: (entry: Entry) => number; color: string }[], stacked = false, note = ''): StatisticsChart {
    const entries = all.filter(entry => series.some(item => item.value(entry) > 0));
    const card = add(id, title, description, {
      labels: entries.map(name),
      datasets: series.map(series => ({
        label: series.label, data: entries.map(series.value), backgroundColor: series.color,
        ...(stacked ? { barThickness: 18 } : { maxBarThickness: 14, barPercentage: 0.7, categoryPercentage: 0.8 })
      }))
    }, entries.slice(0, 5).map(entry => ({ label: name(entry), value: series.map(series => series.label + ' ' + format(series.value(entry))).join('; ') })), { stacked, note, height: Math.max(260, entries.length * 48 + 60) });
    card.options.plugins!.legend = { display: true, position: 'top', labels: { color: palette.soft, font: { size: 11 }, boxWidth: 10, boxHeight: 10 } };
    return card;
  }

  function donut(id: string, title: string, description: string, entries: Entry[], value: (entry: Entry) => number, unit: string): void {
    const ordered = rank(entries, value).filter(entry => value(entry) > 0);
    const selected = ordered.slice(0, 5);
    const labels = selected.map(name);
    const values = selected.map(value);
    const colors = selected.map(color);
    if (ordered.length > 5) {
      labels.push(teams ? 'Otros equipos' : 'Otros pilotos');
      values.push(ordered.slice(5).reduce((sum, entry) => sum + value(entry), 0));
      colors.push(palette.soft);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    const card = add(id, title, description, { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: palette.panel, borderWidth: 3 }] },
      labels.map((label, index) => ({ label, value: format(values[index]) + ' · ' + format(total ? 100 * values[index] / total : 0) + ' %' })),
      { type: 'doughnut', span: id === 'share' || id === 'winners' ? 4 : 6, height: 220, note: 'Los cinco primeros y el resto. Los colores de las marcas identifican al equipo actual.' });
    (card.options as ChartOptions<'doughnut'>).cutout = '72%';
    card.options.plugins!.centerText = { value: format(total), label: unit, color: palette.ink, soft: palette.soft };
  }

  function evolution(): void {
    const source = teams ? overview.teamEvolution : overview.driverEvolution;
    const series = source.series.map(entry => {
      const entity = 'driver' in entry ? entry.driver : entry.team;
      return { name: entity.name, color: colorsMappings['driver' in entry ? entry.driver.team.name : entry.team.name] ?? palette.soft, cumulative: entry.cumulative };
    }).filter(entry => !isVacant(entry.name)).sort((a, b) => (b.cumulative.at(-1) ?? 0) - (a.cumulative.at(-1) ?? 0) || a.name.localeCompare(b.name, 'es')).slice(0, mobile ? 5 : teams ? undefined : 8);
    const finals = series.map(entry => entry.cumulative.at(-1) ?? 0);
    const top = Math.max(1, ...finals) * 1.04;
    const natural = finals.map(value => (1 - value / top) * LINE_PLOT_HEIGHT);
    const order = finals.map((_, index) => index).sort((a, b) => finals[b] - finals[a]);
    const placed: number[] = [];
    order.forEach((index, position) => {
      placed[index] = position ? Math.max(natural[index], placed[order[position - 1]] + LINE_LABEL_GAP) : natural[index];
    });
    const card = add('evolution', teams ? 'El pulso de los equipos' : 'La carrera por los puntos', 'Puntos de carrera acumulados; ' + (mobile ? 'los cinco líderes.' : teams ? 'todos los equipos.' : 'los ocho líderes.'), {
      labels: source.races.map(race => race.name),
      datasets: series.map((entry, index) => {
        const shift = placed[index] - natural[index];
        return {
          label: entry.name, data: entry.cumulative, borderColor: entry.color, backgroundColor: entry.color, borderWidth: 2,
          pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === entry.cumulative.length - 1 ? 4 : 0, pointHoverRadius: 5,
          pointStyle: ['circle', 'rect', 'triangle'][index % 3] as 'circle' | 'rect' | 'triangle',
          borderDash: [[], [6, 3], [2, 3], [9, 3, 2, 3]][index % 4], tension: 0, fill: false,
          datalabels: { align: Math.atan2(shift, LINE_LABEL_OFFSET) * 180 / Math.PI, offset: Math.hypot(shift, LINE_LABEL_OFFSET) }
        } as ChartDataset;
      })
    }, series.map(entry => ({ label: entry.name, value: format(entry.cumulative.at(-1) ?? 0) + ' pts' })), { type: 'line', span: 8, height: 350, note: 'Incluye puntos de sprint. Cada trazo tiene su etiqueta final y un marcador propio.' });
    card.options.indexAxis = 'x';
    card.options.layout = { padding: { right: mobile ? 40 : 46, top: 24, bottom: 12 } };
    card.options.scales = {
      x: { grid: { color: palette.rule }, ticks: { color: palette.soft, font: { size: 11 }, maxTicksLimit: 3, maxRotation: 0, callback: (_value, index) => String(index + 1) }, title: { display: true, text: 'Carrera disputada', color: palette.soft } },
      y: { beginAtZero: true, grid: { color: palette.rule }, ticks: { color: palette.soft, font: { size: 11 }, maxTicksLimit: 5 } }
    };
    card.options.plugins!.datalabels = {
      display: context => context.dataIndex === context.dataset.data.length - 1,
      color: palette.ink, anchor: 'end', clamp: true,
      font: { size: 11 }, formatter: (value: number) => format(value)
    };
  }

  function reliability(all: Entry[]): void {
    const entries = all.filter(entry => entry.races > 0);
    const card = grouped('reliability', teams ? 'Fiabilidad del equipo' : 'Llegar hasta el final',
      'Terminadas frente a abandonos; porcentaje de participaciones.',
      entries,
      [
        { label: 'Terminadas (%)', value: entry => entry.races ? 100 * entry.racesFinished / entry.races : 0, color: palette.up },
        { label: 'Abandonos (%)', value: entry => 100 * rate(entry), color: palette.soft }
      ], true, teams ? 'Cada piloto cuenta como una participación.' : 'Mínimo 20 carreras. Menor tasa de abandono; empates por nombre.');
    card.options.scales!['x'] = { max: 100, stacked: true, grid: { color: palette.rule }, ticks: { color: palette.soft, font: { size: 11 } } };
    card.values = entries.slice(0, 5).map(entry => ({ label: name(entry), value: 'Terminadas ' + entry.racesFinished + ' · Abandonos ' + entry.dnfs + ' (' + format(rate(entry) * 100) + ' %)' }));
    card.options.plugins!.tooltip = { callbacks: { label: context => {
      const entry = entries[context.dataIndex];
      return (context.datasetIndex === 0 ? 'Terminadas: ' + entry.racesFinished : 'Abandonos: ' + entry.dnfs) + ' · ' + format(Number(context.raw)) + ' %';
    } } };
  }

  function lollipop(all: Entry[]): void {
    const value = (entry: Entry) => teams ? overview.summary.finishedRaces ? entry.totalPoints / overview.summary.finishedRaces : 0 : average(entry);
    const entries = all.filter(entry => value(entry) > 0);
    const card = bars('average', 'Media de puntos por carrera', teams ? 'Puntos del constructor / carreras disputadas del calendario.' : 'Puntos totales divididos por carreras terminadas.', entries, value,
      teams ? 'Denominador común: ' + overview.summary.finishedRaces + ' carreras disputadas. Incluye sprint.' : 'Incluye puntos de sprint. Solo pilotos con carreras terminadas.');
    (card.data.datasets[0] as ChartDataset<'bar'>).barThickness = 2;
    card.data.datasets.push({ type: 'scatter', label: 'Media', data: entries.map((entry, index) => ({ x: value(entry), y: index })), backgroundColor: entries.map(color), pointRadius: 5 });
  }

  evolution();
  if (!teams) {
    donut('winners', 'Quién gana', 'Reparto de victorias entre pilotos.', drivers, entry => entry.victories, 'victorias');
    const points = rank(drivers, entry => entry.totalPoints);
    bars('points', 'Puntos totales · Top ' + (mobile ? 5 : 10), 'Incluye puntos de sprint. Orden por puntuación total.', points.slice(0, mobile ? 5 : 10), entry => entry.totalPoints);
    const podiums = rank(drivers, entry => entry.podiums).slice(0, n);
    grouped('podiums', 'El peso de cada podio', 'Llegadas en P1, P2 y P3; la suma indica el total de podios.', podiums,
      [palette.gold, palette.silver, palette.bronze].map((color, index) => ({ label: 'P' + (index + 1), value: entry => (entry as DriverStats).positionDistribution[index] ?? 0, color })), true);
    grouped('one-lap', 'A una vuelta', 'Poles y vueltas rápidas de los pilotos con más poles.', rank(drivers, entry => entry.poles).slice(0, n),
      [{ label: 'Poles', value: entry => entry.poles, color: palette.soft }, { label: 'Vueltas rápidas', value: entry => entry.fastlaps, color: palette.best }]);
    const eligible = drivers.filter(entry => entry.poles >= 3);
    const bubble = add('poles-wins', 'Poles frente a victorias', 'Cada burbuja es un piloto; su tamaño representa puntos totales.', {
      datasets: rank(eligible, entry => entry.totalPoints).map(entry => ({ label: name(entry), data: [{ x: entry.poles, y: entry.victories, r: 3 + 7 * Math.sqrt(entry.totalPoints / Math.max(1, ...drivers.map(entry => entry.totalPoints))) }], backgroundColor: color(entry) }))
    }, summary(rank(eligible, entry => entry.totalPoints), entry => entry.victories, ' victorias'), { type: 'bubble', height: 300, note: 'Mínimo 3 poles. La diagonal es referencia de igualdad, no una tasa de conversión.' });
    bubble.options.plugins!.tooltip = { callbacks: { label: context => {
      if (context.dataset.type === 'line') return context.dataset.label ?? '';
      const point = context.raw as { x: number; y: number };
      return context.dataset.label + ': ' + point.x + ' poles · ' + point.y + ' victorias';
    } } };
    const max = Math.max(1, ...eligible.flatMap(entry => [entry.poles, entry.victories]));
    bubble.data.datasets.push({ type: 'line', label: 'Igualdad', data: [{ x: 0, y: 0 }, { x: max, y: max }], borderColor: palette.soft, borderDash: [4, 4], pointRadius: 0 });
    bubble.options.scales = {
      x: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Poles', color: palette.soft }, ticks: { color: palette.soft, font: { size: 11 } }, grid: { color: palette.rule } },
      y: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Victorias', color: palette.soft }, ticks: { color: palette.soft, font: { size: 11 } }, grid: { color: palette.rule } }
    };
    lollipop(rank(drivers.filter(entry => entry.racesFinished > 0), average).slice(0, n));
    reliability(rank(drivers.filter(entry => entry.races >= 20), rate, true).slice(0, n));
    grouped('penalties', 'Penalizaciones por gravedad', 'Avisos, sanciones leves y graves; la suma indica el total.', rank(drivers, entry => entry.penalties).slice(0, n),
      [
        { label: 'Aviso', value: entry => (entry as DriverStats).penaltiesBy.warning, color: palette.soft },
        { label: 'Leve', value: entry => (entry as DriverStats).penaltiesBy.minor, color: palette.gold },
        { label: 'Grave', value: entry => (entry as DriverStats).penaltiesBy.serious, color: palette.down }
      ], true);
    const conversion = (entry: DriverStats): number => entry.poleWins / entry.poles * 100;
    bars('conversion', 'Convertir la pole', 'Porcentaje de poles que terminaron en victoria para el mismo piloto.', rank(eligible, conversion).slice(0, n), entry => conversion(entry as DriverStats), 'Mínimo 3 poles. La tasa usa poleWins / poles, no victorias / poles.', true);
    bars('hat-tricks', 'El fin de semana perfecto', 'Hat-tricks: victoria, pole y vuelta rápida en la misma carrera.', rank(drivers, entry => entry.hatTricks).slice(0, n), entry => (entry as DriverStats).hatTricks);
    const seasons = [...new Set(drivers.flatMap(entry => Object.keys(entry.pointsBySeason)))].sort((a, b) => Number(a) - Number(b));
    grouped('season-points', 'El impulso por temporada', 'Puntos totales de cada temporada de los pilotos líderes.', points.slice(0, n),
      seasons.map(season => ({ label: 'Temporada ' + season, value: entry => entry.pointsBySeason[season] ?? 0, color: [palette.soft, palette.best, palette.gold][(Number(season) + 2) % 3] })), true,
      'Incluye carrera y sprint. El desglose exclusivo de sprint no está disponible.');
  } else {
    const entries = constructors.slice(0, mobile ? 5 : undefined);
    donut('share', 'Cuota de puntos', 'Porcentaje de puntos totales de la liga que aporta cada equipo.', constructors, entry => entry.totalPoints, 'puntos');
    bars('points', 'Puntos del constructor', 'Puntuación oficial del equipo, incluidos los puntos de sprint.', constructors, entry => entry.totalPoints, 'Todos los equipos; los equipos sin puntos se conservan al final.');
    const contributors = entries.map(entry => ({ ...entry, drivers: entry.drivers.filter(driver => !isVacant(driver.name)).slice(0, 2) })).filter(entry => entry.drivers.some(driver => driver.points > 0));
    const contribution = grouped('contributions', 'Quién firma los puntos', 'Puntos personales de los dos pilotos de la pareja actual.', contributors,
      [0, 1].map(index => ({ label: 'Piloto ' + (index + 1), value: entry => (entry as TeamStats).drivers[index]?.points ?? 0, color: index ? palette.soft : palette.best })), true,
      'Los totales personales pueden diferir del constructor por cambios de equipo o de alineación.');
    contribution.values = contributors.slice(0, 5).map(entry => ({ label: name(entry), value: entry.drivers.map(driver => driver.name + ': ' + format(driver.points)).join('; ') }));
    contribution.options.plugins!.tooltip = { callbacks: { label: context => {
      const driver = contributors[context.dataIndex].drivers[context.datasetIndex];
      return driver ? driver.name + ': ' + format(driver.points) : 'Sin piloto';
    } } };
    const scatter = add('wins-podiums', 'Victorias y presencia en el podio', 'Cada punto es un equipo; el eje vertical cuenta todos sus podios.', {
      datasets: constructors.map((entry, index) => ({ label: name(entry), data: [{ x: entry.victories, y: entry.podiums }], backgroundColor: color(entry), pointRadius: 5, pointStyle: ['circle', 'rect', 'triangle'][index % 3] as 'circle' | 'rect' | 'triangle' }))
    }, constructors.slice(0, 5).map(entry => ({ label: name(entry), value: format(entry.victories) + ' victorias / ' + format(entry.podiums) + ' podios' })), { type: 'scatter', height: 300 });
    scatter.options.plugins!.tooltip = { callbacks: { label: context => {
      const point = context.raw as { x: number; y: number };
      return context.dataset.label + ': ' + point.x + ' victorias · ' + point.y + ' podios';
    } } };
    scatter.options.scales = {
      x: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Victorias', color: palette.soft }, ticks: { color: palette.soft, font: { size: 11 } }, grid: { color: palette.rule } },
      y: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Podios', color: palette.soft }, ticks: { color: palette.soft, font: { size: 11 } }, grid: { color: palette.rule } }
    };
    donut('winners', 'Reparto de victorias', 'Cuota de victorias de cada equipo sobre el total de la liga.', constructors, entry => entry.victories, 'victorias');
    cards.at(-1)!.span = 6;
    grouped('one-lap', 'Poles y vueltas rápidas', 'Comparación de los equipos con mayor puntuación total.', entries,
      [{ label: 'Poles', value: entry => entry.poles, color: palette.soft }, { label: 'Vueltas rápidas', value: entry => entry.fastlaps, color: palette.best }]);
    const duels = constructors.flatMap(entry => entry.duels.filter(duel => !isVacant(duel.a) && !isVacant(duel.b)).map(duel => ({ ...duel, team: entry.team.name })));
    const shownDuels = mobile ? duels.slice(0, 5) : duels;
    const duel = add('duels', 'Duelo de compañeros', 'Carreras en las que cada piloto quedó por delante de su pareja.', {
      labels: shownDuels.map(entry => entry.team + ' · T' + entry.season),
      datasets: [
        { label: 'Piloto A', data: shownDuels.map(entry => -entry.aAhead), backgroundColor: palette.soft, barThickness: 16 },
        { label: 'Piloto B', data: shownDuels.map(entry => entry.bAhead), backgroundColor: palette.best, barThickness: 16 }
      ]
    }, shownDuels.map(entry => ({ label: entry.team + ' · T' + entry.season, value: entry.a + ' ' + entry.aAhead + ' / ' + entry.b + ' ' + entry.bAhead + ' · Empates ' + entry.tied })),
    { stacked: true, note: 'Solo parejas identificadas; se excluyen vacantes. A la izquierda el piloto A, a la derecha el B.' });
    const extent = Math.max(1, ...shownDuels.flatMap(entry => [entry.aAhead, entry.bAhead]));
    duel.options.scales!['x'] = { min: -extent, max: extent, stacked: true, grid: { color: palette.rule }, ticks: { color: palette.soft, font: { size: 11 }, callback: value => String(Math.abs(Number(value))) } };
    duel.options.plugins!.tooltip = { callbacks: { label: context => {
      const entry = shownDuels[context.dataIndex];
      return (context.datasetIndex === 0 ? entry.a + ': ' + entry.aAhead : entry.b + ': ' + entry.bAhead) + ' · Empates: ' + entry.tied;
    } } };
    grouped('double', 'Sumar con los dos coches', 'Carreras con doble puntuación frente a carreras con doble podio.', entries,
      [{ label: 'Doble puntuación', value: entry => (entry as TeamStats).doublePoints, color: palette.soft }, { label: 'Dobles podios', value: entry => (entry as TeamStats).doublePodiums, color: palette.gold }]);
    reliability(entries);
    bars('penalties', 'Penalizaciones', 'Número de sanciones asignadas a cada constructor.', rank(constructors, entry => entry.penalties).slice(0, mobile ? 5 : undefined), entry => entry.penalties);
    lollipop(entries);
    bars('finished', 'Carreras terminadas', 'Suma de llegadas a meta de los pilotos de cada equipo.', constructors, entry => entry.racesFinished, 'Una carrera con dos coches en meta cuenta como dos llegadas.');
  }
  return cards.filter(card => card.values.length > 0);
}
