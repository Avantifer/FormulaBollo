import { Component} from '@angular/core';
import { environment } from '../../../enviroments/enviroment';
import { Season } from '../../../shared/models/season';
import { FormsModule } from '@angular/forms';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { DividerModule } from 'primeng/divider';
import { RaceDetailsComponent } from "../../../shared/components/race-details/race-details.component";
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { DriversGridTableComponent } from "../../../shared/components/drivers-teams-grid-table/drivers-teams-grid-table.component";
import { CommonModule } from '@angular/common';
import { TeamsFiltersComponent } from "../../../shared/components/teams-filters/teams-filters.component";

@Component({
  selector: 'app-drivers',
  imports: [
    CommonModule,
    FormsModule,
    DividerModule,
    SelectButtonModule,
    ButtonModule,
    SelectSeasonsComponent,
    RaceDetailsComponent,
    DriversGridTableComponent,
    TeamsFiltersComponent
  ],
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.scss'
})
export class DriversComponent {
  protected readonly listOptions: any[] = [
    { icon: 'pi pi-th-large', value: 'grid' },
    { icon: 'pi pi-bars', value: 'list' }
  ];
  protected listValue: string = 'grid';
  protected showFilters: boolean = false;
  protected selectedTeams: string[] = [];
  protected season: Season = environment.seasonActual;

  protected onSeasonChange(newSeason: Season): void {
    this.season = newSeason;
    this.showFilters = false;
  }
}
