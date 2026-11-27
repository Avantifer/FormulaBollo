import { CacheService } from '../../../../shared/services/cache.service';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, delay, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';
import { Season } from '../../../../shared/models/season';
import { Team } from '../../../../shared/models/team';
import { TeamWithDrivers } from '../../../../shared/models/teamWithDrivers';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { ERROR_TEAM_FETCH } from '../../../constants';
import { isVacantDriver, pointMetrics } from '../../drivers/drivers-ranking/drivers-ranking.component';

type TeamStanding = Pick<TeamWithDrivers, 'team' | 'totalPoints'> & { drivers: DriverPoints[] };

@Component({
  selector: 'app-teams-ranking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SkeletonModule, SpaceToUnderscorePipe],
  templateUrl: './teams-ranking.component.html',
  styleUrl: './teams-ranking.component.scss'
})
export class TeamsRankingComponent {
  private readonly cache = inject(CacheService);
  readonly season = input<Season>(environment.seasonActual);
  readonly selectedTeams = input<string[]>([]);
  private readonly teamsApi = inject(TeamApiService);
  protected readonly imageService = inject(ImageService);
  protected readonly utilsService = inject(UtilsService);
  protected readonly isVacantDriver = isVacantDriver;
  protected readonly skeletonRows = Array.from({ length: 10 });
  protected readonly isLoading = signal(true);
  private readonly standings = signal<TeamStanding[]>([]);
  protected readonly rows = computed(() => {
    const standings = this.standings();
    const leader = standings.reduce((maximum, row) => Math.max(maximum, row.totalPoints), 0);
    const selected = this.selectedTeams();
    return standings.map(row => ({
      ...row,
      position: 1 + standings.filter(other => other.totalPoints > row.totalPoints).length,
      tied: standings.filter(other => other.totalPoints === row.totalPoints).length > 1,
      gap: pointMetrics(row.totalPoints, leader, row.totalPoints === leader).gap
    })).filter(row => !selected.length || selected.includes('Todos los equipos') || selected.includes(row.team.name));
  });

  constructor() {
    effect(onCleanup => {
      const season = this.season();
      this.isLoading.set(true);
      this.standings.set([]);
      const subscription = this.cache.refreshOnPublish(refresh => this.teamsApi.getllTeamsWithDrivers(season.number).pipe(
        delay(100),
        catchError(error => { if (refresh) throw error; return this.utilsService.handleError<TeamWithDrivers[]>(ERROR_TEAM_FETCH, error, []); }),
        switchMap(points => points.length
          ? of(points.map(row => ({ team: row.team, totalPoints: row.totalPoints, drivers: [row.driver1, row.driver2] })))
          : this.teamsApi.getAllTeams(season.number).pipe(
            catchError(error => { if (refresh) throw error; return this.utilsService.handleError<Team[]>(ERROR_TEAM_FETCH, error, []); }),
            map(teams => teams.map(team => ({ team, totalPoints: 0, drivers: [] })))
          ))
      )).subscribe(standings => {
        this.standings.set(standings);
        this.isLoading.set(false);
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected initials(name: string): string {
    const words = name.trim().split(/\s+/);
    return (words.length > 1 ? words[0][0] + words.at(-1)![0] : name.slice(0, 2)).toUpperCase();
  }
}
