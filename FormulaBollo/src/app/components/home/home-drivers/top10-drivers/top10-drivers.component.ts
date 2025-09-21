import { Component, effect, inject, input, InputSignal } from '@angular/core';
import { Driver } from '../../../../../shared/models/driver';
import { DriverPoints } from '../../../../../shared/models/driverPoints';
import { Router, RouterModule } from '@angular/router';
import { UtilsService } from '../../../../../shared/services/utils.service';
import { SpaceToUnderscorePipe } from '../../../../../shared/pipes/spaceToUnderscore.pipe';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-top10-drivers',
  imports: [
    SpaceToUnderscorePipe,
    ChipModule,
    RouterModule
  ],
  templateUrl: './top10-drivers.component.html',
  styleUrls: ['./top10-drivers.component.scss']
})
export class Top10DriversComponent {
  protected router: Router = inject(Router);
  protected utilsService: UtilsService = inject(UtilsService);

  readonly top10: InputSignal<Driver[] | DriverPoints[]> = input<Driver[] | DriverPoints[]>([]);  
  protected displayTop10: DriverPoints[] = [];

  constructor() {
    effect(() => {
      this.prepareDisplayDrivers();
    });
  }

  private prepareDisplayDrivers(): void {
    this.displayTop10 = this.top10().map((driver: Driver | DriverPoints) => {
      if ((driver as DriverPoints).totalPoints !== undefined) {
        return driver as DriverPoints;
      }

      return {
        driver: driver as Driver,
        totalPoints: 0,
        positionChange: "SAME",
        positionChangeAmount: 0
      };
    });
  }

}
