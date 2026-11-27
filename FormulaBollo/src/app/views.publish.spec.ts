import { HttpRequest } from '@angular/common/http';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../enviroments/enviroment';
import { driverPointsFixture, provideComponentTesting, teamPointsFixture } from '../testing/component-test-providers';
import { SelectSeasonsComponent } from '../shared/components/select-seasons/select-seasons.component';
import { SelectRacesComponent } from '../shared/components/select-races/select-races.component';
import { TeamsFiltersComponent } from '../shared/components/teams-filters/teams-filters.component';
import { Season } from '../shared/models/season';
import { Race } from '../shared/models/race';
import { Result } from '../shared/models/result';
import { Position } from '../shared/models/position';
import { Penalty } from '../shared/models/penalty';
import { CacheService } from '../shared/services/cache.service';
import { ImageService } from '../shared/services/image.service';
import { HomeDriversComponent } from './components/home/home-drivers/home-drivers.component';
import { HomeTeamsComponent } from './components/home/home-teams/home-teams.component';
import { HomeConfigurationComponent } from './components/home/home-configuration/home-configuration.component';
import { DriversRankingComponent } from './components/drivers/drivers-ranking/drivers-ranking.component';
import { DriversInfoComponent } from './components/drivers/drivers-info/drivers-info.component';
import { TeamsRankingComponent } from './components/teams/teams-ranking/teams-ranking.component';
import { TeamsInfoComponent } from './components/teams/teams-info/teams-info.component';
import { RacesComponent } from './components/races/races.component';
import { ResultsComponent } from './components/results/results.component';
import { GeneralStatsComponent } from './components/statistics/general-stats/general-stats.component';
import { EvolutionStatsComponent } from './components/statistics/evolution-stats/evolution-stats.component';
import { ComparativeStatsComponent } from './components/statistics/comparative-stats/comparative-stats.component';
import { RecordsComponent } from './components/statistics/records/records.component';
import { headToHeadFixture, recordsFixture, statisticsFixture } from './components/statistics/statistics.fixture';
import { FantasyComponent } from './components/fantasy/fantasy.component';
import { FantasyClasificationComponent } from './components/fantasy/fantasy-clasification/fantasy-clasification.component';
import { fantasyFixture } from './components/fantasy/fantasy-clasification/fantasy-clasification.fixture';
import { AdminComponent } from './components/admin/admin.component';
import { AdminResultsComponent } from './components/admin/admin-results/admin-results.component';
import { AdminPenaltiesComponent } from './components/admin/admin-penalties/admin-penalties.component';
import { FantasyLoginComponent } from './components/fantasy/fantasy-login/fantasy-login.component';
import { FantasyRegisterComponent } from './components/fantasy/fantasy-register/fantasy-register.component';
import { FantasyRecoverPasswordComponent } from './components/fantasy/fantasy-recover-password/fantasy-recover-password.component';
import { FantasyTeamComponent } from './components/fantasy/fantasy-team/fantasy-team.component';

// All requests use the real API services and cache. Only the HTTP server is replaced.
// A publication always follows a confirmed version; no tests emit on the private Subject.
type ViewFixture = ComponentFixture<unknown>;
interface ViewCase {
  name: string;
  component: Type<unknown>;
  endpoints: string[];
  marker: string;
  inputs?: Record<string, unknown>;
  prepare?: (fixture: ViewFixture) => void;
  change?: (fixture: ViewFixture) => void;
  selection?: 'season' | 'race';
  season?: number;
  race?: number;
  params?: Record<string, string>;
  fallback?: boolean;
}

const historical = new Season(2, 'Temporada 2', 2);
const previous = new Season(1, 'Temporada 1', 1);
const seasons = [previous, historical, environment.seasonActual];
const driver = driverPointsFixture.driver;
const team = driver.team;
const race = new Race(17, 'Gran Premio', 'flag.png', 'circuit.png', new Date('2026-01-01T12:00:00Z'), historical, 1);
const otherRace = { ...race, id: 18, name: 'Otra carrera' };
const result = new Result(race, driver, new Position(1, 1, 25), 1, 1);
const resultTeam = { id: 1, race, results: [result, { ...result }], totalPoints: 50, hasFastLap: true, hasPole: true };

