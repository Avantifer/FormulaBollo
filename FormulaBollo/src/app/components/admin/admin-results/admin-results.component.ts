import { Position } from './../../../../shared/models/position';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { Season } from '../../../../shared/models/season';
import { environment } from '../../../../enviroments/enviroment';
import { DatePicker } from 'primeng/datepicker';
import { CommonModule } from '@angular/common';
import { Race } from '../../../../shared/models/race';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectDriversComponent } from '../../../../shared/components/select-drivers/select-drivers.component';
import { Driver } from '../../../../shared/models/driver';
import { ButtonModule } from 'primeng/button';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { Result } from '../../../../shared/models/result';
import { catchError, lastValueFrom, of, retry, Subject, takeUntil } from 'rxjs';
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
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';

@Component({
  selector: 'app-admin-results',
  imports: [
    CommonModule,
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
  styleUrl: './admin-results.component.scss'
})
export class AdminResultsComponent {

  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly router: Router = inject(Router);
  private readonly sprintApiService: SprintApiService = inject(SprintApiService);
  private readonly raceApiService: RaceApiService = inject(RaceApiService);
  private readonly fantasyApiService: FantasyApiService = inject(FantasyApiService);
  
  actualSeason: Season = environment.seasonActual;
  raceDate: Date | undefined;
  raceSelected: Race | undefined;
  results: Result[] = [];
  sprints: Sprint[] = [];
  emptyResults: any[] = new Array(20).fill(null);
  resultsToSave: Result[] = [];
  sprintsToSave: Sprint[] = [];
  driversSelected: Driver[] = [];
  allDrivers: Driver[] = [];

  fastlapDriver: Driver | undefined;
  poleDriver: Driver | undefined;
  isSprint: boolean = false;
  visible: boolean = false;

  private readonly destroy$: Subject<void> = new Subject<void>();
  
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
    this.results = [];
    if (this.isSprint) {
      this.sprintApiService.getAllSprintPerRace(this.raceSelected!.id)
        .pipe(
          takeUntil(this.destroy$),
          retry(1),
          catchError((error) => {
            this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
            console.error(error);
            return of([]);
          })
        ).subscribe((sprints: Sprint[]) => {
          this.sprints = sprints;
          this.cdr.detectChanges();
        });

    } else {
      this.resultApiService.getAllResultsPerRacePilots(this.raceSelected!.id)
        .pipe(
          takeUntil(this.destroy$),
          retry(1),
          catchError((error) => {
            this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
            console.error(error);
            return of([]);
          })
        ).subscribe((results: Result[]) => { 
          this.results = results;
          this.cdr.detectChanges();
  
          let resultFiltered = results.filter((result: Result) => result.fastlap);
          this.fastlapDriver = resultFiltered.length ? resultFiltered[0].driver : undefined;
  
          resultFiltered = results.filter((result: Result) => result.pole);
          this.poleDriver = resultFiltered.length ? resultFiltered[0].driver : undefined;
        });

    }
  }

  checkIsSprint(): void {
    this.isSprint = !!this.router.url.includes("sprint");
  }

  private resetValuesRaceChange(newRace: Race): void {
    this.raceSelected = newRace;
    this.raceDate = new Date(newRace.dateStart);
    this.fastlapDriver = undefined;
    this.poleDriver = undefined;
    this.driversSelected = new Array(20).fill(null);
  }
 
  onDriverChangeFastLap(newDriver: Driver): void  {
    this.fastlapDriver = newDriver;
  }

  onDriverChangePole(newDriver: Driver): void {
    this.poleDriver = newDriver;
  }

  onDriverChangeResult(newDriver: Driver, position: number): void {     
    if (position < 20) {
      this.driversSelected[position] = newDriver;
    }
  }

  saveResults(): void {
    if (!this.validateForm()) return;
    this.updateRaceIfNeccesary();

    if (this.isSprint) {
      this.sprintLogicSave();
    } else {
      this.resultLogicSave();
    }
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

  private updateRaceIfNeccesary(): void {
    const dateStart = new Date(this.raceSelected!.dateStart);
    this.raceSelected!.dateStart = dateStart;
    this.raceSelected!.finished = 1;
    this.raceApiService.saveRace(this.raceSelected!).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(error, error);
        console.error(error);
        return of("");
      })
    ).subscribe((success: string) => {
      this.messageInfoService.showSuccess(success);
    });
  }

  private sprintLogicSave(): void {
    if (this.sprints.length) {
      this.updateResultsToSave();
    } else {
      this.createResultsToSave();
    }

    this.sprintApiService.saveSprints(this.sprintsToSave).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(error, error);
        console.error(error);
        return of("");
      })
    ).subscribe((success: string) => {
      this.messageInfoService.showSuccess(success);
    });
  }

  private async resultLogicSave(): Promise<void> {
    if (this.results.length) {
      this.updateResultsToSave();
    } else {
      this.createResultsToSave();
    }

    const responseSaveResults: string = await lastValueFrom(
      this.resultApiService.saveResults(this.resultsToSave).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError<string>(error, error))
    ));

    this.messageInfoService.showSuccess(responseSaveResults);
    
    const responseSaveFantasyPoints: string = await lastValueFrom(
      this.fantasyApiService.saveDriverTeamPoints(this.resultsToSave[0].race.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError<string>(error.error, error))
    ));
      
    this.messageInfoService.showSuccess(responseSaveFantasyPoints);

    const responseSaveFantasyPrices: string = await lastValueFrom(
      this.fantasyApiService.saveDriverTeamPrices(this.resultsToSave[0].race.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError<string>(error.error, error))
    ));

    this.messageInfoService.showSuccess(responseSaveFantasyPrices);
  }

  private getResultValidations(): { condition: boolean; message: string }[] {
    return [
      { condition: !!this.raceSelected, message: 'Necesitas poner alguna carrera' },
      { condition: !!this.raceDate, message: 'Necesitas poner la fecha de la carrera' },
      { condition: !!this.fastlapDriver, message: 'Necesitas poner el piloto con la vuelta rápida' },
      { condition: !!this.poleDriver, message: 'Necesitas poner el piloto con la pole' }
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

  private buildResultsToSave(selectedDrivers: Driver[]): Result[] {
    const resultsToSave: Result[] = [];

    selectedDrivers.forEach((driver, index) => {
      const isFastlap = this.fastlapDriver?.id === driver.id;
      const isPole = this.poleDriver?.id === driver.id;

      resultsToSave.push(new Result(
        this.raceSelected!,
        driver,
        new Position(index + 1, 0, 0),
        isFastlap ? 1 : 0,
        isPole ? 1 : 0
      ));
    });

    this.allDrivers.forEach(driver => {
      if (!selectedDrivers.some(d => d.id === driver.id)) {
        const isFastlap = this.fastlapDriver?.id === driver.id;
        const isPole = this.poleDriver?.id === driver.id;

        resultsToSave.push(new Result(
          this.raceSelected!,
          driver,
          null,
          isFastlap ? 1 : 0,
          isPole ? 1 : 0
        ));
      }
    });

    return resultsToSave;
  }

  private buildSprintsToSave(selectedDrivers: Driver[]): Sprint[] {
    const sprintsToSave: Sprint[] = [];

    selectedDrivers.forEach((driver, index) => {
      sprintsToSave.push(new Sprint(
        this.raceSelected!,
        driver,
        new Position(index + 1, 0, 0)
      ));
    });

    this.allDrivers.forEach(driver => {
      if (!selectedDrivers.some(d => d.id === driver.id)) {
        sprintsToSave.push(new Sprint(
          this.raceSelected!,
          driver,
          null
        ));
      }
    });

    return sprintsToSave;
  }


  private updateResultsToSave(): void {  
    const selectedDrivers: Driver[] = [];
    const finishedDrivers = this.isSprint ? this.sprints.filter(r => r.position != null).length : this.results.filter(r => r.position != null).length;
    
    for (let i = 0; i < finishedDrivers; i++) {
      if (this.driversSelected[i]) {
        selectedDrivers.push(this.driversSelected[i]);
      }
    }
    
    if (this.isSprint) {
      this.sprintsToSave = this.buildSprintsToSave(selectedDrivers);
    } else {
      this.resultsToSave = this.buildResultsToSave(selectedDrivers);
    }
  }

  private createResultsToSave(): void {
    const selectedDrivers: Driver[] = [];
    
    for (let i = 0; i < 20; i++) {
      if (this.driversSelected[i]) {
        selectedDrivers.push(this.driversSelected[i]);
      }
    }

    if (this.isSprint) {
      this.sprintsToSave = this.buildSprintsToSave(selectedDrivers);
    } else {
      this.resultsToSave = this.buildResultsToSave(selectedDrivers);
    }
  }

  deleteResults(): void {
    if (this.isSprint) {
      this.sprintApiService.deleteSprintsFromRace(this.raceSelected!.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(error, error);
          console.error(error);
          return of("");
        })
      ).subscribe((success: string) => {
        this.messageInfoService.showSuccess(success);
        this.visible = false;
      });
    } else {
      this.resultApiService.deleteResultsFromRace(this.raceSelected!.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(error, error);
          console.error(error);
          return of("");
        })
      ).subscribe((success: string) => {
        this.messageInfoService.showSuccess(success);
        this.visible = false;
      });
    }
  }
}
