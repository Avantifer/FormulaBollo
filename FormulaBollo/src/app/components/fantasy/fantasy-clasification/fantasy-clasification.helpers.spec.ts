import { buildFantasySeason, fantasyAverage, fantasyInitials, fantasyStandings, fantasyTeamDetail, fantasyUserInitials, rankFantasy } from './fantasy-clasification.helpers';
import { fantasyEntry, fantasyFixture } from './fantasy-clasification.fixture';

describe('Fantasy classification calculations', () => {
  it('matches Python rounding for the reference user5 average and binary decimal boundaries', () => {
    expect(fantasyAverage(279, 12)).toBe(23.2);
    expect(fantasyAverage(95, 4)).toBe(23.8);
    expect(fantasyAverage(21, 20)).toBe(1.1);
    expect(fantasyAverage(23, 20)).toBe(1.1);
    expect(fantasyAverage(0, 0)).toBe(0);
  });
  it('uses competition ranks and username order for ties, with gaps to the immediately previous row', () => {
    const rows = rankFantasy([{ userId: 2, username: 'user2', points: 50 }, { userId: 1, username: 'user1', points: 50 }, { userId: 3, username: 'user3', points: 30 }]);
    expect(rows.map(row => row.rank)).toEqual([1, 1, 3]);
    expect(rows.map(row => row.username)).toEqual(['user1', 'user2', 'user3']);
    expect(rows.map(row => row.gapToLeader)).toEqual([0, 0, 20]);
    expect(rows.map(row => row.gapToPrev)).toEqual([0, 0, 20]);
    expect(rows.map(row => row.tied)).toEqual([true, true, false]);
    expect(rankFantasy([])).toEqual([]);
  });

  it('derives total and race standings and cumulative movement rather than race-rank movement', () => {
    const season = buildFantasySeason(fantasyFixture());
    expect(season.total.map(row => [row.userId, row.points])).toEqual([[3, 140], [2, 111], [1, 51]]);
    expect(fantasyStandings(season, 25).map(row => row.rank)).toEqual([1, 1, 3]);
    expect(fantasyStandings(season, 25).every(row => row.movement === null)).toBeTrue();
    const race = fantasyStandings(season, 26);
    expect(race.map(row => [row.userId, row.points, row.movement])).toEqual([[2, 60, 0], [1, 0, -1]]);
    expect(season.total.map(row => row.movement)).toEqual([2, -1, -1]);
    expect(season.comeback).toEqual(jasmine.objectContaining({ userId: 3, positions: 2, from: 3, to: 1, raceName: 'Mónaco' }));
  });

  it('counts shared wins and podiums, averages only participations and uses the latest election in calendar order', () => {
    const data = fantasyFixture();
    data.entries.reverse(); data.races.reverse();
    const season = buildFantasySeason(data);
    const detail = fantasyTeamDetail(season, season.total, 1, 0)!;
    expect(detail.wins).toBe(1);
    expect(detail.podiums).toBe(2);
    expect(detail.average).toBe(25.5);
    expect(detail.participations).toBe(2);
    expect(detail.raceName).toBe('Jeddah');
    expect(detail.election.points).toBe(0);
    expect(detail.drivers.every(pick => pick.share === 0)).toBeTrue();
    expect(detail.chart.map(race => race.points)).toEqual([51, 0, null]);
    expect(detail.chart.map(race => race.active)).toEqual([false, true, false]);
    expect(detail.chartTop).toBe(100);
  });

  it('excludes competition positions below third from podiums even with shared winners', () => {
    const data = fantasyFixture();
    data.entries.push(fantasyEntry(4, 25, 10));
    const season = buildFantasySeason(data);
    expect(fantasyTeamDetail(season, season.total, 2, 0)!.wins).toBe(2);
    expect(fantasyTeamDetail(season, season.total, 4, 0)!.podiums).toBe(0);
    expect(fantasyStandings(season, 25).map(row => row.rank)).toEqual([1, 1, 3, 4]);
  });

  it('preserves slot order and computes contribution from the election, not from the season total', () => {
    const season = buildFantasySeason(fantasyFixture());
    const detail = fantasyTeamDetail(season, fantasyStandings(season, 25), 1, 25)!;
    expect(detail.drivers.map(pick => [pick.name, pick.points, pick.order])).toEqual([['Juanudi', 0, 1], ['Dani Calde', 18, 2], ['Moraga', 8, 3]]);
    expect(detail.teams.map(pick => [pick.points, pick.order])).toEqual([[14, 1], [11, 2]]);
    expect(detail.drivers[1].share).toBeCloseTo(18 / 51 * 100);
    expect([...detail.drivers, ...detail.teams].reduce((sum, pick) => sum + pick.share, 0)).toBeCloseTo(100);
    expect(detail.driverPoints + detail.teamPoints).toBe(51);
    expect(detail.isTotal).toBeFalse();
  });

  it('handles races and seasons without entries without inventing zero-point elections', () => {
    const season = buildFantasySeason(fantasyFixture());
    expect(fantasyStandings(season, 28)).toEqual([]);
    expect(fantasyTeamDetail(season, [], 1, 28)).toBeNull();
    expect(fantasyStandings(null, 0)).toEqual([]);
    const data = fantasyFixture(); data.entries = [];
    const empty = buildFantasySeason(data);
    expect(empty.total).toEqual([]);
    expect(empty.comeback).toBeNull();
  });

  it('reproduces the reference data.json totals (user2 760, user1 663) and Baréin user1 51 using compact score series', () => {
    // Series de user1 y user2 de data.json; no se incluye el catálogo ni el resto de usuarios.
    const scores: (number | null)[][] = [
      [51, 28, 47, null, 24, 28, 17, 28, 30, 39, null, 40, 38, 53, 38, 35, null, 35, 17, 44, 40, 31],
      [40, 32, 33, 24, 12, 49, 31, null, 61, 37, 46, 58, 39, 46, 42, 30, 20, 42, 41, 43, 34, null]
    ];
    const data = fantasyFixture();
    data.races = scores[0].map((_, index) => ({ id: 25 + index, name: index ? 'Carrera ' + index : 'Baréin', order: index + 1, finished: true }));
    data.entries = scores.flatMap((series, user) => series.flatMap((points, index) => points === null ? [] : [fantasyEntry(user + 1, 25 + index, points)]));
    const season = buildFantasySeason(data);
    expect(season.total.map(row => [row.username, row.points])).toEqual([['user2', 760], ['user1', 663]]);
    expect(fantasyStandings(season, 25)[0]).toEqual(jasmine.objectContaining({ username: 'user1', points: 51 }));
    expect(fantasyTeamDetail(season, season.total, 2, 0)!.average).toBe(38);
    expect(fantasyTeamDetail(season, season.total, 2, 0)!.election.raceId).toBe(45);
  });

  it('uses the reference collision codes and two-letter initials', () => {
    const data = fantasyFixture();
    data.races.push({ id: 29, name: 'Barcelona', order: 5, finished: false });
    expect(buildFantasySeason(data).races.map(race => race.code)).toEqual(['BAE', 'JED', 'MOA', 'MOZ', 'BAC']);
    expect(fantasyInitials('Dani Calde')).toBe('DC');
    expect(fantasyInitials('user1')).toBe('US');
    expect(fantasyUserInitials('user1')).toBe('U1');
    expect(fantasyUserInitials('user13')).toBe('U3');
  });

  it('breaks shared biggest-comeback records by username rather than numeric account id', () => {
    const data = fantasyFixture();
    data.entries = [fantasyEntry(1, 25, 10), fantasyEntry(6, 25, 0), fantasyEntry(16, 25, 0), fantasyEntry(6, 26, 20), fantasyEntry(16, 26, 20)];
    expect(buildFantasySeason(data).comeback).toEqual(jasmine.objectContaining({ userId: 16, positions: 1 }));
  });
});
