import { FantasyPricesDriver } from '../../../../shared/models/fantasyPricesDriver';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
import { parseRaceWallClock, raceStartInstant } from '../../../../shared/helpers/race-time';
import { WARNING_ELECTION_NOT_COMPLETED, WARNING_FANTASY_SAVE_LATE, WARNING_MONEY_NEGATIVE } from '../../../constants';

const M = 1_000_000;
export const FANTASY_BUDGET = 80_000_000;
export const SAVE_DEADLINE_HOURS = 12;
export const DISABLED_MESSAGE = 'La elección de Fantasy no está habilitada.';

export type SlotKind = 'driver' | 'team';
export type Candidate = FantasyPricesDriver | FantasyPricesTeam;
export type PriceBand = 'low' | 'mid' | 'high';
export type SortKey = 'points' | 'price' | 'name' | 'ppm' | 'diff';
export type SaveBlock = 'disabled' | 'incomplete' | 'negative' | 'late';

export interface SlotRef {
  kind: SlotKind;
  index: number;
}

export interface TeamState {
  drivers: (FantasyPricesDriver | undefined)[];
  teams: (FantasyPricesTeam | undefined)[];
}

export interface Outcome {
  remainingAfter: number;
  fits: boolean;
  shortBy: number;
}

export const emptyTeam = (): TeamState => ({ drivers: [undefined, undefined, undefined], teams: [undefined, undefined] });

export const isDriver = (candidate: Candidate): candidate is FantasyPricesDriver => 'driver' in candidate;
export const candidateId = (candidate: Candidate): number => isDriver(candidate) ? candidate.driver.id : candidate.team.id;
export const candidateName = (candidate: Candidate): string => (isDriver(candidate) ? candidate.driver.name : candidate.team.name).trim();

export function teamCost(state: TeamState): number {
  return [...state.drivers, ...state.teams].reduce((total, item) => total + (item?.price ?? 0), 0);
}

export const remainingBudget = (state: TeamState): number => FANTASY_BUDGET - teamCost(state);

export function emptySlots(state: TeamState): SlotRef[] {
  return [
    ...state.drivers.map((item, index) => ({ kind: 'driver' as const, index, empty: !item })),
    ...state.teams.map((item, index) => ({ kind: 'team' as const, index, empty: !item }))
  ].filter(slot => slot.empty).map(({ kind, index }) => ({ kind, index }));
}

export const isComplete = (state: TeamState): boolean => !emptySlots(state).length;

export function nextEmptySlot(state: TeamState, after?: SlotRef): SlotRef | null {
  return nextSlot(emptySlots(state), after);
}

export function nextSlot(empty: SlotRef[], after?: SlotRef): SlotRef | null {
  const order: SlotRef[] = [
    { kind: 'driver', index: 0 }, { kind: 'driver', index: 1 }, { kind: 'driver', index: 2 },
    { kind: 'team', index: 0 }, { kind: 'team', index: 1 }
  ];
  if (!empty.length) return null;
  const start = after ? order.findIndex(slot => slot.kind === after.kind && slot.index === after.index) + 1 : 0;
  for (let step = 0; step < order.length; step++) {
    const slot = order[(start + step) % order.length];
    if (empty.some(item => item.kind === slot.kind && item.index === slot.index)) return slot;
  }
  return null;
}

function cheapest(prices: number[], count: number): number {
  return [...prices].sort((a, b) => a - b).slice(0, count).reduce((total, price) => total + price, 0);
}

/**
 * Qué pasa al poner `candidate` en `slot`: presupuesto que quedaría, si cabe y, si cabe pero no se podría
 * completar el equipo con lo que queda, cuánto faltaría para rellenar las demás casillas con lo más barato.
 */
