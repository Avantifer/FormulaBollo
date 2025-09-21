import { getBarChartOptions, getBarMobileChartOptions, getPieChartOptions } from './../../../constants';
import { Component, effect, inject, Input, signal, WritableSignal } from '@angular/core';
import { Chart, ChartData } from 'chart.js';
import { catchError } from 'rxjs';
import { DriverInfo } from '../../../../shared/models/driverInfo';
import { TeamInfo } from '../../../../shared/models/teamInfo';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { colorsMappings, ERROR_DRIVER_INFO_FETCH } from '../../../constants';
import { ChartModule } from 'primeng/chart';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Season } from '../../../../shared/models/season';
import { ThemeService } from '../../../../shared/services/theme.service';
Chart.register(ChartDataLabels);

@Component({
  selector: 'app-general-stats',
  imports: [ChartModule],
  templateUrl: './general-stats.component.html',
  styleUrl: './general-stats.component.scss'
})
export class GeneralStatsComponent {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly themeService: ThemeService = inject(ThemeService);

  protected driverInfo: WritableSignal<DriverInfo[]> = signal<DriverInfo[]>([]);
  protected teamInfo: WritableSignal<TeamInfo[]> = signal<TeamInfo[]>([]);

  dataDriversVictoriesBar!: ChartData;
  dataDriversVictoriesPie!: ChartData;
  dataDriversPoles!: ChartData;
  dataDriversFastLaps!: ChartData;
  dataDriversPodiums!: ChartData;
  dataDriversPenalties!: ChartData;
  dataDriversTotalPoints!: ChartData;
  dataDriversRacesFinished!: ChartData;
  dataDriversAveragePoints!: ChartData;

  dataTeamsVictoriesBar!: ChartData;
  dataTeamsVictoriesPie!: ChartData;
  dataTeamsPoles!: ChartData;
  dataTeamsFastLaps!: ChartData;
  dataTeamsPodiums!: ChartData;
  dataTeamsPenalties!: ChartData;
  dataTeamsTotalPoints!: ChartData;
  dataTeamsAveragePoints!: ChartData;
  dataTeamsRacesFinished!: ChartData;

  @Input() seasonSelected: Season = new Season(0, "Total", 0);
  @Input() typeSelected!: string;

  barChartOptions = getBarChartOptions(this.themeService.isDarkTheme());
  pieChartOptions = getPieChartOptions(this.themeService.isDarkTheme());
  barMobileChartOptions = getBarMobileChartOptions(this.themeService.isDarkTheme());

  private lastSeasonNumber: number | null = null;
  private lastTypeSelected: string | null = null;

  ngOnChanges(): void {
    if (!this.seasonSelected || !this.typeSelected) return;

    const seasonChanged = this.seasonSelected.number !== this.lastSeasonNumber;
    const typeChanged = this.typeSelected !== this.lastTypeSelected;

    if (seasonChanged || typeChanged) {
      this.lastSeasonNumber = this.seasonSelected.number;
      this.lastTypeSelected = this.typeSelected;

      if (this.typeSelected === 'Pilotos') {
        this.loadDriverInfo();
      } else {
        this.loadTeamInfo();
      }
    }
  }

  ngOnInit(): void {
    this.seasonSelected = new Season(0, "Total", 0);    
  }

  constructor() {
    effect(() => {
      if (this.driverInfo()) {
        this.processStats(
          this.driverInfo(),
          (item) => item.driver.name,
          (item) => colorsMappings[item.driver.team.name],
          'Drivers'
        );
      }
      if (this.teamInfo()) {
        this.processStats(
          this.teamInfo(),
          (item) => item.team.name,
          (item) => colorsMappings[item.team.name],
          'Teams'
        );
      }
      this.barChartOptions = getBarChartOptions(this.themeService.isDarkTheme());
      this.pieChartOptions = getPieChartOptions(this.themeService.isDarkTheme());
      this.barMobileChartOptions = getBarMobileChartOptions(this.themeService.isDarkTheme());
    });
  }

  private loadDriverInfo(): void {
    this.driverApiService.getAllInfoDrivers(this.seasonSelected.number).pipe(
      catchError((error) =>
        this.utilsService.handleError(ERROR_DRIVER_INFO_FETCH, error, [])
      )
    ).subscribe((data) => this.driverInfo.set(data));
  }

  private loadTeamInfo(): void {
    this.teamApiService.getAllInfoTeam(this.seasonSelected.number).pipe(
      catchError((error) =>
        this.utilsService.handleError(ERROR_DRIVER_INFO_FETCH, error, [])
      )
    ).subscribe((data) => this.teamInfo.set(data));
  }

  private processStats<T>(
    dataList: T[],
    getLabel: (item: T) => string,
    getColor: (item: T) => string,
    prefix: 'Drivers' | 'Teams'
  ): void {
    const stats = [
      { field: 'victories', chartType: 'bar', suffix: 'VictoriesBar' },
      { field: 'victories', chartType: 'pie', suffix: 'VictoriesPie' },
      { field: 'poles', chartType: 'bar', suffix: 'Poles' },
      { field: 'fastlaps', chartType: 'bar', suffix: 'FastLaps' },
      { field: 'podiums', chartType: 'bar', suffix: 'Podiums' },
      { field: 'penalties', chartType: 'bar', suffix: 'Penalties' },
      { field: 'totalPoints', chartType: 'bar', suffix: 'TotalPoints' },
      { field: 'racesFinished', chartType: 'bar', suffix: 'RacesFinished' },
      {
        field: 'averagePosition',
        chartType: 'bar',
        suffix: 'AveragePoints',
        filterZero: true,
        transformFn: (item: any) => item.totalPoints / item.racesFinished,
      },
    ];

    stats.forEach(({ field, chartType, suffix, filterZero, transformFn }) => {
      this.generateChartData<T>({
        dataList,
        field: field as keyof T,
        datakey: `data${prefix}${suffix}`,
        getLabel,
        getColor,
        chartType: chartType as 'bar' | 'pie',
        filterZero,
        transformFn,
      });
    });
  }

  private generateChartData<T>({
    dataList,
    field,
    datakey,
    getLabel,
    getColor,
    chartType = 'bar',
    filterZero = true,
    transformFn,
  }: {
    dataList: T[];
    field: keyof T;
    datakey: string;
    getLabel: (item: T) => string;
    getColor: (item: T) => string;
    chartType?: 'bar' | 'pie';
    filterZero?: boolean;
    transformFn?: (item: T) => number;
  }): void {
    let items = [...dataList];
    if (filterZero) {
      items = items.filter((item) => {
        const value = transformFn ? transformFn(item) : (item[field] as unknown as number);
        return value > 0;
      });
    }
    items.sort((a, b) => {
      const aValue = transformFn ? transformFn(a) : (a[field] as unknown as number);
      const bValue = transformFn ? transformFn(b) : (b[field] as unknown as number);
      return bValue - aValue;
    });
    const labels = items.map(getLabel);
    const colors = items.map(getColor);
    const data = items.map((item) => {
      const value = transformFn ? transformFn(item) : (item[field] as unknown as number);
      return parseFloat(value.toFixed(2));
    });

    const dataset: any = {
      data,
      backgroundColor: colors,
      borderRadius: chartType === 'pie' ? 0 : 6,
      borderWidth: 1,
    };
    const chartData = {
      labels,
      datasets: [dataset],
    };
    (this as any)[datakey] = chartData;
  }
}