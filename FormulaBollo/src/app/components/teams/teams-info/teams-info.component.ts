import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { SelectSeasonsComponent } from '../../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../../shared/models/season';
import { TeamInfo } from '../../../../shared/models/teamInfo';
import { TeamWithDrivers } from '../../../../shared/models/teamWithDrivers';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { Result } from '../../../../shared/models/result';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { CacheService } from '../../../../shared/services/cache.service';
import { teamSeasonTitle } from '../../../../shared/services/page-title.strategy';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { ERROR_DRIVER_FETCH, ERROR_TEAM_INFO_FETCH } from '../../../constants';
import { isVacantDriver } from '../../drivers/drivers-ranking/drivers-ranking.component';

@Component({
  selector: 'app-teams-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, DatePipe, NgTemplateOutlet, SpaceToUnderscorePipe, SelectSeasonsComponent],
  templateUrl: './teams-info.component.html',
  styleUrl: './teams-info.component.scss'
})
export class TeamsInfoComponent {
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly imageService = inject(ImageService);
  protected readonly utilsService = inject(UtilsService);
  protected readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly teamApiService = inject(TeamApiService);
  private readonly driverApiService = inject(DriverApiService);
  private readonly resultApiService = inject(ResultApiService);
  private readonly cacheService = inject(CacheService);

  protected teamName = this.activatedRoute.snapshot.paramMap.get('name')!.replaceAll('_', ' ');
  protected initialSeasonNumber?: number;
  protected readonly selectedSeasonNumber = signal(0);
  protected readonly teamInfo = signal<TeamInfo | undefined>(undefined);
  protected readonly drivers = signal<DriverPoints[]>([]);
  protected readonly sortedDrivers = computed(() => [...this.drivers()].sort((a, b) => b.totalPoints - a.totalPoints));
  protected readonly isVacantDriver = isVacantDriver;
  protected readonly driverStandings = computed(() => {
    const drivers = this.sortedDrivers();
    const occupied = drivers.filter(point => !isVacantDriver(point.driver));
    const maximum = Math.max(0, ...drivers.map(point => point.totalPoints));
    return drivers.map(point => ({
      ...point,
      position: isVacantDriver(point.driver) ? null : 1 + occupied.filter(other => other.totalPoints > point.totalPoints).length,
      share: maximum > 0 ? point.totalPoints / maximum * 100 : 0
    }));
  });
  private readonly standings = signal<TeamWithDrivers[]>([]);
  protected readonly championshipPosition = computed(() => {
    const team = this.teamInfo()?.team;
    const standings = this.standings();
    if (!this.selectedSeasonNumber() || !team || !standings.some(point => point.totalPoints > 0)) return undefined;
    const point = standings.find(point => point.team.id === team.id || point.team.name === team.name);
    return point ? {
      position: 1 + standings.filter(other => other.totalPoints > point.totalPoints).length,
      total: standings.length,
      tied: standings.filter(other => other.totalPoints === point.totalPoints).length > 1
    } : undefined;
  });
  protected readonly teamStatsArray = signal<Array<{ icon: string; key: string; value: number | string }>>([]);
  private readonly destroy$ = new Subject<void>();
  private infoSubscription?: Subscription;
  private driversSubscription?: Subscription;
  private standingsSubscription?: Subscription;

