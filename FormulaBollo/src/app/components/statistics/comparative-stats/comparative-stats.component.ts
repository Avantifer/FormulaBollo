import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { Season } from '../../../../shared/models/season';
import { StatisticsHeadToHead, StatisticsOverview } from '../../../../shared/models/statistics';
import { StatisticsApiService } from '../../../../shared/services/api/statistics-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { environment } from '../../../../enviroments/enviroment';
import { colorsMappings } from '../../../constants';
import { raceCodes } from '../evolution-stats/evolution-stats.charts';
import { isVacant } from '../general-stats/general-stats.charts';
import { buildComparisonChart, comparisonMetricLabel, comparisonMetrics, comparisonColors, ComparisonPalette, MUTED_TEAM_WEIGHT, Contender, duelHeadline, teamHeadToHead } from './comparative-stats.helpers';

@Component({
  selector: 'app-comparative-stats',
  imports: [ChartModule, FormsModule, SelectModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comparative-stats.component.html',
  styleUrl: './comparative-stats.component.scss'
})
export class ComparativeStatsComponent implements OnChanges {
  private readonly api = inject(StatisticsApiService);
  private readonly theme = inject(ThemeService);
  private readonly images = inject(ImageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seasonSelected = input<Season>(environment.seasonActual);
  readonly typeSelected = input<'Pilotos' | 'Equipos'>('Pilotos');
  protected readonly overview = signal<StatisticsOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly duel = signal<StatisticsHeadToHead | null>(null);
  protected readonly duelLoading = signal(false);
  protected readonly duelError = signal(false);
  protected readonly failedImages = signal<string[]>([]);
  private readonly media = window.matchMedia('(max-width: 639px)');
  protected readonly mobile = signal(this.media.matches);
  private request?: Subscription;
  private duelRequest?: Subscription;
  private loadedSeason?: number;
  protected readonly isTeams = computed(() => this.typeSelected() === 'Equipos');
  protected readonly metricLabel = comparisonMetricLabel;
  protected readonly palette = computed<ComparisonPalette>(() => {
    this.theme.isDarkTheme();
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue('--' + name).trim();
    return { ink: token('ink'), soft: token('ink-soft'), rule: token('rule'), panel: token('panel'), flat: token('sector-flat') };
  });
  protected readonly source = computed(() => {
    const data = this.overview();
    return data ? this.isTeams() ? data.teamEvolution : data.driverEvolution : null;
  });
  protected readonly candidates = computed<Contender[]>(() => {
    const data = this.overview();
    if (!data) return [];
    const entries = this.isTeams() ? data.teams : data.drivers;
    return entries.map(stats => {
      const entity = 'driver' in stats ? stats.driver : stats.team;
      const team = 'driver' in stats ? stats.driver.team : stats.team;
      const image = 'driver' in stats ? stats.driver.driverImage : stats.team.logoImage;
      const series = this.source()?.series.find(entry => ('driver' in entry ? entry.driver.id : entry.team.id) === entity.id);
      return {
        id: entity.id, name: entity.name, team: team.name, image: image ? this.images.getImageUrl(image) : '',
        initials: entity.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase(),
        rank: 0, color: colorsMappings[team.name] ?? this.palette().soft, stats, cumulative: series?.cumulative ?? []
      };
    }).filter(entry => !isVacant(entry.name))
      .sort((a, b) => b.stats.totalPoints - a.stats.totalPoints || a.name.localeCompare(b.name, 'es'))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  });
  protected readonly selected = computed(() => this.selectedIds().flatMap(id => this.candidates().filter(entry => entry.id === id)));
  protected readonly mutedTeamPercent = MUTED_TEAM_WEIGHT * 100 + '%';
  protected readonly sameColor = computed(() => {
    const [a, b] = this.selected();
    return !!a && !!b && a.color.toLowerCase() === b.color.toLowerCase();
  });
  protected readonly markColors = computed(() => comparisonColors(this.selected(), this.palette().flat));
  protected readonly metrics = computed(() => {
    const [a, b] = this.selected();
    return a && b ? comparisonMetrics(a.stats, b.stats, this.isTeams()) : [];
  });
  protected readonly headline = computed(() => {
    const [a, b] = this.selected();
    return this.duel() && a && b ? duelHeadline(this.duel()!, a.name, b.name) : '';
  });
  protected readonly split = computed(() => {
    const duel = this.duel();
    const total = duel?.comparable ?? 0;
    return total ? [duel!.aheadA / total * 100, duel!.aheadB / total * 100, (total - duel!.aheadA - duel!.aheadB) / total * 100] : [0, 0, 0];
  });
  protected readonly raceCells = computed(() => {
    const races = this.duel()?.races ?? [];
    const codes = raceCodes(races.map(entry => entry.race));
    return races.map((entry, index) => ({
      ...entry, code: codes[index].slice(0, 3),
      a: this.raceValue(entry.positionA), b: this.raceValue(entry.positionB),
      winner: entry.result === 'NONE' ? entry.positionA === null && entry.positionB === null ? '×' : '=' : this.selected()[entry.result === 'A' ? 0 : 1].name
    }));
  });
  protected readonly chart = computed(() => buildComparisonChart(
    this.source()?.races ?? [], this.selected(), this.mobile(), this.palette()
  ));
  protected readonly announcement = computed(() => {
    const [a, b] = this.selected();
    return a && b ? 'Comparando ' + a.name + ' con ' + b.name : '';
  });

  constructor() {
    const resize = (event: MediaQueryListEvent) => this.mobile.set(event.matches);
    this.media.addEventListener('change', resize);
    this.destroyRef.onDestroy(() => {
      this.media.removeEventListener('change', resize);
      this.request?.unsubscribe();
      this.duelRequest?.unsubscribe();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const season = this.seasonSelected().number;
    if (season !== this.loadedSeason) this.load(season);
    else if (changes['typeSelected']) this.reset();
  }

  protected select(id: number, index: number): void {
    if (!this.candidates().some(entry => entry.id === id)) return;
    const ids = [...this.selectedIds()];
    if (ids[index] === id) return;
    if (ids[1 - index] === id) this.swap();
    else {
      ids[index] = id;
      this.selectedIds.set(ids);
      this.loadDuel();
    }
  }

  protected swap(): void {
    this.selectedIds.update(ids => [...ids].reverse());
    this.loadDuel();
  }

  protected retry(): void {
    this.load(this.seasonSelected().number);
  }

  protected loadDuel(): void {
    this.duelRequest?.unsubscribe();
    this.duel.set(null);
    this.duelError.set(false);
    this.duelLoading.set(false);
    const [a, b] = this.selectedIds();
    if (a === undefined || b === undefined || !this.overview()) return;
    if (this.isTeams()) {
      this.duel.set(teamHeadToHead(this.overview()!, a, b));
      return;
    }
    const [driverA, driverB] = this.selected();
    if (!driverA || !driverB) return;
    this.duelLoading.set(true);
    this.duelRequest = this.api.getHeadToHead(this.seasonSelected().number, driverA.name, driverB.name).subscribe({
      next: data => { this.duel.set(data); this.duelLoading.set(false); },
      error: () => { this.duelError.set(true); this.duelLoading.set(false); }
    });
  }

  protected imageFailed(url: string): void {
    this.failedImages.update(urls => [...urls, url]);
  }

  private raceValue(value: number | null): string {
    return value === null ? 'DNF' : this.isTeams() ? value.toLocaleString('es-ES') + ' pts' : 'P' + value;
  }

  private reset(): void {
    this.selectedIds.set(this.candidates().slice(0, 2).map(entry => entry.id));
    this.loadDuel();
  }

  private load(season: number): void {
    this.request?.unsubscribe();
    this.duelRequest?.unsubscribe();
    this.loadedSeason = season;
    this.loading.set(true);
    this.loadError.set(false);
    this.overview.set(null);
    this.selectedIds.set([]);
    this.duel.set(null);
    this.request = this.api.getOverview(season).subscribe({
      next: data => { this.overview.set(data); this.reset(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.loadError.set(true); }
    });
  }
}
