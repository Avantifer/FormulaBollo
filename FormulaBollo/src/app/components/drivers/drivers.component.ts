import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { environment } from '../../../enviroments/enviroment';
import { Season } from '../../../shared/models/season';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { TeamsFiltersComponent } from '../../../shared/components/teams-filters/teams-filters.component';
import { DriversRankingComponent } from './drivers-ranking/drivers-ranking.component';

@Component({
  selector: 'app-drivers',
  imports: [SelectSeasonsComponent, TeamsFiltersComponent, DriversRankingComponent],
  templateUrl: './drivers.component.html'
})
export class DriversComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  // Read once: later URL updates are outputs, never inputs to the current view.
  private readonly initialParams = this.route.snapshot.queryParamMap ?? convertToParamMap(this.route.snapshot.queryParams ?? {});
  private readonly requestedSeason = Number(this.initialParams.get('season'));
  protected readonly initialSeasonNumber = Number.isSafeInteger(this.requestedSeason) && this.requestedSeason > 0
    ? this.requestedSeason : environment.seasonActual.number;
  protected readonly initialTeams = signal(this.initialParams.get('teams')?.split(',').filter(Boolean) ?? []);
  protected readonly seasonReady = signal(false);
  protected readonly selectedTeams = signal<string[]>([]);
  protected readonly season = signal<Season>(environment.seasonActual);

  protected onSeasonChange(newSeason: Season): void {
    const initialized = this.seasonReady();
    if (initialized && this.season().number === newSeason.number) return;
    this.season.set(newSeason);
    this.seasonReady.set(true);
    if (initialized) {
      this.initialTeams.set([]);
      this.selectedTeams.set(['Todos los equipos']);
      this.writeUrl();
    }
  }

  protected onTeamsChange(teams: string[]): void {
    if (teams.length === this.selectedTeams().length && teams.every((team, index) => team === this.selectedTeams()[index])) return;
    this.selectedTeams.set(teams);
    this.writeUrl();
  }

  private writeUrl(): void {
    const teams = this.selectedTeams();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        season: this.season().number === environment.seasonActual.number ? null : this.season().number,
        teams: !teams.length || teams.includes('Todos los equipos') ? null : teams.join(',')
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
