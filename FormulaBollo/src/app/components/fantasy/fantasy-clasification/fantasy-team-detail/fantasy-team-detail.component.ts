import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ImageService } from '../../../../../shared/services/image.service';
import { SpaceToUnderscorePipe } from '../../../../../shared/pipes/spaceToUnderscore.pipe';
import { FantasyTeamDetail, fantasyInitials, fantasyUserInitials } from '../fantasy-clasification.helpers';

@Component({
  selector: 'app-fantasy-team-detail',
  standalone: true,
  imports: [SpaceToUnderscorePipe],
  templateUrl: './fantasy-team-detail.component.html',
  styleUrl: './fantasy-team-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FantasyTeamDetailComponent {
  readonly detail = input<FantasyTeamDetail | null>(null);
  readonly mobile = input(false);
  readonly closed = output<void>();
  readonly images = inject(ImageService);
  readonly failedImages = signal(new Set<string>());
  readonly initials = fantasyInitials;
  readonly userInitials = fantasyUserInitials;
  readonly groups = computed(() => {
    const detail = this.detail();
    return detail ? [{ title: 'Pilotos seleccionados', picks: detail.drivers, count: '3/3', kind: 'driver' }, { title: 'Equipos seleccionados', picks: detail.teams, count: '2/2', kind: 'team' }] : [];
  });
  readonly charts = computed(() => {
    const chart = this.detail()?.chart ?? [];
    if (!this.mobile()) return [chart];
    return Array.from({ length: Math.ceil(chart.length / 11) }, (_, index) => chart.slice(index * 11, (index + 1) * 11));
  });
  readonly graph = computed(() => this.charts().filter(chunk => chunk.length).map(chunk => {
    const width = this.mobile() ? 322 : 762;
    const height = this.mobile() ? 192 : 238;
    const baseline = height - 31;
    const graphHeight = height - 64;
    const top = this.detail()!.chartTop;
    const step = (width - 30) / chunk.length;
    return {
      width, height, baseline,
      ticks: [0, top / 2, top].map(value => ({ value, y: baseline - value / top * graphHeight })),
      bars: chunk.map((race, index) => ({ ...race, x: 28 + step * index, center: 24 + step * (index + 0.5), width: Math.max(1, step - 8), height: (race.points ?? 0) / top * graphHeight, y: baseline - (race.points ?? 0) / top * graphHeight }))
    };
  }));

  imageFailed(path: string): void {
    this.failedImages.update(paths => new Set([...paths, path]));
  }

  percent(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  }

  average(value: number): string {
    return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  }
}
