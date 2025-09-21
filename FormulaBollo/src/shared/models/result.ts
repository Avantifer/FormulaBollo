import { Driver } from "./driver";
import { Position } from "./position";
import { Race } from "./race";

export class Result {
  race: Race;
  driver: Driver;
  position: Position | null;
  fastlap: number;
  pole: number;

  constructor(
    race: Race,
    driver: Driver,
    position: Position | null,
    fastlap: number,
    pole: number
  ) {
    this.race = race;
    this.driver = driver;
    this.position = position;
    this.fastlap = fastlap;
    this.pole = pole;
  }
}
