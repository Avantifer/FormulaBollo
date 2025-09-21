import { Driver } from "./driver";
import { Race } from "./race";

export interface DriverEvolutionPoints {
  driver: Driver;
  accumulatedPoints: number[];
  races: Race[];
}