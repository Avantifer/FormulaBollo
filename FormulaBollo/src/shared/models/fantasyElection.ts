import { Account } from "./account";
import { Driver } from "./driver";
import { Race } from "./race";
import { Season } from "./season";
import { Team } from "./team";

export class FantasyElection {
  id: number | undefined;
  user: Account | undefined;
  driverOne: Driver | undefined;
  driverTwo: Driver | undefined;
  driverThree: Driver | undefined;
  teamOne: Team | undefined;
  teamTwo: Team | undefined;
  race: Race | undefined;
  season: Season | undefined;
}
