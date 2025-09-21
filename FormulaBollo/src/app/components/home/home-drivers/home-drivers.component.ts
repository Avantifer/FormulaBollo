import { Component, inject, signal, Signal, WritableSignal } from '@angular/core';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { catchError, finalize, tap } from 'rxjs';
import { Driver } from '../../../../shared/models/driver';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_DRIVER_FETCH } from '../../../constants';
import { SkeletonModule } from 'primeng/skeleton';
import { SkeletonItemsPipe } from '../../../../shared/pipes/skeletonItems.pipe';
import { toSignal } from '@angular/core/rxjs-interop';
import { CacheService } from '../../../../shared/services/cache.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { CommonModule } from '@angular/common';
import { Top3DriversComponent } from "./top3-drivers/top3-drivers.component";
import { Top10DriversComponent } from "./top10-drivers/top10-drivers.component";

@Component({
  selector: 'app-home-drivers',
  imports: [
    CommonModule,
    SkeletonModule,
    SkeletonItemsPipe,
    Top3DriversComponent,
    Top10DriversComponent
  ],
  templateUrl: './home-drivers.component.html',
  styleUrl: './home-drivers.component.scss'
})
export class HomeDriversComponent {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly cacheService: CacheService = inject(CacheService);

  protected drivers: WritableSignal<Driver[]> = signal([]);
  protected top3Drivers: Driver[] = [];
  protected top3DriverPoints: DriverPoints[] = [];

  protected driverPoints: Signal<DriverPoints[]> = toSignal(
   this.resultApiService.getAllDriverPoints(environment.seasonActual.number, 10).pipe(
      tap((driverPoints: DriverPoints[]) => {
        this.top3DriverPoints = this._extractTop3Drivers(driverPoints) as DriverPoints[];
      }),
      catchError((error) => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, [])),
      finalize(() => {        
        if (this.top3DriverPoints[0] === undefined) {
          this._getAllDrivers();
        }
      })
    ),
    { initialValue: [] }
  );

  ngOnInit(): void {
    this._getDriversCache();
  }

  private _getDriversCache(): void {
    const cache: Map<string, DriverPoints[] | Driver[]> = this.cacheService.loadCache();
    const cacheKeyDriverPoints: string = `allDriverPoints-${environment.seasonActual.number}-undefined`;
    const cacheKeyAllDriver: string = `allDrivers-${environment.seasonActual.number}`;

    if (cache.has(cacheKeyDriverPoints)) {
      this.top3DriverPoints = this._extractTop3Drivers(cache.get(cacheKeyDriverPoints) as DriverPoints[]) as DriverPoints[];
    }

    if (cache.has(cacheKeyAllDriver)) {
      this.top3Drivers = this._extractTop3Drivers(cache.get(cacheKeyAllDriver) as Driver[]) as Driver[];
    }
  }

  private _getAllDrivers(): void {  
    this.driverApiService.getAllDrivers(environment.seasonActual.number, 0, 10).pipe(
      tap((drivers: Driver[]) => {
        this.top3Drivers = this._extractTop3Drivers(drivers) as Driver[];
        this.drivers.set(drivers);
      }),
      catchError((error) => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, []))
    ).subscribe();
  }

  private _extractTop3Drivers(drivers: DriverPoints[] | Driver[]): DriverPoints[] | Driver[] {
    const top3 = drivers.slice(0, 3);
    [top3[0], top3[1]] = [top3[1], top3[0]];
    return top3;
  }
}
