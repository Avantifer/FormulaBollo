import { Race } from '../../../shared/models/race';
import { FantasySeason } from './fantasy-clasification/fantasy-clasification.helpers';

export interface FantasyHomePick {
  id: number;
  name: string;
  detail: string;
  image: string;
  count: number;
}

export interface FantasyHomePicks {
  drivers: FantasyHomePick[];
  teams: FantasyHomePick[];
}

export interface FantasyHomeFigures {
  users: number;
  played: number;
  total: number;
  points: number;
  best: { points: number; username: string } | null;
}

export interface FantasyHomeSegment {
  id: number;
  name: string;
  order: number;
  state: 'played' | 'next' | 'pending';
}

export interface FantasyHomeRace {
  order: number;
  name: string;
  date: Date | null;
  next: boolean;
}

function byCountThenName<T extends { count: number; name: string }>(a: T, b: T): number {
  return b.count - a.count || a.name.localeCompare(b.name, 'es');
}

export function mostPicked(season: FantasySeason, drivers = 3, teams = 2): FantasyHomePicks {
  const driverCount = new Map<number, number>();
  const teamCount = new Map<number, number>();
  for (const entry of season.data.entries) {
    for (const pick of entry.drivers) driverCount.set(pick.driverId, (driverCount.get(pick.driverId) ?? 0) + 1);
    for (const pick of entry.teams) teamCount.set(pick.teamId, (teamCount.get(pick.teamId) ?? 0) + 1);
  }
  const driverPicks = season.data.drivers
    .filter(driver => driverCount.has(driver.id))
    .map(driver => ({ id: driver.id, name: driver.name.trim(), detail: driver.team?.name ?? '', image: driver.driverImage ?? '', count: driverCount.get(driver.id)! }));
  const teamPicks = season.data.teams
    .filter(team => teamCount.has(team.id))
    .map(team => ({ id: team.id, name: team.name.trim(), detail: '', image: team.carImage ?? '', count: teamCount.get(team.id)! }));
  return {
    drivers: driverPicks.sort(byCountThenName).slice(0, drivers),
    teams: teamPicks.sort(byCountThenName).slice(0, teams)
  };
}

export function leagueFigures(season: FantasySeason): FantasyHomeFigures {
  const entries = season.data.entries;
  const best = entries.reduce<FantasyHomeFigures['best']>((top, entry) =>
    !top || entry.points > top.points ? { points: entry.points, username: entry.account.username } : top, null);
  return {
    users: season.total.length,
    played: season.races.filter(race => race.finished).length,
    total: season.races.length,
    points: entries.reduce((sum, entry) => sum + entry.points, 0),
    best
  };
}

export function raceSegments(season: FantasySeason): FantasyHomeSegment[] {
  const nextId = season.races.find(race => !race.finished)?.id;
  return season.races.map(race => ({
    id: race.id,
    name: race.name,
    order: race.order,
    state: race.finished ? 'played' : race.id === nextId ? 'next' : 'pending'
  }));
}

export function upcomingRaces(season: FantasySeason, races: Race[], limit = 4): FantasyHomeRace[] {
  const dates = new Map(races.map(race => [race.id, new Date(race.dateStart)]));
  const pending = season.races.filter(race => !race.finished).slice(0, limit);
  return pending.map((race, index) => {
    const date = dates.get(race.id);
    return { order: race.order, name: race.name, date: date && !Number.isNaN(date.getTime()) ? date : null, next: index === 0 };
  });
}

export function formatNumber(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRaceDay(date: Date): string {
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

export function formatRaceDayLong(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

export function formatRaceTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}
