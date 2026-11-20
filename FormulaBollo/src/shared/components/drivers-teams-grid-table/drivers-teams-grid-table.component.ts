import { environment } from '../../../enviroments/enviroment';
import { Component, effect, inject, input, Input, InputSignal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { SpaceToUnderscorePipe } from '../../pipes/spaceToUnderscore.pipe';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { UtilsService } from '../../services/utils.service';
import { SkeletonModule } from 'primeng/skeleton';
import { SkeletonItemsPipe } from '../../pipes/skeletonItems.pipe';
import { Season } from '../../models/season';
import { catchError, delay, Subject, takeUntil } from 'rxjs';
import { ERROR_TEAM_FETCH } from '../../../app/constants';
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
    TeamCardComponent
  ],
  templateUrl: './drivers-teams-grid-table.component.html',
  styleUrl: './drivers-teams-grid-table.component.scss'
})
export class DriversGridTableComponent {
  protected readonly router: Router = inject(Router);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  protected readonly imageService: ImageService = inject(ImageService);

  @Input() listValue!: string;
  @Input() selectedTeams: string[] = [];
  @Input() type: 'Equipos' = 'Equipos';

  readonly season: InputSignal<Season> = input(environment.seasonActual);
  protected teamPoints: WritableSignal<TeamWithDrivers[]> = signal([]);
  protected teams: WritableSignal<Team[]> = signal([]);

  protected readonly isLoading: WritableSignal<boolean> = signal(true);
  private readonly destroy$: Subject<void> = new Subject<void>();
  
  constructor(){
    effect(() => {
      this._resetData();
      this._getTeamsPoints(this.season());
    });
  }

  private _getTeamsPoints(season: Season): void {
    this.teamApiService.getllTeamsWithDrivers(season.number).pipe(
      takeUntil(this.destroy$),
      delay(100),
      catchError((error) => this.utilsService.handleError(ERROR_TEAM_FETCH, error, []))
    ).subscribe((teamWithDrivers: TeamWithDrivers[]) => this._updateTeamsPointsData(teamWithDrivers, season));
  }

  private _updateTeamsPointsData(teamWithDrivers: TeamWithDrivers[], season: Season): void {
    if (!teamWithDrivers.length) {
      this.isLoading.set(true);
      this._getAllTeams(season.number);
    }

    this.teamPoints.set(teamWithDrivers);
    this.isLoading.set(false);
  }

  private _getAllTeams(seasonNumber: number) {
    this.teamApiService.getAllTeams(seasonNumber)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError(ERROR_TEAM_FETCH, error, []))
      ).subscribe((teams: Team[]) => this.teams.set(teams));
  }

  private _resetData(): void {
    this.isLoading.set(true);
    this.teamPoints.set([]);
    this.teams.set([]);
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
