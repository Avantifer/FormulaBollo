import { CacheService } from '../../../../shared/services/cache.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { SelectSeasonsComponent } from "../../../../shared/components/select-seasons/select-seasons.component";
import { Season } from '../../../../shared/models/season';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { catchError, distinctUntilChanged, map, of, Subject, Subscription, takeUntil } from 'rxjs';
import { DriverInfo } from '../../../../shared/models/driverInfo';
import { ERROR_DRIVER_INFO_FETCH } from '../../../constants';
import { RaceDatePipe } from '../../../../shared/pipes/raceDate.pipe';
import { Title } from '@angular/platform-browser';
import { driverSeasonTitle } from '../../../../shared/services/page-title.strategy';
import { ImageService } from '../../../../shared/services/image.service';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { DriverTeamHistoryEntry } from '../../../../shared/models/driverTeamHistoryEntry';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { Result } from '../../../../shared/models/result';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { driverPosition, isVacantDriver } from '../drivers-ranking/drivers-ranking.component';


@Component({
  selector: 'app-drivers-info',
  imports: [
    RouterModule,
    SpaceToUnderscorePipe,
    RaceDatePipe,
    SelectSeasonsComponent
  ],
  templateUrl: './drivers-info.component.html',
  styleUrl: './drivers-info.component.scss'
})
export class DriversInfoComponent {
  private readonly cache = inject(CacheService);
  private readonly title = inject(Title);
  protected readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly imageService: ImageService = inject(ImageService);
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly resultApiService = inject(ResultApiService);
  protected readonly router: Router = inject(Router);

  protected driverName: string = this.activatedRoute.snapshot.paramMap.get("name")!.replaceAll("_", " ");
  protected initialSeasonNumber?: number;
  protected readonly selectedSeasonNumber = signal(0);
  protected readonly photoFailed = signal(false);
  protected driverInfo: WritableSignal<DriverInfo | undefined> = signal<DriverInfo | undefined>(undefined);
  private readonly teamHistory = signal<DriverTeamHistoryEntry[]>([]);
  private readonly standings = signal<DriverPoints[]>([]);
  protected readonly headerTeams = computed(() => {
    const currentTeam = this.driverInfo()?.driver.team;
    const season = this.selectedSeasonNumber();
    const history = this.teamHistory().filter(entry => season === 0 || entry.season.number === season);
    if (!history.length) return currentTeam ? [currentTeam] : [];
    return history.filter((entry, index) => index === 0 || entry.team.name !== history[index - 1].team.name)
      .map(entry => entry.team);
  });
  protected readonly effectiveTeam = computed(() => {
    const history = this.teamHistory();
    const season = this.selectedSeasonNumber() || Math.max(0, ...history.map(entry => entry.season.number));
    const principal = history.find(entry => entry.season.number === season);
    return principal?.team ?? this.driverInfo()?.driver.team;
  });
  protected readonly championshipPosition = computed(() => {
    const driver = this.driverInfo()?.driver;
    const standings = this.standings().filter(point => !isVacantDriver(point.driver));
    if (!this.selectedSeasonNumber() || !driver || !standings.some(point => point.totalPoints > 0)) return undefined;
    const point = standings.find(point => point.driver.id === driver.id || point.driver.name === driver.name);
    return point ? {
      position: driverPosition(point, standings),
      total: standings.length,
      tied: standings.filter(other => other.totalPoints === point.totalPoints).length > 1
    } : undefined;
  });
  protected driverStatsArray: WritableSignal<Array<{ icon: string, color: string, key: string, value: number | string }>> = signal([]);
  private readonly destroy$: Subject<void> = new Subject<void>();
  private infoSubscription?: Subscription;
  private historySubscription?: Subscription;
  private standingsSubscription?: Subscription;

  ngOnInit(): void {
    this.activatedRoute.params.pipe(
      map(params => params['name'].replaceAll('_', ' ') as string),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(name => {
      this.infoSubscription?.unsubscribe();
      this.resetSeasonDetails();
      this.driverName = name;
      const season = this.activatedRoute.snapshot.queryParamMap?.get('season');
      const number = season && /^\d+$/.test(season) ? Number(season) : NaN;
      this.initialSeasonNumber = Number.isSafeInteger(number) ? number : undefined;
      this.selectedSeasonNumber.set(this.initialSeasonNumber ?? 0);
      this.driverInfo.set(undefined);
    });
  }
  
  protected onSeasonChange(newSeason: Season): void {
    const seasonNumber = newSeason?.number ?? 0;
    this.selectedSeasonNumber.set(seasonNumber);
    this.title.setTitle(driverSeasonTitle(this.driverName, seasonNumber));
    this.resetSeasonDetails(false);
    this._getInfoByDriverName(seasonNumber);
    this.historySubscription = this.cache.refreshOnPublish(() => this.driverApiService.getTeamHistoryByDriverName(this.driverName)).pipe(
      takeUntil(this.destroy$),
      catchError(error => this.utilsService.handleError<DriverTeamHistoryEntry[]>('No se pudo cargar el recorrido de equipos', error, []))
    ).subscribe(history => this.teamHistory.set(history));
    if (seasonNumber !== 0) {
      this.standingsSubscription = this.cache.refreshOnPublish(() => this.resultApiService.getAllDriverPoints(seasonNumber)).pipe(
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

  private resetSeasonDetails(clearHistory = true): void {
    this.historySubscription?.unsubscribe();
    this.standingsSubscription?.unsubscribe();
    if (clearHistory) this.teamHistory.set([]);
    this.standings.set([]);
  }

  private _getInfoByDriverName(seasonNumber: number): void {
    this.infoSubscription?.unsubscribe();
    this.infoSubscription = this.cache.refreshOnPublish(() => this.driverApiService.getInfoByDriverName(this.driverName, seasonNumber))
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError<DriverInfo>(ERROR_DRIVER_INFO_FETCH, error))
      )
      .subscribe((driverInfo: DriverInfo) => { 
        this.driverInfo.set(driverInfo)
        this._mapDriverStats(driverInfo);
      });
  }

  private _mapDriverStats(driverInfo: DriverInfo): void {
    const stats = [
      { icon: 'pi pi-chart-bar', color: 'text-ink-soft', key: 'Puntos Totales', value: driverInfo.totalPoints },
      { icon: 'pi pi-trophy', color: 'text-ink-soft', key: 'Victorias', value: driverInfo.victories },
      { icon: 'pi pi-star', color: 'text-ink-soft', key: 'Podios', value: driverInfo.podiums },
      { icon: 'pi pi-flag', color: 'text-ink-soft', key: 'Poles', value: driverInfo.poles },
      { icon: 'pi pi-bolt', color: 'text-ink-soft', key: 'Vueltas Rápidas', value: driverInfo.fastlaps },
      { icon: 'pi pi-percentage', color: 'text-ink-soft', key: 'Posición Media', value: driverInfo.averagePosition.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { icon: 'pi pi-calendar', color: 'text-ink-soft', key: 'Carreras Terminadas', value: driverInfo.racesFinished },
      { icon: 'pi pi-exclamation-triangle', color: 'text-ink-soft', key: 'Penalizaciones', value: driverInfo.penalties },
      { icon: 'pi pi-chart-line', color: 'text-ink-soft', key: 'Mejor posición', value: driverInfo.bestPosition },
      { icon: 'pi pi-shield', color: 'text-ink-soft', key: 'Campeonatos', value: driverInfo.championships }
    ];
  
    this.driverStatsArray.set(stats);
    this.photoFailed.set(false);
  }

  protected racePoints(result: Result): number {
    return (result.position?.points ?? 0) + (result.fastlap ?? 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
