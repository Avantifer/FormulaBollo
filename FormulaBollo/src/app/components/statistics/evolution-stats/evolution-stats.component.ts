import { ERROR_EVOLUTION_POINTS_NOT_FOUND, getLineChartOptions } from './../../../constants';
import { Component, effect, inject, Input, SimpleChanges } from '@angular/core';
import { Chart, ChartData } from 'chart.js';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { colorsMappings } from '../../../constants';
import { ChartModule } from 'primeng/chart';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Season } from '../../../../shared/models/season';
import { SelectDriversComponent } from "../../../../shared/components/select-drivers/select-drivers.component";
import { Driver } from '../../../../shared/models/driver';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { DriverEvolutionPoints } from '../../../../shared/models/driverEvolutionPoints';
import { environment } from '../../../../enviroments/enviroment';
import { ThemeService } from '../../../../shared/services/theme.service';
import { Team } from '../../../../shared/models/team';
import { SelectTeamsComponent } from "../../../../shared/components/select-teams/select-teams.component";
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { TeamEvolutionPoints } from '../../../../shared/models/teamEvolutionPoints';
Chart.register(ChartDataLabels);

@Component({
  selector: 'app-evolution-stats',
  imports: [ChartModule, SelectDriversComponent, SelectTeamsComponent],
  templateUrl: './evolution-stats.component.html',
  styleUrl: './evolution-stats.component.scss'
})
export class EvolutionStatsComponent {
  private readonly driverApiService: DriverApiService = inject(DriverApiService);
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly themeService: ThemeService = inject(ThemeService);

  @Input() seasonSelected: Season = environment.seasonActual;
  @Input() typeSelected!: string;

  private driversSelected: Driver[] | null[] = [null, null, null, null];
  private teamsSelected: Team[] | null[] = [null, null, null, null];

  lineChartOptions = getLineChartOptions(this.themeService.isDarkTheme())
  dataDriversEvolutionPoints!: ChartData;

  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnChanges(simpleChanges: SimpleChanges): void {
    if (simpleChanges['seasonSelected']) {
      this.driversSelected = [null, null, null, null];
      this.teamsSelected = [null, null, null, null];
    }
  }

  constructor() {
    effect(() => {
      this.lineChartOptions = getLineChartOptions(this.themeService.isDarkTheme())
    });
  }

  onTeamChange(newTeam: Team, index: number): void {
    this.teamsSelected.splice(index, 1, newTeam);

    if (this.teamsSelected.every(team => team != null)) {
      this.getEvolutionPointsTeam();
    }
  }

  onDriverChange(newDriver: Driver, index: number): void {
    this.driversSelected.splice(index, 1, newDriver);

    if (this.driversSelected.every(driver => driver != null)) {
      this.getEvolutionPointsDriver();
    }
  }

  getEvolutionPointsTeam(): void {
    this.teamApiService.getEvolutionPointsTeams(
      this.teamsSelected.at(0)!.id,
      this.teamsSelected.at(1)!.id,
      this.teamsSelected.at(2)!.id,
      this.teamsSelected.at(3)!.id,
      this.seasonSelected.number
    ).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(ERROR_EVOLUTION_POINTS_NOT_FOUND, error);
        console.error(error);
        return of([]);
      })
    ).subscribe((teamPointsTeams: TeamEvolutionPoints[]) => {
      this.generateEvolutionLineChart(teamPointsTeams);
    });
  }

  getEvolutionPointsDriver(): void {
    this.driverApiService.getEvolutionPointsDrivers(
      this.driversSelected.at(0)!.id,
      this.driversSelected.at(1)!.id,
      this.driversSelected.at(2)!.id,
      this.driversSelected.at(3)!.id,
      this.seasonSelected.number
    ).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(ERROR_EVOLUTION_POINTS_NOT_FOUND, error);
        console.error(error);
        return of([]);
      })
    ).subscribe((driverPointsDrivers: DriverEvolutionPoints[]) => {
      this.generateEvolutionLineChart(driverPointsDrivers);
    });
  }

  private generateEvolutionLineChart(dataList: (DriverEvolutionPoints | TeamEvolutionPoints)[]): void {
    if (!dataList.length || !dataList[0].accumulatedPoints?.length || !dataList[0].races?.length) {
      return;
    }

    const labels = dataList[0].races.map(race => race.name);

    const datasets = dataList.map(item => {
      const isDriver = 'driver' in item;
      const name = isDriver ? item.driver.name : item.team.name;
      const colorKey = isDriver ? item.driver.team.name : item.team.name;
      const color = colorsMappings[colorKey] || '#888888';

      return {
        label: name,
        data: item.accumulatedPoints.map(p => parseFloat(p.toFixed(2))),
        borderColor: color,
        backgroundColor: color,
        pointBackgroundColor: color,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });

    this.dataDriversEvolutionPoints = {
      labels,
      datasets
    };
  }
}
