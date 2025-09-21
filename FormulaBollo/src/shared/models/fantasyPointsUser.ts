import { Account } from "./account";
import { FantasyElection } from "./fantasyElection";

export interface FantasyPointsUser {
  account: Account;
  fantasyElection: FantasyElection;
  totalPoints: number;
}