function seasonSelector(fixture: ViewFixture): SelectSeasonsComponent {
  return fixture.componentInstance instanceof SelectSeasonsComponent ? fixture.componentInstance
    : fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance;
}

function raceSelector(fixture: ViewFixture): SelectRacesComponent {
  return fixture.componentInstance instanceof SelectRacesComponent ? fixture.componentInstance
    : fixture.debugElement.query(By.directive(SelectRacesComponent)).componentInstance;
}

function selectSeason(fixture: ViewFixture, season: Season): void {
  seasonSelector(fixture).seasonForm.get('season')!.setValue(season);
}

function click(fixture: ViewFixture, selector: string): void {
  const button = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  expect(button).withContext('the user control must exist: ' + selector).not.toBeNull();
  button?.click();
}

const views: ViewCase[] = [
  { name: 'home drivers', component: HomeDriversComponent, endpoints: ['/results/totalPerDriver'], marker: 'Published leader', season: 3, params: { numResults: '10' } },
  { name: 'home drivers fallback', component: HomeDriversComponent, endpoints: ['/results/totalPerDriver', '/drivers/all'], marker: 'Published leader', season: 3, fallback: true, params: { numResults: '10' } },
  { name: 'home teams', component: HomeTeamsComponent, endpoints: ['/teams/all'], marker: 'Alpine', season: 3 },
  { name: 'home configuration', component: HomeConfigurationComponent, endpoints: ['/configurations/all'], marker: 'Published setting', season: 3 },
  { name: 'drivers ranking', component: DriversRankingComponent, endpoints: ['/results/totalPerDriver'], marker: '777', season: 2,
    inputs: { season: historical, selectedTeams: ['Ferrari'] }, selection: 'season', change: f => f.componentRef.setInput('season', previous) },
  { name: 'drivers ranking fallback', component: DriversRankingComponent, endpoints: ['/results/totalPerDriver', '/drivers/all'], marker: 'Published leader', season: 2, fallback: true,
    inputs: { season: historical, selectedTeams: ['Ferrari'] }, selection: 'season', change: f => f.componentRef.setInput('season', previous) },
  { name: 'driver profile', component: DriversInfoComponent,
    endpoints: ['/drivers/infoDriverByName', '/drivers/teamHistory', '/results/totalPerDriver'], marker: '777', season: 2,
    prepare: f => selectSeason(f, historical), selection: 'season', change: f => selectSeason(f, previous), params: { driverName: driver.name } },
  { name: 'teams ranking', component: TeamsRankingComponent, endpoints: ['/teams/withDrivers'], marker: '777', season: 2,
    inputs: { season: historical, selectedTeams: ['Ferrari'] }, selection: 'season', change: f => f.componentRef.setInput('season', previous) },
  { name: 'teams ranking fallback', component: TeamsRankingComponent, endpoints: ['/teams/withDrivers', '/teams/all'], marker: 'Alpine', season: 2, fallback: true,
    inputs: { season: historical }, selection: 'season', change: f => f.componentRef.setInput('season', previous) },
  { name: 'team profile', component: TeamsInfoComponent,
    endpoints: ['/teams/infoTeamByName', '/drivers/byTeamName', '/results/totalPerSpecificDrivers', '/teams/withDrivers'], marker: '777', season: 2,
    prepare: f => selectSeason(f, historical), selection: 'season', change: f => selectSeason(f, previous), params: { teamName: 'Ferrari' } },
  { name: 'races', component: RacesComponent, endpoints: ['/races/all'], marker: 'Published circuit', season: 2,
    prepare: f => selectSeason(f, historical), selection: 'season', change: f => selectSeason(f, previous) },
  ...(['Pilotos', 'Equipos', 'Penalizaciones'] as const).map((tab, index): ViewCase => ({
    name: 'race results ' + tab, component: ResultsComponent,
    endpoints: ['/results/raceByPilots', '/penalties/totalPerRace', ...(index === 1 ? ['/results/raceByTeams'] : [])],
    marker: index === 0 ? 'Published leader' : index === 1 ? '777' : 'Published penalty', season: 2, race: 18,
    prepare: f => { raceSelector(f).racesForm.get('race')!.setValue(otherRace); click(f, '#results-tab-' + index); },
    selection: 'race', change: f => raceSelector(f).racesForm.get('race')!.setValue(race)
  })),
  { name: 'statistics general', component: GeneralStatsComponent, endpoints: ['/statistics/overview'], marker: '777', season: 2,
    inputs: { seasonSelected: historical, typeSelected: 'Equipos' }, selection: 'season', change: f => f.componentRef.setInput('seasonSelected', previous) },
  { name: 'statistics evolution', component: EvolutionStatsComponent, endpoints: ['/statistics/overview'], marker: '777', season: 2,
    inputs: { seasonSelected: historical, typeSelected: 'Pilotos' },
    prepare: f => click(f, '.comparison-chip[aria-pressed="true"]'),
    selection: 'season', change: f => f.componentRef.setInput('seasonSelected', previous) },
  { name: 'statistics comparative drivers', component: ComparativeStatsComponent,
    endpoints: ['/statistics/overview', '/statistics/headToHead'], marker: '777', season: 2,
    inputs: { seasonSelected: historical, typeSelected: 'Pilotos' },
    prepare: f => f.debugElement.queryAll(By.css('p-select'))[0].triggerEventHandler('ngModelChange', 3),
    selection: 'season', change: f => f.componentRef.setInput('seasonSelected', previous) },
  { name: 'statistics comparative teams', component: ComparativeStatsComponent,
    endpoints: ['/statistics/overview'], marker: '777', season: 2,
    inputs: { seasonSelected: historical, typeSelected: 'Equipos' },
    prepare: f => f.debugElement.queryAll(By.css('p-select'))[0].triggerEventHandler('ngModelChange', 3),
    selection: 'season', change: f => f.componentRef.setInput('seasonSelected', previous) },
  { name: 'statistics records', component: RecordsComponent, endpoints: ['/statistics/records'], marker: 'Published record',
    prepare: f => { const details = f.nativeElement.querySelector('details') as HTMLDetailsElement; expect(details).not.toBeNull(); if (details) details.open = true; } },
  { name: 'fantasy home', component: FantasyComponent, endpoints: ['/seasons/fantasy', '/fantasy/clasification', '/races/all'], marker: '777', season: 2,
    prepare: f => { const details = f.nativeElement.querySelectorAll('details')[2] as HTMLDetailsElement; details.open = true; } },
  { name: 'fantasy classification', component: FantasyClasificationComponent, endpoints: ['/fantasy/clasification'], marker: '777', season: 2,
    prepare: f => { raceSelector(f).racesForm.get('race')!.setValue(raceSelector(f).races().find(r => r.id === 25)); click(f, '[aria-label="Ver equipo de user1"]'); },
    selection: 'season', change: f => selectSeason(f, previous) },
  ...(['all', 'driver', 'team', 'fantasy'] as const).map((kind): ViewCase => ({
    name: 'season selector ' + kind, component: SelectSeasonsComponent,
    endpoints: [kind === 'all' ? '/seasons/all' : kind === 'driver' ? '/seasons/byDriverName' : kind === 'team' ? '/seasons/byTeamName' : '/seasons/fantasy'],
    marker: 'T4', inputs: { variant: 'tabs', ...(kind === 'driver' ? { driverName: driver.name } : kind === 'team' ? { teamName: team.name } : kind === 'fantasy' ? { fantasy: true } : {}) },
    prepare: f => selectSeason(f, kind === 'fantasy' ? historical : previous),
    params: kind === 'driver' ? { driverName: driver.name } : kind === 'team' ? { teamName: team.name } : {}
  })),
  { name: 'team filters', component: TeamsFiltersComponent, endpoints: ['/teams/all'], marker: 'Alpine', season: 2,
    inputs: { season: historical, showFilters: true, variant: 'logos', initialSelectedTeams: ['Ferrari'] },
    selection: 'season', change: f => f.componentRef.setInput('season', previous) },
  { name: 'race selector', component: SelectRacesComponent, endpoints: ['/races/all'], marker: 'Published circuit', season: 2,
    inputs: { season: historical }, prepare: f => raceSelector(f).racesForm.get('race')!.setValue(otherRace),
    selection: 'season', change: f => f.componentRef.setInput('season', previous) }
];

