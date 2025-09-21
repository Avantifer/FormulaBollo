import { colorsMappings, ERROR_DRIVER_INFO_FETCH, ERROR_TEAM_INFO_FETCH, getComparisonChartOptions, getComparisonChartOptionsMobile } from './../../../constants';
import { Component, effect, inject, Input, SimpleChanges } from '@angular/core';
import { Season } from '../../../../shared/models/season';
import { environment } from '../../../../enviroments/enviroment';
import { Driver } from '../../../../shared/models/driver';
import { Team } from '../../../../shared/models/team';
import { SelectTeamsComponent } from '../../../../shared/components/select-teams/select-teams.component';
import { SelectDriversComponent } from '../../../../shared/components/select-drivers/select-drivers.component';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { DriverInfo } from '../../../../shared/models/driverInfo';
import { TeamInfo } from '../../../../shared/models/teamInfo';
import { ChartData } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { ThemeService } from '../../../../shared/services/theme.service';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';

@Component({
  selector: 'app-comparative-stats',
  imports: [
    ChartModule,
    SpaceToUnderscorePipe,
    SelectTeamsComponent, 
    SelectDriversComponent
  ],
  templateUrl: './comparative-stats.component.html',
  styleUrl: './comparative-stats.component.scss'
})
export class ComparativeStatsComponent {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly themeService: ThemeService = inject(ThemeService);

  @Input() seasonSelected: Season = environment.seasonActual;
  @Input() typeSelected!: string;
  
  private driversSelected: Driver[] | null[] = [null, null];
  private teamsSelected: Team[] | null[] = [null, null];

  driversInfo: DriverInfo[] = [];
  teamsInfo: TeamInfo[] = [];

  comparisonChartData!: ChartData;
  comparisonChartOptions = getComparisonChartOptions(this.themeService.isDarkTheme());
  comparisonChartOptionsMobile = getComparisonChartOptionsMobile(this.themeService.isDarkTheme());

  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnChanges(simpleChanges: SimpleChanges): void {
    if (simpleChanges['seasonSelected']) {
      this.driversSelected = [null, null];
      this.teamsSelected = [null, null];
    }
  }

  constructor() {
    effect(() => {
      this.comparisonChartOptions = getComparisonChartOptions(this.themeService.isDarkTheme());
      this.comparisonChartOptionsMobile = getComparisonChartOptionsMobile(this.themeService.isDarkTheme());
    });
  }

  async onTeamChange(newTeam: Team, index: number) {
    this.teamsSelected.splice(index, 1, newTeam);

    if (this.teamsSelected.every(team => team != null)) {
      const [teamAInfo, teamBInfo] = await Promise.all([
        this.getInfoTeams(this.teamsSelected.at(0)!),
        this.getInfoTeams(this.teamsSelected.at(1)!)
      ]);

      this.teamsInfo.splice(0, 1, teamAInfo);
      this.teamsInfo.splice(1, 1, teamBInfo);

      this.generateComparisonChart(teamAInfo, teamBInfo);
    }
  }

  async onDriverChange(newDriver: Driver, index: number) {
    this.driversSelected.splice(index, 1, newDriver);

    if (this.driversSelected.every(driver => driver != null)) {
      const [driverAInfo, driverBInfo] = await Promise.all([
        this.getInfoDrivers(this.driversSelected.at(0)!),
        this.getInfoDrivers(this.driversSelected.at(1)!)
      ]);

      this.driversInfo.splice(0, 1, driverAInfo);
      this.driversInfo.splice(1, 1, driverBInfo);

      this.generateComparisonChart(driverAInfo, driverBInfo);
    }
  }

  getInfoDrivers(driver: Driver): Promise<DriverInfo> {
    return new Promise((resolve) => {
      this.driverApiService.getInfoByDriverName(driver.name, this.seasonSelected.number)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.messageInfoService.showError(ERROR_DRIVER_INFO_FETCH, error);
            console.error(error);
            return of();
          })
        ).subscribe((driverInfo: DriverInfo) => {
          resolve(driverInfo);
        });
    });
  }

  getInfoTeams(team: Team): Promise<TeamInfo> {
    return new Promise((resolve) => {
      this.teamApiService.getInfoTeamByName(team.name, this.seasonSelected.number)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.messageInfoService.showError(ERROR_TEAM_INFO_FETCH, error);
            console.error(error);
            return of();
          })
        ).subscribe((teamInfo: TeamInfo) => {
          resolve(teamInfo);
        });
    });
  }

  generateComparisonChart(entityA: DriverInfo | TeamInfo, entityB: DriverInfo | TeamInfo): void {
    const isDriverComparison = 'driver' in entityA;
    const isDriverBComparison = 'driver' in entityB;

    const labels = [
      'Victorias',
      'Podios',
      'Poles',
      'Vueltas Rápidas',
      'Car. Terminadas',
      'Penalizaciones'
    ];

    const getStats = (entity: DriverInfo | TeamInfo) => [
      entity.victories,
      entity.podiums,
      entity.poles,
      entity.fastlaps,
      entity.racesFinished,
      entity.penalties
    ];

    const colorKeyA = isDriverComparison ? entityA.driver.team.name : entityA.team.name;
    const colorKeyB = isDriverBComparison ? entityB.driver.team.name : entityB.team.name;
    const colorA = colorsMappings[colorKeyA] || '#888888';
    const colorB = colorsMappings[colorKeyB] || '#888888';

    const datasets = [
      {
        label: isDriverComparison ? entityA.driver.name : entityA.team.name,
        backgroundColor: colorA,
        data: getStats(entityA),
        borderRadius: 5,
        barThickness: 35
      },
      {
        label: isDriverBComparison ? entityB.driver.name : entityB.team.name,
        backgroundColor: colorB,
        data: getStats(entityB),
        borderRadius: 5,
        barThickness: 35
      }
    ];

    this.comparisonChartData = {
      labels,
      datasets
    };
  }
}
