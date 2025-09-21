import { Driver } from "./driver";
import { Result } from "./result";

export interface DriverInfo {
  driver: Driver;
  poles: number;
  fastlaps: number;
  racesFinished: number;
  totalPoints: number;
  championships: number;
  penalties: number;
  bestPosition: number;
  podiums: number;
  victories: number;
  averagePosition: number;
  last5Results: [Result];
}
