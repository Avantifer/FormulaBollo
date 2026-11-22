import { DriverStats, StatisticsHeadToHead, StatisticsOverview, TeamStats } from '../../../shared/models/statistics';
import { Season } from '../../../shared/models/season';

export function statisticsFixture(seasonNumber = 0): StatisticsOverview {
  const season = new Season(3, 'Temporada 3', 3);
  const teams: TeamStats[] = Array.from({ length: 10 }, (_, index) => ({
    team: { id: index + 1, name: ['McLaren', 'Mercedes', 'Ferrari', 'Red Bull', 'Alpine', 'Williams', 'Haas', 'Aston Martin', 'Kick Sauber', 'RB'][index], carImage: '', logoImage: '', season },
    poles: 10 - index, fastlaps: 12 - index, racesFinished: 40 - index, totalPoints: index === 9 ? 0 : 1000 - index * 100,
    penalties: index, victories: Math.max(0, 6 - index), podiums: 15 - index, averagePosition: 5, pointsShare: 10,
    races: 48, dnfs: 8 + index, doublePoints: 10 - index, doublePodiums: 4, drivers: [{ name: 'Compañero A ' + index, points: 90 }, { name: index === 9 ? 'Vacante2' : 'Compañero B ' + index, points: 50 }],
    duels: [{ season: 3, a: 'Compañero A ' + index, b: index === 9 ? 'VACANTE2' : 'Compañero B ' + index, aAhead: 6, bAhead: 3, tied: 1 }],
    pointsBySeason: { '3': 500, '1': 150, '2': 350 }
  }));
  const drivers: DriverStats[] = Array.from({ length: 14 }, (_, index) => ({
    driver: { id: index + 1, name: index > 11 ? (index === 12 ? 'Vacante' : 'VaCaNtE42') : 'Piloto ' + String(index + 1).padStart(2, '0'), number: index + 1, team: teams[index % 10].team, driverImage: '', season },
    poles: index === 0 ? 2 : index === 1 ? 4 : 3, fastlaps: 8 - index, racesFinished: index === 0 ? 7 : index === 1 ? 8 : 24,
    totalPoints: 1000 - index * 30, penalties: 20 - index, victories: Math.max(0, 8 - index), podiums: 12 - index,
    averagePosition: 4 + index, races: index === 0 ? 19 : index === 1 ? 20 : 30, dnfs: 3 + index,
    poleWins: index === 1 ? 3 : 1, hatTricks: Math.max(0, 5 - index), winStreak: 3, podiumStreak: 9 - index, currentPodiumStreak: Math.max(0, 3 - index),
    posStd: index === 3 ? null : 1 + index / 10, penaltiesBy: { warning: 10 - index, minor: 5, serious: 5 },
    positionDistribution: [8, 3, 1, ...Array(18).fill(0)], pointsBySeason: { '3': 500, '1': 150, '2': 350 }
  }));
  return {
    season: seasonNumber,
    summary: { raceCount: 72, finishedRaces: 60, distinctWinners: 8, poleWinRate: 42.5, dnfRate: 0.125, margin: 30 },
    drivers, teams,
    driverEvolution: { races: [{ id: 1, name: 'Carrera A', season: 1 }, { id: 2, name: 'Carrera B', season: 1 }], series: drivers.map((entry, index) => ({ driver: entry.driver, cumulative: index > 11 ? [0, 0] : index === 2 ? [23, 49] : [25 - index, 50 - index] })) },
    teamEvolution: { races: [{ id: 1, name: 'Carrera A', season: 1 }, { id: 2, name: 'Carrera B', season: 1 }], series: teams.map((entry, index) => ({ team: entry.team, cumulative: [50 - index, 100 - index] })) }
  };
}

export function headToHeadFixture(season = 3, a = 'Piloto 01', b = 'Piloto 02'): StatisticsHeadToHead {
  return {
    season, a, b, aheadA: 1, aheadB: 1, comparable: 3, bothDnf: 1, pointsA: 20, pointsB: 18,
    races: [
      { race: { id: 1, name: 'Melbourne', season }, positionA: 1, positionB: null, result: 'A' },
      { race: { id: 2, name: 'Shanghái', season }, positionA: 2, positionB: 1, result: 'B' },
      { race: { id: 3, name: 'Suzuka', season }, positionA: null, positionB: null, result: 'NONE' },
      { race: { id: 4, name: 'Bahréin', season }, positionA: 3, positionB: 3, result: 'NONE' }
    ]
  };
}
