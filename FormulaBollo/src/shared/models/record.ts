import { Driver } from "./driver";
import { Season } from "./season";
import { Team } from "./team";

export interface Record {
  title: string;
  value: number;
  driver: Driver;
  team: Team;
  season: Season;
}