import { Component, inject, signal, WritableSignal } from '@angular/core';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { Subscription, switchMap, of, tap } from 'rxjs';
import { Driver } from '../../../../shared/models/driver';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_DRIVER_FETCH } from '../../../constants';
import { SkeletonModule } from 'primeng/skeleton';
import { SkeletonItemsPipe } from '../../../../shared/pipes/skeletonItems.pipe';
import { UtilsService } from '../../../../shared/services/utils.service';

import { Top3DriversComponent } from "./top3-drivers/top3-drivers.component";
import { Top10DriversComponent } from "./top10-drivers/top10-drivers.component";

@Component({
  selector: 'app-home-drivers',
  imports: [
    SkeletonModule,
    SkeletonItemsPipe,
    Top3DriversComponent,
    Top10DriversComponent
],
  templateUrl: './home-drivers.component.html'
})
export class HomeDriversComponent {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  protected readonly utilsService: UtilsService = inject(UtilsService);

  protected drivers: WritableSignal<Driver[]> = signal([]);
  protected top3Drivers: Driver[] = [];
  protected top3DriverPoints: DriverPoints[] = [];

  protected readonly driverPoints = signal<DriverPoints[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  private loadSubscription?: Subscription;

  ngOnInit(): void {
    this.retry();
  }

  protected retry(): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.drivers.set([]);
    this.driverPoints.set([]);
    this.top3Drivers = [];
    this.top3DriverPoints = [];
    this.loadSubscription = this.resultApiService.getAllDriverPoints(environment.seasonActual.number, 10).pipe(
      tap(points => {
        this.driverPoints.set(points);
        this.top3DriverPoints = this._extractTop3Drivers(points) as DriverPoints[];
      }),
      switchMap(points => points.length ? of([] as Driver[]) : this.driverApiService.getAllDrivers(environment.seasonActual.number, 0, 10))
    ).subscribe({
      next: drivers => {
        this.top3Drivers = this._extractTop3Drivers(drivers) as Driver[];
        this.drivers.set(drivers);
        this.loading.set(false);
      },
      error: error => {
        this.loadError.set(true);
        this.loading.set(false);
        this.utilsService.handleError(ERROR_DRIVER_FETCH, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  private _extractTop3Drivers(drivers: DriverPoints[] | Driver[]): DriverPoints[] | Driver[] {
    const top3 = drivers.slice(0, 3);
    if (top3.length > 1) [top3[0], top3[1]] = [top3[1], top3[0]];
    return top3;
  }
}
