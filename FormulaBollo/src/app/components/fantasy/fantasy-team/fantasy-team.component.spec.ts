import { ComponentFixture, TestBed } from '@angular/core/testing';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { FantasyPricesDriver } from '../../../../shared/models/fantasyPricesDriver';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
import { FantasyPointsDriver } from '../../../../shared/models/fantasyPointsDriver';
import { FantasyPointsTeam } from '../../../../shared/models/fantasyPointsTeam';
import { FantasyElection } from '../../../../shared/models/fantasyElection';
import { Race } from '../../../../shared/models/race';
import { colorsMappings, ERROR_PRICE_FETCH } from '../../../constants';
import { FantasyTeamComponent } from './fantasy-team.component';

describe('FantasyTeamComponent', () => {
  let component: FantasyTeamComponent;
  let fixture: ComponentFixture<FantasyTeamComponent>;
  let api: jasmine.SpyObj<FantasyApiService>;
  const driver = driverPointsFixture.driver;
  const team = driver.team;
  const race = new Race(3, 'Primera', '', '', new Date('2026-01-01'), driver.season, 1);
  const secondRace = { ...race, id: 4, name: 'Segunda' };
  const fantasyInfo = { totalPoints: 25, averagePoints: 12.5, differencePrice: 0 };
  const driverPrice: FantasyPricesDriver = { id: 1, driver, race, price: 12.345, fantasyInfo };
  const teamPrice: FantasyPricesTeam = { id: 1, team, race, price: 20.456, fantasyInfo };

  beforeEach(async () => {
    api = jasmine.createSpyObj('FantasyApiService', [
      'getDriverPrices', 'getTeamPrices', 'getDriverPoints', 'getTeamPoints',
      'getAllPricesDriver', 'getAllPricesTeam', 'getFantasyElection'
    ]);
    api.getAllPricesDriver.and.returnValue(of([]));
    api.getAllPricesTeam.and.returnValue(of([]));
    api.getFantasyElection.and.returnValue(of(new FantasyElection()));
    await TestBed.configureTestingModule({
      imports: [FantasyTeamComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: FantasyApiService, useValue: api },
        // TODO: onRaceChange lee .id sin admitir el undefined que emite el selector vacío.
        // Estas pruebas de gráficas mantienen el selector sin respuesta; seleccionan carreras cuando lo necesitan.
        { provide: RaceApiService, useValue: { getActualRace: () => EMPTY, getAllRacesFinishedAndActual: () => EMPTY } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses sector colours for negative and positive remaining budgets', async () => {
    component.addDriverToSelection({ ...driverPrice, price: 80000001 });
    await fixture.whenStable();
    const budget = () => fixture.nativeElement.querySelector('.text-display-md.tabular-nums') as HTMLElement;
    expect(component.totalMoney()).toBe(-1);
    expect(budget().classList.contains('text-sector-down')).toBeTrue();
    expect(budget().classList.contains('text-sector-up')).toBeFalse();

    component.deleteDriverFromSelection(0);
    await fixture.whenStable();
    expect(component.totalMoney()).toBe(80000000);
    expect(budget().classList.contains('text-sector-up')).toBeTrue();
    expect(budget().classList.contains('text-sector-down')).toBeFalse();
  });

  it('names the remove buttons after the selected driver and team', async () => {
    component.addDriverToSelection(driverPrice);
    component.addTeamToSelection(teamPrice);
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('button.selection-remove') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('aria-label')).toBe('Quitar ' + driver.name);
    expect(buttons[1].getAttribute('aria-label')).toBe('Quitar ' + team.name);
    expect(Array.from(buttons).every(button => button.type === 'button')).toBeTrue();
  });

  it('marks the Fantasy unavailable notice with the warning border', () => {
    const notice = fixture.nativeElement.querySelector('.border-l-warn') as HTMLElement;
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('Fantasy no habilitado para esta temporada');
  });

  for (const kind of ['driverPrices', 'teamPrices', 'driverPoints', 'teamPoints'] as const) {
    const isDriver = kind.startsWith('driver');
    const isPrice = kind.endsWith('Prices');
    const invoke = (instance: FantasyTeamComponent) => {
      if (kind === 'driverPrices') instance.generateEvolutionDriverPriceChart(driverPrice);
      if (kind === 'teamPrices') instance.generateEvolutionTeamPriceChart(teamPrice);
      if (kind === 'driverPoints') instance.generateEvolutionPointDriverChart(driverPrice);
      if (kind === 'teamPoints') instance.generateEvolutionPointTeamChart(teamPrice);
    };
    const response = (unknownTeam = false) => [race, secondRace].map((race, index) => ({
      ...driverPrice, ...teamPrice, race,
      driver: unknownTeam ? { ...driver, team: { ...team, name: 'Desconocido' } } : driver,
      team: unknownTeam ? { ...team, name: 'Desconocido' } : team,
      price: index ? 30.678 : 12.345,
      points: index ? 20 : -5,
      season: driver.season
    }));
    const request = () => ({
      driverPrices: api.getDriverPrices, teamPrices: api.getTeamPrices,
      driverPoints: api.getDriverPoints, teamPoints: api.getTeamPoints
    })[kind];
    const chart = () => ({
      driverPrices: component.dataDriversEvolutionPrice, teamPrices: component.dataTeamsEvolutionPrice,
      driverPoints: component.dataDriversEvolutionPoints, teamPoints: component.dataTeamsEvolutionPoints
    })[kind]();

    it(`${kind}: builds the line dataset and preserves price or point statistics`, () => {
      request().and.returnValue(of(response()));
      invoke(component);
      expect(request()).toHaveBeenCalledOnceWith(isDriver ? driver.id : team.id);
      expect(chart()).toEqual({
        labels: ['Primera', 'Segunda'],
        datasets: [{ data: isPrice ? [12.35, 30.68] : [-5, 20],
          borderColor: colorsMappings[team.name], backgroundColor: colorsMappings[team.name],
          pointBackgroundColor: colorsMappings[team.name], pointBorderColor: '#fff',
          pointBorderWidth: 2, fill: false, tension: 0.3, pointRadius: 4, pointHoverRadius: 6 }]
      });
      if (isPrice) {
        expect(isDriver ? component.showDriverStartPriceData() : component.showTeamStartPriceData()).toBe(12.345);
        expect(isDriver ? component.showDriverMaxPriceData() : component.showTeamMaxPriceData()).toBe(30.678);
      } else {
        expect(isDriver ? component.showDriverBestPointsData() : component.showTeamBestPointsData()).toBe(20);
        expect(isDriver ? component.showDriverMedianPointsData() : component.showTeamMedianPointsData()).toBe(7.5);
      }
    });

    it(`${kind}: uses grey for an unknown team`, () => {
      request().and.returnValue(of(response(true)));
      invoke(component);
      expect(chart().datasets[0].borderColor).toBe('#888888');
      expect(chart().datasets[0].backgroundColor).toBe('#888888');
      expect(chart().datasets[0].pointBackgroundColor).toBe('#888888');
    });

    it(`${kind}: leaves the dataset and statistics unchanged on an empty response or error`, () => {
      request().and.returnValue(of(response()));
      invoke(component);
      const previous = chart();
      request().and.returnValue(of([]));
      invoke(component);
      expect(chart()).toBe(previous);
      const error = new Error('offline');
      const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
      spyOn(console, 'error');
      request().and.returnValue(throwError(() => error));
      invoke(component);
      expect(notify).toHaveBeenCalledOnceWith(ERROR_PRICE_FETCH, error);
      expect(chart()).toBe(previous);
      expect(isPrice
        ? (isDriver ? component.showDriverMaxPriceData() : component.showTeamMaxPriceData())
        : (isDriver ? component.showDriverMedianPointsData() : component.showTeamMedianPointsData()))
        .toBe(isPrice ? 30.678 : 7.5);
    });
  }

  it('cancels chart subscriptions when destroyed', () => {
    const response = new Subject<FantasyPointsTeam[]>();
    api.getTeamPoints.and.returnValue(response);
    component.generateEvolutionPointTeamChart(teamPrice);
    const previous = component.dataTeamsEvolutionPoints();
    fixture.destroy();
    response.next([{ id: 1, team, race, points: 10, season: driver.season }]);
    expect(component.dataTeamsEvolutionPoints()).toBe(previous);
    expect(response.observed).toBeFalse();
  });

  it('renders an asynchronous points response without manual change detection', async () => {
    const response = new Subject<FantasyPointsDriver[]>();
    api.getDriverPoints.and.returnValue(response);
    component.generateEvolutionPointDriverChart(driverPrice);
    await fixture.whenStable();
    response.next([{ id: 1, driver, race, points: 17, season: driver.season }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('17.0');
    expect(component.showDriverPointsData()).toBeTrue();
  });

  it('updates prices and filters from asynchronous API responses', async () => {
    const drivers = new Subject<FantasyPricesDriver[]>();
    const teams = new Subject<FantasyPricesTeam[]>();
    api.getAllPricesDriver.and.returnValue(drivers);
    api.getAllPricesTeam.and.returnValue(teams);
    component.raceSelected = race;
    const loading = component.getDriversTeamPrices();
    drivers.next([driverPrice]);
    drivers.complete();
    await Promise.resolve();
    teams.next([teamPrice]);
    teams.complete();
    await loading;
    await fixture.whenStable();
    expect(api.getAllPricesDriver).toHaveBeenCalledWith(race.id);
    expect(api.getAllPricesTeam).toHaveBeenCalledWith(race.id);
    expect(component.fantasyPricesDriversFiltered()).toEqual([driverPrice]);
    expect(component.fantasyPricesTeamsFiltered()).toEqual([teamPrice]);
    expect(fixture.nativeElement.textContent).toContain(driver.name);
  });

  it('keeps selection and budget in sync when adding, deleting and replacing slots', () => {
    component.addDriverToSelection(driverPrice);
    component.addTeamToSelection(teamPrice);
    expect(component.driversSelected()[0]).toBe(driver);
    expect(component.teamsSelected()[0]).toBe(team);
    expect(component.totalMoney()).toBe(80000000 - driverPrice.price - teamPrice.price);
    component.deleteDriverFromSelection(0);
    component.deleteTeamFromSelection(0);
    expect(component.totalMoney()).toBe(80000000);
    component.addDriverToSelection({ ...driverPrice, price: 500 });
    expect(component.totalMoney()).toBe(79999500);
    expect(component.selectedDriversCount()).toBe(1);
    expect(component.selectedTeamsCount()).toBe(0);
  });

  it('renders the election received asynchronously for a historical race', async () => {
    const election = new Subject<FantasyElection>();
    api.getFantasyElection.and.returnValue(election);
    component.onRaceChange(race);
    await fixture.whenStable();
    election.next({ ...new FantasyElection(), driverOne: driver, teamOne: team });
    await fixture.whenStable();
    expect(component.isLastRace()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain(driver.name);
    expect(component.driversSelected()[0]).toBe(driver);
    expect(component.teamsSelected()[0]).toBe(team);
  });
});
