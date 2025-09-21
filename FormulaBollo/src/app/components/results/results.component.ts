import { ChangeDetectorRef, Component, inject, signal, ViewChild, WritableSignal } from '@angular/core';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../shared/models/season';
import { Race } from '../../../shared/models/race';
import { environment } from '../../../enviroments/enviroment';
import { SelectRacesComponent } from '../../../shared/components/select-races/select-races.component';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Result } from '../../../shared/models/result';
import { ResultTeam } from '../../../shared/models/resultTeam';
import { ResultApiService } from '../../../shared/services/api/result-api.service';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { MessageInfoService } from '../../../shared/services/toastInfo.service';
import { ERROR_PENALTY_FETCH, ERROR_RESULT_FETCH } from '../../constants';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { SpaceToUnderscorePipe } from '../../../shared/pipes/spaceToUnderscore.pipe';
import { ImageService } from '../../../shared/services/image.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { PenaltiesApiService } from '../../../shared/services/api/penalties-api.service';
import { Penalty } from '../../../shared/models/penalty';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-results',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RouterModule,
    TableModule,
    DividerModule,
    ChipModule,
    SelectButtonModule,
    SpaceToUnderscorePipe,
    SelectSeasonsComponent,
    SelectRacesComponent
  ],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent  {
  @ViewChild(SelectRacesComponent) selectRacesComponent!: SelectRacesComponent;
  @ViewChild(SelectSeasonsComponent) selectSeasonComponent!: SelectSeasonsComponent;

  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  private readonly penaltiesApiService: PenaltiesApiService = inject(PenaltiesApiService);
  private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  protected readonly imageService: ImageService = inject(ImageService);
  protected readonly utilsService: UtilsService = inject(UtilsService);

  protected seasonSelected: Season = environment.seasonActual;
  protected raceSelected?: Race;
  protected raceName: string = this.activatedRoute.snapshot.paramMap.get("name")!.replaceAll("_", " ");
  protected typeSelected: string = 'Pilotos';
  protected readonly listOptions: any[] = [
    { icon: 'pi pi-user', value: 'Pilotos' },
    { icon: 'pi pi-car', value: 'Equipos' }
  ];
  protected showPenalties: boolean = false;
  
  protected penalties: WritableSignal<Penalty[]> = signal<Penalty[]>([]);
  protected resultsDrivers: WritableSignal<Result[]> = signal<Result[]>([]);
  protected resultsTeams: WritableSignal<ResultTeam[]> = signal<ResultTeam[]>([]);
  private readonly destroy$: Subject<void> = new Subject<void>();

  ngAfterViewInit(): void {
    const seasonParam = parseInt(this.activatedRoute.snapshot.paramMap.get("season")!);
    const selectedSeason = this.selectSeasonComponent.seasons.find(
      (s: Season) => s.number === seasonParam
    );

    if (this.selectSeasonComponent.seasonForm.get('season')?.value != undefined && selectedSeason) {
      this.selectSeasonComponent.seasonForm.get('season')?.setValue(selectedSeason);
    } else {
      const seasonPreload: Season = new Season(seasonParam, "Temporada " + seasonParam, seasonParam);
      this.selectSeasonComponent.seasonForm.get('season')?.setValue(seasonPreload);
    }

    this.cdr.detectChanges();
    
    this.selectRacesComponent.racesForm.get('race')?.setValue(
      this.selectRacesComponent.races.find(
        (race: Race) => race.name === this.activatedRoute.snapshot.paramMap.get("name")!.replaceAll("_", " ")
      )
    );
  }

  onTypeChange(): void {
    this.getResults();
  }

  onSeasonChange(newSeason: Season): void {
    this.seasonSelected = newSeason;
  }

  onRaceChange(newRace: Race): void {
    this.raceSelected = newRace;
    this.getResults();
  }

  getResults(): void {
    this.resultsDrivers.set([]);
    this.resultsTeams.set([]);

    if (this.seasonSelected && this.raceSelected) {
      if (this.typeSelected === "Pilotos") {
        this.getResultsDrivers();
      } else if (this.typeSelected === "Equipos") {
        this.getResultsTeams();
      }

      this.getPenalties();
    }
  }

  private getResultsDrivers(): void {
    this.resultApiService
      .getAllResultsPerRacePilots(this.raceSelected!.id)
      .pipe(
        catchError((error) => {
          this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
          console.error(error);
          return of([]);
        })
      )
      .subscribe((results) => this.resultsDrivers.set(results));
  }

  private getResultsTeams(): void {
    this.resultApiService
      .getAllResultsPerRaceTeams(this.raceSelected!.id)
      .pipe(
        catchError((error) => {
          this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
          console.error(error);
          return of([]);
        })
      )
      .subscribe((results) => this.resultsTeams.set(results));
  }

  getPenalties(): void {
    this.penaltiesApiService.getPenaltiesByRace(this.raceSelected!.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(ERROR_PENALTY_FETCH, error);
          console.error(error);
          return of([]);
      })
    ).subscribe((penalties: Penalty[]) => this.penalties.set(penalties));
  }
}
