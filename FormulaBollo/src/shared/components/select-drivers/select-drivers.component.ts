import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, effect, EventEmitter, inject, Input, input, InputSignal, Output } from '@angular/core';
import { DriverApiService } from '../../services/api/driver-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { Driver } from '../../models/driver';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Season } from '../../models/season';
import { environment } from '../../../enviroments/enviroment';
import { ERROR_DRIVER_FETCH } from '../../../app/constants';
import { SpaceToUnderscorePipe } from '../../pipes/spaceToUnderscore.pipe';

@Component({
  selector: 'select-drivers',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    SpaceToUnderscorePipe
  ],
  templateUrl: './select-drivers.component.html',
  styleUrls: ['./select-drivers.component.scss']
})
export class SelectDriversComponent {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  @Output() driverChanged = new EventEmitter<Driver>();
  @Input() position?: number;
  private _driverId?: number;

  @Input()
  set driverId(value: number | undefined) {
    this._driverId = value;

    if (this.drivers.length && value !== undefined) {
      const selected = this.drivers.find(driver => driver.id === value);
      this.driversForm.get('driver')?.setValue(selected ?? null, { emitEvent: false });
    }
  }

  get driverId(): number | undefined {
    return this._driverId;
  }

  readonly season: InputSignal<Season> = input(environment.seasonActual);
  private previousSeasonSelected?: Season;
  public drivers: Driver[] = [];
  public driversForm: FormGroup = new FormGroup({
    driver: new FormControl()
  });


  constructor() {
    effect(() => {
      const currentSeason = this.season();

      if (currentSeason && currentSeason !== this.previousSeasonSelected) {
        this.obtainAllDrivers();
      }

      this.previousSeasonSelected = currentSeason;
    });
  }

  ngOnInit(): void {
    this.changeDriverListener();
  }

  changeDriverListener(): void {
    this.driversForm.get('driver')?.valueChanges
      .subscribe((newDriver) => {
        this.driverChanged.emit(newDriver);
      });
  }

  obtainAllDrivers(): void {
    this.driverApiService
    .getAllDrivers(this.season().number)
    .subscribe({
      next: (drivers: Driver[]) => {
          this.drivers = drivers;
          
          if (this.position != undefined) {
            this.driversForm.get('driver')?.setValue(drivers[this.position]);
          } else if (this.driverId != undefined) {
            this.driversForm.get('driver')?.setValue(drivers.filter((driver: Driver) => driver.id === this.driverId)[0]);
          } else {
            this.driversForm.get('driver')?.reset();
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.messageInfoService.showError(ERROR_DRIVER_FETCH, error);
          console.log(error);
          throw error;
        }
      }); 
  }
}
