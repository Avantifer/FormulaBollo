import { Driver } from "./driver";
import { Race } from "./race";
import { Season } from "./season";

export interface FantasyPointsDriver {
  id: number;
  driver: Driver;
  race: Race;
  points: number;
  season: Season;
  totalPoints?: number;
}
