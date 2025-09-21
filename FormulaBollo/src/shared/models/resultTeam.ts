import { Race } from "./race";
import { Result } from "./result";

export interface ResultTeam {
  id: number;
  race: Race;
  results: Result[];
  totalPoints: number;
  hasFastLap: boolean;
  hasPole: boolean;
}