import { FantasyPricesDriver } from '../../../../shared/models/fantasyPricesDriver';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
import { WARNING_ELECTION_NOT_COMPLETED, WARNING_FANTASY_SAVE_LATE, WARNING_MONEY_NEGATIVE } from '../../../constants';
import {
  formatDecimals, formatDeparture, formatMoney, formatSignedMoney,
  bandCounts, bestValueId, DISABLED_MESSAGE, emptyTeam, emptySlots, FANTASY_BUDGET, hoursUntil, isComplete, nextEmptySlot,
  outcomeOf, pointsPerMillion, priceBand, remainingBudget, SAVE_BLOCK_MESSAGE, saveBlock, sortCandidates, teamCost, TeamState
} from './fantasy-team.helpers';

const M = 1_000_000;
const driver = (id: number, name: string, price: number, points = 10, diff = 0) =>
  ({ id, driver: { id, name }, price, fantasyInfo: { totalPoints: points, differencePrice: diff, averagePoints: 0 } }) as unknown as FantasyPricesDriver;
const team = (id: number, name: string, price: number, points = 10) =>
  ({ id, team: { id, name }, price, fantasyInfo: { totalPoints: points, differencePrice: 0, averagePoints: 0 } }) as unknown as FantasyPricesTeam;

describe('Fantasy team helpers', () => {
  const drivers = [driver(1, 'Moraga', 20 * M, 200), driver(2, 'Juannudi', 10 * M, 150), driver(3, 'Bubapu', 2 * M, 30), driver(4, 'Fernando', 5 * M, 60), driver(5, 'Robe', 3 * M, 20)];
  const teams = [team(1, 'Red Bull', 22 * M, 300), team(2, 'Haas', 3 * M, 40), team(3, 'Mercedes', 15 * M, 120)];
  const caro = driver(9, 'Caro', 27 * M);
  const withTeam = (partial: Partial<TeamState>): TeamState => ({ ...emptyTeam(), ...partial });

  it('adds up the cost of the team and the budget left out of 80 million', () => {
    expect(FANTASY_BUDGET).toBe(80_000_000);
    expect(teamCost(emptyTeam())).toBe(0);
    const state = withTeam({ drivers: [drivers[0], undefined, drivers[1]], teams: [teams[1], undefined] });
    expect(teamCost(state)).toBe(33 * M);
    expect(remainingBudget(state)).toBe(47 * M);
    expect(remainingBudget(withTeam({ drivers: [drivers[0], drivers[1], caro], teams: [teams[0], teams[2]] }))).toBe(-14 * M);
  });

  it('finds the empty slots and moves to the next empty one, wrapping around', () => {
    const state = withTeam({ drivers: [drivers[0], undefined, drivers[1]], teams: [undefined, teams[1]] });

    expect(emptySlots(state)).toEqual([{ kind: 'driver', index: 1 }, { kind: 'team', index: 0 }]);
    expect(nextEmptySlot(state)).toEqual({ kind: 'driver', index: 1 });
    expect(nextEmptySlot(state, { kind: 'driver', index: 1 })).toEqual({ kind: 'team', index: 0 });
    expect(nextEmptySlot(state, { kind: 'team', index: 1 })).toEqual({ kind: 'driver', index: 1 });
    expect(isComplete(state)).toBeFalse();
    const full = withTeam({ drivers: [drivers[0], drivers[1], drivers[2]], teams: [teams[0], teams[1]] });
    expect(isComplete(full)).toBeTrue();
    expect(nextEmptySlot(full)).toBeNull();
  });

  it('says whether a candidate fits and what would be left, replacing the pick of that slot', () => {
    const state = withTeam({ drivers: [drivers[1], undefined, undefined], teams: [teams[0], undefined] });

    const add = outcomeOf(state, { kind: 'driver', index: 1 }, drivers[3], drivers, teams);
    expect(add.remainingAfter).toBe(80 * M - 10 * M - 22 * M - 5 * M);
    expect(add.fits).toBeTrue();
    const swap = outcomeOf(state, { kind: 'driver', index: 0 }, drivers[0], drivers, teams);
    expect(swap.remainingAfter).toBe(80 * M - 22 * M - 20 * M);
    const tooMuch = outcomeOf(withTeam({ drivers: [drivers[0], drivers[1], undefined], teams: [teams[0], teams[2]] }), { kind: 'driver', index: 2 }, caro, [...drivers, caro], teams);
    expect(tooMuch.fits).toBeFalse();
    expect(tooMuch.remainingAfter).toBe(-14 * M);
  });

  it('warns how much would be missing to complete the team with the cheapest options left', () => {
    const state = withTeam({ drivers: [drivers[0], drivers[1], undefined], teams: [teams[0], undefined] });

    const cheap = outcomeOf(state, { kind: 'driver', index: 2 }, drivers[2], drivers, teams);
    expect(cheap.remainingAfter).toBe(80 * M - 20 * M - 10 * M - 22 * M - 2 * M);
    expect(cheap.shortBy).toBe(0);
    const pricey = outcomeOf(state, { kind: 'driver', index: 2 }, caro, [...drivers, caro], teams);
    expect(pricey.fits).toBeTrue();
    expect(pricey.remainingAfter).toBe(1 * M);
    expect(pricey.shortBy).toBe(2 * M);
  });

  it('computes points per million, price bands and counts, and the best value', () => {
    expect(pointsPerMillion(drivers[0])).toBeCloseTo(10);
    expect(pointsPerMillion(driver(8, 'Gratis', 0, 50))).toBe(0);
    expect(priceBand(5 * M)).toBe('low');
    expect(priceBand(5 * M + 1)).toBe('mid');
    expect(priceBand(15 * M)).toBe('mid');
    expect(priceBand(15 * M + 1)).toBe('high');
    expect(bandCounts(drivers)).toEqual({ all: 5, low: 3, mid: 1, high: 1 });
    expect(bestValueId(drivers)).toBe(2);
    expect(bestValueId([])).toBeNull();
    expect(bestValueId([driver(8, 'Cero', 5 * M, 0)])).toBeNull();
  });

  it('sorts candidates by every key in both directions and breaks ties by name', () => {
    const list = [driver(1, 'Zeta', 10 * M, 50, 1), driver(2, 'Alfa', 10 * M, 80, -2), driver(3, 'Beta', 5 * M, 80, 3)];

    expect(sortCandidates(list, 'points', true).map(item => item.driver.name)).toEqual(['Alfa', 'Beta', 'Zeta']);
    expect(sortCandidates(list, 'price', false).map(item => item.driver.name)).toEqual(['Beta', 'Alfa', 'Zeta']);
    expect(sortCandidates(list, 'name', false).map(item => item.driver.name)).toEqual(['Alfa', 'Beta', 'Zeta']);
    expect(sortCandidates(list, 'name', true).map(item => item.driver.name)).toEqual(['Zeta', 'Beta', 'Alfa']);
    expect(sortCandidates(list, 'ppm', true).map(item => item.driver.name)).toEqual(['Beta', 'Alfa', 'Zeta']);
    expect(sortCandidates(list, 'diff', true).map(item => item.driver.name)).toEqual(['Beta', 'Zeta', 'Alfa']);
    expect(list.map(item => item.driver.name)).toEqual(['Zeta', 'Alfa', 'Beta']);
  });

  it('measures the hours to the race with sign so a race that already started is late', () => {
    const now = new Date('2026-01-10T12:00:00');

    expect(hoursUntil('2026-01-11T12:00:00', now)).toBe(24);
    expect(hoursUntil('2026-01-10T00:00:00', now)).toBe(-12);
  });

  it('explains why saving is blocked, in the order of the app rules', () => {
    const now = new Date('2026-01-01T12:00:00');
    const full = withTeam({ drivers: [drivers[2], drivers[3], drivers[4]], teams: [teams[1], teams[2]] });
    const over = withTeam({ drivers: [drivers[0], drivers[1], caro], teams: [teams[0], teams[2]] });

    expect(saveBlock(false, full, '2026-01-05T12:00:00', now)).toBe('disabled');
    expect(saveBlock(true, withTeam({ drivers: [drivers[0], undefined, undefined] }), '2026-01-05T12:00:00', now)).toBe('incomplete');
    expect(saveBlock(true, over, '2026-01-05T12:00:00', now)).toBe('negative');
    expect(saveBlock(true, full, '2026-01-01T20:00:00', now)).toBe('late');
    expect(saveBlock(true, full, '2025-12-31T12:00:00', now)).toBe('late');
    expect(saveBlock(true, full, '2026-01-02T00:00:00', now)).toBeNull();
    expect(saveBlock(true, full, undefined, now)).toBeNull();
    expect(SAVE_BLOCK_MESSAGE).toEqual({
      disabled: DISABLED_MESSAGE, incomplete: WARNING_ELECTION_NOT_COMPLETED, negative: WARNING_MONEY_NEGATIVE, late: WARNING_FANTASY_SAVE_LATE
    });
  });

  it('formats money with a unit under a million and signs the differences', () => {
    expect(formatMoney(80 * M)).toBe('$80M');
    expect(formatMoney(20_960_000)).toBe('$20,96M');
    expect(formatMoney(350_000)).toBe('$350K');
    expect(formatMoney(4_126)).toBe('$4,13K');
    expect(formatMoney(999)).toBe('$999');
    expect(formatMoney(0)).toBe('$0');
    expect(formatMoney(-4_700_000)).toBe('-$4,7M');
    expect(formatSignedMoney(2_500_000)).toBe('+$2,5M');
    expect(formatSignedMoney(-10 * M)).toBe('−$10M');
    expect(formatSignedMoney(0)).toBe('$0');
  });

  it('formats decimals in Spanish and the departure with the weekday and the time', () => {
    expect(formatDecimals(7.6, 1)).toBe('7,6');
    expect(formatDecimals(0, 2)).toBe('0,00');
    expect(formatDecimals(-13, 2)).toBe('-13,00');
    const departure = formatDeparture(new Date(2024, 10, 10, 18, 0));
    expect(departure).toContain('domingo');
    expect(departure).toContain('10 de noviembre');
    expect(departure.endsWith('18:00')).toBeTrue();
  });
});
