import { ResultTeam } from "./resultTeam";
import { Team } from "./team";

export interface TeamInfo {
  team: Team;
  poles: number;
  fastlaps: number;
  racesFinished: number;
  totalPoints: number;
  constructors: number;
  penalties: number;
  bestPosition: number;
  victories: number;
  podiums: number;
  averagePosition: number;
  last5Results: ResultTeam[];
}