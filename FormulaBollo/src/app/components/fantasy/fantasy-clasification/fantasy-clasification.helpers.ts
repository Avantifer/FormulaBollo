import { FantasyClasificationDTO, FantasyClasificationEntry, FantasyClasificationRace } from '../../../../shared/models/fantasy-clasification';

export interface FantasyStanding {
  userId: number;
  username: string;
  points: number;
  rank: number;
  gapToLeader: number;
  gapToPrev: number;
  previousUsername: string | null;
  movement: number | null;
  tied: boolean;
}

export interface FantasyComeback {
  userId: number;
  username: string;
  positions: number;
  from: number;
  to: number;
  raceName: string;
}

export interface FantasySeason {
  data: FantasyClasificationDTO;
  races: (FantasyClasificationRace & { code: string; played: boolean })[];
  total: FantasyStanding[];
  byRace: Map<number, FantasyStanding[]>;
  cumulative: Map<number, FantasyStanding[]>;
  comeback: FantasyComeback | null;
}

export interface FantasyPick {
  key: string;
  name: string;
  team: string;
  image: string;
  points: number;
  share: number;
  order: number;
  kind: 'driver' | 'team';
}

export interface FantasyTeamDetail {
  standing: FantasyStanding;
  season: number;
  scenario: string;
  isTotal: boolean;
  wins: number;
  podiums: number;
  average: number;
  participations: number;
  election: FantasyClasificationEntry;
  raceName: string;
  drivers: FantasyPick[];
  teams: FantasyPick[];
  driverPoints: number;
  teamPoints: number;
  chart: { raceId: number; name: string; code: string; points: number | null; active: boolean }[];
  chartTop: number;
  pendingRaces: number;
  comeback: FantasyComeback | null;
}

type Score = Pick<FantasyStanding, 'userId' | 'username' | 'points'>;

export function rankFantasy(rows: Score[]): FantasyStanding[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || (a.username < b.username ? -1 : a.username > b.username ? 1 : 0));
  let rank = 0;
  return sorted.map((row, index) => {
    if (!index || row.points !== sorted[index - 1].points) rank = index + 1;
    return {
      ...row, rank,
      gapToLeader: sorted[0].points - row.points,
      gapToPrev: index ? sorted[index - 1].points - row.points : 0,
      previousUsername: index ? sorted[index - 1].username : null,
      movement: null,
      tied: sorted.some(other => other.userId !== row.userId && other.points === row.points)
    };
  });
}

export function buildFantasySeason(data: FantasyClasificationDTO): FantasySeason {
  const ordered = [...data.races].sort((a, b) => a.order - b.order || a.id - b.id);
  const letters = (name: string) => name.normalize('NFKD').replace(/[^a-z]/gi, '').toUpperCase();
  const races = ordered.map(race => {
    const text = letters(race.name);
    const collision = ordered.filter(other => letters(other.name).slice(0, 3) === text.slice(0, 3)).length > 1;
    return { ...race, code: collision ? text.slice(0, 2) + text.slice(3, 4) : text.slice(0, 3), played: data.entries.some(entry => entry.raceId === race.id) };
  });
  const users = [...new Map(data.entries.map(entry => [entry.account.id, entry.account])).values()].sort((a, b) => a.username < b.username ? -1 : a.username > b.username ? 1 : 0);
  const running = new Map(users.map(user => [user.id, 0]));
  const byRace = new Map<number, FantasyStanding[]>();
  const cumulative = new Map<number, FantasyStanding[]>();
  let previous: FantasyStanding[] = [];
  let comeback: FantasyComeback | null = null;
  for (const race of races.filter(race => race.played)) {
    const entries = data.entries.filter(entry => entry.raceId === race.id);
    for (const entry of entries) running.set(entry.account.id, running.get(entry.account.id)! + entry.points);
    const accumulated = rankFantasy(users.map(user => ({ userId: user.id, username: user.username, points: running.get(user.id)! })));
    for (const row of accumulated) {
      const before = previous.find(other => other.userId === row.userId);
      row.movement = before ? before.rank - row.rank : null;
    }
    const rows = rankFantasy(entries.map(entry => ({ userId: entry.account.id, username: entry.account.username, points: entry.points })));
    for (const row of rows) row.movement = accumulated.find(other => other.userId === row.userId)!.movement;
    byRace.set(race.id, rows);
    cumulative.set(race.id, accumulated);
    previous = accumulated;
  }
  // El generador desempata por nombre de usuario y después por calendario.
  for (const user of users) {
    for (const race of races.filter(race => race.played)) {
      const row = cumulative.get(race.id)!.find(row => row.userId === user.id)!;
      if (row.movement !== null && row.movement > (comeback?.positions ?? 0)) {
        comeback = { userId: row.userId, username: row.username, positions: row.movement, from: row.rank + row.movement, to: row.rank, raceName: race.name };
      }
    }
  }
  const total = rankFantasy(users.map(user => ({ userId: user.id, username: user.username, points: running.get(user.id)! })));
  for (const row of total) row.movement = previous.find(other => other.userId === row.userId)?.movement ?? null;
  return { data, races, total, byRace, cumulative, comeback };
}

