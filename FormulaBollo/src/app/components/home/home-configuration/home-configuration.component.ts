import { Component, inject, signal, Signal } from '@angular/core';
import { ConfigurationApiService } from '../../../../shared/services/api/configuration-api.service';
import { Configuration } from '../../../../shared/models/configuration';
import { catchError, finalize } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_CONFIGURATION_FETCH } from '../../../constants';
import { SkeletonModule } from 'primeng/skeleton';

import { ImageService } from '../../../../shared/services/image.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { UtilsService } from '../../../../shared/services/utils.service';
import { SkeletonItemsPipe } from '../../../../shared/pipes/skeletonItems.pipe';


@Component({
  selector: 'app-home-configuration',
  imports: [
    SkeletonItemsPipe,
    SkeletonModule
],
  templateUrl: './home-configuration.component.html'
})
export class HomeConfigurationComponent {
  private readonly configurationApiService: ConfigurationApiService = inject(ConfigurationApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly imageService: ImageService = inject(ImageService);
  protected readonly loading = signal(true);

  protected configurations: Signal<Configuration[]> = toSignal(
    this.configurationApiService.getAllConfigurations(environment.seasonActual.number)
    .pipe(
      catchError((error) => this.utilsService.handleError(ERROR_CONFIGURATION_FETCH, error, [])),
      finalize(() => this.loading.set(false))
    ),
    { initialValue: [] }
  );
}
