import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, delay, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_DRIVER_FETCH } from '../../../constants';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { Driver } from '../../../../shared/models/driver';
import { Season } from '../../../../shared/models/season';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';

export function pointMetrics(points: number, leaderPoints: number, isLeader: boolean): { percentage: number; gap: string } {
  return {
    percentage: leaderPoints > 0 ? Math.min(100, Math.max(0, points / leaderPoints * 100)) : 0,
    gap: isLeader ? '' : '-' + Math.max(0, leaderPoints - points)
  };
}

export function isVacantDriver(driver: Driver): boolean {
  return /^vacante\d*$/i.test(driver.name);
}

export function driverPosition(driver: DriverPoints, standings: readonly DriverPoints[]): number {
  return 1 + standings.filter(point => !isVacantDriver(point.driver) && point.totalPoints > driver.totalPoints).length;
}

@Component({
  selector: 'app-drivers-ranking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SkeletonModule, SpaceToUnderscorePipe],
  templateUrl: './drivers-ranking.component.html',
  styleUrl: './drivers-ranking.component.scss'
})
export class DriversRankingComponent {
  readonly season = input<Season>(environment.seasonActual);
  readonly selectedTeams = input<string[]>([]);
  private readonly resultsApi = inject(ResultApiService);
  private readonly driversApi = inject(DriverApiService);
  protected readonly imageService = inject(ImageService);
  protected readonly utilsService = inject(UtilsService);
  private readonly standings = signal<DriverPoints[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly skeletonRows = Array.from({ length: 10 });
  private readonly realStandings = computed(() => this.standings().filter(point => !isVacantDriver(point.driver)));
  protected readonly vacancies = computed(() => this.standings().filter(point => isVacantDriver(point.driver) && this.matchesTeam(point)));
  protected readonly rows = computed(() => {
    const standings = this.realStandings();
    const leader = standings.reduce((maximum, point) => Math.max(maximum, point.totalPoints), 0);
    return standings.map(point => ({
      ...point,
      position: driverPosition(point, standings),
      tied: standings.filter(other => other.totalPoints === point.totalPoints).length > 1,
      ...pointMetrics(point.totalPoints, leader, point.totalPoints === leader)
    })).filter(point => this.matchesTeam(point));
  });

  private matchesTeam(point: DriverPoints): boolean {
    const teams = this.selectedTeams();
    return !teams.length || teams.includes('Todos los equipos') || teams.includes(point.driver.team.name);
  }

  constructor() {
    effect(onCleanup => {
      const season = this.season();
      this.isLoading.set(true);
      this.standings.set([]);
      const subscription = this.resultsApi.getAllDriverPoints(season.number).pipe(
        delay(100),
        catchError(error => this.utilsService.handleError<DriverPoints[]>(ERROR_DRIVER_FETCH, error, [])),
        switchMap(points => points.length ? of(points) : this.driversApi.getAllDrivers(season.number).pipe(
          catchError(error => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, [])),
          map(drivers => drivers.map(driver => ({ driver, totalPoints: 0, positionChange: 'SAME', positionChangeAmount: 0 })))
        ))
      ).subscribe(points => {
        this.standings.set(points);
        this.isLoading.set(false);
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
