import { DriverStats, RecordBoard, RecordEntry, StatisticsHeadToHead, StatisticsOverview, StatisticsRecords, TeamStats } from '../../../shared/models/statistics';
import { Driver } from '../../../shared/models/driver';
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

export function recordsFixture(): StatisticsRecords {
  const driver = (name: string, id: number, teamName: string, number: number): Driver => {
    const season = new Season(number, 'Temporada ' + number, number);
    return { id, name, number: id, driverImage: '', season, team: { id, name: teamName, season, carImage: '', logoImage: '' } };
  };
  const smoking = driver('SmokingWeed', 1, 'McLaren', 3);
  const moraga = driver('Moraga', 2, 'Red Bull', 3);
  const bubapu = driver('Bubapu', 3, 'Ferrari', 1);
  const robe = driver('Robe', 4, 'Ferrari', 2);
  const fernando = driver('Fernando', 5, 'Aston Martin', 2);
  const dubious = driver('Dani Calde', 6, 'Aston Martin', 1);
  const pilots = [smoking, moraga, bubapu, robe, fernando];
  const entry = (person: Driver, value: number, rank = 1): RecordEntry => ({ rank, value, season: person.season.number, driver: person, team: null });
  const board = (key: string, title: string, value: number, holders: RecordEntry[], percent = false, negative = false): RecordBoard => ({
    key, title, value, holders, percent, negative,
    ranking: [...holders, ...[moraga, fernando, robe, bubapu].slice(0, Math.max(0, 5 - holders.length)).map((person, i) => entry(person, Math.max(0, value - (i + 1)), holders.length + i + 1))]
  });
  const oldSmoking = driver('SmokingWeed', 1, 'AlphaTauri', 1);
  const driverRecords = [
    board('poles', 'Poles', 9, [entry(oldSmoking, 9), entry(smoking, 9)]),
    board('podiums', 'Podios', 15, [entry(smoking, 15), entry(moraga, 15)]),
    board('fastLaps', 'Vueltas rápidas', 7, [entry(bubapu, 7)]),
    board('victories', 'Victorias', 6, [entry(oldSmoking, 6), entry(smoking, 6)]),
    board('winRate', '% de victorias', 37.5, [entry(fernando, 37.5)], true),
    board('penalties', 'Penalizaciones', 5, [entry(dubious, 5)], false, true),
    board('racesFinished', 'Carreras terminadas', 24, [entry(fernando, 24)]),
    board('points', 'Puntos', 430, [entry(bubapu, 430)])
  ];
  const teamEntry = (person: Driver, value: number, rank = 1): RecordEntry => ({ ...entry(person, value, rank), driver: null, team: person.team });
  const teamRecords = [
    board('teamPoints', 'Puntos de equipo', 630, [teamEntry(bubapu, 630)]),
    board('teamVictories', 'Victorias de equipo', 7, [teamEntry(bubapu, 7)]),
    board('teamDoublePodiums', 'Dobles podios', 3, [teamEntry(bubapu, 3), teamEntry(robe, 3)])
  ];
  teamRecords.forEach(item => item.ranking = [...item.holders, teamEntry(smoking, item.value - 1, item.holders.length + 1), teamEntry(moraga, item.value - 2, item.holders.length + 2)]);
  const seasons: StatisticsRecords['seasons'] = [
    { number: 1, year: 2023, races: 24, finishedRaces: 24, inProgress: false, leader: { driver: bubapu, points: 430, margin: 76 } },
    { number: 2, year: 2024, races: 26, finishedRaces: 26, inProgress: false, leader: { driver: fernando, points: 402, margin: 24 } },
    { number: 3, year: 2025, races: 24, finishedRaces: 18, inProgress: true, leader: { driver: smoking, points: 336, margin: 65 } }
  ];
  const circuits = ['Melbourne', 'Baréin', 'Suzuka', 'Shanghái', 'Miami', 'Imola', 'Mónaco', 'Barcelona', 'Montreal', 'Spielberg', 'Silverstone', 'Spa', 'Hungaroring', 'Monza', 'Zandvoort', 'Bakú', 'Singapur', 'Austin', 'México', 'Interlagos', 'Lusail', 'Yas Marina', 'Jeddah', 'Las Vegas', 'Portimão', 'Hockenheim'];
  const races = seasons.flatMap(season => Array.from({ length: season.races }, (_, index) => ({ race: { id: season.number * 100 + index, name: circuits[index], season: season.number }, season: season.number, order: index + 1, played: index < season.finishedRaces })));
  return {
    seasons, driverRecords, teamRecords,
    holderCounts: [{ driver: smoking, count: 3 }, { driver: bubapu, count: 2 }, { driver: fernando, count: 2 }, { driver: moraga, count: 1 }, { driver: dubious, count: 1 }],
    victoryProgress: { races, series: pilots.map((person, index) => {
      let wins = 0;
      return { driver: person, wins: races.map((race, i) => {
        if (!race.played) return null;
        if (i % 7 === index) wins++;
        return wins;
      }) };
    }) }
  };
}
