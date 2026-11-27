import { CacheService } from '../../services/cache.service';
import { UtilsService } from './../../services/utils.service';
import { Component, EventEmitter, inject, input, Output, InputSignal, effect, Input, signal, WritableSignal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Race } from '../../models/race';
import { RaceApiService } from '../../services/api/race-api.service';
import { ERROR_RACE_FETCH } from '../../../app/constants';
import { Season } from '../../models/season';
import { MessageInfoService } from '../../services/toastInfo.service';
import { environment } from '../../../enviroments/enviroment';
import { catchError, Subscription } from 'rxjs';

@Component({
    selector: 'select-races',
    imports: [ReactiveFormsModule, SelectModule],
    templateUrl: './select-races.component.html'
})
export class SelectRacesComponent {
  private readonly cache = inject(CacheService);
  private readonly raceService: RaceApiService = inject(RaceApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  @Output() raceChanged = new EventEmitter<Race>();
  
  @Input() fantasy: boolean = false;
  @Input() fantasyTeam: boolean = false;

  readonly refreshOnPublish = input(true);
  private loadSubscription?: Subscription;
  private selectionSubscription?: Subscription;

  readonly season: InputSignal<Season> = input(environment.seasonActual);
  readonly raceOptions = input<Race[] | undefined>();
  readonly labelId = input<string>();
  public readonly races: WritableSignal<Race[]> = signal<Race[]>([]);
  public racesForm: FormGroup = new FormGroup({
    race: new FormControl()
  });

  constructor() {
    effect(onCleanup => {
      onCleanup(() => this.loadSubscription?.unsubscribe());
      const currentSeason = this.season();
      const options = this.raceOptions();
      this.refreshOnPublish();

      if (options !== undefined) {
        this.setRaceOptions(options);
        return;
      }

      if (currentSeason && !this.fantasyTeam) {
        this.obtainAllRaces();
      } else if (currentSeason && this.fantasyTeam) {
        this.racesFinishedAndActual();
      }
    });
  }

  ngOnInit(): void {
    this.changeRaceListener();
  }

  changeRaceListener(): void {
    this.selectionSubscription = this.racesForm.get('race')?.valueChanges
      .subscribe((newRace) => {
        this.raceChanged.emit(newRace);
      });
  }

  racesFinishedAndActual(): void {
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.raceService.getAllRacesFinishedAndActual(this.season().number)
      .pipe(
        catchError((error) => {
          return this.utilsService.handleError<Race[]>(ERROR_RACE_FETCH, error)
        })
      )
      .subscribe((races: Race[]) => {
        this.races.set(races);
        if (races.length > 0) {
          this.racesForm.get('race')?.setValue(races[races.length - 1]);
        }
      });
  }

  obtainAllRaces(): void {
    this.loadSubscription?.unsubscribe();
    const season = this.season().number;
    const request = () => this.raceService.getAllRaces(season);
    this.loadSubscription = (this.refreshOnPublish() ? this.cache.refreshOnPublish(request) : request())
    .pipe(
      catchError((error) => {
        return this.utilsService.handleError<Race[]>(ERROR_RACE_FETCH, error)
      })
    )
    .subscribe((races: Race[]) => {
        this.setRaceOptions(races);
      }); 
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    this.selectionSubscription?.unsubscribe();
  }

  private setRaceOptions(races: Race[]): void {
    const total = new Race(0, 'Total', '', '', new Date(), this.season(), 0);
    const options = this.fantasy ? [total, ...races.filter(race => race.id !== 0)] : races;
    this.races.set(options);
    const current = this.racesForm.get('race')?.value as Race | undefined;
    const selected = options.find(race => race.id === current?.id)
      ?? options.find(race => race.name === current?.name) ?? options[0];
    untracked(() => this.racesForm.get('race')?.setValue(selected, { emitEvent: current === null || selected?.id !== current?.id }));
  }
}
