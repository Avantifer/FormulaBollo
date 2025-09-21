import { toSignal } from '@angular/core/rxjs-interop';
import { DriverApiService } from './../../../../shared/services/api/driver-api.service';
import { Component, inject, Signal } from '@angular/core';
import { catchError } from 'rxjs';
import { Record } from '../../../../shared/models/record';
import { UtilsService } from '../../../../shared/services/utils.service';
import { ERROR_RECORDS_NOT_FOUND } from '../../../constants';
import { Router } from '@angular/router';
import { ImageService } from '../../../../shared/services/image.service';

@Component({
  selector: 'app-records',
  templateUrl: './records.component.html',
  styleUrls: ['./records.component.scss']
})
export class RecordsComponent  {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly router: Router = inject(Router);
  protected readonly imageService: ImageService = inject(ImageService);

  protected readonly records: Signal<Record[]> = toSignal( 
    this.driverApiService.getRecordsDrivers()
    .pipe(
      catchError((error) => this.utilsService.handleError(ERROR_RECORDS_NOT_FOUND, error, []))
    ),
    { initialValue: [] }
  );
  
}
