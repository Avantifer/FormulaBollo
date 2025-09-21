import { Driver } from "./driver";
import { PenaltySeverity } from "./penaltySeverity";
import { Race } from "./race";
import { Season } from "./season";

export class Penalty {
  id: number;
  race: Race;
  driver: Driver;
  reason: string;
  penaltySeverity: PenaltySeverity;
  season: Season;

  constructor(id: number, race: Race, driver: Driver, reason: string, penaltySeverity: PenaltySeverity, season: Season) {
    this.id = id;
    this.race = race;
    this.driver = driver;
    this.reason = reason;
    this.penaltySeverity = penaltySeverity;
    this.season = season;
  }
}