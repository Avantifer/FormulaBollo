import { CacheService } from '../../../../shared/services/cache.service';
import { UtilsService } from './../../../../shared/services/utils.service';
import { Component, inject, signal } from '@angular/core';
import { Team } from '../../../../shared/models/team';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_TEAM_FETCH } from '../../../constants';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { SpaceToUnderscorePipe } from "../../../../shared/pipes/spaceToUnderscore.pipe";
import { SkeletonModule } from 'primeng/skeleton';
import { ImageService } from '../../../../shared/services/image.service';
import { SkeletonItemsPipe } from '../../../../shared/pipes/skeletonItems.pipe';

@Component({
  selector: 'app-home-teams',
  imports: [
    RouterModule,
    SkeletonModule,
    SkeletonItemsPipe,
    SpaceToUnderscorePipe
],
  templateUrl: './home-teams.component.html'
})
export class HomeTeamsComponent {
  private readonly cache = inject(CacheService);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly imageService: ImageService = inject(ImageService);

  protected readonly teams = signal<Team[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  private loadSubscription?: Subscription;

  ngOnInit(): void {
    this.retry();
  }

  protected retry(): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.loadSubscription = this.cache.refreshOnPublish(() => this.teamApiService.getAllTeams(environment.seasonActual.number)).subscribe({
      next: teams => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: error => {
        this.loadError.set(true);
        this.loading.set(false);
        this.utilsService.handleError(ERROR_TEAM_FETCH, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  protected teamNameSpaceToUnderScore(teamName: string): string {
    return this.utilsService.spaceToUnderScore(teamName);
  }
}
