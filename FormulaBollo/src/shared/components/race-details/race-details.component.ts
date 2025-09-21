import { Component, inject, Signal } from '@angular/core';
import { Race } from '../../models/race';
import { toSignal } from '@angular/core/rxjs-interop';
import { RaceApiService } from '../../services/api/race-api.service';
import { environment } from '../../../enviroments/enviroment';
import { ERROR_RACE_FETCH } from '../../../app/constants';
import { catchError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { UtilsService } from '../../services/utils.service';

@Component({
  selector: 'race-details',
  imports: [CommonModule],
  templateUrl: './race-details.component.html',
  styleUrl: './race-details.component.scss'
})
export class RaceDetailsComponent {
  private readonly raceApiService: RaceApiService = inject(RaceApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  
  protected races: Signal<Race[]> = toSignal(
    this.raceApiService.getAllRaces(environment.seasonActual.number)
    .pipe(
      catchError((error) => this.utilsService.handleError(ERROR_RACE_FETCH, error, []))
    ),
    { initialValue: [] }
  );
  protected raceActual: Signal<Race | undefined> = toSignal(
    this.raceApiService.getActualRace(environment.seasonActual.number)
    .pipe(
      catchError((error) => this.utilsService.handleError<Race>(ERROR_RACE_FETCH, error))
    ),
    { initialValue: undefined }
  );

  countdownText: string = '';
  private intervalId: any;

  private updateCountdown() {
    if (this.raceActual() === undefined) return;
    
    const now = new Date().getTime();
    const target = new Date(this.raceActual()!.dateStart).getTime();
    const difference = target - now;

    if (difference <= 0) {
      this.countdownText = 'Se está jugando la carrera';
      clearInterval(this.intervalId);
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    this.countdownText = `${this.formatNumber(days)}d : ${this.formatNumber(hours)}h : ${this.formatNumber(minutes)}m : ${this.formatNumber(seconds)}s`;
  }

  private formatNumber(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  ngAfterViewInit() {
    this.updateCountdown();
    this.intervalId = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