  ngOnInit(): void {
    this.activatedRoute.params.pipe(
      map(params => params['name'].replaceAll('_', ' ') as string),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(name => {
      this.infoSubscription?.unsubscribe();
      this.driversSubscription?.unsubscribe();
      this.standingsSubscription?.unsubscribe();
      this.teamName = name;
      const season = this.activatedRoute.snapshot.queryParamMap?.get('season');
      const number = season && /^\d+$/.test(season) ? Number(season) : NaN;
      this.initialSeasonNumber = Number.isSafeInteger(number) ? number : undefined;
      this.selectedSeasonNumber.set(this.initialSeasonNumber ?? 0);
      this.teamInfo.set(undefined);
      this.drivers.set([]);
      this.standings.set([]);
      this._getTeamsCache(this.initialSeasonNumber ?? 0);
    });
  }

  private _getTeamsCache(seasonNumber: number): void {
    const cache = this.cacheService.loadCache();
    const info = cache.get('infoTeamByName-' + this.teamName + '-' + seasonNumber) as TeamInfo | undefined;
    if (info) {
      this.teamInfo.set(info);
      this._mapTeamStats(info);
    }
    const drivers = cache.get('driversByTeamName-' + this.teamName + '-' + seasonNumber);
    if (drivers) {
      const ids = drivers.map((driver: DriverPoints['driver']) => driver.id);
      const points = cache.get('specificDriverPoints-' + seasonNumber + '-' + ids);
      if (points) this.drivers.set(points);
    }
    this.standings.set(cache.get('allTeamsWithDrivers-' + seasonNumber) ?? []);
  }

  protected onSeasonChange(newSeason: Season): void {
    const seasonNumber = newSeason?.number ?? 0;
    this.infoSubscription?.unsubscribe();
    this.driversSubscription?.unsubscribe();
    this.standingsSubscription?.unsubscribe();
    this.selectedSeasonNumber.set(seasonNumber);
    this.title.setTitle(teamSeasonTitle(this.teamName, seasonNumber));
    this._getTeamsCache(seasonNumber);
    this.infoSubscription = this.teamApiService.getInfoTeamByName(this.teamName, seasonNumber).pipe(
      takeUntil(this.destroy$),
      catchError(error => this.utilsService.handleError<TeamInfo>(ERROR_TEAM_INFO_FETCH, error))
    ).subscribe(info => {
      this.teamInfo.set(info);
      this._mapTeamStats(info);
    });
    this.driversSubscription = this.driverApiService.getDriversByTeamName(this.teamName, seasonNumber).pipe(
      takeUntil(this.destroy$),
      switchMap(drivers => drivers.length
        ? this.resultApiService.getSpecificDriversPoints(seasonNumber, drivers.map(driver => driver.id))
        : of([])),
      catchError(error => this.utilsService.handleError<DriverPoints[]>(ERROR_DRIVER_FETCH, error, []))
    ).subscribe(drivers => this.drivers.set(drivers));
    if (seasonNumber) {
      this.standingsSubscription = this.teamApiService.getllTeamsWithDrivers(seasonNumber).pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      ).subscribe(standings => this.standings.set(standings));
    }
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { season: seasonNumber || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private _mapTeamStats(info: TeamInfo): void {
    this.teamStatsArray.set([
      { icon: 'pi pi-chart-bar', key: 'Puntos Totales', value: info.totalPoints },
      { icon: 'pi pi-trophy', key: 'Victorias', value: info.victories },
      { icon: 'pi pi-star', key: 'Podios', value: info.podiums },
      { icon: 'pi pi-flag', key: 'Poles', value: info.poles },
      { icon: 'pi pi-bolt', key: 'Vueltas Rápidas', value: info.fastlaps },
      { icon: 'pi pi-percentage', key: 'Posición Media', value: info.averagePosition.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { icon: 'pi pi-calendar', key: 'Carreras Terminadas', value: info.racesFinished },
      { icon: 'pi pi-exclamation-triangle', key: 'Penalizaciones', value: info.penalties },
      { icon: 'pi pi-chart-line', key: 'Mejor posición', value: info.bestPosition === 99 ? '–' : info.bestPosition },
      { icon: 'pi pi-shield', key: 'Constructores', value: info.constructors }
    ]);
  }

  protected driverInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    return (words.length > 1 ? words[0][0] + words.at(-1)![0] : name.slice(0, 2)).toUpperCase();
  }

  protected getBestPosition(results: Result[]): number | null {
    const position = this.utilsService.whichPositionIsBetter(results[0]?.position ?? null, results[1]?.position ?? null).positionNumber;
    return position === 99 ? null : position;
  }

  protected racePoints(results: Result[]): number {
    return this.utilsService.sumPoints(results[0]?.position ?? null, results[1]?.position ?? null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
