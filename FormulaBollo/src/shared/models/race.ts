import { Season } from "./season";

export class Race {
  id: number;
  name: string;
  flagImage: string;
  circuitImage: string;
  dateStart: Date;
  season: Season;
  finished: number;

  constructor(
    id: number,
    name: string,
    flagImage: string,
    circuitImage: string,
    dateStart: Date,
    season: Season,
    finished: number,
  ) {
    this.id = id;
    this.name = name;
    this.flagImage = flagImage;
    this.circuitImage = circuitImage;
    this.dateStart = dateStart;
    this.season = season;
    this.finished = finished;
  }
}
