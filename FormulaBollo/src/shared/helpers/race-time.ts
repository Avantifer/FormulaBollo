/** The API stores Madrid wall-clock strings. Date inputs are local date-picker values. */
export type RaceDate = string | Date;

const MADRID = 'Europe/Madrid';
const madridParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: MADRID, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const pad = (value: number, digits = 2): string => String(value).padStart(digits, '0');

/** Serialize the picker fields, without passing through UTC or the browser's offset. */
export function serializeRaceDate(value: RaceDate): string {
  if (typeof value === 'string') {
    return parseRaceWallClock(value).toISOString().replace(/(?:\.000)?Z$/, '');
  }
  const seconds = `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    + `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  return seconds + (value.getMilliseconds() ? `.${pad(value.getMilliseconds(), 3)}` : '');
}

/** UTC is only a carrier for display fields, never the real race instant. Format with UTC. */
export function parseRaceWallClock(value: RaceDate): Date {
  const text = value instanceof Date ? serializeRaceDate(value) : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/.test(text)) return new Date(NaN);
  return new Date(text + 'Z');
}

function madridOffset(instant: number): number {
  const parts = Object.fromEntries(madridParts.formatToParts(instant).map(part => [part.type, part.value]));
  return Date.parse(`${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}Z`)
    - Math.floor(instant / 1000) * 1000;
}

/** Like Java atZone: gaps shift forward by the gap; overlaps choose the first instant. */
export function raceStartInstant(value: RaceDate): number {
  const wall = parseRaceWallClock(value).getTime();
  if (!Number.isFinite(wall)) return NaN;
  const offsets = [...new Set([madridOffset(wall - 86_400_000), madridOffset(wall + 86_400_000)])];
  const candidates = offsets.map(offset => wall - offset);
  const valid = candidates.filter((instant, index) => madridOffset(instant) === offsets[index]);
  return valid.length ? Math.min(...valid) : Math.max(...candidates);
}
