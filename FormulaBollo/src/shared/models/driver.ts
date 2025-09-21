import { Season } from "./season";
import { Team } from "./team";

export interface Driver {
  id: number;
  name: string;
  number: number;
  team: Team;
  driverImage: string;
  season: Season;
}
