import { RecordBoard, StatisticsRecords } from '../../../../shared/models/statistics';

export function recordValue(value: number, percent = false): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: percent ? 1 : 0, maximumFractionDigits: percent ? 1 : 0 }) + (percent ? ' %' : '');
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words.at(-1)![0] : words[0].slice(0, 2)).toUpperCase();
}

export function seasonRecords(boards: RecordBoard[], season: number) {
  return boards.flatMap(board => {
    const holders = board.holders.filter(entry => entry.season === season);
    return holders.length ? [{ ...board, holders }] : [];
  });
}

export function standingNotes(boards: RecordBoard[], season: number): string[] {
  return boards.flatMap(board => {
    if (!board.holders.some(entry => entry.season === season)) return [];
    return board.holders.filter(entry => entry.season > season && entry.driver).map(entry =>
      'Un récord que sigue en pie: ' + entry.driver!.name + ' lo iguala en T' + entry.season + '.');
  });
}

export function finalWins(wins: (number | null)[]): number {
  return wins.reduce<number>((last, value) => value ?? last, 0);
}

export function victoryLeaders(series: StatisticsRecords['victoryProgress']['series']): string {
  const best = Math.max(...series.map(entry => finalWins(entry.wins)));
  const leaders = series.filter(entry => finalWins(entry.wins) === best).map(entry => entry.driver.name);
  return leaders.length ? 'Récord de trayectoria: ' + leaders.join(' y ') + ' · ' + recordValue(best) + ' victorias.' : 'Todavía no hay victorias registradas.';
}
