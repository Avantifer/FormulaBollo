import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { EMPTY, catchError } from 'rxjs';
import { DrawerModule } from 'primeng/drawer';
import { SelectSeasonsComponent } from '../../../../shared/components/select-seasons/select-seasons.component';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { Season } from '../../../../shared/models/season';
import { Race } from '../../../../shared/models/race';
import { FantasyClasificationDTO } from '../../../../shared/models/fantasy-clasification';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { ERROR_FANTASY_POINTS } from '../../../constants';
import { buildFantasySeason, fantasyStandings, fantasyTeamDetail } from './fantasy-clasification.helpers';
import { FantasyTeamDetailComponent } from './fantasy-team-detail/fantasy-team-detail.component';

@Component({
  selector: 'app-fantasy-clasification',
  standalone: true,
  imports: [SelectSeasonsComponent, SelectRacesComponent, DrawerModule, FantasyTeamDetailComponent, NgTemplateOutlet],
  templateUrl: './fantasy-clasification.component.html',
  styleUrl: './fantasy-clasification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FantasyClasificationComponent {
  private readonly api = inject(FantasyApiService);
  private readonly utils = inject(UtilsService);
  private readonly document = inject(DOCUMENT);
  private trigger?: HTMLButtonElement;
  readonly seasonSelected = signal<Season | undefined>(undefined);
  readonly raceSelected = signal<Race | undefined>(undefined);
  readonly data = signal<FantasyClasificationDTO | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly errorMessage = ERROR_FANTASY_POINTS;
  readonly selectedId = signal<number | null | undefined>(undefined);
  readonly sheetOpen = signal(false);
  readonly mobile = signal(false);
  readonly season = computed(() => this.data() ? buildFantasySeason(this.data()!) : null);
  readonly rows = computed(() => fantasyStandings(this.season(), this.raceSelected()?.id ?? 0));
  readonly selected = computed(() => this.selectedId() === null ? null : this.rows().find(row => row.userId === this.selectedId()) ?? this.rows()[0] ?? null);
  readonly detail = computed(() => {
    const season = this.season();
    const selected = this.selected();
    return season && selected ? fantasyTeamDetail(season, this.rows(), selected.userId, this.raceSelected()?.id ?? 0) : null;
  });
  readonly raceOptions = computed(() => this.season()?.races.map(race => new Race(race.id, race.name, '', '', new Date(0), this.seasonSelected()!, Number(race.played))) ?? []);
  readonly played = computed(() => this.season()?.races.filter(race => race.played).length ?? 0);
  readonly scenario = computed(() => this.raceSelected()?.id ? this.raceSelected()!.name : 'Temporada completa');
  readonly ties = computed(() => {
    const groups = new Map<number, string[]>();
    for (const row of this.rows().filter(row => row.tied)) groups.set(row.points, [...groups.get(row.points) ?? [], row.username]);
    return [...groups].map(([points, users]) => users.join(' y ') + ', ' + points + ' puntos. Comparten posición.');
  });
  readonly latestLeader = computed(() => {
    const season = this.season();
    const leader = season?.total[0];
    const race = season?.races.filter(race => race.played).at(-1);
    if (!leader || !race) return null;
    const entry = season!.data.entries.find(entry => entry.account.id === leader.userId && entry.raceId === race.id);
    return { username: leader.username, raceName: race.name, points: entry?.points ?? 0, participated: !!entry };
  });

  constructor() {
    const media = this.document.defaultView?.matchMedia('(max-width: 767px)');
    if (media) {
      this.mobile.set(media.matches);
      const update = () => {
        this.mobile.set(media.matches);
        if (!media.matches) this.sheetOpen.set(false);
      };
      media.addEventListener('change', update);
      inject(DestroyRef).onDestroy(() => media.removeEventListener('change', update));
    }
    effect(onCleanup => {
      const season = this.seasonSelected();
      if (!season) return;
      this.loading.set(true);
      this.failed.set(false);
      const request = this.api.getFantasyClasification(season.number).pipe(
        catchError(error => {
          if (this.seasonSelected()?.number !== season.number) return EMPTY;
          this.failed.set(true);
          this.loading.set(false);
          return this.utils.handleError<FantasyClasificationDTO | null>(ERROR_FANTASY_POINTS, error, null);
        })
      ).subscribe(data => {
        if (this.seasonSelected()?.number !== season.number) return;
        this.data.set(data);
        this.loading.set(false);
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  onSeasonChange(season: Season): void {
    if (this.seasonSelected()?.number === season.number) return;
    this.data.set(null);
    this.raceSelected.set(undefined);
    this.selectedId.set(undefined);
    this.sheetOpen.set(false);
    this.seasonSelected.set(season);
  }

  onRaceChange(race: Race): void {
    const selected = this.selected();
    this.raceSelected.set(race);
    this.selectedId.set(this.rows().some(row => row.userId === selected?.userId) ? selected!.userId : undefined);
  }

  viewTeam(userId: number, trigger: HTMLButtonElement): void {
    this.trigger = trigger;
    this.selectedId.set(userId);
    if (this.mobile()) this.sheetOpen.set(true);
  }

  closeDetail(): void {
    this.selectedId.set(null);
    this.sheetOpen.set(false);
    this.restoreFocus();
  }

  onSheetVisible(visible: boolean): void {
    if (!visible) this.closeDetail();
  }

  focusSheet(): void {
    this.document.querySelector<HTMLButtonElement>('.fantasy-sheet .detail-close')?.focus();
  }

  restoreFocus(): void {
    this.trigger?.focus();
  }
}
