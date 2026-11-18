import { Subscription } from 'rxjs';
import { Component, EventEmitter, inject, Input, Output, SimpleChanges, signal, WritableSignal } from '@angular/core';
import { Season } from '../../models/season';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../enviroments/enviroment';
import { SelectModule } from 'primeng/select';
import { SeasonApiService } from '../../services/api/season-api.service';
import { Router } from '@angular/router';
import { MessageInfoService } from '../../services/toastInfo.service';
import { ERROR_DRIVER_NAME_NOT_FOUND, ERROR_TEAM_NAME_NOT_FOUND } from '../../../app/constants';

@Component({
    selector: 'select-seasons',
    imports: [ReactiveFormsModule, SelectModule],
    templateUrl: './select-seasons.component.html'
})
export class SelectSeasonsComponent {
  private readonly seasonApiService: SeasonApiService = inject(SeasonApiService);
  private readonly router: Router = inject(Router);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  @Output() seasonChanged = new EventEmitter<Season>();
  @Input() driverName!: string;
  @Input() teamName!: string;
  @Input() statistics!: string;
  @Input() fantasy: boolean = false; 

  public readonly seasons: WritableSignal<Season[]> = signal<Season[]>([]);

  public seasonForm: FormGroup = new FormGroup({
    season: new FormControl(environment.seasonActual),
  });

  private initialized = false;
  private loadSubscription?: Subscription;
  private selectionSubscription?: Subscription;

  ngOnInit(): void {
    this.initialized = true;
    this.selectionSubscription = this.seasonForm.get('season')!.valueChanges.subscribe(season => {
      if (season) this.seasonChanged.emit(season);
    });
    this.loadSeasons();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.initialized) this.loadSeasons();
  }

  private loadSeasons(): void {
    this.loadSubscription?.unsubscribe();
    const includeTotal = !!this.driverName || !!this.teamName || this.statistics === 'general';
    const request = this.driverName
      ? this.seasonApiService.getSeasonByDriverName(this.driverName)
      : this.teamName
        ? this.seasonApiService.getSeasonByTeamName(this.teamName)
        : this.fantasy
          ? this.seasonApiService.getSeasonOfFantasy()
          : this.seasonApiService.getSeasons();

    this.loadSubscription = request.subscribe({
      next: seasons => {
        const options = includeTotal ? [new Season(0, 'Total', 0), ...seasons] : seasons;
        this.seasons.set(options);
        const selection = includeTotal ? options[0] : options.at(-1);
        this.seasonForm.get('season')!.setValue(selection ?? null, { emitEvent: false });
        if (selection) this.seasonChanged.emit(selection);
        if (!seasons.length && (this.driverName || this.teamName)) {
          void this.router.navigate([this.driverName ? '/drivers' : '/teams']);
          this.messageInfoService.showError(this.driverName ? ERROR_DRIVER_NAME_NOT_FOUND : ERROR_TEAM_NAME_NOT_FOUND, '');
        }
      },
      error: error => this.messageInfoService.showError('No se pudieron cargar las temporadas', error)
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    this.selectionSubscription?.unsubscribe();
  }
}
