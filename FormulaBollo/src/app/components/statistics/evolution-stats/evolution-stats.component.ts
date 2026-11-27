import { CacheService } from '../../../../shared/services/cache.service';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { Season } from '../../../../shared/models/season';
import { StatisticsOverview } from '../../../../shared/models/statistics';
import { StatisticsApiService } from '../../../../shared/services/api/statistics-api.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { environment } from '../../../../enviroments/enviroment';
import { colorsMappings } from '../../../constants';
import { LINE_DASHES } from '../chart-labels';
import { isVacant } from '../general-stats/general-stats.charts';
import { buildEvolutionChart, EvolutionPalette } from './evolution-stats.charts';

@Component({
  selector: 'app-evolution-stats',
  imports: [ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evolution-stats.component.html',
  styleUrl: './evolution-stats.component.scss'
})
export class EvolutionStatsComponent implements OnChanges {
  private readonly cache = inject(CacheService);
  private readonly api = inject(StatisticsApiService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seasonSelected = input<Season>(environment.seasonActual);
  readonly typeSelected = input<'Pilotos' | 'Equipos'>('Pilotos');
  protected readonly overview = signal<StatisticsOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly selectedIds = signal<number[]>([]);
  private readonly media = window.matchMedia('(max-width: 639px)');
  protected readonly mobile = signal(this.media.matches);
  private request?: Subscription;
  private loadedSeason?: number;
  protected readonly isTeams = computed(() => this.typeSelected() === 'Equipos');
  protected readonly noun = computed(() => this.isTeams() ? 'escuderías' : 'pilotos');
  protected readonly source = computed(() => {
    const data = this.overview();
    return data ? this.isTeams() ? data.teamEvolution : data.driverEvolution : null;
  });
  protected readonly palette = computed<EvolutionPalette>(() => {
    this.theme.isDarkTheme();
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue('--' + name).trim();
    return { ink: token('ink'), soft: token('ink-soft'), rule: token('rule'), panel: token('panel') };
  });
  protected readonly series = computed(() => this.source()?.series.map(entry => {
    const entity = 'driver' in entry ? entry.driver : entry.team;
    const team = 'driver' in entry ? entry.driver.team.name : entry.team.name;
    return { id: entity.id, name: entity.name, color: colorsMappings[team] ?? this.palette().soft, cumulative: entry.cumulative };
  }) ?? []);
  protected readonly participants = computed(() => this.series().filter(entry => !isVacant(entry.name))
    .sort((a, b) => (b.cumulative.at(-1) ?? 0) - (a.cumulative.at(-1) ?? 0) || a.name.localeCompare(b.name, 'es')));
  protected readonly chips = computed(() => this.participants().map(entry => {
    const index = this.selectedIds().indexOf(entry.id);
    return { ...entry, selected: index !== -1, dash: LINE_DASHES[Math.max(0, index)], disabled: index === -1 && this.selectedIds().length === 6 };
  }));
  protected readonly empty = computed(() => !this.overview()?.summary.finishedRaces || !this.source()?.races.length || !this.participants().length);
  protected readonly chart = computed(() => buildEvolutionChart(
    this.source()?.races ?? [], this.participants(), this.selectedIds(), this.mobile(), this.palette()
  ));
  protected readonly announcement = computed(() => 'Mostrando ' + this.selectedIds().length + ' ' + this.noun());

  constructor() {
    const resize = (event: MediaQueryListEvent) => this.mobile.set(event.matches);
    this.media.addEventListener('change', resize);
    this.destroyRef.onDestroy(() => {
      this.media.removeEventListener('change', resize);
      this.request?.unsubscribe();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const season = this.seasonSelected().number;
    if (season !== this.loadedSeason) this.load(season);
    else if (changes['typeSelected']) this.reset();
  }

  protected toggle(id: number): void {
    const selected = this.selectedIds();
    if (selected.includes(id)) {
      if (selected.length > 1) this.selectedIds.set(selected.filter(value => value !== id));
    } else if (selected.length < 6) this.selectedIds.set([...selected, id]);
  }

  protected reset(): void {
    this.selectedIds.set(this.empty() ? [] : this.participants().slice(0, 4).map(entry => entry.id));
  }

  protected retry(): void {
    this.load(this.seasonSelected().number);
  }

  private load(season: number): void {
    this.request?.unsubscribe();
    this.loadedSeason = season;
    this.loading.set(true);
    this.loadError.set(false);
    this.overview.set(null);
    this.selectedIds.set([]);
    this.request = this.cache.refreshOnPublish(() => this.api.getOverview(season)).subscribe({
      next: data => {
        const previous = this.overview();
        this.overview.set(data);
        if (!previous) this.reset();
        else {
          const valid = this.selectedIds().filter(id => this.participants().some(entry => entry.id === id));
          if (valid.length) this.selectedIds.set(valid);
          else this.reset();
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }
}
