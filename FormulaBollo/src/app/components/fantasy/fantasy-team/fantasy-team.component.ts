import { FantasyApiService } from './../../../../shared/services/api/fantasy-api.service';
import { ButtonModule } from 'primeng/button';
import { Component, effect, inject, Signal } from '@angular/core';
import { SelectRacesComponent } from "../../../../shared/components/select-races/select-races.component";
import { Race } from '../../../../shared/models/race';
import { catchError, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { FantasyPricesDriver } from '../../../../shared/models/fantasyPricesDriver';
import { UtilsService } from '../../../../shared/services/utils.service';
import { colorsMappings, ERROR_FANTASY_ELECTION_NOT_FOUND, ERROR_PRICE_FETCH, ERROR_RACE_FETCH, getLineChartOptions, WARNING_ELECTION_NOT_COMPLETED, WARNING_FANTASY_SAVE_LATE, WARNING_MONEY_NEGATIVE } from '../../../constants';
import { toSignal } from '@angular/core/rxjs-interop';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { environment } from '../../../../enviroments/enviroment';
import { ImageService } from '../../../../shared/services/image.service';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { PricePipe } from '../../../../shared/pipes/pricePipe.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../../../shared/services/theme.service';
import { ChartData } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { FantasyPointsDriver } from '../../../../shared/models/fantasyPointsDriver';
import { FantasyElection } from '../../../../shared/models/fantasyElection';
import { Driver } from '../../../../shared/models/driver';
import { Team } from '../../../../shared/models/team';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
import { FantasyPointsTeam } from '../../../../shared/models/fantasyPointsTeam';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { Account } from '../../../../shared/models/account';
import { AuthJWTService } from '../../../../shared/services/authJWT.service';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from "primeng/table";
import { OrderBy } from '../../../../shared/models/orderBy';

@Component({
  selector: 'app-fantasy-team',
  imports: [
    SelectButtonModule,
    ButtonModule,
    ChartModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    SelectRacesComponent,
    SpaceToUnderscorePipe,
    PricePipe,
    TableModule
],
  templateUrl: './fantasy-team.component.html',
  styleUrl: './fantasy-team.component.scss'
})
export class FantasyTeamComponent {
  private readonly fantasyApiService: FantasyApiService = inject(FantasyApiService);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  private readonly raceApiService: RaceApiService =  inject(RaceApiService);
  protected readonly imageService: ImageService = inject(ImageService);
  private readonly themeService: ThemeService = inject(ThemeService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService)
  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  
  protected readonly listOptions: any[] = [
    { icon: 'pi pi-users', value: 'Pilotos' },
    { icon: 'pi pi-car', value: 'Equipos' }
  ];
  optionSelected: string = 'Pilotos';

  lineChartOptions = getLineChartOptions(this.themeService.isDarkTheme(), false)

  totalMoney: number = 80000000;

  isLastRace: boolean = true;
  raceSelected: Race | undefined;

  fantasyPricesDrivers: FantasyPricesDriver[] = [];
  fantasyPricesDriversFiltered: FantasyPricesDriver[] = [];

  fantasyPricesTeams: FantasyPricesTeam[] = [];
  fantasyPricesTeamsFiltered: FantasyPricesTeam[] = [];

  dataDriversEvolutionPrice!: ChartData;
  showDriverPricesData: boolean = false;
  driverPriceData!: FantasyPricesDriver;
  showDriverMaxPriceData!: number;
  showDriverStartPriceData!: number;

  dataTeamsEvolutionPrice!: ChartData;
  showTeamPricesData: boolean = false;
  teamPriceData!: FantasyPricesTeam;
  showTeamMaxPriceData!: number;
  showTeamStartPriceData!: number;

  dataDriversEvolutionPoints!: ChartData;
  showDriverPointsData: boolean = false;
  driverPointData!: FantasyPricesDriver;
  showDriverBestPointsData!: number;
  showDriverMedianPointsData!: number;

  dataTeamsEvolutionPoints!: ChartData;
  showTeamPointsData: boolean = false;
  teamPointData!: FantasyPricesTeam;
  showTeamBestPointsData!: number;
  showTeamMedianPointsData!: number;

  fantasyElection: FantasyElection = new FantasyElection();

  driversSelected: (Driver | undefined)[] = [undefined, undefined, undefined];
  fantasydriversSelected: (FantasyPricesDriver | undefined)[] = [undefined, undefined, undefined];

  teamsSelected: (Team | undefined)[] = [undefined, undefined];
  fantasyTeamsSelected: (FantasyPricesTeam | undefined)[] = [undefined, undefined];

  filtroString: string = '';

  orders: OrderBy[] = [
    new OrderBy("pi pi-star", "Puntos", "DESC"),
    new OrderBy("pi pi-dollar", "Precio", "DESC"),
    new OrderBy("pi pi-user", "Nombre", "DESC")
  ];
  orderSelected: OrderBy = new OrderBy("pi pi-star", "Puntos", "DESC");

  private readonly destroy$: Subject<void> = new Subject<void>();
  private readonly lastRace: Signal<Race | undefined> = toSignal(this.raceApiService.getActualRace(environment.seasonActual.id)
    .pipe(
      catchError((error) => this.utilsService.handleError<Race>(ERROR_RACE_FETCH, error))
    )
  );

  constructor() {
    effect(() => {
      this.lineChartOptions = getLineChartOptions(this.themeService.isDarkTheme(), false)
      
      const race = this.lastRace();
      if (race) {
        this.raceSelected = race;
        this.getDriversTeamPrices();
      }
    });
  }

  changeOptions(): void {
    this.filtroString = '';
    this.fantasyPricesDriversFiltered = [...this.fantasyPricesDrivers];
    this.fantasyPricesTeamsFiltered = [...this.fantasyPricesTeams];
    this.orderSelected = new OrderBy("pi pi-star", "Puntos", "DESC");
    this.orders = [
      new OrderBy("pi pi-star", "Puntos", "DESC"),
      new OrderBy("pi pi-dollar", "Precio", "DESC"),
      new OrderBy("pi pi-user", "Nombre", "DESC")
    ];
    this.changeOrder(this.orderSelected);
  }

  changeOrder(order: OrderBy): void {
    this.orderSelected = order;
    order.value = order.value === "ASC" ? "DESC" : "ASC";
    this.orders.forEach((element) => {
      if (element.name !== order.name) {
        element.value = "ASC";
      }
    });

    if (order.name === "Nombre") {
      this.orderByName(order.value);
    } else if (order.name === "Precio") {
      this.orderByPrice(order.value);
    } else if (order.name === "Puntos") {
      this.orderByTotalPoints(order.value);
    }
  }

  private orderByName(orderDirection: string): void {
    if (this.optionSelected === "Pilotos") {
      this.fantasyPricesDriversFiltered.sort((a: FantasyPricesDriver, b: FantasyPricesDriver) =>
        orderDirection === "ASC"
          ? a.driver.name.localeCompare(b.driver.name)
          : b.driver.name.localeCompare(a.driver.name),
      );
    } else {
      this.fantasyPricesTeamsFiltered.sort((a: FantasyPricesTeam, b: FantasyPricesTeam) =>
        orderDirection === "ASC"
          ? a.team.name.localeCompare(b.team.name)
          : b.team.name.localeCompare(a.team.name),
      );
    }
  }

  private orderByPrice(orderDirection: string): void {
    if (this.optionSelected === "Pilotos") {
      this.fantasyPricesDriversFiltered.sort((a: FantasyPricesDriver, b: FantasyPricesDriver) =>
        orderDirection === "ASC" ? a.price - b.price : b.price - a.price,
      );
    } else {
      this.fantasyPricesTeamsFiltered.sort((a: FantasyPricesTeam, b: FantasyPricesTeam) =>
        orderDirection === "ASC" ? a.price - b.price : b.price - a.price,
      );
    }
  }

  private orderByTotalPoints(orderDirection: string): void {
    if (this.optionSelected === "Pilotos") {
      this.fantasyPricesDriversFiltered.sort((a: FantasyPricesDriver, b: FantasyPricesDriver) =>
        orderDirection === "ASC"
          ? a.fantasyInfo.totalPoints - b.fantasyInfo.totalPoints
          : b.fantasyInfo.totalPoints - a.fantasyInfo.totalPoints,
      );
    } else {
      this.fantasyPricesTeamsFiltered.sort((a: FantasyPricesTeam, b: FantasyPricesTeam) =>
        orderDirection === "ASC"
          ? a.fantasyInfo.totalPoints - b.fantasyInfo.totalPoints
          : b.fantasyInfo.totalPoints - a.fantasyInfo.totalPoints,
      );
    }
  }


  filterItems(filter: string) {
    if (this.optionSelected === 'Pilotos') {
      this.fantasyPricesDriversFiltered = [...this.fantasyPricesDrivers];
      this.fantasyPricesDriversFiltered = this.fantasyPricesDrivers.filter((fpd) => fpd.driver.name.toLowerCase().includes(filter.toLowerCase()));
    } else {
      this.fantasyPricesTeamsFiltered = [...this.fantasyPricesTeams];
      this.fantasyPricesTeamsFiltered = this.fantasyPricesTeams.filter((fpt) => fpt.team.name.toLowerCase().includes(filter.toLowerCase()));
    }
  }


  onRaceChange(newRace: Race) {
    this.raceSelected = newRace;
    this.optionSelected = 'Pilotos';

    if (this.lastRace()?.id !== this.raceSelected.id)  {
      this.isLastRace = false;
      this.fantasyApiService.getFantasyElection(this.raceSelected.id, parseInt(this.authJWTService.getIdFromToken(localStorage.getItem("auth")!))).pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError<FantasyElection>(ERROR_FANTASY_ELECTION_NOT_FOUND, error))
      ).subscribe((fantasyElection: FantasyElection) => {
        this.setFantasyElection(fantasyElection);
      });
    } else {
      this.isLastRace = true;
      this.resetFantasyElection();
    }
  }

  async getDriversTeamPrices(): Promise<void> {
    this.fantasyPricesDrivers = await lastValueFrom(this.fantasyApiService.getAllPricesDriver(this.raceSelected!.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError(ERROR_PRICE_FETCH, error, []))
    ));

    this.fantasyPricesDriversFiltered = [...this.fantasyPricesDrivers]

    this.fantasyPricesTeams = await lastValueFrom(this.fantasyApiService.getAllPricesTeam(this.raceSelected!.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError(ERROR_PRICE_FETCH, error, []))
    ));

    this.fantasyPricesTeamsFiltered = [...this.fantasyPricesTeams]
  }

  isDriverSelected(driver: Driver): boolean  {
    return this.driversSelected.some((d: Driver | undefined) => d?.name === driver.name);
  }

  isTeamSelected(team: Team): boolean  {
    return this.teamsSelected.some((t: Team | undefined) => t?.name === team.name);
  }

  selectedDriversCount(): number {
    return this.driversSelected.filter((d: Driver | undefined) => d !== undefined).length;
  }

  selectedTeamsCount(): number {
    return this.teamsSelected.filter((t: Team | undefined) => t !== undefined).length;
  }

  addDriverToSelection(fantasyDriver: FantasyPricesDriver): void {
    if (!this.fantasyElection.driverOne) {
      this.fantasyElection.driverOne = fantasyDriver.driver;
      this.fantasydriversSelected[0] = fantasyDriver;
    } else if (!this.fantasyElection.driverTwo) {
      this.fantasyElection.driverTwo = fantasyDriver.driver;
      this.fantasydriversSelected[1] = fantasyDriver;
    } else {
      this.fantasyElection.driverThree = fantasyDriver.driver;
      this.fantasydriversSelected[2] = fantasyDriver;
    }

    this.syncDriversSelected();
    this.calculateTotalPrice();
  }

  addTeamToSelection(fantasyTeam: FantasyPricesTeam): void {
    if (!this.fantasyElection.teamOne) {
      this.fantasyElection.teamOne = fantasyTeam.team;
      this.fantasyTeamsSelected[0] = fantasyTeam;
    } else {
      this.fantasyElection.teamTwo = fantasyTeam.team;
      this.fantasyTeamsSelected[1] = fantasyTeam;
    }

    this.syncTeamSelected();
    this.calculateTotalPrice();
  }

  deleteDriverFromSelection(index: number): void {
    if (index === 0) {
      this.fantasyElection.driverOne = undefined;
    } else if (index === 1) {
      this.fantasyElection.driverTwo = undefined;
    } else {
      this.fantasyElection.driverThree = undefined;
    }

    this.syncDriversSelected();
    this.calculateTotalPrice();
  }

  deleteTeamFromSelection(index: number): void {
    if (index === 0) {
      this.fantasyElection.teamOne = undefined;
    } else {
      this.fantasyElection.teamTwo = undefined;
    }

    this.syncTeamSelected();
    this.calculateTotalPrice();
  }

  private syncDriversSelected(): void {
    this.driversSelected = [
      this.fantasyElection.driverOne,
      this.fantasyElection.driverTwo,
      this.fantasyElection.driverThree
    ];    
  }

  private syncTeamSelected(): void {
    this.teamsSelected = [
      this.fantasyElection.teamOne,
      this.fantasyElection.teamTwo
    ];
  }

  private calculateTotalPrice(): void {
    this.totalMoney = 80000000;
    this.calculateDriversValue();
    this.calculateTeamsValue();
  }

  private calculateDriversValue(): void {
    if (this.fantasyElection.driverOne) {
      const driverOne = this.fantasydriversSelected.filter((d): d is FantasyPricesDriver => !!d).find(d => d.driver.id === this.fantasyElection.driverOne!.id);
      this.totalMoney -= driverOne!.price;
    }

    if (this.fantasyElection.driverTwo) {
      const driverTwo = this.fantasydriversSelected.filter((d): d is FantasyPricesDriver => !!d).find(d => d.driver.id === this.fantasyElection.driverTwo!.id);
      this.totalMoney -= driverTwo!.price;
    }

    if (this.fantasyElection.driverThree) {
       const driverThree = this.fantasydriversSelected.filter((d): d is FantasyPricesDriver => !!d).find(d => d.driver.id === this.fantasyElection.driverThree!.id);
      this.totalMoney -= driverThree!.price;
    }
  }

  private calculateTeamsValue(): void {
    if (this.fantasyElection.teamOne) {
      const teamOne = this.fantasyTeamsSelected.filter((t): t is FantasyPricesTeam => !!t).find(t => t.team.id === this.fantasyElection.teamOne!.id);
      this.totalMoney -= teamOne!.price;
    }

    if (this.fantasyElection.teamTwo) {
      const teamTwo = this.fantasyTeamsSelected.filter((t): t is FantasyPricesTeam => !!t).find(t => t.team.id === this.fantasyElection.teamTwo!.id);
      this.totalMoney -= teamTwo!.price;
    }
  }

  private resetFantasyElection(): void {
    this.fantasyElection = new FantasyElection();
    this.driversSelected = [undefined, undefined, undefined];
    this.fantasydriversSelected = [undefined, undefined, undefined];
    this.teamsSelected = [undefined, undefined];
    this.fantasyTeamsSelected = [undefined, undefined];
    this.calculateTotalPrice()
  }

  private setFantasyElection(fantasyElection: FantasyElection): void {
    this.fantasyElection = fantasyElection;
    this.driversSelected = [fantasyElection.driverOne, fantasyElection.driverTwo, fantasyElection.driverThree];
    this.teamsSelected = [fantasyElection.teamOne, fantasyElection.teamTwo];
  }

  generateEvolutionDriverPriceChart(data: FantasyPricesDriver): void {
    this.showDriverPricesData = true;
    this.driverPriceData = data;

    this.fantasyApiService.getDriverPrices(data.driver.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError(ERROR_PRICE_FETCH, error, []))
    ).subscribe((fantasyPricesDriverArray: FantasyPricesDriver[]) => {
      if (!fantasyPricesDriverArray.length) return;

      this.showDriverMaxPriceData = Math.max(...fantasyPricesDriverArray.map((fp: FantasyPricesDriver) => fp.price));
      this.showDriverStartPriceData = fantasyPricesDriverArray[0].price;

      const labels = fantasyPricesDriverArray.map(fp => fp.race.name);
      const data = fantasyPricesDriverArray.map(fp => parseFloat(fp.price.toFixed(2)));

      const colorKey = fantasyPricesDriverArray[0].driver.team.name;
      const color = colorsMappings[colorKey] || '#888888';

      this.dataDriversEvolutionPrice = {
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      }
    });
  }

  generateEvolutionTeamPriceChart(data: FantasyPricesTeam): void {
    this.showTeamPricesData = true;
    this.teamPriceData = data;

    this.fantasyApiService.getTeamPrices(data.team.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError(ERROR_PRICE_FETCH, error, []))
    ).subscribe((fantasyPricesTeamArray: FantasyPricesTeam[]) => {
      if (!fantasyPricesTeamArray.length) return;

      this.showTeamMaxPriceData = Math.max(...fantasyPricesTeamArray.map((fp: FantasyPricesTeam) => fp.price));
      this.showTeamStartPriceData = fantasyPricesTeamArray[0].price;

      const labels = fantasyPricesTeamArray.map(fp => fp.race.name);
      const data = fantasyPricesTeamArray.map(fp => parseFloat(fp.price.toFixed(2)));

      const colorKey = fantasyPricesTeamArray[0].team.name;
      const color = colorsMappings[colorKey] || '#888888';

      this.dataTeamsEvolutionPrice = {
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      }
    });
  }

  generateEvolutionPointDriverChart(data: FantasyPricesDriver): void {
    this.showDriverPointsData = true;
    this.driverPointData = data;

    this.fantasyApiService.getDriverPoints(data.driver.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError(ERROR_PRICE_FETCH, error, []))
    ).subscribe((fantasyPointsDriverArray: FantasyPointsDriver[]) => {
      if (!fantasyPointsDriverArray.length) return;

      this.showDriverBestPointsData = Math.max(...fantasyPointsDriverArray.map((fp: FantasyPointsDriver) => fp.points));
      this.showDriverMedianPointsData = fantasyPointsDriverArray.reduce((acc, fp) => acc + fp.points, 0) / fantasyPointsDriverArray.length;

      const labels = fantasyPointsDriverArray.map(fp => fp.race.name);
      const data = fantasyPointsDriverArray.map(fp => fp.points);

      const colorKey = fantasyPointsDriverArray[0].driver.team.name;
      const color = colorsMappings[colorKey] || '#888888';

      this.dataDriversEvolutionPoints = {
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      }
    });
  }

  generateEvolutionPointTeamChart(data: FantasyPricesTeam): void {
    this.showTeamPointsData = true;
    this.teamPointData = data;

    this.fantasyApiService.getTeamPoints(data.team.id).pipe(
      takeUntil(this.destroy$),
      catchError((error) => this.utilsService.handleError(ERROR_PRICE_FETCH, error, []))
    ).subscribe((fantasyPointsTeamArray: FantasyPointsTeam[]) => {
      if (!fantasyPointsTeamArray.length) return;

      this.showTeamBestPointsData = Math.max(...fantasyPointsTeamArray.map((fp: FantasyPointsTeam) => fp.points));
      this.showTeamMedianPointsData = fantasyPointsTeamArray.reduce((acc, fp) => acc + fp.points, 0) / fantasyPointsTeamArray.length;

      const labels = fantasyPointsTeamArray.map(fp => fp.race.name);
      const data = fantasyPointsTeamArray.map(fp => fp.points);

      const colorKey = fantasyPointsTeamArray[0].team.name;
      const color = colorsMappings[colorKey] || '#888888';

      this.dataTeamsEvolutionPoints = {
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      }
    });
  }

  saveFantasyElecion(): void {
    if (this.raceSelected?.dateStart) {
      const today: Date = new Date();
      const dateStart: Date = new Date(this.raceSelected?.dateStart);

      const differenceMiliseconds: number = Math.abs(dateStart.getTime() - today.getTime());
      const differenceHours: number = differenceMiliseconds / (1000 * 60 * 60);

      if (differenceHours < 12) {
        this.messageInfoService.showWarn(WARNING_FANTASY_SAVE_LATE);
        return;
      }
    }

    if (
      this.fantasyElection.driverOne &&
      this.fantasyElection.driverTwo &&
      this.fantasyElection.driverThree &&
      this.fantasyElection.teamOne &&
      this.fantasyElection.teamTwo
    ) {
      if (this.totalMoney < 0)
        return this.messageInfoService.showWarn(WARNING_MONEY_NEGATIVE);

      this.fantasyElection.race = this.raceSelected;
      this.fantasyElection.season = this.raceSelected?.season;
      this.fantasyElection.user = new Account(
        parseInt(
          this.authJWTService.getIdFromToken(localStorage.getItem("auth")!),
        ),
      );

      this.messageInfoService.showWarn('No esta habilitado el fantasy.');
    } else {
      this.messageInfoService.showWarn(WARNING_ELECTION_NOT_COMPLETED);
    }

  }
}
