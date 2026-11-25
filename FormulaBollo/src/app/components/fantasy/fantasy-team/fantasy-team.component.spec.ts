import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { FantasyPricesDriver } from '../../../../shared/models/fantasyPricesDriver';
import { FantasyPointsDriver } from '../../../../shared/models/fantasyPointsDriver';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
import { FantasyElection } from '../../../../shared/models/fantasyElection';
import { Race } from '../../../../shared/models/race';
import { ERROR_PRICE_FETCH } from '../../../constants';
import { FantasyTeamComponent } from './fantasy-team.component';

const M = 1_000_000;
const season = { id: 3, name: 'Temporada 3', number: 3 };
const race = new Race(3, 'Primera', '', '', new Date('2099-01-01T18:00:00'), season, 0);
const previous = { ...race, id: 2, name: 'Anterior', dateStart: new Date('2098-12-01T18:00:00'), finished: 1 };

const teamOf = (id: number, name: string) => ({ id, name, carImage: `${name}.avif`, logoImage: '', season });
const driver = (id: number, name: string, teamName: string, price: number, points = 10, diff = 0) => ({
  id, race, price, fantasyInfo: { totalPoints: points, differencePrice: diff, averagePoints: 0 },
  driver: { id, name, number: id, driverImage: `${name}.webp`, season, team: teamOf(id, teamName) }
}) as unknown as FantasyPricesDriver;
const team = (id: number, name: string, price: number, points = 10) => ({
  id, race, price, fantasyInfo: { totalPoints: points, differencePrice: 0, averagePoints: 0 }, team: teamOf(id, name)
}) as unknown as FantasyPricesTeam;

