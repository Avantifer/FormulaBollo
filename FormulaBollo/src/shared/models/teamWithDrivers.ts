import { DriverPoints } from "./driverPoints";
import { Team } from "./team";

export interface TeamWithDrivers {
  team: Team;
  driver1: DriverPoints;
  driver2: DriverPoints;
  totalPoints: number;
  positionChange: string;
  positionChangeAmount: number;
}