// Preserve entity IDs and names used as selections; change server-owned values only.
function response(request: HttpRequest<unknown>, published: boolean): object {
  const path = new URL(request.url).pathname;
  const points = published ? 777 : 25;
  const seasonNumber = Number(request.params.get('season') ?? request.params.get('numberSeason') ?? 2);
  const selectedRace = Number(request.params.get('raceId')) === 18 ? otherRace : race;
  const currentResult = { ...result, race: selectedRace, driver: { ...driver, name: published ? 'Published leader' : driver.name } };
  if (path.startsWith('/seasons/')) {
    const available = path.endsWith('/fantasy') ? [previous, historical] : seasons;
    return available;
  }
  switch (path) {
    case '/results/totalPerDriver': return [{ ...driverPointsFixture, totalPoints: points,
      driver: request.params.get('numResults') && published ? { ...driver, name: 'Published leader' } : driver }];
    case '/teams/withDrivers': return [{ ...teamPointsFixture, totalPoints: points }];
    case '/teams/all': return published ? [team, { ...team, id: 2, name: 'Alpine' }] : [team];
    case '/configurations/all': return [{ id: 1, setting: 'Longitud de carrera', settingValue: published ? 'Published setting' : '50%' }];
    case '/drivers/infoDriverByName': return { driver, totalPoints: points, victories: 2, podiums: 3, poles: 1, fastlaps: 1,
      averagePosition: 2, racesFinished: 4, penalties: 0, bestPosition: 1, championships: 1, last5Results: [result] };
    case '/drivers/teamHistory': return [{ team: published ? { ...team, id: 2, name: 'Alpine' } : team, season: historical, races: 2 }];
    case '/teams/infoTeamByName': return { team, totalPoints: points, victories: 2, podiums: 3, poles: 1, fastlaps: 1,
      averagePosition: 2, racesFinished: 4, penalties: 0, bestPosition: 1, constructors: 1, last5Results: [resultTeam] };
    case '/drivers/byTeamName': return [driver];
    case '/drivers/all': return [{ ...driver, name: published ? 'Published leader' : driver.name }];
    case '/results/totalPerSpecificDrivers': return [{ ...driverPointsFixture, driver: published ? { ...driver, name: 'Published teammate' } : driver, totalPoints: points }];
    case '/races/all': return published ? [race, otherRace, { ...race, id: 19, name: 'Published circuit' }] : [race, otherRace];
    case '/results/raceByPilots': return [currentResult];
    case '/results/raceByTeams': return [{ ...resultTeam, race: selectedRace, totalPoints: points }];
    case '/penalties/totalPerRace': return [new Penalty(1, selectedRace, driver, published ? 'Published penalty' : 'Contacto', { id: 1, severity: 'Leve' }, historical)];
    case '/statistics/overview': {
      const data = statisticsFixture(seasonNumber);
      if (published) {
        data.summary.margin = 777;
        data.drivers.forEach(entry => entry.totalPoints = 777);
        data.teams.forEach(entry => entry.totalPoints = 777);
        data.driverEvolution.series.forEach(entry => entry.cumulative = [200, 777]);
      }
      return data;
    }
    case '/statistics/headToHead': return headToHeadFixture(seasonNumber, request.params.get('a')!, request.params.get('b')!);
    case '/statistics/records': {
      const data = recordsFixture();
      if (published) data.driverRecords[0].title = 'Published record';
      return data;
    }
    case '/fantasy/clasification': {
      const data = fantasyFixture();
      data.season = seasonNumber;
      if (published) data.entries[0].points = 777;
      return data;
    }
    default: throw new Error('Unexpected server request: ' + request.urlWithParams);
  }
}

