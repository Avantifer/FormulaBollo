import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, map, of, shareReplay, switchMap } from 'rxjs';
import { ImageService } from '../../../shared/services/image.service';
import { AuthJWTService } from '../../../shared/services/authJWT.service';
import { FantasyApiService } from '../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../shared/services/api/race-api.service';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { Race } from '../../../shared/models/race';
import { buildFantasySeason } from './fantasy-clasification/fantasy-clasification.helpers';
import { formatNumber, formatRaceDay, formatRaceDayLong, formatRaceTime, leagueFigures, mostPicked, raceSegments, upcomingRaces } from './fantasy.helpers';

interface HowToPlayItem {
  title: string;
  summary: string;
  rules: string[];
  image: string;
  imageLight: string;
  imageAlt: string;
  width: number;
  height: number;
}

@Component({
  selector: 'app-fantasy',
  imports: [NgOptimizedImage, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fantasy.component.html',
  styleUrl: './fantasy.component.scss'
})
export class FantasyComponent {
  protected readonly imageService: ImageService = inject(ImageService);
  private readonly fantasyApi = inject(FantasyApiService);
  private readonly raceApi = inject(RaceApiService);

  readonly isLogged: boolean = inject(AuthJWTService).isLogged();
  readonly startLink: string = this.isLogged ? '/fantasy/team' : '/fantasy/register';

  private readonly seasonNumber$ = inject(SeasonApiService).getSeasonOfFantasy().pipe(
    map(seasons => Math.max(0, ...seasons.map(season => season.number))),
    catchError(() => of(0)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly season = toSignal(this.seasonNumber$.pipe(
    switchMap(number => number ? this.fantasyApi.getFantasyClasification(number).pipe(map(buildFantasySeason)) : of(null)),
    catchError(() => of(null))
  ), { initialValue: undefined });
  readonly loading = computed(() => this.season() === undefined);

  private readonly races = toSignal(this.seasonNumber$.pipe(
    switchMap(number => number ? this.raceApi.getAllRaces(number) : of([] as Race[])),
    catchError(() => of([] as Race[]))
  ), { initialValue: [] as Race[] });

  readonly top = computed(() => this.season()?.total.slice(0, 5) ?? []);
  readonly picks = computed(() => {
    const season = this.season();
    const picks = season ? mostPicked(season) : null;
    return picks?.drivers.length || picks?.teams.length ? picks : null;
  });
  readonly figures = computed(() => {
    const season = this.season();
    return season && season.data.entries.length ? leagueFigures(season) : null;
  });
  readonly segments = computed(() => {
    const season = this.season();
    return season ? raceSegments(season) : [];
  });
  readonly upcoming = computed(() => {
    const season = this.season();
    return season ? upcomingRaces(season, this.races()) : [];
  });
  readonly remaining = computed(() => this.segments().filter(segment => segment.state !== 'played').length);
  readonly progress = computed(() => {
    const figures = this.figures();
    return figures && figures.total ? String(Math.round(figures.played / figures.total * 1000) / 10).replace('.', ',') : '0';
  });

  protected readonly formatNumber = formatNumber;
  protected readonly formatDay = formatRaceDay;
  protected readonly formatDayLong = formatRaceDayLong;
  protected readonly formatTime = formatRaceTime;

  readonly howToPlay: HowToPlayItem[] = [
    {
      title: 'Crea tu equipo',
      summary: '3 pilotos y 2 escuderías, 80 millones, guardado hasta 12 horas antes de la carrera',
      rules: [
        'Escoge tu equipo favorito de 3 pilotos y 2 escuderías, manteniéndote debajo del presupuesto ficticio de 80 millones.',
        'Los tendrás que rellenar por cada temporada.',
        'El equipo NO se guarda automáticamente, se tendrá que guardar y crear cada jornada.',
        'Puedes guardar el equipo hasta 12 horas antes de la carrera, después no dejará.'
      ],
      image: 'fantasy/fantasyHowToPlay1.avif?v=2',
      imageLight: 'fantasy/fantasyHowToPlay1-light.avif?v=2',
      imageAlt: 'Selector de equipo con tres pilotos y dos escuderías elegidos',
      width: 632,
      height: 378
    },
    {
      title: 'Precios dinámicos',
      summary: 'Los precios cambian cada jornada según el rendimiento',
      rules: [
        'Los precios van cambiando cada jornada dependiendo del rendimiento del jugador en la carrera.',
        'De esta manera vas a poder variar tu equipo y analizar cuál puede ser el mejor equipo para la jornada que viene.',
        'Al igual también va cambiando el precio de los equipos teniendo en cuenta los pilotos de la escudería en específico.'
      ],
      image: 'fantasy/fantasyHowToPlay2.avif?v=2',
      imageLight: 'fantasy/fantasyHowToPlay2-light.avif?v=2',
      imageAlt: 'Lista de pilotos con su precio y su variación',
      width: 964,
      height: 488
    },
    {
      title: 'Sistema de puntuación',
      summary: 'Puntos por posición, vuelta rápida y pole; sin puntos por DNF o no participar',
      rules: [
        'Los puntos de los pilotos se definirán dependiendo de su rendimiento en la carrera.',
        'Cuanto más arriba quede el piloto más puntos obtendrán al igual que si tiene la vuelta rápida o haya obtenido una pole.',
        'No obtendrá puntos si consiguió hacer un DNF o si ni siquiera participó.'
      ],
      image: 'fantasy/fantasyHowToPlay3.avif?v=2',
      imageLight: 'fantasy/fantasyHowToPlay3-light.avif?v=2',
      imageAlt: 'Tarjetas de los pilotos y escuderías elegidos con los puntos de cada uno',
      width: 791,
      height: 576
    },
    {
      title: 'Clasificación',
      summary: 'Una sola liga para todos y puedes ver los equipos de los demás',
      rules: [
        'Compite con tus amigos o compañeros de F1 Bollo para ver quién es el mejor jugador del Fantasy Bollo.',
        'Todos estarán en la misma liga y aunque no juegues al F1 Bollo puedes seguir jugando al Fantasy Bollo y estar pendiente de la competición.',
        'También podrás ver el equipo que escogieron para obtener inspiración.'
      ],
      image: 'fantasy/fantasyHowToPlay4.avif?v=2',
      imageLight: 'fantasy/fantasyHowToPlay4-light.avif?v=2',
      imageAlt: 'Clasificación general con posición, usuario y puntos, junto al detalle del equipo del líder',
      width: 1265,
      height: 439
    }
  ];
}
