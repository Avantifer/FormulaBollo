import { Season } from "./season";

export interface Team {
  id: number;
  name: string;
  carImage: string;
  logoImage: string;
  season: Season;
}
