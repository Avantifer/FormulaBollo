import { Driver } from './driver';
import { Team } from './team';

export interface StatisticsRace {
  id: number;
  name: string;
  season: number;
}

export interface RecordEntry {
  rank: number;
  value: number;
  season: number;
  driver: Driver | null;
  team: Team | null;
}

export interface RecordBoard {
  key: string;
  title: string;
  percent: boolean;
  negative: boolean;
  value: number;
  holders: RecordEntry[];
  ranking: RecordEntry[];
}

export interface StatisticsRecords {
  seasons: {
    number: number;
    year: number;
    races: number;
    finishedRaces: number;
    inProgress: boolean;
    leader: { driver: Driver; points: number; margin: number } | null;
  }[];
  driverRecords: RecordBoard[];
  teamRecords: RecordBoard[];
  holderCounts: { driver: Driver; count: number }[];
  victoryProgress: {
    races: { race: StatisticsRace; season: number; order: number; played: boolean }[];
    series: { driver: Driver; wins: (number | null)[] }[];
  };
}

export interface StatisticsSummary {
  raceCount: number;
  finishedRaces: number;
  distinctWinners: number;
  poleWinRate: number | null;
  dnfRate: number;
  margin: number;
}

export interface DriverStats {
  driver: Driver;
  poles: number;
  fastlaps: number;
  racesFinished: number;
  totalPoints: number;
  penalties: number;
  victories: number;
  podiums: number;
  averagePosition: number;
  races: number;
  dnfs: number;
  poleWins: number;
  hatTricks: number;
  winStreak: number;
  podiumStreak: number;
  currentPodiumStreak: number;
  posStd: number | null;
  penaltiesBy: { warning: number; minor: number; serious: number };
  positionDistribution: number[];
  pointsBySeason: Record<string, number>;
}

export interface TeamStats {
  team: Team;
  poles: number;
  fastlaps: number;
  racesFinished: number;
  totalPoints: number;
  penalties: number;
  victories: number;
  podiums: number;
  averagePosition: number;
  pointsShare: number;
  races: number;
  dnfs: number;
  doublePoints: number;
  doublePodiums: number;
  drivers: { name: string; points: number }[];
  duels: { season: number; a: string; b: string; aAhead: number; bAhead: number; tied: number }[];
  pointsBySeason: Record<string, number>;
}

export interface StatisticsEvolution<T> {
  races: StatisticsRace[];
  series: T[];
}

export interface StatisticsOverview {
  season: number;
  summary: StatisticsSummary;
  drivers: DriverStats[];
  teams: TeamStats[];
  driverEvolution: StatisticsEvolution<{ driver: Driver; cumulative: number[] }>;
  teamEvolution: StatisticsEvolution<{ team: Team; cumulative: number[] }>;
}

export interface StatisticsHeadToHead {
  season: number;
  a: string;
  b: string;
  aheadA: number;
  aheadB: number;
  comparable: number;
  bothDnf: number;
  pointsA: number;
  pointsB: number;
  races: {
    race: StatisticsRace;
    positionA: number | null;
    positionB: number | null;
    result: 'A' | 'B' | 'NONE';
  }[];
}