export function fantasyStandings(season: FantasySeason | null, raceId: number): FantasyStanding[] {
  return raceId ? season?.byRace.get(raceId) ?? [] : season?.total ?? [];
}

export function fantasyTeamDetail(season: FantasySeason, rows: FantasyStanding[], userId: number, raceId: number): FantasyTeamDetail | null {
  const standing = rows.find(row => row.userId === userId);
  if (!standing) return null;
  const entries = season.data.entries.filter(entry => entry.account.id === userId);
  const election = raceId ? entries.find(entry => entry.raceId === raceId) : season.races.map(race => entries.find(entry => entry.raceId === race.id)).filter(entry => !!entry).at(-1);
  if (!election) return null;
  const appearances = [...season.byRace.values()].flatMap(rows => rows.filter(row => row.userId === userId));
  const total = season.total.find(row => row.userId === userId)!;
  const drivers: FantasyPick[] = election.drivers.map((pick, index) => {
    const driver = season.data.drivers.find(driver => driver.id === pick.driverId);
    return { key: 'driver-' + pick.driverId, kind: 'driver', name: driver?.name.trim() ?? 'Piloto no disponible', team: driver?.team.name ?? 'Escudería no disponible', image: driver?.driverImage ?? '', points: pick.points, share: election.points ? pick.points / election.points * 100 : 0, order: index + 1 };
  });
  const teams: FantasyPick[] = election.teams.map((pick, index) => {
    const team = season.data.teams.find(team => team.id === pick.teamId);
    return { key: 'team-' + pick.teamId, kind: 'team', name: team?.name.trim() ?? 'Equipo no disponible', team: team?.name ?? '', image: team?.carImage ?? '', points: pick.points, share: election.points ? pick.points / election.points * 100 : 0, order: index + 1 };
  });
  const raceName = season.races.find(race => race.id === election.raceId)!.name;
  return {
    standing, season: season.data.season, scenario: raceId ? raceName : 'Temporada ' + season.data.season + ' · Total', isTotal: !raceId,
    wins: appearances.filter(row => row.rank === 1).length, podiums: appearances.filter(row => row.rank <= 3).length,
    average: fantasyAverage(total.points, entries.length), participations: entries.length,
    election, raceName, drivers, teams,
    driverPoints: drivers.reduce((sum, pick) => sum + pick.points, 0), teamPoints: teams.reduce((sum, pick) => sum + pick.points, 0),
    chart: season.races.filter(race => race.played).map(race => ({ raceId: race.id, name: race.name, code: race.code, points: entries.find(entry => entry.raceId === race.id)?.points ?? null, active: race.id === election.raceId })),
    chartTop: Math.max(10, Math.ceil(Math.max(0, ...season.data.entries.map(entry => entry.points)) / 10) * 10),
    pendingRaces: season.races.filter(race => !race.played).length,
    comeback: season.comeback?.userId === userId ? season.comeback : null
  };
}

export function fantasyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words.at(-1)![0] : words[0].slice(0, 2)).toUpperCase();
}

export function fantasyUserInitials(name: string): string {
  const match = /^user(\d+)$/i.exec(name);
  return match ? 'U' + match[1].slice(-1) : name.normalize('NFKD').replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase();
}

export function fantasyAverage(points: number, participations: number): number {
  if (!participations) return 0;
  // Conserva la precisión binaria y el desempate al par de round(media, 1) en Python.
  const [whole, decimals] = Math.abs(points / participations).toFixed(20).split('.');
  const tenths = Number(whole) * 10 + Number(decimals[0]);
  const rest = decimals.slice(1);
  const half = '5'.padEnd(rest.length, '0');
  const increment = rest > half || (rest === half && tenths % 2 !== 0) ? 1 : 0;
  return Math.sign(points) * (tenths + increment) / 10;
}
