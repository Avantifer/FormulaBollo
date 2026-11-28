import { Position } from './../../../../shared/models/position';
import { ChangeDetectionStrategy, Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { Season } from '../../../../shared/models/season';
import { environment } from '../../../../enviroments/enviroment';
import { DatePicker } from 'primeng/datepicker';

import { Race } from '../../../../shared/models/race';
import { RaceDate, serializeRaceDate } from '../../../../shared/helpers/race-time';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectDriversComponent } from '../../../../shared/components/select-drivers/select-drivers.component';
import { Driver } from '../../../../shared/models/driver';
import { ButtonModule } from 'primeng/button';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { Result } from '../../../../shared/models/result';
import { catchError, defer, EMPTY, finalize, lastValueFrom, map, Observable, retry, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { ERROR_DRIVER_FETCH, ERROR_RESULT_FETCH } from '../../../constants';
import { DividerModule } from 'primeng/divider';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { Router } from '@angular/router';
import { SprintApiService } from '../../../../shared/services/api/sprint-api.service';
import { Sprint } from '../../../../shared/models/sprint';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-admin-results',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePicker,
    SelectRacesComponent,
    SelectDriversComponent,
    DividerModule,
    DialogModule,
    ButtonModule
],
  templateUrl: './admin-results.component.html',
  styleUrl: './admin-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminResultsComponent {

  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  private readonly router: Router = inject(Router);
  private readonly sprintApiService: SprintApiService = inject(SprintApiService);
  private readonly raceApiService: RaceApiService = inject(RaceApiService);
  
  actualSeason: Season = environment.seasonActual;
  private pickerDate: Date | undefined;
  // Keep the loaded text separate: a local Date normalizes nonexistent browser times.
  private raceDateToSave: RaceDate | undefined;
  get raceDate(): Date | undefined {
    return this.pickerDate;
  }
  set raceDate(value: Date | null | undefined) {
    this.pickerDate = value ?? undefined;
    this.raceDateToSave = value ?? undefined;
  }
  raceSelected: Race | undefined;
  readonly results: WritableSignal<Result[]> = signal<Result[]>([]);
  readonly sprints: WritableSignal<Sprint[]> = signal<Sprint[]>([]);
  emptyResults: any[] = new Array(20).fill(null);
  resultsToSave: Result[] = [];
  sprintsToSave: Sprint[] = [];
  driversSelected: (Driver | null)[] = [];
  allDrivers: Driver[] = [];

  readonly fastlapDriver: WritableSignal<Driver | undefined> = signal<Driver | undefined>(undefined);
  readonly poleDriver: WritableSignal<Driver | undefined> = signal<Driver | undefined>(undefined);
  isSprint: boolean = false;
  readonly visible: WritableSignal<boolean> = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  private readonly loadedRaceId = signal<number | undefined>(undefined);
  readonly canSave = computed(() => {
    const loadedRaceId = this.loadedRaceId();
    return loadedRaceId !== undefined && loadedRaceId === this.raceSelected?.id
      && !this.isLoading() && !this.isSaving();
  });

  private readonly destroy$: Subject<void> = new Subject<void>();
  private readonly raceChanges$ = new Subject<{ raceId: number; sprint: boolean }>();

  constructor() {
    this.raceChanges$.pipe(
      switchMap(({ raceId, sprint }) => {
        const request$: Observable<(Result | Sprint)[]> = sprint
          ? this.sprintApiService.getAllSprintPerRace(raceId)
          : this.resultApiService.getAllResultsPerRacePilots(raceId);
        return request$.pipe(
          retry(1),
          map(rows => ({ raceId, sprint, rows })),
          catchError(error => {
            this.isLoading.set(false);
            this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
            console.error(error);
            return EMPTY;
          }),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(({ raceId, sprint, rows }) => {
      if (raceId !== this.raceSelected?.id || sprint !== this.isSprint) return;
      // Keep editable selections and positions separate from objects held in the API cache.
      this.driversSelected = rows.length ? rows.map(row => row.driver) : new Array(20).fill(null);
      if (sprint) {
        this.sprints.set(rows.map(row => new Sprint(
          this.raceSelected!, row.driver, row.position ? { ...row.position } : null,
        )));
      } else {
        const results = rows as Result[];
        this.results.set(results.map(row => new Result(
          this.raceSelected!, row.driver, row.position ? { ...row.position } : null, row.fastlap, row.pole,
        )));
        this.fastlapDriver.set(results.find(row => row.fastlap)?.driver);
        this.poleDriver.set(results.find(row => row.pole)?.driver);
      }
      this.loadedRaceId.set(raceId);
      this.isLoading.set(false);
    });
  }
  
  ngOnInit(): void {
    this.checkIsSprint();
    this.getAllDrivers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async getAllDrivers(): Promise<void> {
    this.allDrivers = await lastValueFrom(this.driverApiService.getAllDrivers(environment.seasonActual.number)
    .pipe(
      catchError((error) => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, []))
    ))
  } 

  onRaceChange(newRace: Race): void {
    this.resetValuesRaceChange(newRace);
    this.results.set([]);
    this.sprints.set([]);
    this.loadedRaceId.set(undefined);
    this.isLoading.set(true);
    this.raceChanges$.next({ raceId: newRace.id, sprint: this.isSprint });
  }

  checkIsSprint(): void {
    this.isSprint = !!this.router.url.includes("sprint");
  }

  private resetValuesRaceChange(newRace: Race): void {
    this.raceSelected = { ...newRace };
    this.pickerDate = new Date(newRace.dateStart);
    this.raceDateToSave = newRace.dateStart;
    this.fastlapDriver.set(undefined);
    this.poleDriver.set(undefined);
    this.driversSelected = new Array(20).fill(null);
  }
 
  onDriverChangeFastLap(newDriver: Driver): void  {
    this.fastlapDriver.set(newDriver);
  }

  onDriverChangePole(newDriver: Driver): void {
    this.poleDriver.set(newDriver);
  }

  onDriverChangeResult(newDriver: Driver | null, position: number): void {
    if (position >= 0 && position < this.driversSelected.length) {
      this.driversSelected[position] = newDriver;
    }
  }

  saveResults(): void {
    if (!this.canSave() || !this.validateForm()) return;

    const dateStart = typeof this.raceDateToSave === 'string'
      ? this.raceDateToSave : serializeRaceDate(this.raceDateToSave!);
    const race: Race = { ...this.raceSelected!, dateStart };
    if (this.isSprint ? this.sprints().length : this.results().length) this.updateResultsToSave(race);
    else this.createResultsToSave(race);

    // The request uses this submission's snapshot even if another race is selected meanwhile.
    const results = this.resultsToSave;
    const sprints = this.sprintsToSave;
    const save = this.isSprint
      ? () => this.sprintApiService.saveSprints(sprints)
      : () => this.raceApiService.closeRace({ ...race, finished: 1 }, results);

    this.isSaving.set(true);
    defer(save).pipe(
      takeUntil(this.destroy$),
      tap(response => this.messageInfoService.showSuccess(response)),
      catchError(error => {
        this.messageInfoService.showError(error, error);
        console.error(error);
        return EMPTY;
      }),
      finalize(() => this.isSaving.set(false)),
    ).subscribe();
  }

  private validateForm(): boolean {
    const formValidations = this.isSprint ? this.getSprintValidations() : this.getResultValidations();
    
    if (!this.isValidForm(formValidations)) {
      return false;
    }

    const driversValidation = this.validateDrivers();
    if (!driversValidation.valid) {
      this.messageInfoService.showWarn(driversValidation.message);
      return false;
    }

    return true;
  }

  private validateDrivers(): { valid: boolean; message: string } {
    const rows = this.isSprint ? this.sprints() : this.results();
    if (rows.length && this.driversSelected.some(driver => !driver)) {
      return { valid: false, message: 'Debes seleccionar un piloto en cada fila' };
    }
    let lastSelectedIndex = -1;
    for (let i = 0; i < this.driversSelected.length; i++) {
      if (this.driversSelected[i]) {
        lastSelectedIndex = i;
      }
    }

    if (lastSelectedIndex === -1) {
      return {
        valid: false,
        message: 'Debes seleccionar al menos un piloto'
      };
    }

    const selectedIds = new Set<number>();
    for (const driver of this.driversSelected) {
      if (driver) {
        if (selectedIds.has(driver.id)) {
          return {
            valid: false,
            message: `El piloto ${driver.name} está duplicado`
          };
        }
        selectedIds.add(driver.id);
      }
    }

    return { valid: true, message: '' };
  }

  private getResultValidations(): { condition: boolean; message: string }[] {
    return [
      { condition: !!this.raceSelected, message: 'Necesitas poner alguna carrera' },
      { condition: !!this.raceDate, message: 'Necesitas poner la fecha de la carrera' },
      { condition: !!this.fastlapDriver(), message: 'Necesitas poner el piloto con la vuelta rápida' },
      { condition: !!this.poleDriver(), message: 'Necesitas poner el piloto con la pole' }
    ];
  }

  private getSprintValidations(): { condition: boolean; message: string }[] {
    return [
      { condition: !!this.raceSelected, message: 'Necesitas poner alguna carrera' },
      { condition: !!this.raceDate, message: 'Necesitas poner la fecha de la carrera' }
    ];
  }

  private isValidForm(validations: { condition: boolean; message: string }[]): boolean {
    for (const { condition, message } of validations) {
      if (!condition) {
        this.messageInfoService.showWarn(message);
        return false;
      }
    }
    return true;
  }

  private buildResultsToSave(selectedDrivers: Driver[], race: Race): Result[] {
    const resultsToSave: Result[] = [];

    selectedDrivers.forEach((driver, index) => {
      const isFastlap = this.fastlapDriver()?.id === driver.id;
      const isPole = this.poleDriver()?.id === driver.id;

      resultsToSave.push(new Result(
        race,
        driver,
        new Position(index + 1, index + 1, 0),
        isFastlap ? 1 : 0,
        isPole ? 1 : 0
      ));
    });

    this.allDrivers.forEach(driver => {
      if (!selectedDrivers.some(d => d.id === driver.id)) {
        const isFastlap = this.fastlapDriver()?.id === driver.id;
        const isPole = this.poleDriver()?.id === driver.id;

        resultsToSave.push(new Result(
          race,
          driver,
          null,
          isFastlap ? 1 : 0,
          isPole ? 1 : 0
        ));
      }
    });

    return resultsToSave;
  }

  private buildSprintsToSave(selectedDrivers: Driver[], race: Race): Sprint[] {
    const sprintsToSave: Sprint[] = [];

    selectedDrivers.forEach((driver, index) => {
      sprintsToSave.push(new Sprint(
        race,
        driver,
        new Position(index + 1, index + 1, 0)
      ));
    });

    this.allDrivers.forEach(driver => {
      if (!selectedDrivers.some(d => d.id === driver.id)) {
        sprintsToSave.push(new Sprint(
          race,
          driver,
          null
        ));
      }
    });

    return sprintsToSave;
  }


  private updateResultsToSave(race: Race): void {
    if (this.isSprint) {
      this.sprintsToSave = this.sprints().map((row, index) => new Sprint(
        race, this.driversSelected[index]!, row.position ? { ...row.position } : null,
      ));
    } else {
      this.resultsToSave = this.results().map((row, index) => {
        const driver = this.driversSelected[index]!;
        return new Result(race, driver, row.position ? { ...row.position } : null,
          this.fastlapDriver()?.id === driver.id ? 1 : 0,
          this.poleDriver()?.id === driver.id ? 1 : 0);
      });
    }
  }

  private createResultsToSave(race: Race): void {
    const selectedDrivers = this.driversSelected.filter((driver): driver is Driver => driver !== null);

    if (this.isSprint) {
      this.sprintsToSave = this.buildSprintsToSave(selectedDrivers, race);
    } else {
      this.resultsToSave = this.buildResultsToSave(selectedDrivers, race);
    }
  }

  deleteResults(): void {
    if (this.isSprint) {
      this.sprintApiService.deleteSprintsFromRace(this.raceSelected!.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(error, error);
          console.error(error);
          return EMPTY;
        })
      ).subscribe((success: string) => {
        this.messageInfoService.showSuccess(success);
        this.visible.set(false);
      });
    } else {
      this.resultApiService.deleteResultsFromRace(this.raceSelected!.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(error, error);
          console.error(error);
          return EMPTY;
        })
      ).subscribe((success: string) => {
        this.messageInfoService.showSuccess(success);
        this.visible.set(false);
      });
    }
  }
}
