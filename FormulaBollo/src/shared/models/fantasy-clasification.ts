import { Driver } from './driver';
import { Team } from './team';

export interface FantasyClasificationRace {
  id: number;
  name: string;
  order: number;
  finished: boolean;
}

export interface FantasyClasificationEntry {
  raceId: number;
  account: { id: number; username: string };
  points: number;
  drivers: { driverId: number; points: number }[];
  teams: { teamId: number; points: number }[];
}

export interface FantasyClasificationDTO {
  season: number;
  races: FantasyClasificationRace[];
  drivers: Driver[];
  teams: Team[];
  entries: FantasyClasificationEntry[];
}
