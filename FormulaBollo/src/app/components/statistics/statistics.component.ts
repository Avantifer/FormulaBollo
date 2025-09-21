import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../shared/models/season';
import { RecordsComponent } from "./records/records.component";
import { GeneralStatsComponent } from './general-stats/general-stats.component';
import { EvolutionStatsComponent } from './evolution-stats/evolution-stats.component';
import { environment } from '../../../enviroments/enviroment';
import { ComparativeStatsComponent } from './comparative-stats/comparative-stats.component';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ButtonModule,
    SelectButtonModule,
    SelectSeasonsComponent,
    RecordsComponent,
    GeneralStatsComponent,
    EvolutionStatsComponent,
    ComparativeStatsComponent
  ],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent {
  protected selectedTab: string = 'general';
  protected readonly tabs = [
    { label: 'General', icon: 'pi pi-chart-bar', value: 'general' },
    { label: 'Evolución', icon: 'pi pi-chart-line', value: 'evolucion' },
    { label: 'Comparativa', icon: 'pi pi-sort-alt', value: 'comparative' },
    { label: 'Récords', icon: 'pi pi-trophy', value: 'records' },
  ];
  protected readonly listOptions: any[] = [
    { icon: 'pi pi-user', value: 'Pilotos' },
    { icon: 'pi pi-car', value: 'Equipos' }
  ];

  protected typeSelected: string = 'Pilotos';
  protected seasonSelected: Season = new Season(0, "Total", 0);
  protected seasonEvolucionSelected: Season = environment.seasonActual;

  onSeasonChange(newSeason: Season): void {
    this.seasonSelected = newSeason;
    this.seasonEvolucionSelected = newSeason;
  }
}
