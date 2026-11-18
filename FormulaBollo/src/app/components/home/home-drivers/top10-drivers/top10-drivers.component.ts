import { ChangeDetectionStrategy, Component, effect, inject, input, InputSignal } from '@angular/core';
import { Driver } from '../../../../../shared/models/driver';
import { DriverPoints } from '../../../../../shared/models/driverPoints';
import { RouterLink } from '@angular/router';
import { UtilsService } from '../../../../../shared/services/utils.service';
import { SpaceToUnderscorePipe } from '../../../../../shared/pipes/spaceToUnderscore.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-top10-drivers',
  imports: [
    SpaceToUnderscorePipe,
    RouterLink
  ],
  templateUrl: './top10-drivers.component.html'
})
export class Top10DriversComponent {
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
