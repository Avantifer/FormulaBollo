import { UtilsService } from '../../../../shared/services/utils.service';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { SelectSeasonsComponent } from "../../../../shared/components/select-seasons/select-seasons.component";
import { Season } from '../../../../shared/models/season';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { catchError, Subject, takeUntil } from 'rxjs';
import { DriverInfo } from '../../../../shared/models/driverInfo';
import { ERROR_DRIVER_INFO_FETCH } from '../../../constants';
import { CommonModule, DatePipe } from '@angular/common';
import { ImageService } from '../../../../shared/services/image.service';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { TableModule } from 'primeng/table';
import { CacheService } from '../../../../shared/services/cache.service';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-drivers-info',
  imports: [
    ButtonModule,
    RouterModule,
    CommonModule,
    TableModule,
    SpaceToUnderscorePipe,
    DatePipe,
    SelectSeasonsComponent
  ],
  templateUrl: './drivers-info.component.html',
  styleUrl: './drivers-info.component.scss'
})
export class DriversInfoComponent {
  protected readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly imageService: ImageService = inject(ImageService);
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly cacheService: CacheService = inject(CacheService);
  protected readonly router: Router = inject(Router);

  protected readonly driverName: string = this.activatedRoute.snapshot.paramMap.get("name")!.replaceAll("_", " ");
  protected driverInfo: WritableSignal<DriverInfo | undefined> = signal<DriverInfo | undefined>(undefined);
  protected driverStatsArray: WritableSignal<Array<{ icon: string, color: string, key: string, value: number | string }>> = signal([]);
  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnInit(): void {
    this._getDriversCache();
  }
  
  private _getDriversCache(): void {
    const cache: Map<string, DriverInfo> = this.cacheService.loadCache();
    const cacheKeyDriverInfo: string =`infoByDriverName-${this.driverName}-0`;
    
    if (cache.has(cacheKeyDriverInfo)) {
      this.driverInfo.set(cache.get(cacheKeyDriverInfo));
      this._mapDriverStats(this.driverInfo()!);
    }    
  }

  protected onSeasonChange(newSeason: Season): void {
    this._getInfoByDriverName(newSeason.number);
  }

  private _getInfoByDriverName(seasonNumber: number): void {
    this.driverApiService
      .getInfoByDriverName(this.driverName, seasonNumber)
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
      { icon: 'pi pi-trophy', color: 'text-yellow-400', key: 'Victorias', value: driverInfo.victories },
      { icon: 'pi pi-flag', color: 'text-blue-400', key: 'Poles', value: driverInfo.poles },
      { icon: 'pi pi-star', color: 'text-yellow-400', key: 'Podios', value: driverInfo.podiums },
      { icon: 'pi pi-bolt', color: 'text-purple-400', key: 'Vueltas Rápidas', value: driverInfo.fastlaps },
      { icon: 'pi pi-percentage', color: 'text-red-400', key: 'Posición Media', value: driverInfo.averagePosition.toFixed(2) },
      { icon: 'pi pi-calendar', color: 'text-gray-400', key: 'Carreras Terminadas', value: driverInfo.racesFinished },
      { icon: 'pi pi-chart-bar', color: 'text-green-400', key: 'Puntos Totales', value: driverInfo.totalPoints },
      { icon: 'pi pi-exclamation-triangle', color: 'text-red-400', key: 'Penalizaciones', value: driverInfo.penalties },
      { icon: 'pi pi-chart-line', color: 'text-blue-400', key: 'Mejor posición', value: driverInfo.bestPosition },
      { icon: 'pi pi-shield', color: 'text-orange-400', key: 'Campeonatos', value: driverInfo.championships }
    ];
  
    this.driverStatsArray.set(stats);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
