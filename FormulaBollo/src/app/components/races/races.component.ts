import { SkeletonModule } from 'primeng/skeleton';
import { RouterModule } from '@angular/router';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../shared/models/season';
import { Race } from '../../../shared/models/race';
import { environment } from '../../../enviroments/enviroment';
import { CommonModule } from '@angular/common';
import { catchError, delay, Subject, takeUntil } from 'rxjs';
import { ERROR_RACE_FETCH } from '../../constants';
import { ButtonModule } from 'primeng/button';
import { ImageService } from '../../../shared/services/image.service';
import { CarouselModule, CarouselResponsiveOptions } from 'primeng/carousel';
import { RaceApiService } from '../../../shared/services/api/race-api.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { SpaceToUnderscorePipe } from '../../../shared/pipes/spaceToUnderscore.pipe';
import { SkeletonItemsPipe } from '../../../shared/pipes/skeletonItems.pipe';

@Component({
  selector: 'app-races',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CarouselModule,
    RouterModule,
    SkeletonModule,
    SkeletonItemsPipe,
    SpaceToUnderscorePipe,
    SelectSeasonsComponent
  ],
  templateUrl: './races.component.html',
  styleUrl: './races.component.scss'
})
export class RacesComponent {
  private readonly raceApiService: RaceApiService = inject(RaceApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  public imageService: ImageService = inject(ImageService);

  protected seasonSelected: Season = environment.seasonActual;

  protected races: WritableSignal<Race[]> = signal<Race[]>([]);
  private readonly destroy$ = new Subject<void>();
  protected readonly responsiveOptionsCarousel: CarouselResponsiveOptions[] = [
    {
      breakpoint: '1520px',
      numVisible: 4,
      numScroll: 4,
    },
    {
      breakpoint: '1399px',
      numVisible: 3,
      numScroll: 3,
    },
    {
      breakpoint: '1023px',
      numVisible: 4,
      numScroll: 4,
    },
    {
      breakpoint: '991px',
      numVisible: 3,
      numScroll: 3,
    },
    {
      breakpoint: '767px',
      numVisible: 2,
      numScroll: 2,
    },
    { 
      breakpoint: '639px',
      numVisible: 1,
      numScroll: 1,
    }
  ];

  onSeasonChange(newSeason: Season): void {
    this.seasonSelected = newSeason;
    if (this.seasonSelected) {
      this.getRaces(newSeason);
    }
  }

  ngOnInit(): void {
    this.getRaces(this.seasonSelected);
  }

  private getRaces(season: Season): void {
    this.raceApiService.getAllRaces(season.number).pipe(
      takeUntil(this.destroy$),
      delay(100),
      catchError((error) => this.utilsService.handleError(ERROR_RACE_FETCH, error, [])),
    ).subscribe((races: Race[]) => this.races.set(races));
  }
}