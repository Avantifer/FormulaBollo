import { Driver } from './driver';
import { Team } from './team';

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
  races: { id: number; name: string; season: number }[];
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
