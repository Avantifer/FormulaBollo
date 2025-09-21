import { environment } from '../../../enviroments/enviroment';
import { Component, effect, inject, input, Input, InputSignal, signal, WritableSignal } from '@angular/core';
import { DriverCardComponent } from "../../../app/components/drivers/driver-card/driver-card.component";
import { CommonModule } from '@angular/common';
import { DriverPoints } from '../../models/driverPoints';
import { TableModule } from 'primeng/table';
import { SpaceToUnderscorePipe } from '../../pipes/spaceToUnderscore.pipe';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { UtilsService } from '../../services/utils.service';
import { SkeletonModule } from 'primeng/skeleton';
import { SkeletonItemsPipe } from '../../pipes/skeletonItems.pipe';
import { Driver } from '../../models/driver';
import { Season } from '../../models/season';
import { catchError, delay, Subject, takeUntil } from 'rxjs';
import { DriverApiService } from '../../services/api/driver-api.service';
import { ResultApiService } from '../../services/api/result-api.service';
import { ERROR_DRIVER_FETCH, ERROR_TEAM_FETCH } from '../../../app/constants';
import { TeamApiService } from '../../services/api/team-api.service';
import { TeamWithDrivers } from '../../models/teamWithDrivers';
import { Team } from '../../models/team';
import { ImageService } from '../../services/image.service';
import { TeamCardComponent } from "../../../app/components/teams/team-card/team-card.component";

@Component({
  selector: 'drivers-teams-grid-table',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    SkeletonModule,
    SkeletonItemsPipe,
    SpaceToUnderscorePipe,
    DriverCardComponent,
    TeamCardComponent
  ],
  templateUrl: './drivers-teams-grid-table.component.html',
  styleUrl: './drivers-teams-grid-table.component.scss'
})
export class DriversGridTableComponent {
  private readonly driversApiService: DriverApiService = inject(DriverApiService);
  private readonly resultApiService: ResultApiService = inject(ResultApiService);
  protected readonly router: Router = inject(Router);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  protected readonly imageService: ImageService = inject(ImageService);

  @Input() listValue!: string;
  @Input() selectedTeams: string[] = [];
  @Input() type!: string;

  readonly season: InputSignal<Season> = input(environment.seasonActual);
  protected drivers: WritableSignal<Driver[]> = signal<Driver[]>([]);
  protected driverPoints: WritableSignal<DriverPoints[]> = signal<DriverPoints[]>([]);
  protected teamPoints: WritableSignal<TeamWithDrivers[]> = signal([]);
  protected teams: WritableSignal<Team[]> = signal([]);

  protected isLoading: boolean = true;
  private readonly destroy$: Subject<void> = new Subject<void>();
  
  constructor(){
    effect(() => {
      this._resetData();
      this._getPointsDrivers(this.season());

      if (this.type === 'Equipos') {
        this._getTeamsPoints(this.season());
      }
    });
  }

  protected _getPointsDrivers(season: Season): void {
    this.resultApiService.getAllDriverPoints(season.number).pipe(
      takeUntil(this.destroy$),
      delay(100),
      catchError((error) => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, [])),
    ).subscribe((driverPoints: DriverPoints[]) => this._updateDriversPointsData(driverPoints))
  }

  private _getTeamsPoints(season: Season): void {
    this.teamApiService.getllTeamsWithDrivers(season.number).pipe(
      takeUntil(this.destroy$),
      delay(100),
      catchError((error) => this.utilsService.handleError(ERROR_TEAM_FETCH, error, []))
    ).subscribe((teamWithDrivers: TeamWithDrivers[]) => this._updateTeamsPointsData(teamWithDrivers));
  }

  private _updateDriversPointsData(driverPoints: DriverPoints[]): void {
    if (!driverPoints.length) {
      this.isLoading = true;
      this._getAllDrivers();
    }

    this.driverPoints.set(driverPoints);
    this.isLoading = false;
  }

  private _updateTeamsPointsData(teamWithDrivers: TeamWithDrivers[]): void {
    if (!teamWithDrivers.length) {
      this.isLoading = true;
      this._getAllTeams();
    }

    this.teamPoints.set(teamWithDrivers);
    this.isLoading = false;
  }

  private _getAllDrivers(): void {
    this.driversApiService.getAllDrivers(environment.seasonActual.number)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError(ERROR_DRIVER_FETCH, error, []))
      )
      .subscribe((drivers: Driver[]) => this.drivers.set(drivers));
  }
  
  private _getAllTeams() {
    this.teamApiService.getAllTeams(environment.seasonActual.number)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError(ERROR_TEAM_FETCH, error, []))
      ).subscribe((teams: Team[]) => this.teams.set(teams));
  }

  private _resetData(): void {
    this.isLoading = true;
    this.driverPoints.set([]);
    this.drivers.set([]);
    this.teamPoints.set([]);
    this.teams.set([]);
  }

  protected showDriverByTeamFilter(driver: Driver): boolean {
    if (!this.selectedTeams?.length) return true;
  
    const driverTeam = driver.team.name;
    return this.selectedTeams.includes('Todos los equipos') || this.selectedTeams.includes(driverTeam);
  }

  protected showTeamsByTeamFilter(team: Team): boolean {
    if (!this.selectedTeams?.length) return true;
  
    const driverTeam = team.name;
    return this.selectedTeams.includes('Todos los equipos') || this.selectedTeams.includes(driverTeam);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
