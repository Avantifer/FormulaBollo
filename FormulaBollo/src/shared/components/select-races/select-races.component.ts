import { UtilsService } from './../../services/utils.service';
import { Component, EventEmitter, inject, input, Output, InputSignal, effect, Input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Race } from '../../models/race';
import { RaceApiService } from '../../services/api/race-api.service';
import { ERROR_RACE_FETCH } from '../../../app/constants';
import { Season } from '../../models/season';
import { MessageInfoService } from '../../services/toastInfo.service';
import { environment } from '../../../enviroments/enviroment';
import { catchError } from 'rxjs';

@Component({
    selector: 'select-races',
    imports: [ReactiveFormsModule, SelectModule],
    templateUrl: './select-races.component.html',
    styleUrl: './select-races.component.scss'
})
export class SelectRacesComponent {
  private readonly raceService: RaceApiService = inject(RaceApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  @Output() raceChanged = new EventEmitter<Race>();
  
  @Input() fantasy: boolean = false;
  @Input() fantasyTeam: boolean = false;

  readonly season: InputSignal<Season> = input(environment.seasonActual);
  public races: Race[] = [];
  public racesForm: FormGroup = new FormGroup({
    race: new FormControl()
  });

  constructor() {
    effect(() => {
      const currentSeason = this.season();

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
    this.racesForm.get('race')?.valueChanges
      .subscribe((newRace) => {
        this.raceChanged.emit(newRace);
      });
  }

  racesFinishedAndActual(): void {
    this.raceService
      .getAllRacesFinishedAndActual(this.season().number)
      .pipe(
        catchError((error) => {
          return this.utilsService.handleError<Race[]>(ERROR_RACE_FETCH, error)
        })
      )
      .subscribe((races: Race[]) => {
        this.races = races;
        console.log()
        this.racesForm.get('race')?.setValue(this.races[this.races.length - 1]);
      });
  }

  obtainAllRaces(): void {
    this.raceService
    .getAllRaces(this.season().number)
    .pipe(
      catchError((error) => {
        return this.utilsService.handleError<Race[]>(ERROR_RACE_FETCH, error)
      })
    )
    .subscribe((races: Race[]) => {
        this.races = races;
        const findRace: Race | undefined = this.races.find((race: Race) => race.name === this.racesForm.get('race')?.value?.name);
        
        if (this.racesForm.get('race')?.value?.name && !findRace) {
          this.racesForm.get('race')?.setValue(this.races[0]);
        } else if (findRace) {
          this.racesForm.get('race')?.setValue(findRace);
        } else if (this.fantasy) {
          const raceOfTotal: Race = new Race(0, "Total", "", "", new Date(), new Season(0, "", 0), 0);
          this.racesForm.get('race')?.setValue(raceOfTotal);
          this.races = [raceOfTotal, ...races];
          this.raceChanged.emit(raceOfTotal);
        } else {
          this.racesForm.get('race')?.setValue(this.races[0]);
        }
      }); 
  }
}