describe('FantasyTeamComponent', () => {
  let fixture: ComponentFixture<FantasyTeamComponent>;
  let component: FantasyTeamComponent;
  let api: jasmine.SpyObj<FantasyApiService>;
  let actual$: Observable<Race>;
  const drivers = [
    driver(1, 'Moraga', 'Red Bull', 20 * M, 200), driver(2, 'Juannudi', 'AlphaTauri', 10 * M, 150, 5), driver(3, 'Bubapu', 'Ferrari', 2 * M, 30, -3),
    driver(4, 'Fernando', 'Haas', 5 * M, 60), driver(5, 'Robe', 'Alpine', 3 * M, 20), driver(6, 'Caro', 'McLaren', 27 * M, 90)
  ];
  const teams = [team(1, 'Red Bull', 22 * M, 300), team(2, 'Haas', 3 * M, 40), team(3, 'Mercedes', 15 * M, 120)];
  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll<HTMLButtonElement>('section[aria-labelledby="panel-title"] button'));
  const add = (name: string) => buttons().find(button => (button.getAttribute('aria-label') ?? '').startsWith('Añadir a') && button.getAttribute('aria-label')!.endsWith(name))!;
  const rowOf = (name: string) => Array.from(root().querySelectorAll('section[aria-labelledby="panel-title"] ul.grid > li')).find(li => li.textContent!.includes(name))!;
  const text = (selector: string) => root().querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  const names = () => Array.from(root().querySelectorAll('section[aria-labelledby="panel-title"] ul.grid > li strong.font-display.text-lg')).map(item => item.textContent!.trim());

  function create(prices: { drivers?: FantasyPricesDriver[]; teams?: FantasyPricesTeam[] } = {}): void {
    api.getAllPricesDriver.and.returnValue(of(prices.drivers ?? drivers));
    api.getAllPricesTeam.and.returnValue(of(prices.teams ?? teams));
    fixture = TestBed.createComponent(FantasyTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const ready = async () => { await fixture.whenStable(); fixture.detectChanges(); };
  const press = (button: HTMLButtonElement) => { button.click(); fixture.detectChanges(); };

  beforeEach(() => {
    api = jasmine.createSpyObj('FantasyApiService', ['getDriverPrices', 'getTeamPrices', 'getDriverPoints', 'getTeamPoints', 'getAllPricesDriver', 'getAllPricesTeam', 'getFantasyElection']);
    api.getFantasyElection.and.returnValue(of(new FantasyElection()));
    actual$ = of(race);
    TestBed.configureTestingModule({
      imports: [FantasyTeamComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: FantasyApiService, useValue: api },
        { provide: RaceApiService, useValue: { getActualRace: () => actual$, getAllRacesFinishedAndActual: () => EMPTY } }
      ]
    });
  });

  afterEach(() => fixture?.destroy());

  it('loads the prices of the actual race once and starts on the first driver slot with the whole budget', async () => {
    create();
    await ready();

    expect(api.getAllPricesDriver).toHaveBeenCalledOnceWith(3);
    expect(api.getAllPricesTeam).toHaveBeenCalledOnceWith(3);
    expect(text('#panel-title')).toBe('Elegir Piloto 1');
    expect(root().querySelectorAll('section[aria-labelledby="panel-title"] ul.grid > li').length).toBe(6);
    expect(text('section[aria-labelledby="team-title"]')).toContain('$80M');
    expect(text('#save-reason')).toContain('Faltan Piloto 1, Piloto 2, Piloto 3, Equipo 1 y Equipo 2.');
    expect(root().querySelectorAll('h1').length).toBe(1);
  });

  it('keeps saving disabled with the reason while the election is not enabled', async () => {
    create();
    await ready();

    const save = Array.from(root().querySelectorAll('button')).find(button => button.textContent!.includes('Guardar equipo'))!;
    expect(save.disabled).toBeTrue();
    expect(text('#save-reason')).toContain('La elección de Fantasy no está habilitada.');
    expect(text('section[aria-labelledby="team-title"]')).not.toContain('Equipo completo y válido');
    expect(root().textContent).toContain('Fantasy no habilitado para esta temporada');
    expect(root().textContent).toContain('hasta 12 horas antes de la carrera');
  });

  it('fills the active slot, moves to the next empty one and updates the budget and the segmented bar', async () => {
    create();
    await ready();
    press(add('Moraga'));

    expect(component.remaining()).toBe(60 * M);
    expect(text('#panel-title')).toBe('Elegir Piloto 2');
    expect(root().textContent).toContain('Al fichar, pasas a Piloto 3.');
    expect(text('section[aria-labelledby="team-title"]')).toContain('$60M');
    expect(root().querySelectorAll('section[aria-labelledby="team-title"] div[aria-hidden="true"] span').length).toBe(1);
    press(add('Juannudi'));
    press(add('Bubapu'));
    expect(text('#panel-title')).toBe('Elegir Equipo 1');
    expect(root().querySelectorAll('section[aria-labelledby="panel-title"] ul.grid > li').length).toBe(3);
    expect(text('#save-reason')).toContain('Faltan Equipo 1 y Equipo 2.');
  });

  it('warns how much would be missing when a candidate fits but the team could not be completed', async () => {
    create({ teams: [team(1, 'Red Bull', 22 * M, 300), team(2, 'Mercedes', 15 * M, 120), team(3, 'Alpha', 12 * M, 40)] });
    await ready();
    press(add('Moraga'));
    press(add('Juannudi'));
    fixture.detectChanges();

    const row = rowOf('Caro');
    expect(row.textContent).toContain('Cabe, pero faltarían $4M para completar el equipo');
    const button = add('Caro');
    expect(button.disabled).toBeFalse();
    press(button);
    expect(component.remaining()).toBe(23 * M);
  });

  it('blocks a swap that does not fit and says why', async () => {
    create();
    await ready();
    press(add('Moraga'));
    press(add('Juannudi'));
    press(add('Bubapu'));
    press(add('Red Bull'));
    press(add('Mercedes'));
    component.activate({ kind: 'driver', index: 2 });
    fixture.detectChanges();

    const row = rowOf('Caro');
    expect(row.textContent).toContain('Frente a lo que tienes');
    expect(row.textContent).toContain('Te pasas $14M');
    const button = Array.from(row.querySelectorAll('button')).find(item => item.textContent!.includes('No cabe'))!;
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-label')).toBe('Caro: no cabe, te pasas por $14M');
  });

  it('swaps the pick of a filled slot and shows the price and points differences', async () => {
    create();
    await ready();
    press(add('Moraga'));
    component.activate({ kind: 'driver', index: 0 });
    fixture.detectChanges();

    const row = rowOf('Juannudi');
    expect(row.textContent).toContain('precio −$10M');
    expect(row.textContent).toContain('puntos −50');
    expect(rowOf('Moraga').textContent).toContain('En tu equipo');
    press(Array.from(row.querySelectorAll('button')).find(item => item.textContent!.includes('Cambiar'))!);
    expect(component.team().drivers[0]?.driver.name).toBe('Juannudi');
    expect(component.remaining()).toBe(70 * M);
  });

  it('removes a pick and goes back to that slot', async () => {
    create();
    await ready();
    press(add('Moraga'));
    press(add('Juannudi'));
    press(root().querySelector<HTMLButtonElement>('button[aria-label="Quitar Moraga"]')!);

    expect(component.team().drivers[0]).toBeUndefined();
    expect(text('#panel-title')).toBe('Elegir Piloto 1');
    expect(component.remaining()).toBe(70 * M);
  });

  it('filters by price band and search, sorts by every column and marks the best value', async () => {
    create();
    await ready();

    expect(names()).toEqual(['Moraga', 'Juannudi', 'Caro', 'Fernando', 'Bubapu', 'Robe']);
    component.band.set('low');
    fixture.detectChanges();
    expect(names()).toEqual(['Fernando', 'Bubapu', 'Robe']);
    component.band.set('all');
    component.query.set('jua');
    fixture.detectChanges();
    expect(names()).toEqual(['Juannudi']);
    component.query.set('');
    component.sortBy('name');
    fixture.detectChanges();
    expect(names()[0]).toBe('Bubapu');
    component.sortBy('name');
    fixture.detectChanges();
    expect(names()[0]).toBe('Robe');
    component.sortBy('ppm');
    fixture.detectChanges();
    expect(names()[0]).toBe('Bubapu');
    expect(rowOf('Juannudi').querySelector('.sr-only')!.textContent).toContain('Mejor valor');
    expect(component.counts()).toEqual({ all: 6, low: 3, mid: 1, high: 2 });
  });

  it('shows the saved team of a previous race without prices, list or remove buttons', async () => {
    const election = new FantasyElection();
    election.driverOne = drivers[0].driver;
    election.driverTwo = drivers[1].driver;
    election.driverThree = drivers[2].driver;
    election.teamOne = teams[0].team;
    election.teamTwo = teams[1].team;
    api.getFantasyElection.and.returnValue(of(election));
    create();
    await ready();
    component.onRaceChange(previous as unknown as Race);
    fixture.detectChanges();

    expect(api.getFantasyElection).toHaveBeenCalledWith(2);
    expect(root().querySelector('section[aria-labelledby="panel-title"]')).toBeNull();
    expect(root().textContent).toContain('Equipo guardado en Anterior');
    expect(root().querySelectorAll('button[aria-label^="Quitar"]').length).toBe(0);
    const saved = Array.from(root().querySelectorAll('section[aria-labelledby="slots-title"] strong')).map(item => item.textContent!.trim());
    expect(saved).toEqual(['Moraga', 'Juannudi', 'Bubapu', 'Red Bull', 'Haas']);
    expect(root().querySelector('section[aria-labelledby="slots-title"]')!.textContent).not.toContain('$');
    component.onRaceChange(race);
    fixture.detectChanges();
    expect(root().querySelector('section[aria-labelledby="panel-title"]')).not.toBeNull();
  });

  it('opens one dialog with the points and price series of a candidate and switches tabs', async () => {
    api.getDriverPoints.and.returnValue(of([{ race: { name: 'A' }, points: 10 }, { race: { name: 'B' }, points: 20 }] as unknown as FantasyPointsDriver[]));
    api.getDriverPrices.and.returnValue(of([{ race: { name: 'A' }, price: 5 * M }, { race: { name: 'B' }, price: 9 * M }] as unknown as FantasyPricesDriver[]));
    create();
    await ready();
    component.openChart(drivers[0]);
    fixture.detectChanges();

    const view = component.chart()!;
    expect(api.getDriverPoints).toHaveBeenCalledWith(1);
    expect(api.getDriverPrices).toHaveBeenCalledWith(1);
    expect(view.average).toBe(15);
    expect(view.best).toBe(20);
    expect(view.start).toBe(5 * M);
    expect(view.max).toBe(9 * M);
    expect(view.points!.labels).toEqual(['A', 'B']);
    component.chartTab('prices');
    expect(component.chart()!.tab).toBe('prices');
    component.closeChart();
    expect(component.chart()).toBeNull();
  });

  it('opens the series of a team and keeps an empty chart when the series fail', async () => {
    api.getTeamPoints.and.returnValue(throwError(() => new Error('falla')));
    api.getTeamPrices.and.returnValue(of([]));
    create();
    await ready();
    component.openChart(teams[0]);

    expect(api.getTeamPoints).toHaveBeenCalledWith(1);
    expect(component.chart()!.points).toBeNull();
    expect(component.chart()!.prices).toBeNull();
  });

  it('explains when there are no prices and keeps the page usable when the price request fails', async () => {
    create({ drivers: [], teams: [] });
    await ready();
    expect(root().textContent).toContain('No hay precios para esta carrera.');
    fixture.destroy();

    api.getAllPricesDriver.and.returnValue(throwError(() => new Error(ERROR_PRICE_FETCH)));
    api.getAllPricesTeam.and.returnValue(of([]));
    fixture = TestBed.createComponent(FantasyTeamComponent);
    fixture.detectChanges();
    await ready();
    expect(root().querySelector('section[aria-labelledby="slots-title"]')).not.toBeNull();
  });
  it('is the last race when the actual race arrives after the selector and then loads the prices', async () => {
    const arrival = new Subject<Race>();
    actual$ = arrival;
    create();
    component.onRaceChange(race);
    fixture.detectChanges();

    expect(component.isLastRace()).toBeTrue();
    expect(api.getAllPricesDriver).not.toHaveBeenCalled();
    arrival.next(race);
    await ready();
    expect(api.getAllPricesDriver).toHaveBeenCalledOnceWith(3);
    expect(root().querySelector('section[aria-labelledby="panel-title"]')).not.toBeNull();
    expect(names().length).toBe(6);
  });

  it('keeps the draft team when looking at a previous race and coming back', async () => {
    create();
    await ready();
    press(add('Moraga'));
    component.onRaceChange(previous as unknown as Race);
    fixture.detectChanges();
    expect(root().querySelector('section[aria-labelledby="team-title"]')!.textContent).not.toContain('Guardar equipo');
    component.onRaceChange(race);
    fixture.detectChanges();

    expect(component.remaining()).toBe(60 * M);
    expect(text('section[aria-labelledby="team-title"]')).toContain('$60M');
  });

  it('says there is no saved team, survives a failure and ignores a late answer from another race', async () => {
    const late = new Subject<FantasyElection>();
    api.getFantasyElection.and.callFake(id => id === 2 ? late : of(new FantasyElection()));
    create();
    await ready();
    component.onRaceChange(previous as unknown as Race);
    fixture.detectChanges();
    expect(component.savedState()).toBe('loading');
    expect(root().textContent).toContain('Cargando el equipo guardado');
    component.onRaceChange({ ...previous, id: 5, name: 'Otra' } as unknown as Race);
    fixture.detectChanges();
    expect(component.savedState()).toBe('none');
    expect(root().textContent).toContain('No hay equipo guardado en Otra');
    const stale = new FantasyElection();
    stale.driverOne = drivers[0].driver;
    late.next(stale);
    fixture.detectChanges();
    expect(component.savedState()).toBe('none');

    api.getFantasyElection.and.returnValue(throwError(() => new Error('offline')));
    component.onRaceChange({ ...previous, id: 6, name: 'Rota' } as unknown as Race);
    fixture.detectChanges();
    expect(component.savedState()).toBe('none');
  });

  it('searches without caring about accents or case', async () => {
    create({ drivers: [...drivers, driver(7, 'Álvaro', 'Williams', 4 * M, 10)] });
    await ready();
    component.query.set('ALVARO');
    fixture.detectChanges();

    expect(names()).toEqual(['Álvaro']);
  });

  it('shows the chart as loading until both series arrive', async () => {
    const points = new Subject<FantasyPointsDriver[]>();
    api.getDriverPoints.and.returnValue(points);
    api.getDriverPrices.and.returnValue(of([]));
    create();
    await ready();
    component.openChart(drivers[0]);
    fixture.detectChanges();

    expect(component.chart()!.loading).toBeTrue();
    expect(document.body.textContent).toContain('Cargando gráfico');
    points.next([]);
    points.complete();
    fixture.detectChanges();
    expect(component.chart()!.loading).toBeFalse();
    component.closeChart();
    fixture.detectChanges();
    expect(component.chart()).toBeNull();
  });

  it('keeps the change panel on the last slot when the team is complete and says what it compares against', async () => {
    create();
    await ready();
    for (const name of ['Moraga', 'Juannudi', 'Bubapu', 'Red Bull', 'Haas']) press(add(name));

    expect(component.missing().length).toBe(0);
    expect(text('#panel-title')).toBe('Cambiar Equipo 2');
    expect(root().querySelector('section[aria-labelledby="panel-title"]')!.textContent).toContain('Cada fila se compara con Haas ($3M)');
    expect(root().textContent).toContain('Al cambiar, sigues en Equipo 2.');
    press(root().querySelector<HTMLButtonElement>('#slot-driver-0')!);
    expect(text('#panel-title')).toBe('Cambiar Piloto 1');
  });

  it('moves between the chart tabs with the arrow keys', async () => {
    api.getDriverPoints.and.returnValue(of([]));
    api.getDriverPrices.and.returnValue(of([]));
    create();
    await ready();
    component.openChart(drivers[0]);
    component.onTabKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 'points');
    expect(component.chart()!.tab).toBe('prices');
    component.onTabKey(new KeyboardEvent('keydown', { key: 'Home' }), 'prices');
    expect(component.chart()!.tab).toBe('points');
    component.onTabKey(new KeyboardEvent('keydown', { key: 'a' }), 'points');
    expect(component.chart()!.tab).toBe('points');
  });
});
