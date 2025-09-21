import { DriverPoints } from './../../../../shared/models/driverPoints';
import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { Driver } from '../../../../shared/models/driver';
import { Router } from '@angular/router';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';

@Component({
  selector: 'app-driver-card',
  imports: [CommonModule, SpaceToUnderscorePipe],
  templateUrl: './driver-card.component.html',
  styleUrl: './driver-card.component.scss'
})
export class DriverCardComponent {
  protected readonly router: Router = inject(Router);
  protected readonly imageService: ImageService = inject(ImageService);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  
  @Input() index!: number;
  @Input() driverPoint!: Driver | DriverPoints;
  protected driverShow!: DriverPoints;

  ngOnInit(): void {
    this.prepareDisplayDrivers();
  }

  private prepareDisplayDrivers(): void {
    if ((this.driverPoint as DriverPoints).totalPoints !== undefined) {
      this.driverShow = (this.driverPoint as DriverPoints);
    } else {
      this.driverShow = {
        driver: this.driverPoint as Driver,
        positionChange: "SAME",
        positionChangeAmount: 0,
        totalPoints: 0
      } 
    }
  }
}
