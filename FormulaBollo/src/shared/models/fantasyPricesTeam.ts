import { FantasyInfo } from "./fantasyInfo";
import { Race } from "./race";
import { Team } from "./team";

export interface FantasyPricesTeam {
  id: number;
  team: Team;
  race: Race;
  price: number;
  fantasyInfo: FantasyInfo;
}
