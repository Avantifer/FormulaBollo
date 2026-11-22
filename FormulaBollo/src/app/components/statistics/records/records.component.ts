import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { RecordEntry, StatisticsRecords } from '../../../../shared/models/statistics';
import { Team } from '../../../../shared/models/team';
import { StatisticsApiService } from '../../../../shared/services/api/statistics-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { colorsMappings } from '../../../constants';
import { buildRecordsChart, RecordsPalette } from './records.charts';
import { initials, recordValue, seasonRecords, standingNotes, victoryLeaders } from './records.helpers';

@Component({
  selector: 'app-records',
  imports: [NgTemplateOutlet, RouterLink, ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss'
})
export class RecordsComponent {
  private readonly api = inject(StatisticsApiService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly imageService = inject(ImageService);
  protected readonly utilsService = inject(UtilsService);
  protected readonly data = signal<StatisticsRecords | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly failedImages = signal<string[]>([]);
  private readonly media = window.matchMedia('(max-width: 639px)');
  protected readonly mobile = signal(this.media.matches);
  private request?: Subscription;
  protected readonly format = recordValue;
  protected readonly initials = initials;
  protected readonly chasers = (ranking: RecordEntry[]) => ranking.filter(entry => entry.rank > 1).slice(0, 2);
  protected readonly skeletons = [0, 1, 2];
  protected readonly empty = computed(() => !this.data()?.seasons.length && !this.data()?.driverRecords.length);
  protected readonly seasons = computed(() => {
    const data = this.data();
    return [...(data?.seasons ?? [])].sort((a, b) => a.number - b.number).map(season => ({
      ...season, boards: seasonRecords(data?.driverRecords ?? [], season.number),
      notes: standingNotes(data?.driverRecords ?? [], season.number)
    }));
  });
  protected readonly years = computed(() => {
    const years = this.seasons().map(season => season.year);
    return years.length ? Math.min(...years) + '—' + Math.max(...years) : '—';
  });
  protected readonly totals = computed(() => this.seasons().reduce((sum, season) => ({
    finished: sum.finished + season.finishedRaces, races: sum.races + season.races
  }), { finished: 0, races: 0 }));
  protected readonly palette = computed<RecordsPalette>(() => {
    this.theme.isDarkTheme();
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue('--' + name).trim();
    return { ink: token('ink'), soft: token('ink-soft'), rule: token('rule'), panel: token('panel'), pending: token('panel-alt') };
  });
  protected readonly chart = computed(() => buildRecordsChart(this.data()?.victoryProgress ?? { races: [], series: [] }, this.seasons(), this.mobile(), this.palette()));
  protected readonly trajectory = computed(() => victoryLeaders(this.data()?.victoryProgress.series ?? []));

  constructor() {
    const resize = (event: MediaQueryListEvent) => this.mobile.set(event.matches);
    this.media.addEventListener('change', resize);
    this.destroyRef.onDestroy(() => {
      this.request?.unsubscribe();
      this.media.removeEventListener('change', resize);
    });
    this.load();
  }

  protected teamColor(team: Team): string {
    return colorsMappings[team.name] ?? this.palette().soft;
  }

  protected imageFailed(path: string): void {
    this.failedImages.update(paths => [...paths, path]);
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.data.set(null);
    this.request = this.api.getRecords().subscribe({
      next: data => { this.data.set(data); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); }
    });
  }
}
