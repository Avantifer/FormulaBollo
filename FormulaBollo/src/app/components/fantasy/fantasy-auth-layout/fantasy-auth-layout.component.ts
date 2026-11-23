import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { buildFantasySeason } from '../fantasy-clasification/fantasy-clasification.helpers';

@Component({
  selector: 'app-fantasy-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fantasy-auth-layout.component.html',
  styleUrl: './fantasy-auth-layout.component.scss'
})
export class FantasyAuthLayoutComponent {
  readonly title = input('Arma tu parrilla');
  readonly help = input('Tu estrategia. Los puntos reales de cada carrera.');
  readonly compactHelp = input('Tu equipo empieza con una cuenta.');
  private readonly fantasyApi = inject(FantasyApiService);
  readonly season = toSignal(inject(SeasonApiService).getSeasonOfFantasy().pipe(
    map(seasons => Math.max(0, ...seasons.map(season => season.number))),
    switchMap(number => number ? this.fantasyApi.getFantasyClasification(number) : of(null)),
    map(data => data ? buildFantasySeason(data) : null),
    catchError(() => of(null))
  ), { initialValue: null });
  readonly podium = computed(() => this.season()?.total.slice(0, 3) ?? []);
  readonly played = computed(() => this.season()?.races.filter(race => race.played).length ?? 0);
}
