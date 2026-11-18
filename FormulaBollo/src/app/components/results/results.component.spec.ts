import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../testing/component-test-providers';
import { ResultApiService } from '../../../shared/services/api/result-api.service';
import { PenaltiesApiService } from '../../../shared/services/api/penalties-api.service';
import { RaceApiService } from '../../../shared/services/api/race-api.service';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { MessageInfoService } from '../../../shared/services/toastInfo.service';
import { Race } from '../../../shared/models/race';
import { Season } from '../../../shared/models/season';
import { Result } from '../../../shared/models/result';
import { ResultTeam } from '../../../shared/models/resultTeam';
import { Position } from '../../../shared/models/position';
import { Penalty } from '../../../shared/models/penalty';
import { ERROR_PENALTY_FETCH, ERROR_RESULT_FETCH } from '../../constants';
import { ResultsComponent } from './results.component';

describe('ResultsComponent', () => {
  const season = new Season(42, 'Histórica', 2);
  const race = new Race(17, 'Gran Premio', '', '', new Date('2026-01-01'), season, 1);
  const otherRace = { ...race, id: 18, name: 'Otra carrera' };
  const driver = driverPointsFixture.driver;
  const result = new Result(race, driver, new Position(1, 1, 25), 1, 1);
  const teamResult: ResultTeam = { id: 1, race, results: [result, { ...result }], totalPoints: 50, hasFastLap: true, hasPole: true };
  const penalty = new Penalty(1, race, driver, 'Contacto', { id: 1, severity: 'Leve' }, season);
  let fixture: ComponentFixture<ResultsComponent>;
  let component: ResultsComponent;
  let results: jasmine.SpyObj<ResultApiService>;
  let penalties: jasmine.SpyObj<PenaltiesApiService>;
  let races: jasmine.SpyObj<RaceApiService>;
  let seasons: jasmine.SpyObj<SeasonApiService>;

  beforeEach(() => {
    results = jasmine.createSpyObj('ResultApiService', ['getAllResultsPerRacePilots', 'getAllResultsPerRaceTeams']);
    penalties = jasmine.createSpyObj('PenaltiesApiService', ['getPenaltiesByRace']);
    races = jasmine.createSpyObj('RaceApiService', ['getAllRaces']);
    seasons = jasmine.createSpyObj('SeasonApiService', ['getSeasons']);
    results.getAllResultsPerRacePilots.and.returnValue(of([result]));
    results.getAllResultsPerRaceTeams.and.returnValue(of([teamResult]));
    penalties.getPenaltiesByRace.and.returnValue(of([penalty]));
    races.getAllRaces.and.returnValue(of([otherRace, race]));
    seasons.getSeasons.and.returnValue(of([season]));
    TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ name: 'Gran_Premio', season: '2' }) } } },
        { provide: ResultApiService, useValue: results },
        { provide: PenaltiesApiService, useValue: penalties },
        { provide: RaceApiService, useValue: races },
        { provide: SeasonApiService, useValue: seasons }
      ]
    });
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('renders driver timing tower rows with team borders, points and lap and pole labels', () => {
    results.getAllResultsPerRacePilots.and.returnValue(of([
      { ...result, fastlap: 1, pole: 0 },
      { ...result, fastlap: 0, pole: 1, position: null },
    ]));
    fixture.detectChanges();

    const tower: HTMLElement = fixture.nativeElement.querySelector('p-table.timing-tower');
    expect(tower).not.toBeNull();
    const rows = tower.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      expect(cells[0].classList).toContain('border-Ferrari');
      expect(row.querySelectorAll('td.tt-points').length).toBe(1);
      expect(cells[3].classList).toContain('tt-points');
      expect(cells[3].textContent!.trim()).toBe(index === 0 ? '25' : 'DNF');
      expect(cells[4].textContent!.trim()).toBe(index === 0 ? 'Sí' : 'No');
      expect(cells[5].textContent!.trim()).toBe(index === 0 ? 'No' : 'Sí');
    });
  });

  it('renders the penalty severity in a timing tower when penalties are shown', () => {
    (component as any).showPenalties = true;
    fixture.detectChanges();

    const tower: HTMLElement = fixture.nativeElement.querySelector('p-table.penaltiesTable.timing-tower');
    expect(tower).not.toBeNull();
    expect(tower.querySelector('tbody td:first-child')!.classList).toContain('border-Ferrari');
    expect(tower.querySelector('tbody p-chip')!.textContent!.trim()).toBe('Leve');
  });

  it('renders driver result cells under their matching column headers', () => {
    fixture.detectChanges();
    const table: HTMLTableElement = fixture.nativeElement.querySelector('p-table table');
    const headers = Array.from(table.querySelectorAll('thead th'), header => header.textContent!.trim());
    const cells = table.querySelectorAll('tbody tr:first-child td');

    expect(headers).toEqual(['POS', 'Piloto', 'Equipo', 'Puntos', 'Vuelta Rápida', 'Pole']);
    expect(cells[headers.indexOf('Piloto')].textContent).toContain(driver.name);
    expect(cells[headers.indexOf('Equipo')].textContent).toContain(driver.team.name);
  });

  it('renders team and both driver result cells under their matching column headers', () => {
    const secondDriver = { ...driver, id: 2, name: 'Segundo piloto' };
    results.getAllResultsPerRaceTeams.and.returnValue(of([{
      ...teamResult,
      results: [result, { ...result, driver: secondDriver }]
    }]));
    (component as any).typeSelected = 'Equipos';
    fixture.detectChanges();
    const table: HTMLTableElement = fixture.nativeElement.querySelector('p-table table');
    const headers = Array.from(table.querySelectorAll('thead th'), header => header.textContent!.trim());
    const cells = table.querySelectorAll('tbody tr:first-child td');

    expect(headers).toEqual(['POS', 'Equipo', 'Piloto 1', 'Piloto 2', 'Puntos', 'Vuelta Rápida', 'Pole']);
    expect(cells[headers.indexOf('Equipo')].textContent).toContain(driver.team.name);
    expect(cells[headers.indexOf('Piloto 1')].textContent).toContain(driver.name);
    expect(cells[headers.indexOf('Piloto 2')].textContent).toContain(secondDriver.name);
  });

  it('decodes the route race name, selects the season by number and loads its race id', () => {
    fixture.detectChanges();
    expect(component.selectSeasonComponent.seasonForm.get('season')!.value).toBe(season);
    expect(races.getAllRaces.calls.mostRecent().args).toEqual([2]);
    expect(component.selectRacesComponent.racesForm.get('race')!.value).toBe(race);
    expect(results.getAllResultsPerRacePilots.calls.mostRecent().args).toEqual([17]);
    expect(penalties.getPenaltiesByRace.calls.mostRecent().args).toEqual([17]);
    expect((component as any).resultsDrivers()).toEqual([result]);
    expect((component as any).penalties()).toEqual([penalty]);
    expect(fixture.nativeElement.textContent).toContain('Resultados de Gran Premio');
    expect(fixture.nativeElement.textContent).toContain(driver.name);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/results');
  });

  it('preloads a route season when the season list is empty', () => {
    seasons.getSeasons.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.selectSeasonComponent.seasonForm.get('season')!.value).toEqual(new Season(2, 'Temporada 2', 2));
    expect(races.getAllRaces.calls.mostRecent().args).toEqual([2]);
    expect(results.getAllResultsPerRacePilots.calls.mostRecent().args).toEqual([17]);
  });

  it('uses a race selected by the child Output and switches from drivers to teams', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.selectRacesComponent.racesForm.get('race')!.setValue(otherRace);
    // Termina la actualización del selector antes de cambiar el tipo de resultados.
    await fixture.whenStable();
    expect(results.getAllResultsPerRacePilots.calls.mostRecent().args).toEqual([18]);
    (component as any).typeSelected = 'Equipos';
    component.onTypeChange();
    fixture.detectChanges();
    expect(results.getAllResultsPerRaceTeams).toHaveBeenCalledOnceWith(18);
    expect((component as any).resultsDrivers()).toEqual([]);
    expect((component as any).resultsTeams()).toEqual([teamResult]);
    expect(fixture.nativeElement.textContent).toContain('50');
  });

  it('does not call result services before a race is selected', () => {
    component.getResults();
    expect(results.getAllResultsPerRacePilots).not.toHaveBeenCalled();
    expect(results.getAllResultsPerRaceTeams).not.toHaveBeenCalled();
    expect(penalties.getPenaltiesByRace).not.toHaveBeenCalled();
  });

  for (const type of ['Pilotos', 'Equipos']) {
    it(`renders an empty ${type} response`, () => {
      results.getAllResultsPerRacePilots.and.returnValue(of([]));
      results.getAllResultsPerRaceTeams.and.returnValue(of([]));
      (component as any).typeSelected = type;
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No hay resultados disponibles');
      expect((component as any).resultsDrivers()).toEqual([]);
      expect((component as any).resultsTeams()).toEqual([]);
    });

    it(`reports ${type} errors and recovers on the next selection`, () => {
      const request = type === 'Pilotos' ? results.getAllResultsPerRacePilots : results.getAllResultsPerRaceTeams;
      const error = new Error('offline');
      request.and.returnValue(throwError(() => error));
      const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
      spyOn(console, 'error');
      (component as any).typeSelected = type;
      fixture.detectChanges();
      expect(notify).toHaveBeenCalledWith(ERROR_RESULT_FETCH, error);
      expect(fixture.nativeElement.textContent).toContain('No hay resultados disponibles');
      if (type === 'Pilotos') results.getAllResultsPerRacePilots.and.returnValue(of([result]));
      else results.getAllResultsPerRaceTeams.and.returnValue(of([teamResult]));
      component.onRaceChange(otherRace);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(driver.name);
    });
  }

  it('reports a penalty error and clears penalties independently of the results', () => {
    const error = new Error('penalties offline');
    penalties.getPenaltiesByRace.and.returnValue(throwError(() => error));
    const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
    spyOn(console, 'error');
    fixture.detectChanges();
    expect(notify).toHaveBeenCalledWith(ERROR_PENALTY_FETCH, error);
    expect((component as any).penalties()).toEqual([]);
    expect((component as any).resultsDrivers()).toEqual([result]);
    // El evento del botón notifica el cambio de showPenalties en Angular zoneless.
    fixture.nativeElement.querySelector('.penaltiesButton button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se registraron penalizaciones');
  });
});
