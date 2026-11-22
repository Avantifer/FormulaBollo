import { recordsFixture } from '../statistics.fixture';
import { finalWins, initials, recordValue, seasonRecords, standingNotes, victoryLeaders } from './records.helpers';

describe('records helpers', () => {
  it('formats integers and percent as es-ES without inferring units from titles', () => {
    expect(recordValue(37.54, true)).toBe('37,5 %');
    expect(recordValue(50, true)).toBe('50,0 %');
    expect(recordValue(430)).toBe('430');
    expect(recordValue(12345)).toBe((12345).toLocaleString('es-ES'));
  });

  it('uses two initials, including a single word and whitespace', () => {
    expect(initials(' Dani Calde ')).toBe('DC');
    expect(initials('SmokingWeed')).toBe('SM');
    expect(initials('Ana María Pérez')).toBe('AP');
  });

  it('filters season holders without losing ties or mutating the original boards', () => {
    const data = recordsFixture();
    const poles = seasonRecords(data.driverRecords, 1).find(board => board.key === 'poles')!;
    expect(poles.holders.length).toBe(1);
    expect(data.driverRecords[0].holders.length).toBe(2);
    expect(seasonRecords(data.driverRecords, 3).find(board => board.key === 'podiums')!.holders.length).toBe(2);
    expect(seasonRecords([], 1)).toEqual([]);
    expect(seasonRecords(data.driverRecords, 9)).toEqual([]);
  });

  it('only describes later coholders for records already held in that season', () => {
    const data = recordsFixture();
    expect(standingNotes(data.driverRecords, 1)).toContain('Un récord que sigue en pie: SmokingWeed lo iguala en T3.');
    expect(standingNotes(data.driverRecords, 2)).toEqual([]);
    expect(standingNotes(data.driverRecords, 3)).toEqual([]);
  });

  it('keeps every trajectory leader and ignores pending values including all-null and empty series', () => {
    expect(finalWins([0, 2, null, null])).toBe(2);
    expect(finalWins([null])).toBe(0);
    expect(finalWins([])).toBe(0);
    const series = recordsFixture().victoryProgress.series.slice(0, 2).map(entry => ({ ...entry, wins: [2, 3, null] }));
    expect(victoryLeaders(series)).toBe('Récord de trayectoria: SmokingWeed y Moraga · 3 victorias.');
    expect(victoryLeaders([])).toBe('Todavía no hay victorias registradas.');
  });
});