for (const view of views) {
  describe('Publication in place: ' + view.name, () => {
    let fixture: ViewFixture;
    let http: HttpTestingController;
    let cache: CacheService;
    let destroyed: boolean;
    const render = () => { fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); fixture.detectChanges(); };
    const root = (): HTMLElement => fixture.nativeElement;
    const visibleText = () => root().innerText;

    async function settle(): Promise<void> {
      // The ranking components deliberately delay successful HTTP responses by 100 ms.
      if (view.component === DriversRankingComponent || view.component === TeamsRankingComponent) {
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      await fixture.whenStable();
      render();
    }

    async function finish(requests: TestRequest[] = [], published = false): Promise<TestRequest[]> {
      const all: TestRequest[] = [];
      let batch = requests;
      for (let round = 0; round < 10; round++) {
        all.push(...batch.filter(req => !req.cancelled));
        batch.filter(req => !req.cancelled).forEach(req => {
          const body = view.fallback && (req.request.url.endsWith('/results/totalPerDriver') || req.request.url.endsWith('/teams/withDrivers'))
            ? [] : response(req.request, published);
          req.flush(published && view.component === SelectSeasonsComponent
            ? [...body as Season[], new Season(4, 'Temporada 4', 4)] : body);
        });
        render();
        batch = http.match(() => true);
        if (!batch.length) { await settle(); batch = http.match(() => true); }
        if (!batch.length) return all;
      }
      throw new Error('Requests did not settle');
    }

    function expectRefresh(requests: TestRequest[], selectedSeason = view.season, selectedRace = view.race, contender = selectedSeason === 1 ? 'Piloto 01' : 'Piloto 03'): void {
      for (const endpoint of view.endpoints) {
        const matches = requests.filter(req => req.request.url.endsWith(endpoint));
        expect(matches.length).withContext('publication must request exactly once: ' + endpoint).toBe(1);
        for (const { request } of matches) {
          if (selectedSeason !== undefined && !endpoint.startsWith('/seasons/') && endpoint !== '/drivers/teamHistory' && !endpoint.includes('/raceBy') && !endpoint.endsWith('/totalPerRace')) {
            const key = endpoint === '/fantasy/clasification' ? 'numberSeason' : 'season';
            expect(request.params.get(key)).withContext(endpoint + ' current season').toBe(String(selectedSeason));
          }
          if (endpoint.includes('/raceBy') || endpoint.endsWith('/totalPerRace')) expect(request.params.get('raceId')).toBe(String(selectedRace));
          for (const [key, value] of Object.entries(view.params ?? {})) {
            if (request.params.has(key)) expect(request.params.get(key)).withContext(endpoint + ' ' + key).toBe(value);
          }
          if (endpoint === '/results/totalPerSpecificDrivers') expect(request.body).toEqual([driver.id]);
          if (endpoint === '/statistics/headToHead') {
            expect(request.params.get('a')).toBe(contender);
            expect(request.params.get('b')).toBe('Piloto 02');
          }
        }
      }
    }

    function state(): object {
      const season = fixture.componentInstance instanceof SelectSeasonsComponent ? fixture.componentInstance
        : fixture.debugElement.query(By.directive(SelectSeasonsComponent))?.componentInstance as SelectSeasonsComponent | undefined;
      const races = fixture.componentInstance instanceof SelectRacesComponent ? fixture.componentInstance
        : fixture.debugElement.query(By.directive(SelectRacesComponent))?.componentInstance as SelectRacesComponent | undefined;
      return {
        season: season?.seasonForm.get('season')!.value?.number,
        race: races?.racesForm.get('race')!.value?.id,
        pressed: Array.from(root().querySelectorAll('[aria-pressed="true"], [role="tab"][aria-selected="true"]'), el => el.getAttribute('aria-label') ?? el.textContent!.trim()),
        pickers: Array.from(root().querySelectorAll('p-select'), el => el.textContent!.trim()),
        details: Array.from(root().querySelectorAll('details'), el => el.open),
        detailUser: root().querySelector('.team-detail h2')?.textContent,
        statisticsInputs: fixture.componentInstance instanceof GeneralStatsComponent || fixture.componentInstance instanceof EvolutionStatsComponent || fixture.componentInstance instanceof ComparativeStatsComponent
          ? { season: fixture.componentInstance.seasonSelected().number, type: fixture.componentInstance.typeSelected() } : undefined,
        rankingInputs: view.component === DriversRankingComponent || view.component === TeamsRankingComponent
          ? { season: (fixture.componentInstance as DriversRankingComponent).season().number, teams: (fixture.componentInstance as DriversRankingComponent).selectedTeams() } : undefined
      };
    }

    beforeEach(async () => {
      destroyed = false;
      const name = view.component === TeamsInfoComponent ? 'Ferrari' : view.component === ResultsComponent ? 'Gran_Premio' : 'Piloto_de_prueba';
      const params = { name, season: '2' };
      TestBed.configureTestingModule({ imports: [view.component], providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params), params, queryParamMap: convertToParamMap({ season: '2' }) }, params: of(params) } }
      ] });
      http = TestBed.inject(HttpTestingController);
      cache = TestBed.inject(CacheService);
      cache.updateVersion(29);
      spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      if (view.component !== FantasyComponent) TestBed.inject(ImageService).getImageUrl = () => 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      fixture = TestBed.createComponent(view.component);
      Object.entries(view.inputs ?? {}).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
      render();
      await finish(http.match(() => true));
      view.prepare?.(fixture);
      render();
      await finish(http.match(() => true));
      expect(visibleText().length).withContext('the initial server data must be rendered').toBeGreaterThan(0);
      http.expectNone(() => true);
    });

    afterEach(() => {
      if (fixture && !destroyed) fixture.destroy();
      http?.verify({ ignoreCancelled: true });
      cache?.clearCache();
    });

    it('reloads the current selection once, retains the instance and visible content while pending, then shows new data', async () => {
      const instance = fixture.componentInstance;
      const before = visibleText();
      const selection = state();
      const height = root().getBoundingClientRect().height;
      cache.updateVersion(30);
      render();
      const pending = http.match(() => true);
      expect(fixture.componentInstance).toBe(instance);
      expect(state()).toEqual(selection);
      expect(visibleText()).withContext('previous content stays visible during refresh').toBe(before);
      expect(root().querySelector('p-skeleton, .loading-profile')).toBeNull();
      expect(root().getBoundingClientRect().height).withContext('publication must not collapse page height').toBeGreaterThanOrEqual(height);
      const refreshed = await finish(pending, true);
      expectRefresh(refreshed);
      expect(fixture.componentInstance).toBe(instance);
      expect(state()).withContext('response must preserve the user selection and open details').toEqual(selection);
      if (view.component === TeamsFiltersComponent) {
        expect(root().querySelector('[aria-label="Alpine"]')).withContext('the new team must be available as a filter').not.toBeNull();
      } else if (view.component === HomeTeamsComponent) {
        expect(root().querySelector('a[href="/teams/Alpine"] img')?.getAttribute('alt'))
          .withContext('render the published team logo and profile link').toBe('Alpine');
      } else if (view.component === SelectRacesComponent) {
        click(fixture, '[role="combobox"]');
        await settle();
        expect(root().querySelector('[role="combobox"]')?.getAttribute('aria-expanded')).toBe('true');
        expect(Array.from(root().querySelectorAll('[role="option"]'), option => option.textContent!.trim()))
          .withContext('the new circuit must appear in the dropdown').toContain(view.marker);
        root().querySelector('[role="combobox"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      } else {
        expect(root().textContent).withContext('render the published server response').toContain(view.marker);
      }
      if (view.component === DriversInfoComponent) expect(root().querySelector('header')?.textContent).toContain('Alpine');
      if (view.component === TeamsInfoComponent) expect(visibleText()).toContain('Published teammate');
      cache.updateVersion(30);
      render();
      http.expectNone(() => true, 'the same version must not refresh twice');
    });

    it('requests the current data on publication and keeps previous content and choices if that request fails', async () => {
      spyOn(console, 'error');
      const before = visibleText();
      const selection = state();
      cache.updateVersion(30);
      render();
      const pending = http.match(() => true);
      expect(pending.length).withContext('exercise a real refresh failure, not an absent refresh').toBeGreaterThan(0);
      for (const req of pending) if (!req.cancelled) req.flush('offline', { status: 503, statusText: 'Unavailable' });
      await settle();
      // Any fallback requests are answered too, so hiding old content behind a fallback fails.
      await finish(http.match(() => true));
      expect(visibleText()).withContext('failed refresh must retain previously rendered data').toContain(before);
      expect(state()).toEqual(selection);
      expect(root().querySelector('p-skeleton, .loading-profile')).toBeNull();
    });

    it('does not request anything when publication follows destroy', () => {
      fixture.destroy();
      destroyed = true;
      cache.updateVersion(30);
      cache.updateVersion(31);
      http.expectNone(() => true, 'destroyed views must unsubscribe from publication');
    });

    if (view.component === SelectSeasonsComponent || view.component === TeamsFiltersComponent || view.component === EvolutionStatsComponent) {
      it('preserves a choice made while publication is pending and does not create a second refresh subscription', async () => {
        cache.updateVersion(30);
        render();
        const pending = http.match(() => true);
        expect(pending.length).withContext('a publication refresh must be in flight').toBeGreaterThan(0);
        if (view.component === SelectSeasonsComponent) {
          const selector = seasonSelector(fixture);
          selectSeason(fixture, selector.seasons().find(season => season.number > 0 && season.number !== selector.seasonForm.get('season')!.value.number)!);
        } else if (view.component === TeamsFiltersComponent) {
          click(fixture, '[aria-label="Ferrari"]');
        } else {
          click(fixture, '.comparison-chip[aria-pressed="true"]');
        }
        render();
        const selection = state();
        http.expectNone(() => true, 'local choices must not duplicate the publication request');
        expectRefresh(await finish(pending, true));
        expect(state()).toEqual(selection);
        cache.updateVersion(31);
        render();
        expectRefresh(await finish(http.match(() => true), true));
        expect(state()).toEqual(selection);
      });
    }

    if (view.component === DriversRankingComponent || view.component === TeamsRankingComponent) {
      it('keeps a changed team filter while the publication response is pending without starting a second load', async () => {
        cache.updateVersion(30);
        render();
        const pending = http.match(() => true);
        expect(pending.length).withContext('a publication refresh must be in flight').toBeGreaterThan(0);
        fixture.componentRef.setInput('selectedTeams', ['Todos los equipos']);
        render();
        http.expectNone(() => true, 'filtering the current season is local');
        const refreshed = await finish(pending, true);
        expectRefresh(refreshed);
        expect((fixture.componentInstance as DriversRankingComponent).selectedTeams()).toEqual(['Todos los equipos']);
        expect(root().querySelector('ol')).not.toBeNull();
        cache.updateVersion(31);
        render();
        expectRefresh(await finish(http.match(() => true), true));
        expect((fixture.componentInstance as DriversRankingComponent).selectedTeams()).toEqual(['Todos los equipos']);
      });
    }

    if (view.name === 'statistics comparative drivers') {
      it('refreshes the newly chosen driver pair without restoring or requesting the old pair', async () => {
        cache.updateVersion(30);
        render();
        const pending = http.match(() => true);
        expect(pending.length).withContext('the overview must already be refreshing').toBeGreaterThan(0);
        fixture.debugElement.queryAll(By.css('p-select'))[0].triggerEventHandler('ngModelChange', 4);
        render();
        const changed = await finish(http.match(() => true), true);
        const refreshed = await finish(pending, true);
        for (const req of [...changed, ...refreshed].filter(req => req.request.url.endsWith('/statistics/headToHead'))) {
          expect(req.request.params.get('a')).toBe('Piloto 04');
          expect(req.request.params.get('b')).toBe('Piloto 02');
        }
        const selection = state();
        cache.updateVersion(31);
        render();
        expectRefresh(await finish(http.match(() => true), true), 2, undefined, 'Piloto 04');
        expect(state()).toEqual(selection);
      });
    }

    if (view.component === FantasyClasificationComponent) {
      it('keeps the newly chosen circuit and open team detail when the pending publication arrives', async () => {
        cache.updateVersion(30);
        render();
        const pending = http.match(() => true);
        expect(pending.length).withContext('the season classification must already be refreshing').toBeGreaterThan(0);
        raceSelector(fixture).racesForm.get('race')!.setValue(raceSelector(fixture).races().find(race => race.id === 26));
        render();
        const selection = state();
        http.expectNone(() => true, 'circuit changes use the already loaded season classification');
        expectRefresh(await finish(pending, true));
        expect(state()).toEqual(selection);
        cache.updateVersion(31);
        render();
        expectRefresh(await finish(http.match(() => true), true));
        expect(state()).toEqual(selection);
      });
    }

    if (view.change) {
      it('switches selection during refresh, ignores the obsolete response and refreshes only the new selection on the next publication', async () => {
        cache.updateVersion(30);
        render();
        const obsolete = http.match(() => true);
        expect(obsolete.length).withContext('publication must start a refresh before changing selection').toBeGreaterThan(0);
        view.change!(fixture);
        render();
        // An old response must either be cancelled or be ignored, even if it arrives late.
        await finish(http.match(() => true));
        const selection = state();
        for (const req of obsolete) {
          if (!req.cancelled) req.flush(response(req.request, true));
        }
        await settle();
        expect(visibleText()).withContext('obsolete selection must not overwrite the current screen').not.toContain(view.marker);
        expect(state()).withContext('obsolete response must not reset the new selection').toEqual(selection);
        cache.updateVersion(31);
        render();
        const refreshed = await finish(http.match(() => true), true);
        expectRefresh(refreshed, view.selection === 'season' ? 1 : view.season, view.selection === 'race' ? 17 : view.race);
        for (const req of refreshed) {
          const key = view.selection === 'race' ? 'raceId' : req.request.params.has('numberSeason') ? 'numberSeason' : 'season';
          if (req.request.params.has(key)) expect(req.request.params.get(key)).withContext('no stale selection requested again').toBe(view.selection === 'race' ? '17' : '1');
        }
        expect(state()).toEqual(selection);
      });
    }
  });
}

