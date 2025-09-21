import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import { Season } from '../../models/season';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../enviroments/enviroment';
import { SelectModule } from 'primeng/select';
import { SeasonApiService } from '../../services/api/season-api.service';
import { Router } from '@angular/router';
import { MessageInfoService } from '../../services/toastInfo.service';
import { ERROR_DRIVER_NAME_NOT_FOUND, ERROR_TEAM_NAME_NOT_FOUND } from '../../../app/constants';

@Component({
    selector: 'select-seasons',
    imports: [ReactiveFormsModule, SelectModule],
    templateUrl: './select-seasons.component.html',
    styleUrl: './select-seasons.component.scss'
})
export class SelectSeasonsComponent {
  private readonly seasonApiService: SeasonApiService = inject(SeasonApiService);
  private readonly router: Router = inject(Router);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  @Output() seasonChanged = new EventEmitter<Season>();
  @Input() driverName!: string;
  @Input() teamName!: string;
  @Input() statistics!: string;
  @Input() fantasy: boolean = false; 

  public seasons: Season[] = [];

  public seasonForm: FormGroup = new FormGroup({
    season: new FormControl(environment.seasonActual),
  });

  ngOnInit(): void {
    if (this.driverName) {
      this.getSeasonsByDriverName(this.driverName)
    } else if (this.teamName) {
      this.getSeasonsByTeamName(this.teamName);
    } else if (this.statistics && this.statistics === 'general') {
      this.obtainAllSeasonsStats();
    } else if (this.fantasy) {
      this.obtainAllFantasySeasons();
    } else {
      this.obtainAllSeasons();
    }

    this.changeSeasonListener();
  }

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges['statistics'] && simpleChanges['statistics'].currentValue === 'general') {
      this.obtainAllSeasonsStats();
    } else {
      this.obtainAllSeasons();
    }
  }

  ngOnDestroy(): void {
    this.seasons = [];
    this.seasonForm.get('season')?.setValue(null);
  }

  changeSeasonListener(): void {
    this.seasonForm.get('season')?.valueChanges
      .subscribe((newSeason) => {
        this.seasonChanged.emit(newSeason);
      });
  }

  obtainAllSeasons(): void {
    this.seasonApiService.getSeasons().subscribe((seasons) => {
      this.seasons = seasons;
      this.seasonForm.get('season')?.setValue(seasons[seasons.length - 1]);
      this.seasonChanged.emit(seasons[seasons.length - 1]);
    });    
  }

  obtainAllFantasySeasons(): void {
    this.seasonApiService.getSeasonOfFantasy().subscribe((seasons) => {
      this.seasons = seasons;
      this.seasonForm.get('season')?.setValue(seasons[seasons.length - 1]);
      this.seasonChanged.emit(seasons[seasons.length - 1]);
    });    
  }

  obtainAllSeasonsStats(): void {
    this.seasonApiService.getSeasons().subscribe((seasons) => {
      const seasonOfTotal: Season = new Season(0, "Total", 0);
      this.seasonForm.get('season')?.setValue(seasonOfTotal);
      this.seasons = [seasonOfTotal, ...seasons];
      this.seasonChanged.emit(seasonOfTotal);
    });    
  }

  getSeasonsByDriverName(driverName: string): void {
    this.seasonApiService
      .getSeasonByDriverName(driverName)
      .pipe()
      .subscribe({
        next: (seasons: Season[]) => {  
          const seasonOfTotal: Season = new Season(0, "Total", 0);
          this.seasonForm.get('season')?.setValue(seasonOfTotal);
          this.seasons = [seasonOfTotal, ...seasons];
        },
        complete: () => {
          if (this.seasons.length === 1) {
            this.router.navigate(["/drivers"]);
            this.messageInfoService.showError(ERROR_DRIVER_NAME_NOT_FOUND, "");
          }
        }
      });
  }

  getSeasonsByTeamName(teamName: string): void {
    this.seasonApiService
    .getSeasonByTeamName(teamName)
    .pipe()
    .subscribe({
      next: (seasons: Season[]) => {
          const seasonOfTotal: Season = new Season(0, "Total", 0);
          this.seasonForm.get('season')?.setValue(seasonOfTotal);
          this.seasons = [seasonOfTotal, ...seasons];
        },
        complete: () => {
          if (this.seasons.length === 1) {
            this.router.navigate(["/teams"]);
            this.messageInfoService.showError(ERROR_TEAM_NAME_NOT_FOUND, "");
          }
        }
      });
  }
}
