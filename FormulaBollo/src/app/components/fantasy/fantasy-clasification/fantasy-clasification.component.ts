import { ButtonModule } from 'primeng/button';
import { Component, effect, inject, signal } from '@angular/core';
import { SelectSeasonsComponent } from "../../../../shared/components/select-seasons/select-seasons.component";
import { Season } from '../../../../shared/models/season';
import { SelectRacesComponent } from "../../../../shared/components/select-races/select-races.component";
import { Race } from '../../../../shared/models/race';
import { FantasyPointsUser } from '../../../../shared/models/fantasyPointsUser';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { UtilsService } from '../../../../shared/services/utils.service';
import { ERROR_FANTASY_POINTS, ERROR_POINT_FETCH } from '../../../constants';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ImageService } from '../../../../shared/services/image.service';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { FantasyPointsDriver } from '../../../../shared/models/fantasyPointsDriver';
import { FantasyPointsTeam } from '../../../../shared/models/fantasyPointsTeam';

@Component({
  selector: 'app-fantasy-clasification',
  imports: [
    ButtonModule,
    TableModule,
    DialogModule,
    SelectSeasonsComponent,
    SelectRacesComponent,
    SpaceToUnderscorePipe
  ],
  templateUrl: './fantasy-clasification.component.html',
  styleUrl: './fantasy-clasification.component.scss'
})
export class FantasyClasificationComponent {
  private readonly fantasyApiService: FantasyApiService = inject(FantasyApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  readonly imageService: ImageService = inject(ImageService);

  readonly seasonSelected = signal<Season | undefined>(undefined);
  readonly raceSelected = signal<Race | undefined>(undefined);
  readonly fantasyPointsUsers = signal<FantasyPointsUser[]>([]);

  fantasyPointsUserSelected: FantasyPointsUser | undefined;
  pointsDriverArray: number[] = [];
  pointsTeamArray: number[] = [];
  showDialog: boolean = false;
  private readonly destroy$: Subject<void> = new Subject<void>();

  constructor() {
    effect(() => {
      if (this.raceSelected()?.id === 0) {
        this.fantasyApiService.getFantasyPointsSeason(this.seasonSelected()!.number).pipe(
          catchError(error =>
            this.utilsService.handleError(ERROR_FANTASY_POINTS, error, [])
          )
        ).subscribe(users => this.fantasyPointsUsers.set(users));
      } else if (this.raceSelected()){
          this.fantasyApiService.getFantasyPointsRace(this.raceSelected()!.id).pipe(
            catchError(error =>
              this.utilsService.handleError(ERROR_FANTASY_POINTS, error, [])
            )
          ).subscribe(users => this.fantasyPointsUsers.set(users));
        
      }
    });
  }

  onSeasonChange(newSeason: Season): void {
    this.seasonSelected.set(newSeason);
  }

  onRaceChange(newRace: Race): void {
    this.raceSelected.set(newRace);
  }

  openDialog(fantasyPointsUser: FantasyPointsUser): void {
    this.fantasyPointsUserSelected = fantasyPointsUser;
    this.getDriverPoints();
    this.getTeamPoints();
    this.showDialog = true;
  }

  private getTeamPoints(): void {
    this.getSpecificTeamPoint(this.fantasyPointsUserSelected!.fantasyElection.teamOne!.id, 0);
    this.getSpecificTeamPoint(this.fantasyPointsUserSelected!.fantasyElection.teamTwo!.id, 1);
  }

  private getSpecificTeamPoint(teamId: number, index: number) {
    this.fantasyApiService
      .getTeamPointsSpecificRace(teamId, this.fantasyPointsUserSelected!.fantasyElection.race!.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(ERROR_POINT_FETCH, error);
          console.error(error);
          return of();
        })
      )
      .subscribe((fantasyPointsTeam: FantasyPointsTeam) => {
          this.pointsTeamArray[index] = fantasyPointsTeam.points;
        }
      );
  }

  private getDriverPoints(): void {
    this.getSpecificDriverPoint(this.fantasyPointsUserSelected!.fantasyElection.driverOne!.id, 0);
    this.getSpecificDriverPoint(this.fantasyPointsUserSelected!.fantasyElection.driverTwo!.id, 1);
    this.getSpecificDriverPoint(this.fantasyPointsUserSelected!.fantasyElection.driverThree!.id, 2);
  }

  private getSpecificDriverPoint(driverId: number, index: number) {
     this.fantasyApiService
      .getDriverPointsSpecificRace(driverId, this.fantasyPointsUserSelected!.fantasyElection.race!.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(ERROR_POINT_FETCH, error);
          console.error(error);
          return of();
        })
      )
      .subscribe((fantasyPointsDriver: FantasyPointsDriver) => {
          this.pointsDriverArray[index] = fantasyPointsDriver.points;
        }
      );
  }

  showAllPoints(): number {
    let points: number = 0;
    this.pointsDriverArray.forEach((pointsDriver: number) => points += pointsDriver);
    this.pointsTeamArray.forEach((pointsTeam: number) => points += pointsTeam);
    return points;
  }
}