for (const excluded of [
  { name: 'admin shell', component: AdminComponent },
  { name: 'admin results', component: AdminResultsComponent },
  { name: 'admin sprints', component: AdminResultsComponent, sprint: true },
  { name: 'admin penalties', component: AdminPenaltiesComponent },
  { name: 'fantasy login', component: FantasyLoginComponent },
  { name: 'fantasy register', component: FantasyRegisterComponent },
  { name: 'fantasy recover password', component: FantasyRecoverPasswordComponent },
  { name: 'fantasy team', component: FantasyTeamComponent }
]) {
  describe('Publication excluded: ' + excluded.name, () => {
    let fixture: ViewFixture;
    let http: HttpTestingController;
    let cache: CacheService;
    const render = () => { fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); fixture.detectChanges(); };

    beforeEach(async () => {
      TestBed.configureTestingModule({ imports: [excluded.component], providers: provideComponentTesting() });
      http = TestBed.inject(HttpTestingController);
      cache = TestBed.inject(CacheService);
      cache.updateVersion(29);
      spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      if (excluded.sprint) spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/admin/sprints');
      fixture = TestBed.createComponent(excluded.component as Type<unknown>);
      render();
      for (let round = 0; round < 10; round++) {
        const batch = http.match(() => true);
        if (!batch.length) { await fixture.whenStable(); render(); break; }
        for (const req of batch) {
          const path = new URL(req.request.url).pathname;
          const body = path === '/races/actual' ? { ...race, dateStart: '2099-01-01T12:00:00Z' }
            : path === '/races/allFinishedAndActual' ? [race]
            : path === '/drivers/all' ? [driver]
            : path === '/penaltiesSeverity/all' ? [{ id: 1, severity: 'Leve' }]
            : path === '/penalties/totalPerDriver' || path === '/penalties/perDriverPerRace' || path === '/sprints/race' ? []
            : path === '/fantasy/allDriverPrices' || path === '/fantasy/allTeamPrices' ? []
            : path === '/fantasy/fantasyElection' ? {}
            : response(req.request, false);
          req.flush(body);
        }
        render();
      }
      http.expectNone(() => true, 'the form must finish its initial loads before publication');
    });

    afterEach(() => {
      fixture?.destroy();
      http?.verify({ ignoreCancelled: true });
      cache?.clearCache();
    });

    it('makes no request on publication and preserves the form DOM and typed text', async () => {
      const instance = fixture.componentInstance;
      const fields = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="checkbox"]), textarea'));
      fields.filter(field => !field.readOnly && !field.disabled).forEach(field => {
        field.value = 'Unsaved draft';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
      render();
      const values = fields.map(field => field.value);
      cache.updateVersion(30);
      render();
      await fixture.whenStable();
      render();
      http.expectNone(() => true, 'excluded views, layouts and their selectors must not refresh');
      expect(fixture.componentInstance).toBe(instance);
      expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input:not([type="checkbox"]), textarea'))).toEqual(fields);
      expect(fields.map(field => field.value)).toEqual(values);
    });
  });
}
