import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
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
import { ImageService } from '../../../shared/services/image.service';
import { CacheService } from '../../../shared/services/cache.service';
import { ResultsComponent } from './results.component';

describe('ResultsComponent', () => {
  const season = new Season(42, 'Histórica', 2);
  const race = new Race(17, 'Gran Premio', 'flag.png', 'circuit.png', new Date('2026-01-01T12:00:00Z'), season, 1);
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
  let navigate: jasmine.Spy;
  let route: { snapshot: { paramMap: ReturnType<typeof convertToParamMap> } };

  const root = (): HTMLElement => fixture.nativeElement;
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => root().querySelector<T>(selector)!;
  const render = (): void => { fixture.detectChanges(); fixture.detectChanges(); };
  const tab = (index: number): HTMLButtonElement => query<HTMLButtonElement>('#results-tab-' + index);
  const select = (index: number): void => { tab(index).click(); fixture.detectChanges(); };

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
    route = { snapshot: { paramMap: convertToParamMap({ name: 'Gran_Premio', season: '2' }) } };
    TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: route },
        { provide: ResultApiService, useValue: results },
        { provide: PenaltiesApiService, useValue: penalties },
        { provide: RaceApiService, useValue: races },
        { provide: SeasonApiService, useValue: seasons }
      ]
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    TestBed.inject(ImageService).getImageUrl = () => 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  });

  afterEach(() => fixture.destroy());

  it('stops refreshing the old race immediately when the season changes before its new race list arrives', () => {
    const cache = TestBed.inject(CacheService);
    cache.updateVersion(29);
    render();
    select(1);
    const obsolete = new Subject<Result[]>();
    results.getAllResultsPerRacePilots.and.returnValue(obsolete);
    cache.updateVersion(30);
    races.getAllRaces.and.returnValue(new Subject<Race[]>());
    component.onSeasonChange(new Season(1, 'Temporada 1', 1));
    render();
    obsolete.next([{ ...result, driver: { ...driver, name: 'Obsolete result' } }]);
    render();
    expect(root().textContent).not.toContain('Obsolete result');
    results.getAllResultsPerRacePilots.calls.reset();
    results.getAllResultsPerRaceTeams.calls.reset();
    penalties.getPenaltiesByRace.calls.reset();
    cache.updateVersion(31);
    expect(results.getAllResultsPerRacePilots).not.toHaveBeenCalled();
    expect(results.getAllResultsPerRaceTeams).not.toHaveBeenCalled();
    expect(penalties.getPenaltiesByRace).not.toHaveBeenCalled();
  });

  it('decodes the route name, selects the season by number and loads its race without navigation', () => {
    render();
    expect(component.selectSeasonComponent.seasonForm.get('season')!.value).toBe(season);
    expect(races.getAllRaces.calls.mostRecent().args).toEqual([2]);
    expect(component.selectRacesComponent.racesForm.get('race')!.value).toBe(race);
    expect(results.getAllResultsPerRacePilots).toHaveBeenCalledOnceWith(17);
    expect(penalties.getPenaltiesByRace).toHaveBeenCalledOnceWith(17);
    expect(results.getAllResultsPerRaceTeams).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('preloads the route season when the season list is empty', () => {
    seasons.getSeasons.and.returnValue(of([]));
    render();
    expect(component.selectSeasonComponent.seasonForm.get('season')!.value).toEqual(new Season(2, 'Temporada 2', 2));
    expect(results.getAllResultsPerRacePilots).toHaveBeenCalledOnceWith(17);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('selects the route race after an asynchronous race list arrives', async () => {
    const request = new Subject<Race[]>();
    races.getAllRaces.and.returnValue(request);
    render();
    expect(query('h1').textContent).toBe('Resultados de la carrera');
    expect(results.getAllResultsPerRacePilots).not.toHaveBeenCalled();
    request.next([otherRace, race]);
    await fixture.whenStable();
    expect(component.selectRacesComponent.racesForm.get('race')!.value).toBe(race);
    expect(results.getAllResultsPerRacePilots).toHaveBeenCalledOnceWith(17);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the route season when the asynchronous seasons arrive', async () => {
    const request = new Subject<Season[]>();
    seasons.getSeasons.and.returnValue(request);
    render();
    request.next([new Season(1, 'Temporada 1', 1), season, new Season(3, 'Temporada 3', 3)]);
    await fixture.whenStable();
    expect(component.selectSeasonComponent.seasonForm.get('season')!.value).toBe(season);
    expect(component.selectRacesComponent.racesForm.get('race')!.value).toBe(race);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not call services before a race is selected', () => {
    component.getResults();
    component.getPenalties();
    component.selectTab('Equipos');
    expect(results.getAllResultsPerRacePilots).not.toHaveBeenCalled();
    expect(results.getAllResultsPerRaceTeams).not.toHaveBeenCalled();
    expect(penalties.getPenaltiesByRace).not.toHaveBeenCalled();
  });

  it('clears the previous results when the child has no race in the new season', () => {
    render();
    const previousCalls = results.getAllResultsPerRacePilots.calls.count();
    component.onRaceChange(undefined);
    fixture.detectChanges();
    expect(results.getAllResultsPerRacePilots.calls.count()).toBe(previousCalls);
    expect(root().querySelector('.result-row')).toBeNull();
    expect(root().querySelector('.key-data')).toBeNull();
    expect(query('#results-panel-0 .empty-state')).not.toBeNull();
  });

  it('renders one h1, the back link, decorative circuit and flag and a dated time', () => {
    render();
    expect(root().querySelectorAll('h1').length).toBe(1);
    expect(query('h1').textContent).toBe('Resultados de Gran Premio');
    expect(query<HTMLAnchorElement>('.back-link').getAttribute('href')).toBe('/results');
    expect(query('.back-link').textContent).toContain('Volver a los resultados');
    expect(query('time').textContent).toBe('01/01/2026');
    expect(query('time').getAttribute('datetime')).toBe('2026-01-01');
    for (const image of Array.from(root().querySelectorAll<HTMLImageElement>('header img'))) {
      expect(image.alt).toBe('');
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
    expect(query<HTMLImageElement>('.circuit-image').loading).toBe('eager');
    expect(query('header').classList).toContain('bg-pit');
    expect(query('select-seasons').getAttribute('variant')).toBe('tabs');
  });

  it('computes winner, pole, fastest lap and penalties from the driver results', () => {
    results.getAllResultsPerRacePilots.and.returnValue(of([
      { ...result, driver: { ...driver, name: 'Ganador' }, pole: 0, fastlap: 0 },
      { ...result, driver: { ...driver, id: 2, name: 'Autor de pole' }, position: new Position(2, 2, 18), fastlap: 0 },
      { ...result, driver: { ...driver, id: 3, name: 'Vuelta veloz' }, position: null, pole: 0 }
    ]));
    render();
    const cells = Array.from(root().querySelectorAll('.key-item dd'), cell => cell.textContent!.trim());
    expect(cells).toEqual(['Ganador', 'Autor de pole', 'Vuelta veloz', '1']);
    expect(query('.key-data .team-dot').classList).toContain('bg-Ferrari');
  });

  it('uses dashes for missing key drivers and hides key data when results are empty', () => {
    results.getAllResultsPerRacePilots.and.returnValue(of([{ ...result, position: null, pole: 0, fastlap: 0 }]));
    render();
    expect(Array.from(root().querySelectorAll('.key-item dd'), cell => cell.textContent!.trim())).toEqual(['–', '–', '–', '1']);
    results.getAllResultsPerRacePilots.and.returnValue(of([]));
    component.onRaceChange(otherRace);
    fixture.detectChanges();
    expect(root().querySelector('.key-data')).toBeNull();
  });

  it('defaults to drivers and exposes linked ARIA tabs with a roving tabindex and penalty count', () => {
    render();
    expect(root().querySelectorAll('[role="tablist"]').length).toBe(1);
    for (const index of [0, 1, 2]) {
      expect(tab(index).getAttribute('aria-selected')).toBe(String(index === 0));
      expect(tab(index).tabIndex).toBe(index === 0 ? 0 : -1);
      const panel = query('#' + tab(index).getAttribute('aria-controls'));
      expect(panel.getAttribute('role')).toBe('tabpanel');
      expect(panel.getAttribute('aria-labelledby')).toBe(tab(index).id);
      expect(panel.hidden).toBe(index !== 0);
      expect(panel.querySelector('h2')).not.toBeNull();
    }
    expect(tab(2).querySelector('.count')!.textContent).toBe('1');
  });

  it('supports ArrowLeft/Right, Home and End with wrapping and keyboard focus', () => {
    render();
    const steps = [
      { from: 0, key: 'ArrowLeft', to: 2 }, { from: 2, key: 'ArrowRight', to: 0 },
      { from: 0, key: 'End', to: 2 }, { from: 2, key: 'Home', to: 0 },
      { from: 0, key: 'ArrowRight', to: 1 }
    ];
    for (const step of steps) {
      tab(step.from).dispatchEvent(new KeyboardEvent('keydown', { key: step.key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(tab(step.to).getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(tab(step.to));
      expect(tab(step.to).tabIndex).toBe(0);
    }
    expect(results.getAllResultsPerRaceTeams).toHaveBeenCalledOnceWith(17);
  });

  it('loads teams only when activated and refreshes drivers, teams and penalties on the child race Output', async () => {
    render();
    select(1);
    select(0);
    select(1);
    expect(results.getAllResultsPerRaceTeams).toHaveBeenCalledOnceWith(17);
    component.selectRacesComponent.racesForm.get('race')!.setValue(otherRace);
    await fixture.whenStable();
    expect(results.getAllResultsPerRaceTeams.calls.allArgs()).toEqual([[17], [18]]);
    expect(results.getAllResultsPerRacePilots.calls.mostRecent().args).toEqual([18]);
    expect(penalties.getPenaltiesByRace.calls.mostRecent().args).toEqual([18]);
    expect(query('#results-panel-1 .race-points').textContent).toBe('Puntos 50');
    expect(navigate).toHaveBeenCalledWith(['/results', 'Otra_carrera', 2], { replaceUrl: true });
  });

  for (const { position, fastlap, expected } of [
    { position: new Position(1, 1, 25), fastlap: 1, expected: '26' },
    { position: new Position(1, 1, 25), fastlap: 0, expected: '25' },
    { position: new Position(6, 6, 8), fastlap: 1, expected: '9' },
    { position: null, fastlap: 1, expected: 'DNF +1' },
    { position: null, fastlap: 0, expected: 'DNF' },
    { position: new Position(1, 1, 25), fastlap: null, expected: '25' },
    { position: new Position(1, 1, 25), fastlap: undefined, expected: '25' }
  ]) {
    it('renders race points ' + expected + ' for position ' + (position?.positionNumber ?? 'DNF') + ' and fastlap ' + fastlap, () => {
      const raceResult = { ...result, position, fastlap } as Result;
      results.getAllResultsPerRacePilots.and.returnValue(of([raceResult]));
      render();
      expect(query('.result-row .race-points').textContent!.trim()).toBe('Puntos ' + expected);
      expect(raceResult).toEqual({ ...result, position, fastlap } as Result);
    });
  }

  for (const tabIndex of [0, 1]) {
    for (const fastlap of [0, 1]) {
      for (const dnfSlot of [0, 1]) {
        it(`shows ${fastlap ? 'DNF +1' : 'DNF'} in tab ${tabIndex}, driver slot ${dnfSlot}, agreeing with team points`, () => {
          const finisher = { ...result, pole: 0, fastlap: 0 };
          const dnf = { ...result, driver: { ...driver, id: 2, name: 'Retired driver' }, position: null, pole: 0, fastlap };
          const entries = dnfSlot === 0 ? [dnf, finisher] : [finisher, dnf];
          results.getAllResultsPerRacePilots.and.returnValue(of(entries));
          results.getAllResultsPerRaceTeams.and.returnValue(of([
            { ...teamResult, results: entries, totalPoints: 25 + fastlap, hasFastLap: fastlap === 1, hasPole: false }
          ]));
          render();
          select(tabIndex);
          const panel = query('#results-panel-' + tabIndex);
          const cells = panel.querySelectorAll(tabIndex === 0 ? '.result-row' : '.team-driver');
          const score = cells[dnfSlot].querySelector(tabIndex === 0 ? '.race-points' : '.driver-points')!;
          expect(score.textContent!.trim().match(/DNF(?: \+\d+)?$/)?.[0]).toBe(fastlap ? 'DNF +1' : 'DNF');
          const finishedScore = cells[1 - dnfSlot].querySelector(tabIndex === 0 ? '.race-points' : '.driver-points')!;
          expect(finishedScore.textContent!.trim()).toBe('Puntos 25');
          if (tabIndex === 1) expect(panel.querySelector('.race-points')!.textContent!.trim()).toBe('Puntos ' + (25 + fastlap));
        });
      }
    }
  }

  it('preserves API order, uses actual positions and renders driver links, photos, DNF and only positive chips', () => {
    results.getAllResultsPerRacePilots.and.returnValue(of([
      { ...result, position: new Position(6, 6, 8), fastlap: 0, pole: 0 },
      { ...result, position: null }
    ]));
    render();
    const rows = root().querySelectorAll('.result-row');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.position')!.textContent!.trim()).toBe('Posición 6');
    expect(rows[0].classList).toContain('border-Ferrari');
    expect(rows[0].querySelector('img.driver-avatar')).not.toBeNull();
    expect(rows[0].querySelector('a')!.getAttribute('href')).toBe('/drivers/Piloto_de_prueba');
    expect(rows[0].querySelector('.driver-number')!.textContent).toBe('#7');
    expect(rows[0].querySelectorAll('.result-chip').length).toBe(0);
    expect(rows[1].querySelector('.position')!.textContent).toContain('–');
    expect(rows[1].classList).toContain('dnf');
    expect(rows[1].querySelector('.race-points')!.textContent).toContain('DNF');
    expect(Array.from(rows[1].querySelectorAll('.result-chip'), chip => chip.textContent!.trim())).toEqual(['Pole', 'Vuelta Rápida']);
    expect(root().querySelectorAll('p-table, p-chip, p-button, p-divider, p-selectbutton').length).toBe(0);
  });

  for (const type of ['Pilotos', 'Equipos']) {
    it('uses podium colors only for positions 1, 2 and 3 in ' + type + ' and ink for the rest', () => {
      const positions = [3, 1, 4, 2, null];
      const entries = positions.map((position, index) => ({
        ...result,
        driver: { ...driver, id: index + 1 },
        position: position === null ? null : new Position(position, position, 0)
      }));
      results.getAllResultsPerRacePilots.and.returnValue(of(entries));
      results.getAllResultsPerRaceTeams.and.returnValue(of(entries.map((entry, index) => ({
        ...teamResult, id: index + 1, results: [entry]
      }))));
      render();
      if (type === 'Equipos') select(1);
      const panel = query(type === 'Pilotos' ? '#results-panel-0' : '#results-panel-1');
      const pieces = panel.querySelectorAll('.result-row > .position');
      expect(pieces.length).toBe(5);
      pieces.forEach((piece, index) => {
        const position = type === 'Pilotos' ? positions[index] : index + 1;
        expect(piece.textContent!.trim()).toBe('Posición ' + (position ?? '–'));
        expect(piece.querySelector('.sr-only')!.textContent).toBe('Posición ');
        for (const name of ['border', 'border-rule', 'bg-panel', 'tabular-nums', 'size-8']) {
          expect(piece.classList).toContain(name);
        }
        for (const podium of [1, 2, 3]) {
          expect(piece.classList.contains('text-podium-' + podium)).toBe(position === podium);
        }
        expect(piece.classList.contains('text-ink')).toBe(position === null || position > 3);
        expect(piece.classList.contains('border-dashed')).toBe(position === null);
        for (const name of ['bg-accent', 'bg-pit', 'text-on-accent', 'text-on-pit']) {
          expect(piece.classList).not.toContain(name);
        }
      });
    });
  }

  it('uses two initials for missing/default photos and suppresses vacant driver links and numbers', () => {
    results.getAllResultsPerRacePilots.and.returnValue(of([
      { ...result, driver: { ...driver, name: 'Dani Calde', driverImage: '/drivers/default/default.png' } },
      { ...result, driver: { ...driver, id: 2, name: 'Moraga', driverImage: '' } },
      ...['Vacante', 'vacante3', 'VACANTE22'].map((name, index) => ({ ...result, driver: { ...driver, id: 3 + index, name } }))
    ]));
    render();
    expect(Array.from(root().querySelectorAll('.result-row .initials'), avatar => avatar.textContent)).toEqual(['DC', 'MO']);
    const rows = root().querySelectorAll('.result-row');
    for (const row of Array.from(rows).slice(2)) {
      expect(row.querySelector('a')).toBeNull();
      expect(row.querySelector('.driver-number')).toBeNull();
      expect(row.querySelector('.driver-avatar')!.classList).toContain('border-dashed');
      expect(row.querySelector('.driver-link')!.textContent).toBe('Vacante');
    }
  });

  it('marks the highest penalty severity for each driver with screen reader text', () => {
    penalties.getPenaltiesByRace.and.returnValue(of([
      { ...penalty, penaltySeverity: { id: 1, severity: 'Aviso' } },
      { ...penalty, id: 2, penaltySeverity: { id: 2, severity: 'Grave' } },
      penalty
    ]));
    render();
    const marker = query('.result-row .penalty-marker');
    expect(marker.querySelector('.sr-only')!.textContent).toBe('Penalización grave');
    expect(marker.querySelector('svg.text-sector-down')).not.toBeNull();
    expect(root().querySelectorAll('.result-row .penalty-marker').length).toBe(1);
  });

  it('renders aligned team headers and rows in API order with team colors and API totals', () => {
    results.getAllResultsPerRaceTeams.and.returnValue(of([
      teamResult,
      { ...teamResult, id: 2, totalPoints: 18, hasPole: false, hasFastLap: false,
        results: [{ ...result, driver: { ...driver, team: { ...driver.team, name: 'Red Bull' } } }] }
    ]));
    render();
    select(1);
    const panel = query('#results-panel-1');
    expect(panel.querySelector('h2.sr-only')!.textContent).toBe('Equipos');
    expect(panel.querySelector('.result-head')!.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(panel.querySelectorAll('.result-head > span'), cell => cell.textContent)).toEqual(['POS', 'Equipo', 'Piloto 1', 'Piloto 2', 'Pole / Vuelta Rápida', 'Puntos']);
    expect(panel.querySelector('ol.results-list')!.getAttribute('aria-label')).toBe('Clasificación de equipos');
    expect(panel.querySelector('ol')!.getAttribute('role')).toBe('list');
    const rows = panel.querySelectorAll('.result-row');
    expect(rows.length).toBe(2);
    for (const [index, row] of Array.from(rows).entries()) {
      expect(row.classList).toContain('border-l-4');
      expect(row.classList).toContain(index ? 'border-Red_Bull' : 'border-Ferrari');
      expect(row.querySelector('.team-dot')!.classList).toContain(index ? 'bg-Red_Bull' : 'bg-Ferrari');
      expect(row.querySelector('.position')!.textContent!.trim()).toBe('Posición ' + (index + 1));
      expect(row.querySelector('.position')!.classList).toContain('text-podium-' + (index + 1));
      expect(row.querySelector('.team-label a')).toBeNull();
      expect(row.querySelector('.race-points')!.textContent).toBe('Puntos ' + (index ? 18 : 50));
    }
    expect(rows[0].querySelector('.team-label')!.textContent!.trim()).toBe('Ferrari');
    expect(Array.from(rows[0].querySelectorAll('.result-chip'), chip => chip.textContent!.trim())).toEqual(['Pole', 'Vuelta Rápida']);
    expect(rows[0].querySelectorAll('.result-chip i[aria-hidden="true"]').length).toBe(2);
    expect(rows[1].querySelectorAll('.result-chip').length).toBe(0);
  });

  it('renders only the first two team results with photos, driver links, numbers and race points', () => {
    const pair = [
      { ...result, fastlap: 0 },
      { ...result, driver: { ...driver, id: 2, name: 'Segundo piloto' }, position: new Position(10, 10, 0), fastlap: 1 }
    ];
    const reserve = { ...result, driver: { ...driver, id: 3, name: 'Tercero excluido' }, position: new Position(3, 3, 999) };
    const apiTeam = { ...teamResult, totalPoints: 73, results: [...pair, reserve] };
    results.getAllResultsPerRaceTeams.and.returnValue(of([apiTeam]));
    render();
    select(1);
    const panel = query('#results-panel-1');
    const cells = panel.querySelectorAll('.team-driver');
    expect(cells.length).toBe(2);
    expect(panel.textContent).not.toContain('Tercero excluido');
    expect(panel.innerHTML).not.toContain('Tercero_excluido');
    expect(panel.textContent).not.toContain('999');
    expect(Array.from(cells, cell => cell.querySelector('.driver-points')!.textContent)).toEqual(['Puntos 25', 'Puntos 1']);
    expect(Array.from(cells, cell => cell.querySelector('a')!.getAttribute('href'))).toEqual(['/drivers/Piloto_de_prueba', '/drivers/Segundo_piloto']);
    expect(Array.from(cells, cell => cell.querySelector('.driver-number')!.textContent)).toEqual(['#7', '#7']);
    for (const cell of Array.from(cells)) {
      const photo = cell.querySelector<HTMLImageElement>('img.driver-avatar')!;
      expect(photo.getBoundingClientRect().width).toBe(32);
      expect(photo.getBoundingClientRect().height).toBe(32);
    }
    expect(apiTeam.results).toEqual([...pair, reserve]);
    expect(panel.querySelector('.race-points')!.textContent).toBe('Puntos 73');
  });

  it('shows zero points and DNF with a dash and dashed pilot cells without changing team points', () => {
    const zero = { ...result, position: new Position(15, 15, 0), fastlap: 0 };
    const dnf = { ...result, position: null, fastlap: 1 };
    results.getAllResultsPerRaceTeams.and.returnValue(of([
      { ...teamResult, totalPoints: 0, results: [zero, dnf] },
      { ...teamResult, id: 2, totalPoints: 1, results: [dnf, dnf] }
    ]));
    render();
    select(1);
    const rows = query('#results-panel-1').querySelectorAll('.result-row');
    expect(rows[0].querySelector('.driver-points')!.textContent).toBe('Puntos 0');
    expect(rows[0].querySelector('.team-driver')!.classList).not.toContain('dnf');
    expect(rows[0].querySelector('.race-points')!.textContent).toBe('Puntos 0');
    expect(rows[1].querySelector('.race-points')!.textContent).toBe('Puntos 1');
    expect(query('#results-panel-1').querySelectorAll('.team-driver.dnf').length).toBe(3);
    for (const cell of Array.from(query('#results-panel-1').querySelectorAll('.team-driver.dnf'))) {
      expect(cell.querySelector('.driver-points')!.textContent).toBe('– Puntos DNF +1');
    }
  });

  it('renders vacant team drivers without links or numbers and with a dashed avatar', () => {
    results.getAllResultsPerRaceTeams.and.returnValue(of([{ ...teamResult, results: [
      { ...result, driver: { ...driver, name: 'Vacante3' }, position: null },
      { ...result, driver: { ...driver, name: 'VACANTE' } }
    ] }]));
    render();
    select(1);
    for (const cell of Array.from(query('#results-panel-1').querySelectorAll('.team-driver'))) {
      expect(cell.querySelector('a')).toBeNull();
      expect(cell.querySelector('.driver-number')).toBeNull();
      expect(cell.querySelector('.driver-avatar')!.classList).toContain('border-dashed');
      expect(cell.querySelector('.driver-link')!.textContent).toBe('Vacante');
    }
  });

  for (const [hasPole, hasFastLap, expected] of [
    [false, false, []], [true, false, ['Pole']], [false, true, ['Vuelta Rápida']], [true, true, ['Pole', 'Vuelta Rápida']]
  ] as const) {
    it('uses team flags for chips with pole ' + hasPole + ' and fast lap ' + hasFastLap, () => {
      results.getAllResultsPerRaceTeams.and.returnValue(of([{ ...teamResult, hasPole, hasFastLap }]));
      render();
      select(1);
      expect(Array.from(query('#results-panel-1').querySelectorAll('.result-chip'), chip => chip.textContent!.trim())).toEqual([...expected]);
    });
  }

  it('keeps empty pilot cells in place for teams with one or no results', () => {
    results.getAllResultsPerRaceTeams.and.returnValue(of([
      { ...teamResult, results: [result] },
      { ...teamResult, id: 2, results: [], totalPoints: 0 }
    ]));
    render();
    select(1);
    const rows = query('#results-panel-1').querySelectorAll('.result-row');
    expect(rows[0].querySelectorAll('.team-driver').length).toBe(2);
    expect(rows[0].querySelectorAll('.team-driver')[1].textContent!.trim()).toBe('');
    expect(rows[0].querySelectorAll('.driver-link').length).toBe(1);
    expect(rows[1].querySelectorAll('.team-driver').length).toBe(2);
    expect(rows[1].querySelectorAll('.driver-link').length).toBe(0);
    expect(rows[1].querySelector('.team-label')!.textContent!.trim()).toBe('Equipo 2');
    expect(rows[1].classList).toContain('border-rule');
    expect(rows[1].querySelector('.race-points')!.textContent).toBe('Puntos 0');
  });

  it('reuses initials for missing/default photos in team pilot cells', () => {
    results.getAllResultsPerRaceTeams.and.returnValue(of([{ ...teamResult, results: [
      { ...result, driver: { ...driver, name: 'Dani Calde', driverImage: '/drivers/default/default.png' } },
      { ...result, driver: { ...driver, id: 2, name: 'Moraga', driverImage: '' } }
    ] }]));
    render();
    select(1);
    expect(Array.from(query('#results-panel-1').querySelectorAll('.initials'), avatar => avatar.textContent)).toEqual(['DC', 'MO']);
    expect(Array.from(query('#results-panel-1').querySelectorAll('.driver-number'), number => number.textContent)).toEqual(['#7', '#7']);
  });

  it('renders the penalty legend, all table headers, mobile labels, driver number, severity and complete reason', () => {
    render();
    select(2);
    const panel = query('#results-panel-2');
    expect(panel.textContent).toContain('Graves: Penalizaciones severas que afectan significativamente.');
    expect(panel.textContent).toContain('Leves: Penalizaciones moderadas por infracciones importantes.');
    expect(panel.textContent).toContain('Aviso: Penalizaciones menores por infracciones leves.');
    expect(Array.from(panel.querySelectorAll('th'), th => th.textContent)).toEqual(['Piloto', 'Equipo', 'Tipo', 'Motivo']);
    expect(panel.querySelector('tbody')!.textContent).toContain('Contacto');
    expect(panel.querySelector('.driver-number')!.textContent).toBe('#7');
    expect(panel.querySelector('.severity')!.textContent!.trim()).toBe('Leve');
    expect(panel.querySelector('.severity .text-warn')).not.toBeNull();
    expect(panel.querySelectorAll('.mobile-label').length).toBe(4);
  });

  it('renders Carrera limpia with Cerrar returning to drivers and Ver reglamento linking to /statute', () => {
    penalties.getPenaltiesByRace.and.returnValue(of([]));
    render();
    select(2);
    expect(query('.clean-state').textContent).toContain('Carrera limpia');
    expect(query('.clean-state').textContent).toContain('No se registraron penalizaciones en esta carrera. Todos los pilotos mantuvieron una conducción deportiva siguiendo el reglamento.');
    expect(query<HTMLAnchorElement>('.clean-state a').getAttribute('href')).toBe('/statute');
    query<HTMLButtonElement>('.clean-state button').click();
    fixture.detectChanges();
    expect(tab(0).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab(0));
  });

  for (const type of ['Pilotos', 'Equipos'] as const) {
    it('renders an empty ' + type + ' response', () => {
      results.getAllResultsPerRacePilots.and.returnValue(of([]));
      results.getAllResultsPerRaceTeams.and.returnValue(of([]));
      render();
      if (type === 'Equipos') select(1);
      const panel = query(type === 'Pilotos' ? '#results-panel-0' : '#results-panel-1');
      expect(panel.textContent).toContain('No hay resultados disponibles');
      expect(panel.textContent).toContain('No se encontraron resultados para la carrera de Gran Premio en la Histórica.');
    });

    it('reports ' + type + ' errors and recovers on the next race', () => {
      const request = type === 'Pilotos' ? results.getAllResultsPerRacePilots : results.getAllResultsPerRaceTeams;
      const error = new Error('offline');
      request.and.returnValue(throwError(() => error));
      const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
      const log = spyOn(console, 'error');
      render();
      if (type === 'Equipos') select(1);
      expect(notify).toHaveBeenCalledWith(ERROR_RESULT_FETCH, error);
      expect(log).toHaveBeenCalledWith(error);
      expect(query(type === 'Pilotos' ? '#results-panel-0' : '#results-panel-1').textContent).toContain('No hay resultados disponibles');
      if (type === 'Pilotos') results.getAllResultsPerRacePilots.and.returnValue(of([result]));
      else results.getAllResultsPerRaceTeams.and.returnValue(of([teamResult]));
      component.onRaceChange(otherRace);
      fixture.detectChanges();
      expect(query(type === 'Pilotos' ? '#results-panel-0 .result-row' : '#results-panel-1 .result-row').textContent).toContain(driver.name);
    });
  }

  it('handles penalties errors independently and recovers on the next race', () => {
    const error = new Error('penalties offline');
    penalties.getPenaltiesByRace.and.returnValue(throwError(() => error));
    const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
    const log = spyOn(console, 'error');
    render();
    expect(notify).toHaveBeenCalledWith(ERROR_PENALTY_FETCH, error);
    expect(log).toHaveBeenCalledWith(error);
    expect(query('.result-row').textContent).toContain(driver.name);
    select(2);
    expect(query('.clean-state')).not.toBeNull();
    penalties.getPenaltiesByRace.and.returnValue(of([penalty]));
    component.onRaceChange(otherRace);
    fixture.detectChanges();
    expect(query('.penalties-table').textContent).toContain('Contacto');
  });

  it('shows skeletons instead of empty states until drivers and teams finish loading', () => {
    const driversRequest = new Subject<Result[]>();
    const teamsRequest = new Subject<ResultTeam[]>();
    results.getAllResultsPerRacePilots.and.returnValue(driversRequest);
    results.getAllResultsPerRaceTeams.and.returnValue(teamsRequest);
    render();
    expect(query('#results-panel-0 p-skeleton')).not.toBeNull();
    expect(query('#results-panel-0').textContent).not.toContain('No hay resultados disponibles');
    select(1);
    expect(query('#results-panel-1 p-skeleton')).not.toBeNull();
    driversRequest.next([result]);
    teamsRequest.next([]);
    fixture.detectChanges();
    expect(query('#results-panel-1 .empty-state')).not.toBeNull();
  });

  it('keeps previous results while loading and ignores stale responses after changing race', () => {
    render();
    const stale = new Subject<Result[]>();
    const current = new Subject<Result[]>();
    results.getAllResultsPerRacePilots.and.returnValues(stale, current);
    component.onRaceChange(otherRace);
    fixture.detectChanges();
    expect(query('.result-row').textContent).toContain(driver.name);
    component.onRaceChange({ ...otherRace, id: 19 });
    stale.next([]);
    fixture.detectChanges();
    expect(query('.result-row')).not.toBeNull();
    current.next([]);
    fixture.detectChanges();
    expect(query('#results-panel-0 .empty-state')).not.toBeNull();
  });

  it('updates the URL with replaceUrl after season or race changes and skips an identical URL', () => {
    render();
    component.onRaceChange(race);
    component.onSeasonChange(season);
    expect(navigate).not.toHaveBeenCalled();
    component.onSeasonChange(new Season(43, 'Temporada 3', 3));
    expect(navigate).toHaveBeenCalledWith(['/results', 'Gran_Premio', 3], { replaceUrl: true });
    route.snapshot.paramMap = convertToParamMap({ name: 'Gran_Premio', season: '3' });
    navigate.calls.reset();
    component.onSeasonChange(new Season(43, 'Temporada 3', 3));
    expect(navigate).not.toHaveBeenCalled();
    component.onRaceChange(otherRace);
    expect(navigate).toHaveBeenCalledWith(['/results', 'Otra_carrera', 3], { replaceUrl: true });
  });

  it('LAYOUT checks podium and DNF contrast and fits real layouts and mobile targets at 320/390/768/1024/1296px in both themes with 22 pilots, 10 teams, 9 penalties, clean and empty states', async () => {
    const entries: Result[] = Array.from({ length: 22 }, (_, index) => ({
      ...result,
      driver: {
        ...driver, id: index + 1,
        name: index >= 19 ? 'Vacante' + index : index === 3 ? 'UnNombreSinEspaciosParaComprobarElReflujoCompleto' : 'Piloto de prueba ' + index,
        driverImage: index % 2 ? 'drivers/default/default.webp' : driver.driverImage,
        team: { ...driver.team, id: Math.floor(index / 2) + 1, name: ['McLaren', 'Mercedes', 'Red Bull', 'Ferrari', 'Alpine', 'Williams', 'Haas', 'Aston Martin', 'RB', 'Kick Sauber'][Math.floor(index / 2) % 10] }
      },
      position: index < 13 ? new Position(index + 1, index + 1, Math.max(0, 25 - index * 3)) : null,
      pole: index === 0 ? 1 : 0, fastlap: index === 0 ? 1 : 0
    }));
    const teams: ResultTeam[] = Array.from({ length: 10 }, (_, index) => ({
      ...teamResult, id: index + 1, totalPoints: [28, 26, 17, 15, 8, 6, 2, 0, 0, 0][index],
      results: [
        ...(index === 9 ? entries.slice(19, 21) : entries.slice(index * 2, index * 2 + 2)),
        { ...result, driver: { ...driver, id: 100 + index, name: 'Tercer piloto excluido ' + index }, position: null }
      ],
      hasPole: index === 0, hasFastLap: index === 0
    }));
    const incidents = Array.from({ length: 9 }, (_, index) => ({
      ...penalty, id: index + 1, driver: entries[index].driver,
      penaltySeverity: { id: index % 3, severity: ['Grave', 'Leve', 'Aviso'][index % 3] },
      reason: 'Toque por pasada de frenada con otro piloto; reincorporación peligrosa y pérdida de control durante la disputa de posición. '.repeat(3)
    }));
    results.getAllResultsPerRacePilots.and.returnValue(of(entries));
    results.getAllResultsPerRaceTeams.and.returnValue(of(teams));
    penalties.getPenaltiesByRace.and.returnValue(of(incidents));
    render();
    await fixture.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
    function contrast(a: string, b: string): number {
      const luminance = (color: string): number => {
        const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = color.startsWith('color(srgb') ? value : value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0] + 0.05) / (values[1] + 0.05);
    }
    for (const scenario of ['pilots', 'teams', 'penalties', 'clean', 'empty', 'empty teams']) {
      if (scenario === 'clean') {
        penalties.getPenaltiesByRace.and.returnValue(of([]));
        component.getResults();
      }
      if (scenario === 'empty') {
        results.getAllResultsPerRacePilots.and.returnValue(of([]));
        results.getAllResultsPerRaceTeams.and.returnValue(of([]));
        component.getResults();
      }
      select(scenario === 'teams' || scenario === 'empty teams' ? 1 : scenario === 'penalties' || scenario === 'clean' ? 2 : 0);
      await fixture.whenStable();
      for (const dark of [false, true]) {
        for (const width of [320, 390, 359, 360, 767, 768, 1024, 1296]) {
          for (const forceVerdana of [false, true]) {
            const frame = document.createElement('iframe');
            Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' });
            document.body.append(frame);
            try {
              const doc = frame.contentDocument!;
              doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + root().outerHTML + '</body>';
              doc.documentElement.classList.toggle('dark', dark);
              const fontOverride = doc.createElement('style');
              fontOverride.id = 'layout-font-override';
              fontOverride.textContent = '* { font-family: Verdana, sans-serif !important; }';
              if (forceVerdana) doc.head.append(fontOverride);
              const view = frame.contentWindow!;
              await doc.fonts.ready;
              const context = scenario + '/' + (dark ? 'dark' : 'light') + '/' + width + (forceVerdana ? '/Verdana' : '/default font');
              if (forceVerdana) expect(view.getComputedStyle(doc.querySelector('.race-title')!).fontFamily).toContain('Verdana');
              expect(view.innerWidth).withContext(context + '/real width').toBe(width);
              expect(doc.documentElement.scrollWidth).withContext(context + '/document overflow').toBeLessThanOrEqual(doc.documentElement.clientWidth);
              for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.race-title, .key-item, .content-tabs, .results-list, .result-row, .identity, .team-label, .marks, .team-driver, .team-driver-details, .penalties-panel, .penalties-table, .penalties-table td, .clean-state, .empty-state'))) {
                if (!element.getBoundingClientRect().height) continue;
                expect(element.scrollWidth).withContext(context + '/' + element.className + '/overflow').toBeLessThanOrEqual(element.clientWidth);
              }
              if (width < 768) {
                for (const target of Array.from(doc.querySelectorAll<HTMLElement>('a, button, .race-select p-select'))) {
                  if (!target.getBoundingClientRect().height) continue;
                  expect(target.getBoundingClientRect().height).withContext(context + '/' + target.className + '/target height').toBeGreaterThanOrEqual(44);
                  if (target.matches('a, button')) {
                    target.focus();
                    expect(view.getComputedStyle(target).outlineStyle).withContext(context + '/visible focus').toBe('solid');
                  }
                }
              }
              const header = doc.querySelector<HTMLElement>('.race-header')!;
              const headerStyle = view.getComputedStyle(header);
              expect(contrast(headerStyle.color, headerStyle.backgroundColor)).withContext(context + '/header contrast').toBeGreaterThanOrEqual(4.5);
              const photo = doc.querySelector<HTMLElement>('.circuit-image')!.getBoundingClientRect();
              const hero = doc.querySelector<HTMLElement>('.hero-top')!.getBoundingClientRect();
              expect(photo.bottom).withContext(context + '/photo stays above key data').toBeLessThanOrEqual(hero.bottom);
              const active = doc.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])')!;
              for (const element of Array.from(active.querySelectorAll<HTMLElement>('.driver-name, .driver-number, .race-points, .result-chip, .team-label, .driver-points, .severity, .clean-state h3, .empty-state p'))) {
                if (!element.getBoundingClientRect().height) continue;
                let parent: Element | null = element;
                let background = 'rgba(0, 0, 0, 0)';
                while (parent && background === 'rgba(0, 0, 0, 0)') {
                  background = view.getComputedStyle(parent).backgroundColor;
                  parent = parent.parentElement;
                }
                expect(contrast(view.getComputedStyle(element).color, background)).withContext(context + '/' + element.className + '/contrast').toBeGreaterThanOrEqual(4.5);
              }
              if (scenario === 'pilots' || scenario === 'teams') {
                const panel = view.getComputedStyle(active.querySelector('.result-row')!).backgroundColor;
                for (const piece of Array.from(active.querySelectorAll<HTMLElement>('.position'))) {
                  const style = view.getComputedStyle(piece);
                  expect(style.backgroundColor).withContext(context + '/position panel background').toBe(panel);
                  expect(contrast(style.color, panel)).withContext(context + '/position ' + piece.textContent!.trim()).toBeGreaterThanOrEqual(4.5);
                  const token = doc.createElement('span');
                  const podium = [1, 2, 3].find(position => piece.classList.contains('text-podium-' + position));
                  token.style.color = podium ? 'var(--podium-' + podium + ')' : 'var(--ink)';
                  piece.append(token);
                  expect(style.color).withContext(context + '/position color token').toBe(view.getComputedStyle(token).color);
                  token.remove();
                  expect(style.fontVariantNumeric).toBe('tabular-nums');
                  if (piece.closest('.dnf')) expect(style.borderStyle).withContext(context + '/DNF piece border').toBe('dashed');
                }
              }
              if (scenario === 'pilots') {
                expect(active.querySelectorAll('.result-row').length).toBe(22);
                expect(active.querySelectorAll('.dnf').length).toBe(9);
                expect(active.querySelectorAll('.driver-avatar.border-dashed').length).toBe(3);
                expect(view.getComputedStyle(doc.querySelector('.key-data')!).gridTemplateColumns.split(' ').length).toBe(width < 768 ? 2 : 4);
              }
              if (scenario === 'teams') {
                const rows = Array.from(active.querySelectorAll<HTMLElement>('.result-row'));
                expect(rows.length).toBe(10);
                expect(active.querySelectorAll('.team-driver').length).toBe(20);
                expect(active.textContent).not.toContain('Tercer piloto excluido');
                expect(active.querySelectorAll('.team-driver.dnf').length).toBe(7);
                expect(active.querySelectorAll('.driver-avatar.border-dashed').length).toBe(2);
                const list = active.querySelector<HTMLElement>('.results-list')!.getBoundingClientRect();
                const headers = active.querySelectorAll<HTMLElement>('.result-head > span');
                for (const [index, row] of rows.entries()) {
                  const rect = row.getBoundingClientRect();
                  expect(rect.width).withContext(context + '/full width team').toBeCloseTo(list.width - 2, 0);
                  if (width >= 768 || !row.querySelector('.result-chip')) {
                    const reference = width >= 768 ? rows[0] : rows.find(item => !item.querySelector('.result-chip'))!;
                    expect(rect.height).withContext(context + '/equal team row heights').toBeCloseTo(reference.getBoundingClientRect().height, 0);
                  }
                  if (width === 390 && !row.querySelector('.result-chip')) {
                    expect(rect.height).withContext(context + '/compact team row height').toBeLessThanOrEqual(120);
                  }
                  if (index) expect(rect.top).withContext(context + '/one column').toBeGreaterThanOrEqual(rows[index - 1].getBoundingClientRect().bottom);
                  expect(view.getComputedStyle(row).borderLeftWidth).withContext(context + '/team color bar').toBe('4px');
                  const cells = Array.from(row.querySelectorAll<HTMLElement>(':scope > .position, :scope > .team-label, :scope > .team-driver, :scope > .marks, :scope > .race-points'));
                  if (width >= 768) {
                    expect(rect.height).withContext(context + '/desktop row height').toBeGreaterThanOrEqual(52);
                    expect(rect.height).withContext(context + '/desktop row height').toBeLessThanOrEqual(60);
                    for (const [column, cell] of cells.entries()) {
                      expect(cell.getBoundingClientRect().left).withContext(context + '/header alignment ' + column).toBeCloseTo(headers[column].getBoundingClientRect().left, 0);
                    }
                  } else {
                    const pilots = Array.from(row.querySelectorAll<HTMLElement>('.team-driver'));
                    expect(pilots[0].getBoundingClientRect().top).withContext(context + '/pilots below team name').toBeGreaterThanOrEqual(row.querySelector('.team-label')!.getBoundingClientRect().bottom);
                    const first = pilots[0].getBoundingClientRect();
                    const second = pilots[1].getBoundingClientRect();
                    if (width >= 360) {
                      expect(second.top).withContext(context + '/two pilot columns').toBeCloseTo(first.top, 0);
                      expect(second.left).withContext(context + '/separate pilot columns').toBeGreaterThanOrEqual(first.right);
                      expect(second.width).withContext(context + '/equal pilot columns').toBeCloseTo(first.width, 0);
                    } else {
                      expect(second.top).withContext(context + '/stacked pilots at narrow widths').toBeGreaterThanOrEqual(first.bottom);
                    }
                    for (const pilot of pilots) {
                      expect(pilot.getBoundingClientRect().height).withContext(context + '/compact pilot cell').toBeLessThanOrEqual(56);
                      const avatar = pilot.querySelector('.driver-avatar')!.getBoundingClientRect();
                      expect(avatar.width).withContext(context + '/avatar width').toBe(32);
                      const name = pilot.querySelector('.driver-name, .driver-link')!.getBoundingClientRect();
                      const points = pilot.querySelector('.driver-points')!.getBoundingClientRect();
                      expect(points.left).withContext(context + '/points to right of name').toBeGreaterThanOrEqual(name.right);
                      expect(points.top).withContext(context + '/points alongside name').toBeLessThan(name.bottom);
                      expect(points.bottom).withContext(context + '/points alongside name').toBeGreaterThan(name.top);
                    }
                    const teamName = row.querySelector('.team-label')!.getBoundingClientRect();
                    for (const selector of [':scope > .position', ':scope > .race-points']) {
                      const cell = row.querySelector(selector)!.getBoundingClientRect();
                      expect(cell.top).withContext(context + '/single team line').toBeLessThan(teamName.bottom);
                      expect(cell.bottom).withContext(context + '/single team line').toBeGreaterThan(teamName.top);
                    }
                    const marks = row.querySelector<HTMLElement>('.marks')!;
                    if (marks.getBoundingClientRect().height) expect(marks.getBoundingClientRect().top).withContext(context + '/chips below pilots').toBeGreaterThanOrEqual(pilots[1].getBoundingClientRect().bottom);
                  }
                  for (const cell of Array.from(row.querySelectorAll<HTMLElement>('.team-driver.dnf'))) {
                    expect(view.getComputedStyle(cell).borderStyle).withContext(context + '/DNF dashed border').toBe('dashed');
                  }
                }
              }
              if (scenario === 'penalties') {
                expect(active.querySelectorAll('tbody tr').length).toBe(9);
                expect(view.getComputedStyle(active.querySelector('.mobile-label')!).display).toBe(width < 768 ? 'block' : 'none');
              }
              if (scenario.startsWith('empty')) expect(doc.querySelector('.key-data')).toBeNull();
            } finally {
              frame.contentDocument?.getElementById('layout-font-override')?.remove();
              expect(frame.contentDocument?.getElementById('layout-font-override')).toBeNull();
              frame.remove();
            }
          }
        }
      }
    }
  }, 30000);
});
