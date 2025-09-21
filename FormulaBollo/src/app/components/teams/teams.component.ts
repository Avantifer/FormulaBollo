import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../shared/models/season';
import { Subject } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { SkeletonModule } from 'primeng/skeleton';
import { RaceDetailsComponent } from "../../../shared/components/race-details/race-details.component";
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TeamsFiltersComponent } from "../../../shared/components/teams-filters/teams-filters.component";
import { DividerModule } from 'primeng/divider';
import { DriversGridTableComponent } from "../../../shared/components/drivers-teams-grid-table/drivers-teams-grid-table.component";

@Component({
  selector: 'app-teams',
  imports: [
    CommonModule,
    SelectButtonModule,
    FormsModule,
    ButtonModule,
    SkeletonModule,
    DividerModule,
    SelectSeasonsComponent,
    RaceDetailsComponent,
    TeamsFiltersComponent,
    DriversGridTableComponent
  ],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss'
})
export class TeamsComponent {
  protected readonly listOptions: any[] = [
    { icon: 'pi pi-th-large', value: 'grid' },
    { icon: 'pi pi-bars', value: 'list' }
  ];
  protected listValue: string = 'grid';
  protected showFilters: boolean = false;
  protected selectedTeams: string[] = [];
  protected season: Season = environment.seasonActual;

  protected isLoading: boolean = true;
  private readonly destroy$ = new Subject<void>();
  
  protected onSeasonChange(newSeason: Season): void {
    this.season = newSeason;
    this.showFilters = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
