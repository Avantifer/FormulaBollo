import { Driver } from "./driver";
import { FantasyInfo } from "./fantasyInfo";
import { Race } from "./race";

export interface FantasyPricesDriver {
  id: number;
  driver: Driver;
  race: Race;
  price: number;
  fantasyInfo: FantasyInfo;
}
