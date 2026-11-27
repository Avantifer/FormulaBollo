import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { parseRaceWallClock, RaceDate } from '../helpers/race-time';

@Pipe({ name: 'raceDate' })
export class RaceDatePipe implements PipeTransform {
  private readonly datePipe = new DatePipe('en-US');

  transform(value: RaceDate, format: string): string | null {
    return this.datePipe.transform(parseRaceWallClock(value), format, 'UTC');
  }
}
