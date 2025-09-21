import { UtilsService } from './../../../../../shared/services/utils.service';
import { Component, effect, inject, input, InputSignal } from '@angular/core';
import { DriverPoints } from '../../../../../shared/models/driverPoints';
import { Driver } from '../../../../../shared/models/driver';
import { CommonModule } from '@angular/common';
import { SpaceToUnderscorePipe } from '../../../../../shared/pipes/spaceToUnderscore.pipe';
import { ImageService } from '../../../../../shared/services/image.service';

@Component({
  selector: 'app-top3-drivers',
  imports: [
    CommonModule,
    SpaceToUnderscorePipe
  ],
  templateUrl: './top3-drivers.component.html',
  styleUrls: ['./top3-drivers.component.scss']
})
export class Top3DriversComponent {
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly imageService: ImageService = inject(ImageService);
  
  readonly top3: InputSignal<Driver[] | DriverPoints[]> = input<Driver[] | DriverPoints[]>([]);  
  protected displayTop3: DriverPoints[] = [];

  constructor() {
    effect(() => {
      this.prepareDisplayDrivers();
    });
  }

  private prepareDisplayDrivers(): void {
    this.displayTop3 = this.top3().map((driver: Driver | DriverPoints) => {
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
