import { Component, inject, signal, WritableSignal } from '@angular/core';
import { SelectSeasonsComponent } from '../../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../../shared/models/season';
import { catchError, Subject, switchMap, takeUntil } from 'rxjs';
import { TeamInfo } from '../../../../shared/models/teamInfo';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { ERROR_DRIVER_FETCH, ERROR_TEAM_INFO_FETCH } from '../../../constants';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { CommonModule } from '@angular/common';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { Driver } from '../../../../shared/models/driver';
import { TableModule } from 'primeng/table';
import { Result } from '../../../../shared/models/result';
import { PopoverModule } from 'primeng/popover';
import { UtilsService } from '../../../../shared/services/utils.service';
import { CacheService } from '../../../../shared/services/cache.service';
import { ButtonModule } from 'primeng/button';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { DriverPoints } from '../../../../shared/models/driverPoints';

@Component({
  selector: 'app-teams-info',
  imports: [
    RouterModule,
    ButtonModule,
    CommonModule,
    TableModule,
    PopoverModule,
    SpaceToUnderscorePipe,
    SelectSeasonsComponent
  ],
  templateUrl: './teams-info.component.html',
  styleUrl: './teams-info.component.scss'
})
export class TeamsInfoComponent {
  protected readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  protected readonly imageService: ImageService = inject(ImageService);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly router: Router = inject(Router);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  protected teamName: string = this.activatedRoute.snapshot.paramMap.get("name")!.replaceAll("_", " ");
  protected teamInfo: WritableSignal<TeamInfo | undefined> = signal<TeamInfo | undefined>(undefined);
  protected teamStatsArray: WritableSignal<Array<{ icon: string, color: string, key: string, value: number | string | Driver[] }>> = signal([]);
  protected drivers: WritableSignal<DriverPoints[]> = signal<DriverPoints[]>([]);
  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnInit(): void {
    this._getTeamsCache()
  }  
  
  private _getTeamsCache(): void {
    const cache = this.cacheService.loadCache();
    const cacheKeyTeamInfo: string = `infoTeamByName-${this.teamName}-0`;
    const cacheKeyDriversTeamInfo: string = `driversByTeamName-${this.teamName}-0`;
    
    if (cache.has(cacheKeyTeamInfo)) {
      this.teamInfo.set(cache.get(cacheKeyTeamInfo));
      this._mapTeamStats(this.teamInfo()!);
    }

    if (cache.has(cacheKeyDriversTeamInfo)) {
      const driversTeamInfo: Driver[] = cache.get(cacheKeyDriversTeamInfo);
      const driverIds = driversTeamInfo.map((driver: Driver) => driver.id);

      const cacheKeyDriverPoints: string = `specificDriverPoints-0-${driverIds}`;

      if (cache.has(cacheKeyDriverPoints)) {
        this.drivers.set(cache.get(cacheKeyDriverPoints));
      }
    }
  }

  onSeasonChange(newSeason: Season): void {
    this._getDriversbyTeam(newSeason?.number);
    this._getInfoByTeamName(newSeason?.number);
  }

  private _mapTeamStats(teamInfo: TeamInfo): void {
    const stats = [
      { icon: 'pi pi-trophy', color: 'text-yellow-400', key: 'Victorias', value: teamInfo.victories },
      { icon: 'pi pi-flag', color: 'text-blue-400', key: 'Poles', value: teamInfo.poles },
      { icon: 'pi pi-star', color: 'text-yellow-400', key: 'Podios', value: teamInfo.podiums },
      { icon: 'pi pi-bolt', color: 'text-purple-400', key: 'Vueltas Rápidas', value: teamInfo.fastlaps },
      { icon: 'pi pi-percentage', color: 'text-red-400', key: 'Posición Media', value: teamInfo.averagePosition.toFixed(2) },
      { icon: 'pi pi-calendar', color: 'text-gray-400', key: 'Carreras Terminadas', value: teamInfo.racesFinished },
      { icon: 'pi pi-chart-bar', color: 'text-green-400', key: 'Puntos Totales', value: teamInfo.totalPoints },
      { icon: 'pi pi-exclamation-triangle', color: 'text-red-400', key: 'Penalizaciones', value: teamInfo.penalties },
      { icon: 'pi pi-chart-line', color: 'text-blue-400', key: 'Mejor posición', value: teamInfo.bestPosition },
      { icon: 'pi pi-shield', color: 'text-orange-400', key: 'Constructores', value: teamInfo.constructors }
    ];
  
    this.teamStatsArray.set(stats);
  }

  private _getInfoByTeamName(seasonNumber: number): void {
    this.teamApiService
      .getInfoTeamByName(this.teamName, seasonNumber)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError<TeamInfo>(ERROR_TEAM_INFO_FETCH, error))
      )
      .subscribe((teamInfo: TeamInfo) => { 
        this._mapTeamStats(teamInfo);
         this.teamInfo.set(teamInfo);
      });
  }

  private _getDriversbyTeam(seasonNumber: number): void {
    this.driverApiService
    .getDriversByTeamName(this.teamName, seasonNumber)
    .pipe(
      takeUntil(this.destroy$),
      switchMap((drivers: Driver[]) => {
        const driverIds = drivers.map(driver => driver.id);
        return this.resultApiService.getSpecificDriversPoints(seasonNumber, driverIds);
      }),
      catchError((error) => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, []))
    )
    .subscribe((drivers: DriverPoints[]) => this.drivers.set(drivers));
  }

  protected getBestPosition(results: Result[]): number | string {
    const validPositions = results
    .map(result => result.position?.positionNumber)
    .filter(position => position !== undefined && position !== null);

    if (validPositions.length === 0) {
      return 'N/A';
    }

    return Math.min(...validPositions);
  }

  protected hasDoublePodium(results: Result[]): string {
    const podiums = results
    .map(result => result.position?.positionNumber)
    .filter(position => position !== undefined && position !== null && position <= 3)
    .length;


    return podiums >= 2 ? 'Si' : 'No';
  }

  protected driverNameSpaceToUnderScore(driverName: string): string {
    return driverName.replaceAll(" ", "_");
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
