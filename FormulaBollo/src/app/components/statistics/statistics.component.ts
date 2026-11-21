import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../shared/models/season';
import { RecordsComponent } from './records/records.component';
import { GeneralStatsComponent } from './general-stats/general-stats.component';
import { EvolutionStatsComponent } from './evolution-stats/evolution-stats.component';
import { environment } from '../../../enviroments/enviroment';
import { ComparativeStatsComponent } from './comparative-stats/comparative-stats.component';

@Component({
  selector: 'app-statistics',
  imports: [SelectSeasonsComponent, RecordsComponent, GeneralStatsComponent, EvolutionStatsComponent, ComparativeStatsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent {
  protected readonly selectedTab = signal('general');
  protected readonly tabs = [
    { label: 'General', value: 'general' },
    { label: 'Evolución', value: 'evolucion' },
    { label: 'Comparativa', value: 'comparative' },
    { label: 'Récords', value: 'records' }
  ];
  protected readonly listOptions = ['Pilotos', 'Equipos'] as const;
  protected readonly typeSelected = signal<'Pilotos' | 'Equipos'>('Pilotos');
  protected readonly seasonSelected = signal(new Season(0, 'Total', 0));
  protected readonly seasonEvolucionSelected = signal(environment.seasonActual);

  onSeasonChange(season: Season): void {
    if (this.selectedTab() === 'general') this.seasonSelected.set(season);
    if (season.number !== 0) this.seasonEvolucionSelected.set(season);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % this.tabs.length; break;
      case 'ArrowLeft': next = (index + this.tabs.length - 1) % this.tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = this.tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    this.selectedTab.set(this.tabs[next].value);
    (event.currentTarget as HTMLElement).parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus();
  }
}
