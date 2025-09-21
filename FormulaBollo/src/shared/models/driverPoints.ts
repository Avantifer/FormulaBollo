import { Driver } from "./driver";

export interface DriverPoints {
  driver: Driver;
  totalPoints: number;
  positionChange: string;
  positionChangeAmount: number;
}
