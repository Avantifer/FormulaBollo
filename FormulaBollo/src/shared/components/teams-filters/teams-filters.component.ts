import { CommonModule } from '@angular/common';
import { Component, effect, EventEmitter, inject, input, InputSignal, Output, signal, WritableSignal } from '@angular/core';
import { ChipModule } from 'primeng/chip';
import { UtilsService } from '../../services/utils.service';
import { TeamApiService } from '../../services/api/team-api.service';
import { Team } from '../../models/team';
import { catchError, map, Subject, takeUntil } from 'rxjs';
import { ERROR_TEAM_FETCH } from '../../../app/constants';
import { Season } from '../../models/season';
import { SpaceToUnderscorePipe } from '../../pipes/spaceToUnderscore.pipe';
import { environment } from '../../../enviroments/enviroment';

@Component({
  selector: 'teams-filters',
  imports: [
    CommonModule,
    ChipModule,
    SpaceToUnderscorePipe
  ],
  templateUrl: './teams-filters.component.html',
  styleUrl: './teams-filters.component.scss'
})
export class TeamsFiltersComponent {
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);

  readonly showFilters: InputSignal<boolean> = input(false);
  readonly season: InputSignal<Season> = input(environment.seasonActual);
  protected selectedTeams: Set<string> = new Set();
  protected teamsName: WritableSignal<string[]> = signal([]); 
  private readonly destroy$ = new Subject<void>();
  @Output() selectedTeamsChanged = new EventEmitter<string[]>();

  constructor() {
    effect(() => {
      this.selectedTeams.clear();
      this.selectedTeams.add('Todos los equipos');
      this.emitSelection();

      this.teamApiService.getAllTeams(this.season().number).pipe(
        takeUntil(this.destroy$),
        map((teams: Team[] | undefined) => (teams ?? []).map(team => team.name)),
        catchError((error) => this.utilsService.handleError<string[]>(ERROR_TEAM_FETCH, error, []))
      ).subscribe((teams: string[]) => this.teamsName.set(teams));
    });
  }

  protected toggleSelection(team: string): void {
    if (team === 'Todos los equipos') {
      return;
    }
  
    this.selectedTeams.add(team);
    this.selectedTeams.delete('Todos los equipos');
    this.emitSelection();
  }
  
  protected isSelected(team: string): boolean {
    return this.selectedTeams.has(team);
  }
  
  protected removeSelection(event: Event, team: string): void {
    event.stopPropagation();
  
    this.selectedTeams.delete(team);
  
    if (this.selectedTeams.size === 0) {
      this.selectedTeams.add('Todos los equipos');
    }
    
    this.emitSelection();
  }

  protected getTeamClass(teamName: string): { [klass: string]: boolean } {
    return {
      ['bg-' + this.utilsService.spaceToUnderScore(teamName)]: this.isSelected(teamName)
    };
  }

  private emitSelection(): void {
    this.selectedTeamsChanged.emit(Array.from(this.selectedTeams));
  }
}
