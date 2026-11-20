import { CommonModule } from '@angular/common';
import { Component, effect, EventEmitter, inject, input, InputSignal, Output, signal, untracked, WritableSignal } from '@angular/core';
import { ChipModule } from 'primeng/chip';
import { UtilsService } from '../../services/utils.service';
import { TeamApiService } from '../../services/api/team-api.service';
import { Team } from '../../models/team';
import { catchError, map } from 'rxjs';
import { ERROR_TEAM_FETCH } from '../../../app/constants';
import { Season } from '../../models/season';
import { SpaceToUnderscorePipe } from '../../pipes/spaceToUnderscore.pipe';
import { environment } from '../../../enviroments/enviroment';
import { ImageService } from '../../services/image.service';

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
  protected readonly imageService = inject(ImageService);

  readonly variant = input<'chips' | 'logos'>('chips');
  readonly showFilters: InputSignal<boolean> = input(false);
  readonly season: InputSignal<Season> = input(environment.seasonActual);
  readonly initialSelectedTeams = input<string[]>([]);
  private selectionInitialized = false;
  protected selectedTeams: Set<string> = new Set();
  protected teams: WritableSignal<Team[]> = signal([]);
  @Output() selectedTeamsChanged = new EventEmitter<string[]>();

  constructor() {
    effect(onCleanup => {
      const season = this.season();
      const initial = this.selectionInitialized ? [] : untracked(this.initialSelectedTeams);
      this.selectionInitialized = true;
      this.selectedTeams.clear();
      this.selectedTeams.add('Todos los equipos');
      this.teams.set([]);
      if (!initial.length) untracked(() => this.emitSelection());

      const subscription = this.teamApiService.getAllTeams(season.number).pipe(
        map((teams: Team[] | undefined) => teams ?? []),
        catchError((error) => this.utilsService.handleError<Team[]>(ERROR_TEAM_FETCH, error, []))
      ).subscribe(teams => {
        this.teams.set(teams);
        const valid = initial.filter(name => teams.some(team => team.name === name));
        this.selectedTeams = new Set(valid.length ? valid : ['Todos los equipos']);
        if (initial.length) untracked(() => this.emitSelection());
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected toggleSelection(team: string): void {
    if (team === 'Todos los equipos') {
      if (this.variant() === 'logos') {
        this.selectedTeams.clear();
        this.selectedTeams.add(team);
        this.emitSelection();
      }
      return;
    }

    if (this.variant() === 'logos' && this.isSelected(team)) {
      this.selectedTeams.delete(team);
      if (!this.selectedTeams.size) this.selectedTeams.add('Todos los equipos');
      this.emitSelection();
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