export function outcomeOf(state: TeamState, slot: SlotRef, candidate: Candidate, drivers: FantasyPricesDriver[], teams: FantasyPricesTeam[]): Outcome {
  const current = (slot.kind === 'driver' ? state.drivers[slot.index] : state.teams[slot.index])?.price ?? 0;
  const remainingAfter = remainingBudget(state) + current - candidate.price;
  const next: TeamState = {
    drivers: state.drivers.map((item, index) => slot.kind === 'driver' && index === slot.index ? candidate as FantasyPricesDriver : item),
    teams: state.teams.map((item, index) => slot.kind === 'team' && index === slot.index ? candidate as FantasyPricesTeam : item)
  };
  const chosenDrivers = new Set(next.drivers.filter(Boolean).map(item => item!.driver.id));
  const chosenTeams = new Set(next.teams.filter(Boolean).map(item => item!.team.id));
  const missingDrivers = next.drivers.filter(item => !item).length;
  const missingTeams = next.teams.filter(item => !item).length;
  const toComplete = cheapest(drivers.filter(item => !chosenDrivers.has(item.driver.id)).map(item => item.price), missingDrivers)
    + cheapest(teams.filter(item => !chosenTeams.has(item.team.id)).map(item => item.price), missingTeams);
  return { remainingAfter, fits: remainingAfter >= 0, shortBy: Math.max(0, toComplete - remainingAfter) };
}

export function pointsPerMillion(candidate: Candidate): number {
  return candidate.price > 0 ? candidate.fantasyInfo.totalPoints / (candidate.price / 1_000_000) : 0;
}

export function priceBand(price: number): PriceBand {
  return price <= 5_000_000 ? 'low' : price <= 15_000_000 ? 'mid' : 'high';
}

export function bandCounts(candidates: Candidate[]): Record<PriceBand | 'all', number> {
  return {
    all: candidates.length,
    low: candidates.filter(item => priceBand(item.price) === 'low').length,
    mid: candidates.filter(item => priceBand(item.price) === 'mid').length,
    high: candidates.filter(item => priceBand(item.price) === 'high').length
  };
}

export function bestValueId(candidates: Candidate[]): number | null {
  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (!best || pointsPerMillion(candidate) > pointsPerMillion(best)) best = candidate;
  }
  return best && pointsPerMillion(best) > 0 ? candidateId(best) : null;
}

const value = (candidate: Candidate, key: SortKey): number | string => {
  switch (key) {
    case 'points': return candidate.fantasyInfo.totalPoints;
    case 'price': return candidate.price;
    case 'ppm': return pointsPerMillion(candidate);
    case 'diff': return candidate.fantasyInfo.differencePrice;
    default: return candidateName(candidate);
  }
};

export function sortCandidates<T extends Candidate>(candidates: T[], key: SortKey, descending: boolean): T[] {
  const sign = descending ? -1 : 1;
  return [...candidates].sort((a, b) => {
    const left = value(a, key);
    const right = value(b, key);
    const order = typeof left === 'string' ? left.localeCompare(right as string, 'es') : (left as number) - (right as number);
    return sign * order || candidateName(a).localeCompare(candidateName(b), 'es');
  });
}

export const hoursUntil = (start: Date | string, now: Date): number => (raceStartInstant(start) - now.getTime()) / 3_600_000;

export function saveBlock(enabled: boolean, state: TeamState, raceStart: Date | string | undefined, now: Date): SaveBlock | null {
  if (!enabled) return 'disabled';
  if (!isComplete(state)) return 'incomplete';
  if (remainingBudget(state) < 0) return 'negative';
  if (raceStart && hoursUntil(raceStart, now) <= SAVE_DEADLINE_HOURS) return 'late';
  return null;
}

export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const text = abs >= M
    ? (abs / M).toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false }) + 'M'
    : abs >= 1_000
      ? (abs / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false }) + 'K'
      : abs.toLocaleString('es-ES', { maximumFractionDigits: 0, useGrouping: false });
  return (amount < 0 ? '-' : '') + '$' + text;
}

export function formatDecimals(value: number, digits: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatSignedMoney(amount: number): string {
  return (amount > 0 ? '+' : amount < 0 ? '−' : '') + formatMoney(Math.abs(amount));
}

export function formatDeparture(date: Date | string): string {
  const start = parseRaceWallClock(date);
  const day = start.toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return day + ', ' + start.toLocaleTimeString('es-ES', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
}

export const SAVE_BLOCK_MESSAGE: Record<SaveBlock, string> = {
  disabled: DISABLED_MESSAGE,
  incomplete: WARNING_ELECTION_NOT_COMPLETED,
  negative: WARNING_MONEY_NEGATIVE,
  late: WARNING_FANTASY_SAVE_LATE
};
