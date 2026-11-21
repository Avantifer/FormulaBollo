import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnChanges, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Season } from '../../../../shared/models/season';
import { StatisticsOverview } from '../../../../shared/models/statistics';
import { StatisticsApiService } from '../../../../shared/services/api/statistics-api.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { colorsMappings } from '../../../constants';
import { buildStatisticsCharts, centerTextPlugin, isVacant, StatisticsPalette } from './general-stats.charts';

@Component({
  selector: 'app-general-stats',
  imports: [ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './general-stats.component.html',
  styleUrl: './general-stats.component.scss'
})
export class GeneralStatsComponent implements OnChanges {
  private readonly api = inject(StatisticsApiService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seasonSelected = input(new Season(0, 'Total', 0));
  readonly typeSelected = input('Pilotos');
  protected readonly overview = signal<StatisticsOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly plugins = [ChartDataLabels, centerTextPlugin];
  private readonly media = window.matchMedia('(max-width: 639px)');
  protected readonly mobile = signal(this.media.matches);
  private request?: Subscription;
  private loadedSeason?: number;
  protected readonly skeletons = Array.from({ length: 6 }, (_, index) => index);
  protected readonly drivers = computed(() => this.overview()?.drivers.filter(entry => !isVacant(entry.driver.name)) ?? []);
  protected readonly isTeams = computed(() => this.typeSelected() === 'Equipos');
  protected readonly empty = computed(() => {
    const data = this.overview();
    return !data || data.summary.finishedRaces === 0 || (this.isTeams() ? data.teams.length === 0 : this.drivers().length === 0);
  });
  protected readonly palette = computed<StatisticsPalette>(() => {
    this.theme.isDarkTheme();
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue('--' + name).trim();
    return {
      ink: token('ink'), soft: token('ink-soft'), rule: token('rule'), panel: token('panel'),
      up: token('sector-up'), down: token('sector-down'), best: token('sector-best'),
      gold: token('podium-1'), silver: token('podium-2'), bronze: token('podium-3')
    };
  });
  protected readonly cards = computed(() => {
    const data = this.overview();
    return data ? buildStatisticsCharts(data, this.isTeams(), this.mobile(), this.theme.isDarkTheme(), this.palette()) : [];
  });
  protected readonly keyFigures = computed(() => {
    const data = this.overview();
    if (!data) return [];
    const entries = this.isTeams() ? data.teams.map(entry => ({ ...entry, name: entry.team.name })) : this.drivers().map(entry => ({ ...entry, name: entry.driver.name }));
    const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name, 'es'));
    const leader = sorted[0];
    const winner = [...entries].sort((a, b) => b.victories - a.victories || a.name.localeCompare(b.name, 'es'))[0];
    const pole = [...entries].sort((a, b) => b.poles - a.poles || a.name.localeCompare(b.name, 'es'))[0];
    const reliable = [...entries].filter(entry => entry.races > 0).sort((a, b) => a.dnfs / a.races - b.dnfs / b.races || a.name.localeCompare(b.name, 'es'))[0];
    return [
      { label: 'Líder de puntos', value: leader?.totalPoints ?? 0, suffix: '', detail: (leader?.name ?? '—') + ' · Ventaja ' + data.summary.margin + ' pts', reference: leader },
      { label: 'Victorias', value: entries.reduce((sum, entry) => sum + entry.victories, 0), suffix: '', detail: data.summary.distinctWinners + ' ganadores distintos', reference: winner },
      { label: 'Pole → victoria', value: data.summary.poleWinRate, suffix: ' %', detail: 'Poles convertidas en victoria', reference: pole },
      { label: 'Abandonos', value: data.summary.dnfRate * 100, suffix: ' %', detail: 'De las participaciones', reference: reliable }
    ].map(figure => ({
      ...figure, sparkline: this.sparkline(figure.reference?.pointsBySeason ?? {}),
      sparkLabel: 'Puntos por temporada de ' + (figure.reference?.name ?? '—')
    }));
  });
  protected readonly remainingPoints = computed(() => {
    const entries = [...this.drivers()].sort((a, b) => b.totalPoints - a.totalPoints || a.driver.name.localeCompare(b.driver.name, 'es')).slice(this.mobile() ? 5 : 10);
    return {
      count: entries.length, height: entries.length * 38 + 45,
      data: { labels: entries.map(entry => entry.driver.name), datasets: [{ label: 'Puntos totales', data: entries.map(entry => entry.totalPoints), backgroundColor: entries.map(entry => colorsMappings[entry.driver.team.name] ?? this.palette().soft), barThickness: 14 }] },
      text: entries.map(entry => entry.driver.name + ': ' + entry.totalPoints).join('; ')
    };
  });

  constructor() {
    const resize = (event: MediaQueryListEvent) => this.mobile.set(event.matches);
    this.media.addEventListener('change', resize);
    this.destroyRef.onDestroy(() => {
      this.media.removeEventListener('change', resize);
      this.request?.unsubscribe();
    });
  }

  ngOnChanges(): void {
    const season = this.seasonSelected().number;
    if (season !== this.loadedSeason) this.load(season);
  }

  protected retry(): void {
    this.load(this.seasonSelected().number);
  }

  protected formatValue(value: number | null): string {
    return value === null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  }

  private load(season: number): void {
    this.request?.unsubscribe();
    this.loadedSeason = season;
    this.loading.set(true);
    this.loadError.set(false);
    this.overview.set(null);
    this.request = this.api.getOverview(season).subscribe({
      next: data => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }

  private sparkline(points: Record<string, number>): string | null {
    const values = Object.keys(points).sort((a, b) => Number(a) - Number(b)).map(key => points[key]);
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const extent = Math.max(...values) - min || 1;
    return values.map((value, index) => (2 + index * 84 / (values.length - 1)) + ',' + (30 - (value - min) * 26 / extent)).join(' ');
  }
}
