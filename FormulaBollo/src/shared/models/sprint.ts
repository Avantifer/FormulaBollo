import { Driver } from "./driver";
import { Race } from "./race";
import { SprintPosition } from "./sprintPosition";

export class Sprint {
  race: Race;
  driver: Driver;
  position: SprintPosition | null;

  constructor(
    race: Race,
    driver: Driver,
    position: SprintPosition | null
  ) {
    this.race = race;
    this.driver = driver;
    this.position = position;
  }
}
