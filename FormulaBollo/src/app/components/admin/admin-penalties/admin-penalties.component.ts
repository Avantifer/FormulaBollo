import { Component, inject, Signal } from '@angular/core';
import { SelectDriversComponent } from '../../../../shared/components/select-drivers/select-drivers.component';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { SelectPenaltySeveritiesComponent } from '../../../../shared/components/select-penalty-severities/select-penalty-severities.component';
import { Season } from '../../../../shared/models/season';
import { environment } from '../../../../enviroments/enviroment';
import { PenaltySeverity } from '../../../../shared/models/penaltySeverity';
import { Driver } from '../../../../shared/models/driver';
import { Race } from '../../../../shared/models/race';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { Penalty } from '../../../../shared/models/penalty';
import { PenaltiesApiService } from '../../../../shared/services/api/penalties-api.service';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { UtilsService } from '../../../../shared/services/utils.service';
import { ERROR_PENALTIES_FETCH } from '../../../constants';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-admin-penalties',
  imports: [
    ButtonModule,
    TextareaModule,
    DialogModule,
    DividerModule,
    TableModule,
    CardModule,
    FormsModule,
    SelectDriversComponent,
    SelectRacesComponent,
    SelectPenaltySeveritiesComponent,
    SpaceToUnderscorePipe
  ],
  templateUrl: './admin-penalties.component.html',
  styleUrl: './admin-penalties.component.scss'
})
export class AdminPenaltiesComponent {
  private readonly penaltyApiService: PenaltiesApiService = inject(PenaltiesApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly utilsService: UtilsService = inject(UtilsService);

  readonly actualSeason: Season = environment.seasonActual;
  penaltySeveritySelected: PenaltySeverity | undefined;
  driverSelected: Driver | undefined;
  raceSelected: Race | undefined;
  visible: boolean = false;
  penaltiesToShow: string = "";
  penaltiesToSave: Penalty[] = [];
  penaltiesTable: Signal<Penalty[]> = toSignal(
    this.penaltyApiService.getPenaltiesPerDriver()
    .pipe(
      catchError((error) => this.utilsService.handleError(ERROR_PENALTIES_FETCH, error, []))
    ),
    { initialValue: [] }
  );

  private readonly destroy$: Subject<void> = new Subject<void>();

  onPenaltySeverityChange(newPenaltySeverity: PenaltySeverity): void {
    this.penaltySeveritySelected = newPenaltySeverity;
    this.getPenaltiesPerDriverAndPerRace();
  }

  onDriverChange(newDriver: Driver): void {
    this.driverSelected = newDriver;
    this.getPenaltiesPerDriverAndPerRace();
  }

  onRaceChange(newRace: Race): void {
    this.raceSelected = newRace;
    this.getPenaltiesPerDriverAndPerRace();
  }
  
  cleanPenalties(): void {
    const cleanPenalties: string[] = this.penaltiesToShow
      .split(".")
      .map(item => item.trim())
      .filter(item => item !== "")
      .map(item => item + ".");
    
    this.penaltiesToSave = [];

    cleanPenalties.forEach((reason: string) => {
      const penalty: Penalty = new Penalty(0, this.raceSelected!, this.driverSelected!, reason, this.penaltySeveritySelected!, this.actualSeason);
      this.penaltiesToSave.push(penalty);
    });
  }

  private isValidForm(): boolean {
    const validations: { condition: boolean; message: string }[] = [
      { condition: !!this.raceSelected, message: 'Necesitas poner alguna carrera' },
      { condition: !!this.driverSelected, message: 'Necesitas poner el piloto' },
      { condition: !!this.penaltySeveritySelected, message: 'Necesitas poner alguna gravedad' }
    ];

    for (const { condition, message } of validations) {
      if (!condition) {
        this.messageInfoService.showWarn(message);
        return false;
      }
    }
    return true;
  }

  getPenaltiesPerDriverAndPerRace(): void {
    if (!this.driverSelected || !this.raceSelected || !this.penaltySeveritySelected) return;

    this.penaltyApiService.getPenaltiesPerDriverAndPerRace(this.driverSelected.id, this.raceSelected.id, this.penaltySeveritySelected.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(error, error);
        console.error(error);
        return of([]);
      })
    ).subscribe((penalties: Penalty[]) => {
      if (penalties.length) {
        this.penaltiesToShow = penalties.map((penalty: Penalty) => penalty.reason).join(' ');
      } else {
        this.penaltiesToShow = "";
      }
    });
  }

  savePenalties(): void {
    if (!this.isValidForm()) return;

    this.cleanPenalties();

    this.penaltyApiService.savePenalties(this.penaltiesToSave, this.driverSelected!.id, this.raceSelected!.id).pipe(
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
}
