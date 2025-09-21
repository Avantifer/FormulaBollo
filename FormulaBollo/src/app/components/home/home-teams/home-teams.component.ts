import { UtilsService } from './../../../../shared/services/utils.service';
import { Component, inject, Signal } from '@angular/core';
import { Team } from '../../../../shared/models/team';
import { catchError } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_TEAM_FETCH } from '../../../constants';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { SpaceToUnderscorePipe } from "../../../../shared/pipes/spaceToUnderscore.pipe";
import { SkeletonModule } from 'primeng/skeleton';
import { ImageService } from '../../../../shared/services/image.service';
import { SkeletonItemsPipe } from '../../../../shared/pipes/skeletonItems.pipe';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CacheService } from '../../../../shared/services/cache.service';

@Component({
  selector: 'app-home-teams',
  imports: [
    CommonModule,
    RouterModule,
    SkeletonModule,
    SkeletonItemsPipe,
    SpaceToUnderscorePipe
  ],
  templateUrl: './home-teams.component.html',
  styleUrl: './home-teams.component.scss'
})
export class HomeTeamsComponent {
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly cacheService: CacheService = inject(CacheService);
  
  protected readonly router: Router = inject(Router);
  protected readonly imageService: ImageService = inject(ImageService);

  protected teams: Signal<Team[]> = toSignal(
    this.teamApiService.getAllTeams(environment.seasonActual.number)
    .pipe(
      catchError((error) => this.utilsService.handleError(ERROR_TEAM_FETCH, error, []))
    ),
    { initialValue: [] }
  );

  protected teamNameSpaceToUnderScore(teamName: string): string {
    return teamName.replaceAll(" ", "");
  }
}
