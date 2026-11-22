import { DriverStats, StatisticsHeadToHead, StatisticsOverview, TeamStats } from '../../../../shared/models/statistics';
import { buildEvolutionChart, EvolutionPalette, EvolutionSeries } from '../evolution-stats/evolution-stats.charts';

export interface Contender {
  id: number;
  name: string;
  team: string;
  image: string;
  initials: string;
  rank: number;
  color: string;
  stats: DriverStats | TeamStats;
  cumulative: number[];
}

export interface ComparisonMetric {
  key: string;
  label: string;
  unit: string;
  a: string;
  b: string;
  widthA: number;
  widthB: number;
  winner: 'A' | 'B' | '=' | null;
}

export function comparisonMetricLabel(row: ComparisonMetric, a: string, b: string): string {
  const result = row.winner === null ? 'Sin dato suficiente.' : row.winner === '=' ? 'Empate.' : 'Gana ' + (row.winner === 'A' ? a : b) + '.';
  return row.label + ': ' + a + ' ' + row.a + ', ' + b + ' ' + row.b + '. ' + result;
}

export function comparisonMetrics(a: DriverStats | TeamStats, b: DriverStats | TeamStats, teams: boolean): ComparisonMetric[] {
  type Stats = DriverStats | TeamStats;
  type Metric = [string, string, string, number, boolean, (stats: Stats) => number | null, string?];
  const rows: Metric[] = [
    ['totalPoints', 'Puntos', 'pts · incluye sprint', 0, false, s => s.totalPoints],
    ['avgPoints', 'Media de puntos', 'pts / carrera terminada', 2, false, s => s.racesFinished ? s.totalPoints / s.racesFinished : 0],
    ['victories', 'Victorias', 'carreras', 0, false, s => s.victories],
    ['podiums', 'Podios', 'carreras', 0, false, s => s.podiums],
    ['poles', 'Poles', 'sesiones', 0, false, s => s.poles],
    ['fastlaps', 'Vueltas rápidas', 'carreras', 0, false, s => s.fastlaps],
    ['racesFinished', 'Carreras terminadas', teams ? 'llegadas de pilotos' : 'carreras', 0, false, s => s.racesFinished],
    ['penalties', 'Penalizaciones', 'sanciones · menos es mejor', 0, true, s => s.penalties]
  ];
  if (teams) rows.push(
    ['doublePoints', 'Doble puntuación', 'ambos pilotos en los puntos', 0, false, s => (s as TeamStats).doublePoints],
    ['doublePodiums', 'Dobles podios', 'ambos pilotos en el podio', 0, false, s => (s as TeamStats).doublePodiums],
    ['pointsShare', 'Cuota de puntos', '% del campeonato', 1, false, s => (s as TeamStats).pointsShare, ' %'],
    ['reliability', 'Fiabilidad', '% sin abandono', 1, false, s => s.races ? (1 - s.dnfs / s.races) * 100 : null, ' %']
  );
  else rows.push(
    ['hatTricks', 'Hat-tricks', 'victoria + pole + vuelta rápida', 0, false, s => (s as DriverStats).hatTricks],
    ['podiumStreak', 'Racha de podios', 'máxima · carreras seguidas', 0, false, s => (s as DriverStats).podiumStreak],
    ['posStd', 'Regularidad', 'σ de posición · menos es mejor', 1, true, s => (s as DriverStats).posStd]
  );
  return rows.map(([key, label, unit, digits, lower, value, suffix = '']) => {
    const va = value(a), vb = value(b);
    const max = Math.max(0, va ?? 0, vb ?? 0);
    const format = (v: number | null) => v === null ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + suffix;
    return {
      key, label, unit, a: format(va), b: format(vb),
      widthA: max ? Math.max(0, va ?? 0) / max * 100 : 0,
      widthB: max ? Math.max(0, vb ?? 0) / max * 100 : 0,
      winner: va === null || vb === null ? null : va === vb ? '=' : (va < vb) === lower ? 'A' : 'B'
    };
  });
}

export function teamHeadToHead(data: StatisticsOverview, a: number, b: number): StatisticsHeadToHead {
  const ac = data.teamEvolution.series.find(entry => entry.team.id === a)?.cumulative ?? [];
  const bc = data.teamEvolution.series.find(entry => entry.team.id === b)?.cumulative ?? [];
  const races = data.teamEvolution.races.flatMap((race, index) => {
    if (ac[index] === undefined || bc[index] === undefined) return [];
    const positionA = ac[index] - (ac[index - 1] ?? 0);
    const positionB = bc[index] - (bc[index - 1] ?? 0);
    const result = positionA > positionB ? 'A' : positionA < positionB ? 'B' : 'NONE';
    return [{ race, positionA, positionB, result } as StatisticsHeadToHead['races'][number]];
  });
  return {
    season: data.season,
    a: data.teamEvolution.series.find(entry => entry.team.id === a)?.team.name ?? '',
    b: data.teamEvolution.series.find(entry => entry.team.id === b)?.team.name ?? '',
    races, bothDnf: 0, comparable: races.length,
    aheadA: races.filter(r => r.result === 'A').length, aheadB: races.filter(r => r.result === 'B').length,
    pointsA: races.reduce((sum, r) => sum + r.positionA!, 0), pointsB: races.reduce((sum, r) => sum + r.positionB!, 0)
  };
}

export function duelHeadline(duel: StatisticsHeadToHead, a: string, b: string): string {
  if (!duel.comparable) return 'No hay carreras comunes con resultado comparable.';
  if (duel.aheadA === duel.aheadB) return a + ' y ' + b + ' van igualados: ' + duel.aheadA + '-' + duel.aheadB + ' en ' + duel.comparable + ' carreras comunes';
  const [leader, other, wins] = duel.aheadA > duel.aheadB ? [a, b, duel.aheadA] : [b, a, duel.aheadB];
  return leader + ' adelanta a ' + other + ' en ' + wins + ' de ' + duel.comparable + ' carreras comunes';
}

export function buildComparisonChart(races: { name: string }[], selected: EvolutionSeries[], mobile: boolean, palette: EvolutionPalette) {
  const chart = buildEvolutionChart(races, selected, selected.map(entry => entry.id), mobile, palette);
  chart.data.datasets.forEach((dataset, index) => {
    dataset.pointRadius = 3;
    dataset.pointBackgroundColor = index ? palette.panel : selected[index].color;
    dataset.pointBorderColor = selected[index].color;
    dataset.pointBorderWidth = 2;
  });
  const colors = selected.map((entry, index) => ({
    borderColor: entry.color, backgroundColor: index ? palette.panel : entry.color,
    borderDash: (index ? [6, 3] : [0, 0]) as [number, number], borderWidth: 2
  }));
  chart.options.plugins!.tooltip!.callbacks!.labelColor = context => colors[context.datasetIndex];
  return chart;
}
