import { Race } from '../../../shared/models/race';
import { buildFantasySeason } from './fantasy-clasification/fantasy-clasification.helpers';
import { fantasyEntry, fantasyFixture } from './fantasy-clasification/fantasy-clasification.fixture';
import { formatNumber, formatRaceDay, formatRaceDayLong, formatRaceTime, leagueFigures, mostPicked, raceSegments, upcomingRaces } from './fantasy.helpers';

describe('Fantasy home helpers', () => {
  const season = () => buildFantasySeason(fantasyFixture());

  it('shows the API wall-clock day and time in the upcoming calendar, including a browser DST gap', () => {
    const data = fantasyFixture();
    const race = { id: 28, dateStart: '2025-03-09T02:30:00' } as unknown as Race;
    const upcoming = upcomingRaces(buildFantasySeason(data), [race]);
    expect(upcoming[0].date).not.toBeNull();
    expect(formatRaceDayLong(upcoming[0].date!)).toBe('9 de marzo');
    expect(formatRaceTime(upcoming[0].date!)).toBe('02:30');
  });

  it('counts the most picked drivers and teams, most repeated first', () => {
    const data = fantasyFixture();
    data.entries = [fantasyEntry(1, 25, 10), fantasyEntry(2, 25, 10), fantasyEntry(3, 25, 10)];
    data.entries[0].drivers = [{ driverId: 3, points: 0 }, { driverId: 1, points: 0 }, { driverId: 2, points: 0 }];
    data.entries[1].drivers = [{ driverId: 3, points: 0 }, { driverId: 1, points: 0 }, { driverId: 2, points: 0 }];
    data.entries[2].drivers = [{ driverId: 3, points: 0 }, { driverId: 2, points: 0 }, { driverId: 2, points: 0 }];
    data.entries[2].teams = [{ teamId: 2, points: 0 }, { teamId: 2, points: 0 }];

    const picks = mostPicked(buildFantasySeason(data));

    expect(picks.drivers.map(pick => [pick.name, pick.count])).toEqual([['Dani Calde', 4], ['Moraga', 3], ['Juanudi', 2]]);
    expect(picks.teams.map(pick => [pick.name, pick.count])).toEqual([['McLaren', 4], ['Ferrari', 2]]);
  });

  it('breaks ties by name and limits the picks', () => {
    const picks = mostPicked(season());

    expect(picks.drivers.map(pick => pick.name)).toEqual(['Dani Calde', 'Juanudi', 'Moraga']);
    expect(picks.teams.map(pick => pick.name)).toEqual(['Ferrari', 'McLaren']);
    const limited = mostPicked(season(), 1, 1);
    expect(limited.drivers.length).toBe(1);
    expect(limited.teams.length).toBe(1);
  });

  it('omits drivers and teams that nobody picked', () => {
    const none = fantasyFixture();
    none.entries = [];

    expect(mostPicked(buildFantasySeason(none))).toEqual({ drivers: [], teams: [] });
  });

  it('summarises the league: users, played races, distributed points and best score', () => {
    expect(leagueFigures(season())).toEqual({ users: 3, played: 3, total: 4, points: 302, best: { points: 100, username: 'user3' } });
    const empty = fantasyFixture();
    empty.entries = [];
    expect(leagueFigures(buildFantasySeason(empty)).best).toBeNull();
  });

  it('marks played, next and pending races in the calendar strip', () => {
    const data = fantasyFixture();
    data.races.push({ id: 29, name: 'Spa', order: 5, finished: false });

    expect(raceSegments(buildFantasySeason(data)).map(segment => segment.state)).toEqual(['played', 'played', 'played', 'next', 'pending']);
    data.races.forEach(race => race.finished = true);
    expect(raceSegments(buildFantasySeason(data)).every(segment => segment.state === 'played')).toBeTrue();
  });

  it('decides which races are over by the finished flag and not by having picks', () => {
    const data = fantasyFixture();
    data.entries.push(fantasyEntry(1, 28, 5));

    expect(raceSegments(buildFantasySeason(data)).map(segment => segment.state)).toEqual(['played', 'played', 'played', 'next']);
    expect(upcomingRaces(buildFantasySeason(data), []).map(race => race.name)).toEqual(['Monza']);
    data.races.forEach(race => race.finished = true);
    data.entries = [];
    expect(upcomingRaces(buildFantasySeason(data), [])).toEqual([]);
    expect(leagueFigures(buildFantasySeason(data)).played).toBe(4);
  });

  it('lists the upcoming races with their dates and ignores invalid or missing ones', () => {
    const data = fantasyFixture();
    data.races.push({ id: 29, name: 'Spa', order: 5, finished: false }, { id: 30, name: 'Zandvoort', order: 6, finished: false });
    const races = [
      { id: 28, dateStart: '2024-09-01T15:00:00' },
      { id: 29, dateStart: 'no es una fecha' }
    ] as unknown as Race[];

    const upcoming = upcomingRaces(buildFantasySeason(data), races);

    expect(upcoming.map(race => [race.order, race.name, race.next])).toEqual([[4, 'Monza', true], [5, 'Spa', false], [6, 'Zandvoort', false]]);
    expect(formatRaceTime(upcoming[0].date!)).toBe('15:00');
    expect(upcoming[1].date).toBeNull();
    expect(upcoming[2].date).toBeNull();
    expect(upcomingRaces(buildFantasySeason(data), races, 1).length).toBe(1);
  });

  it('formats numbers with thousands separators and race dates in Spanish', () => {
    expect(formatNumber(6647)).toBe('6.647');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1234567)).toBe('1.234.567');
    const date = new Date('2024-11-10T18:00:00Z');
    expect(formatRaceTime(date)).toBe('18:00');
    expect(formatRaceDay(date)).toMatch(/^dom\.? 10 nov/);
  });
});
