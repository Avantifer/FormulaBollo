import { SkeletonModule } from 'primeng/skeleton';
import { ActivatedRoute, convertToParamMap, Router, RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../shared/models/season';
import { Race } from '../../../shared/models/race';
import { environment } from '../../../enviroments/enviroment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ERROR_RACE_FETCH } from '../../constants';
import { ImageService } from '../../../shared/services/image.service';
import { RaceApiService } from '../../../shared/services/api/race-api.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { SpaceToUnderscorePipe } from '../../../shared/pipes/spaceToUnderscore.pipe';
import { SkeletonItemsPipe } from '../../../shared/pipes/skeletonItems.pipe';

@Component({
  selector: 'app-races',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SkeletonModule,
    SkeletonItemsPipe,
    SpaceToUnderscorePipe,
    SelectSeasonsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './races.component.html',
  styleUrl: './races.component.scss'
})
export class RacesComponent {
  private readonly raceApiService: RaceApiService = inject(RaceApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly initialParams = this.route.snapshot.queryParamMap ?? convertToParamMap(this.route.snapshot.queryParams ?? {});
  private readonly requestedSeason = Number(this.initialParams.get('season'));
  protected readonly initialSeasonNumber = Number.isSafeInteger(this.requestedSeason) && this.requestedSeason > 0
    ? this.requestedSeason : environment.seasonActual.number;
  public imageService: ImageService = inject(ImageService);

  protected seasonSelected: Season = environment.seasonActual;

  protected races: WritableSignal<Race[]> = signal<Race[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly sortedRaces = computed(() => [...this.races()].sort(
    (a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
  ));
  protected readonly featuredRace = computed(() => this.sortedRaces().find(race => !race.finished) ?? this.sortedRaces().at(-1));
  protected readonly calendarRaces = computed(() => this.sortedRaces().filter(race => race !== this.featuredRace()));
  private loadSubscription?: Subscription;
  private loadedSeasonNumber?: number;
  private seasonReady = false;

  onSeasonChange(newSeason: Season): void {
    const initialized = this.seasonReady;
    if (initialized && this.seasonSelected.number === newSeason.number) return;
    this.seasonSelected = newSeason;
    this.seasonReady = true;
    if (this.loadedSeasonNumber !== newSeason.number) {
      this.getRaces(newSeason);
    }
    if (initialized) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { season: newSeason.number === environment.seasonActual.number ? null : newSeason.number },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  ngOnInit(): void {
    if (this.initialSeasonNumber === environment.seasonActual.number) this.getRaces(this.seasonSelected);
  }

  protected retry(): void {
    this.getRaces(this.seasonSelected);
  }

  private getRaces(season: Season): void {
    this.loadSubscription?.unsubscribe();
    this.loadedSeasonNumber = season.number;
    this.loading.set(true);
    this.loadError.set(false);
    this.races.set([]);
    this.loadSubscription = this.raceApiService.getAllRaces(season.number).subscribe({
      next: races => {
        this.races.set(races);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.loadError.set(true);
        this.utilsService.handleError(ERROR_RACE_FETCH, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }
}
