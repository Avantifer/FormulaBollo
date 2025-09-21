import { Race } from "./race";
import { Team } from "./team";

export interface TeamEvolutionPoints {
  team: Team;
  accumulatedPoints: number[];
  races: Race[];
}