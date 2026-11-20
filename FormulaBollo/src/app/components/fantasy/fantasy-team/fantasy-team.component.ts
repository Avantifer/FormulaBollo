import { DecimalPipe } from '@angular/common';
import { FantasyApiService } from './../../../../shared/services/api/fantasy-api.service';
import { ButtonModule } from 'primeng/button';
import { Component, computed, effect, inject, signal, Signal, untracked } from '@angular/core';
import { SelectRacesComponent } from "../../../../shared/components/select-races/select-races.component";
import { Race } from '../../../../shared/models/race';
import { catchError, forkJoin, lastValueFrom, Observable, Subject, takeUntil } from 'rxjs';
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
import { FantasyElection } from '../../../../shared/models/fantasyElection';
import { Driver } from '../../../../shared/models/driver';
import { Team } from '../../../../shared/models/team';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
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
    DecimalPipe,
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

  readonly lineChartOptions = computed(() => getLineChartOptions(this.themeService.isDarkTheme(), false));

  readonly isLastRace = signal(true);
  private readonly selectedRace = signal<Race | undefined>(undefined);

  get raceSelected(): Race | undefined {
    return this.selectedRace();
  }

  set raceSelected(race: Race | undefined) {
    this.selectedRace.set(race);
  }

  readonly fantasyPricesDrivers = signal<FantasyPricesDriver[]>([]);
  readonly fantasyPricesDriversFiltered = signal<FantasyPricesDriver[]>([]);
  readonly fantasyPricesTeams = signal<FantasyPricesTeam[]>([]);
  readonly fantasyPricesTeamsFiltered = signal<FantasyPricesTeam[]>([]);

  readonly dataDriversEvolutionPrice = signal<ChartData<'line'>>({ datasets: [] });
  readonly showDriverPricesData = signal(false);
  readonly driverPriceData = signal<FantasyPricesDriver>(undefined!);
  readonly showDriverMaxPriceData = signal(0);
  readonly showDriverStartPriceData = signal(0);

  readonly dataTeamsEvolutionPrice = signal<ChartData<'line'>>({ datasets: [] });
  readonly showTeamPricesData = signal(false);
  readonly teamPriceData = signal<FantasyPricesTeam>(undefined!);
  readonly showTeamMaxPriceData = signal(0);
  readonly showTeamStartPriceData = signal(0);

  readonly dataDriversEvolutionPoints = signal<ChartData<'line'>>({ datasets: [] });
  readonly showDriverPointsData = signal(false);
  readonly driverPointData = signal<FantasyPricesDriver>(undefined!);
  readonly showDriverBestPointsData = signal(0);
  readonly showDriverMedianPointsData = signal(0);

  readonly dataTeamsEvolutionPoints = signal<ChartData<'line'>>({ datasets: [] });
  readonly showTeamPointsData = signal(false);
  readonly teamPointData = signal<FantasyPricesTeam>(undefined!);
  readonly showTeamBestPointsData = signal(0);
  readonly showTeamMedianPointsData = signal(0);

  readonly fantasyElection = signal(new FantasyElection());
  readonly driversSelected = computed(() => {
    const election = this.fantasyElection();
    return [election.driverOne, election.driverTwo, election.driverThree];
  });
  readonly teamsSelected = computed(() => {
    const election = this.fantasyElection();
    return [election.teamOne, election.teamTwo];
  });
  readonly fantasydriversSelected = signal<(FantasyPricesDriver | undefined)[]>([undefined, undefined, undefined]);
  readonly fantasyTeamsSelected = signal<(FantasyPricesTeam | undefined)[]>([undefined, undefined]);
  readonly totalMoney = computed(() => {
    const driversValue = this.driversSelected().reduce((total, driver) => total +
      (driver ? this.fantasydriversSelected().find(price => price?.driver.id === driver.id)?.price ?? 0 : 0), 0);
    const teamsValue = this.teamsSelected().reduce((total, team) => total +
      (team ? this.fantasyTeamsSelected().find(price => price?.team.id === team.id)?.price ?? 0 : 0), 0);
    return 80000000 - driversValue - teamsValue;
  });

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
      const race = this.lastRace();
      if (race && !this.raceSelected) {
        this.raceSelected = race;
        untracked(() => this.getDriversTeamPrices());
      }
    });
  }

  changeOptions(): void {
    this.filtroString = '';
    this.fantasyPricesDriversFiltered.set([...this.fantasyPricesDrivers()]);
    this.fantasyPricesTeamsFiltered.set([...this.fantasyPricesTeams()]);
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
      this.fantasyPricesDriversFiltered.update(items => [...items].sort((a: FantasyPricesDriver, b: FantasyPricesDriver) =>
        orderDirection === "ASC"
          ? a.driver.name.localeCompare(b.driver.name)
          : b.driver.name.localeCompare(a.driver.name),
      ));
    } else {
      this.fantasyPricesTeamsFiltered.update(items => [...items].sort((a: FantasyPricesTeam, b: FantasyPricesTeam) =>
        orderDirection === "ASC"
          ? a.team.name.localeCompare(b.team.name)
          : b.team.name.localeCompare(a.team.name),
      ));
    }
  }

  private orderByPrice(orderDirection: string): void {
    if (this.optionSelected === "Pilotos") {
      this.fantasyPricesDriversFiltered.update(items => [...items].sort((a: FantasyPricesDriver, b: FantasyPricesDriver) =>
        orderDirection === "ASC" ? a.price - b.price : b.price - a.price,
      ));
    } else {
      this.fantasyPricesTeamsFiltered.update(items => [...items].sort((a: FantasyPricesTeam, b: FantasyPricesTeam) =>
        orderDirection === "ASC" ? a.price - b.price : b.price - a.price,
      ));
    }
  }

  private orderByTotalPoints(orderDirection: string): void {
    if (this.optionSelected === "Pilotos") {
      this.fantasyPricesDriversFiltered.update(items => [...items].sort((a: FantasyPricesDriver, b: FantasyPricesDriver) =>
        orderDirection === "ASC"
          ? a.fantasyInfo.totalPoints - b.fantasyInfo.totalPoints
          : b.fantasyInfo.totalPoints - a.fantasyInfo.totalPoints,
      ));
    } else {
      this.fantasyPricesTeamsFiltered.update(items => [...items].sort((a: FantasyPricesTeam, b: FantasyPricesTeam) =>
        orderDirection === "ASC"
          ? a.fantasyInfo.totalPoints - b.fantasyInfo.totalPoints
          : b.fantasyInfo.totalPoints - a.fantasyInfo.totalPoints,
      ));
    }
  }


  filterItems(filter: string) {
    if (this.optionSelected === 'Pilotos') {
      this.fantasyPricesDriversFiltered.set(this.fantasyPricesDrivers().filter((fpd) => fpd.driver.name.toLowerCase().includes(filter.toLowerCase())));
    } else {
      this.fantasyPricesTeamsFiltered.set(this.fantasyPricesTeams().filter((fpt) => fpt.team.name.toLowerCase().includes(filter.toLowerCase())));
    }
  }


  onRaceChange(newRace: Race) {
    if (!newRace) return;
    this.raceSelected = newRace;
    this.optionSelected = 'Pilotos';

    if (this.lastRace()?.id !== this.raceSelected.id)  {
      this.isLastRace.set(false);
      this.fantasyApiService.getFantasyElection(this.raceSelected.id).pipe(
        takeUntil(this.destroy$),
        catchError((error) => this.utilsService.handleError<FantasyElection>(ERROR_FANTASY_ELECTION_NOT_FOUND, error))
      ).subscribe((fantasyElection: FantasyElection) => {
        this.setFantasyElection(fantasyElection);
      });
    } else {
      this.isLastRace.set(true);
      this.resetFantasyElection();
    }
  }

  async getDriversTeamPrices(): Promise<void> {
    const raceId = this.raceSelected!.id;
    const prices = await lastValueFrom(forkJoin({
      drivers: this.fantasyApiService.getAllPricesDriver(raceId).pipe(
        catchError(error => this.utilsService.handleError<FantasyPricesDriver[]>(ERROR_PRICE_FETCH, error, []))
      ),
      teams: this.fantasyApiService.getAllPricesTeam(raceId).pipe(
        catchError(error => this.utilsService.handleError<FantasyPricesTeam[]>(ERROR_PRICE_FETCH, error, []))
      )
    }).pipe(takeUntil(this.destroy$)), { defaultValue: undefined });
    if (!prices) return;
    this.fantasyPricesDrivers.set(prices.drivers);
    this.fantasyPricesDriversFiltered.set([...prices.drivers]);
    this.fantasyPricesTeams.set(prices.teams);
    this.fantasyPricesTeamsFiltered.set([...prices.teams]);
  }

  isDriverSelected(driver: Driver): boolean  {
    return this.driversSelected().some((d: Driver | undefined) => d?.name === driver.name);
  }

  isTeamSelected(team: Team): boolean  {
    return this.teamsSelected().some((t: Team | undefined) => t?.name === team.name);
  }

  selectedDriversCount(): number {
    return this.driversSelected().filter((d: Driver | undefined) => d !== undefined).length;
  }

  selectedTeamsCount(): number {
    return this.teamsSelected().filter((t: Team | undefined) => t !== undefined).length;
  }

  addDriverToSelection(fantasyDriver: FantasyPricesDriver): void {
    const election = this.fantasyElection();
    const index = !election.driverOne ? 0 : !election.driverTwo ? 1 : 2;
    const key = (['driverOne', 'driverTwo', 'driverThree'] as const)[index];
    this.fantasyElection.update(current => ({ ...current, [key]: fantasyDriver.driver }));
    this.fantasydriversSelected.update(prices => prices.map((price, i) => i === index ? fantasyDriver : price));
  }

  addTeamToSelection(fantasyTeam: FantasyPricesTeam): void {
    const index = !this.fantasyElection().teamOne ? 0 : 1;
    const key = (['teamOne', 'teamTwo'] as const)[index];
    this.fantasyElection.update(current => ({ ...current, [key]: fantasyTeam.team }));
    this.fantasyTeamsSelected.update(prices => prices.map((price, i) => i === index ? fantasyTeam : price));
  }

  deleteDriverFromSelection(index: number): void {
    const key = index === 0 ? 'driverOne' : index === 1 ? 'driverTwo' : 'driverThree';
    this.fantasyElection.update(current => ({ ...current, [key]: undefined }));
  }

  deleteTeamFromSelection(index: number): void {
    const key = index === 0 ? 'teamOne' : 'teamTwo';
    this.fantasyElection.update(current => ({ ...current, [key]: undefined }));
  }

  private resetFantasyElection(): void {
    this.fantasyElection.set(new FantasyElection());
    this.fantasydriversSelected.set([undefined, undefined, undefined]);
    this.fantasyTeamsSelected.set([undefined, undefined]);
  }

  private setFantasyElection(fantasyElection: FantasyElection): void {
    this.fantasyElection.set(fantasyElection);
  }

  private loadEvolutionChart<T extends { race: Race }>(
    request: Observable<T[]>,
    value: (entry: T) => number,
    team: (entry: T) => string,
    update: (chart: ChartData<'line'>, entries: T[]) => void
  ): void {
    request.pipe(
      takeUntil(this.destroy$),
      catchError(error => this.utilsService.handleError<T[]>(ERROR_PRICE_FETCH, error, []))
    ).subscribe(entries => {
      if (!entries.length) return;
      const color = colorsMappings[team(entries[0])] || '#888888';
      update({
        labels: entries.map(entry => entry.race.name),
        datasets: [{
          data: entries.map(value),
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      }, entries);
    });
  }

  generateEvolutionDriverPriceChart(data: FantasyPricesDriver): void {
    this.showDriverPricesData.set(true);
    this.driverPriceData.set(data);
    this.loadEvolutionChart(this.fantasyApiService.getDriverPrices(data.driver.id),
      entry => parseFloat(entry.price.toFixed(2)), entry => entry.driver.team.name,
      (chart, entries) => {
        this.dataDriversEvolutionPrice.set(chart);
        this.showDriverMaxPriceData.set(Math.max(...entries.map(entry => entry.price)));
        this.showDriverStartPriceData.set(entries[0].price);
      });
  }

  generateEvolutionTeamPriceChart(data: FantasyPricesTeam): void {
    this.showTeamPricesData.set(true);
    this.teamPriceData.set(data);
    this.loadEvolutionChart(this.fantasyApiService.getTeamPrices(data.team.id),
      entry => parseFloat(entry.price.toFixed(2)), entry => entry.team.name,
      (chart, entries) => {
        this.dataTeamsEvolutionPrice.set(chart);
        this.showTeamMaxPriceData.set(Math.max(...entries.map(entry => entry.price)));
        this.showTeamStartPriceData.set(entries[0].price);
      });
  }

  generateEvolutionPointDriverChart(data: FantasyPricesDriver): void {
    this.showDriverPointsData.set(true);
    this.driverPointData.set(data);
    this.loadEvolutionChart(this.fantasyApiService.getDriverPoints(data.driver.id),
      entry => entry.points, entry => entry.driver.team.name,
      (chart, entries) => {
        this.dataDriversEvolutionPoints.set(chart);
        this.showDriverBestPointsData.set(Math.max(...entries.map(entry => entry.points)));
        this.showDriverMedianPointsData.set(entries.reduce((total, entry) => total + entry.points, 0) / entries.length);
      });
  }

  generateEvolutionPointTeamChart(data: FantasyPricesTeam): void {
    this.showTeamPointsData.set(true);
    this.teamPointData.set(data);
    this.loadEvolutionChart(this.fantasyApiService.getTeamPoints(data.team.id),
      entry => entry.points, entry => entry.team.name,
      (chart, entries) => {
        this.dataTeamsEvolutionPoints.set(chart);
        this.showTeamBestPointsData.set(Math.max(...entries.map(entry => entry.points)));
        this.showTeamMedianPointsData.set(entries.reduce((total, entry) => total + entry.points, 0) / entries.length);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  readonly electionEnabled = false;

  saveFantasyElecion(): void {
    if (!this.electionEnabled) return;
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
      this.fantasyElection().driverOne &&
      this.fantasyElection().driverTwo &&
      this.fantasyElection().driverThree &&
      this.fantasyElection().teamOne &&
      this.fantasyElection().teamTwo
    ) {
      if (this.totalMoney() < 0)
        return this.messageInfoService.showWarn(WARNING_MONEY_NEGATIVE);

      this.fantasyElection.update(election => ({
        ...election,
        race: this.raceSelected,
        season: this.raceSelected?.season,
        user: new Account(parseInt(this.authJWTService.getIdFromToken(localStorage.getItem('auth')!)))
      }));

      this.messageInfoService.showWarn('No esta habilitado el fantasy.');
    } else {
      this.messageInfoService.showWarn(WARNING_ELECTION_NOT_COMPLETED);
    }

  }
}
