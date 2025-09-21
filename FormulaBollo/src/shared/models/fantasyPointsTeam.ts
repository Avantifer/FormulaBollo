import { Race } from "./race";
import { Season } from "./season";
import { Team } from "./team";

export interface FantasyPointsTeam {
  id: number;
  team: Team;
  race: Race;
  points: number;
  season: Season;
  totalPoints?: number;
}
