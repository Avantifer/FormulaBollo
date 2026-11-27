import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { Component, inject, provideZonelessChangeDetection, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { merge, of, Subject, Subscription, switchMap } from 'rxjs';
import { environment } from '../enviroments/enviroment';
import { CacheService } from '../shared/services/cache.service';
import { ImageService } from '../shared/services/image.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { driverPointsFixture } from '../testing/component-test-providers';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { HomeDriversComponent } from './components/home/home-drivers/home-drivers.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { ResultsComponent } from './components/results/results.component';
import { headToHeadFixture, recordsFixture, statisticsFixture } from './components/statistics/statistics.fixture';
import { SelectSeasonsComponent } from '../shared/components/select-seasons/select-seasons.component';
import { SelectRacesComponent } from '../shared/components/select-races/select-races.component';
import { Season } from '../shared/models/season';
import { Race } from '../shared/models/race';
import { Result } from '../shared/models/result';
import { Position } from '../shared/models/position';
import { Penalty } from '../shared/models/penalty';

class PublishViewData {
  value = 'Standings 29';
  created = 0;
  readonly load = jasmine.createSpy('load standings').and.callFake(() => of(this.value));
}

@Component({
  template: `
    <p data-testid="visit">Visit {{ visit }}</p>
    <p data-testid="standings">{{ standings() }}</p>
    <label>Draft <input aria-label="Draft" /></label>
  `
})
class PublishViewComponent {
  private readonly cache = inject(CacheService);
  private readonly data = inject(PublishViewData);
  readonly visit = ++this.data.created;
  readonly standings = signal('Loading standings');
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = merge(of(undefined), this.cache.screenDataOutdated$).pipe(
      switchMap(() => this.cache.getOrLoad<string>('publish-view', () => this.data.load()))
    )
      .subscribe(value => this.standings.set(value));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

@Component({
  imports: [RouterOutlet],
  template: '<label>Parent draft <input aria-label="Parent draft" /></label><router-outlet />'
})
class PublishParentComponent {}

describe('AppComponent routed view on data publication', () => {
  let fixture: ComponentFixture<AppComponent> | undefined;
  let cache: CacheService;
  let seed: CacheService | undefined;
  let http: HttpTestingController;
  let router: Router;
  let data: PublishViewData;
  let messages$: Subject<number>;
  let versionRequest: TestRequest;
  let clockInstalled: boolean;
  const standingsUrl = '/standings?season=3&order=points#ranking';
  const testRoutes: Routes = [
    { path: 'standings', component: PublishViewComponent },
    { path: 'form', component: PublishViewComponent },
    {
      path: 'parent', component: PublishParentComponent,
      children: [{ path: 'child', component: PublishViewComponent }]
    },
    { path: 'home', component: HomeDriversComponent }
  ];

  beforeEach(() => {
    localStorage.clear();
    fixture = undefined;
    seed = undefined;
    clockInstalled = false;
    messages$ = new Subject<number>();
    data = new PublishViewData();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
        provideRouter(testRoutes), MessageService,
        { provide: PublishViewData, useValue: data },
        { provide: ImageService, useValue: { getImageUrl: () => 'assets/test.png' } },
        { provide: WebSocketService, useValue: {
          connected$: new Subject<void>(), getMessages: () => messages$, closeConnection: () => {}
        } }
      ]
    });
  });

  afterEach(() => {
    try {
      fixture?.destroy();
      http?.verify();
    } finally {
      cache?.clearCache();
      seed?.clearCache();
      localStorage.clear();
      if (clockInstalled) jasmine.clock().uninstall();
    }
  });

  function startClock(): void {
    jasmine.clock().install();
    clockInstalled = true;
  }

  function stopClock(): void {
    jasmine.clock().uninstall();
    clockInstalled = false;
  }

  function persistVersion29(): void {
    startClock();
    seed = new CacheService();
    seed.updateVersion(29);
    seed.getOrLoad('publish-view', () => of('Persisted standings 29')).subscribe();
    jasmine.clock().tick(300);
    stopClock();
  }

  async function open(url = standingsUrl, initialVersion: number | null = 29): Promise<void> {
    cache = TestBed.inject(CacheService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    versionRequest = http.expectOne(request => request.url.endsWith('/cache/current'));
    if (initialVersion !== null) versionRequest.flush(initialVersion);
    await router.navigateByUrl(url);
    fixture.detectChanges();
    // Clock-driven cases control rendering until the cached value is released.
    if (initialVersion !== null) await ready();
  }

  async function ready(): Promise<void> {
    await fixture!.whenStable();
    fixture!.detectChanges();
  }

  function text(selector: string): string {
    return fixture!.nativeElement.querySelector(selector).textContent.trim();
  }

  function draft(label = 'Draft'): HTMLInputElement {
    return fixture!.nativeElement.querySelector(`input[aria-label="${label}"]`);
  }

  function typeDraft(label = 'Draft'): HTMLInputElement {
    const input = draft(label);
    input.value = 'Unsaved changes';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  }

  function expectView(visit: number, standings: string, url = standingsUrl): void {
    expect(text('[data-testid="visit"]')).toBe(`Visit ${visit}`);
    expect(text('[data-testid="standings"]')).toBe(standings);
    expect(router.url).toBe(url);
  }

  for (const source of ['WebSocket', 'updateVersion'] as const) {
    it(`R1: refreshes data in the same routed instance after a confirmed version changes through ${source}`, async () => {
      await open();
      expectView(1, 'Standings 29');
      const original = typeDraft();
      const instance = fixture!.debugElement.query(By.directive(PublishViewComponent)).componentInstance;
      data.value = 'Standings 30';

      if (source === 'WebSocket') messages$.next(30);
      else cache.updateVersion(30);
      await ready();

      expectView(1, 'Standings 30');
      expect(fixture!.debugElement.query(By.directive(PublishViewComponent)).componentInstance).toBe(instance);
      expect(draft()).toBe(original);
      expect(draft().value).toBe('Unsaved changes');
      expect(data.load).toHaveBeenCalledTimes(2);
      messages$.next(30);
      await ready();
      expectView(1, 'Standings 30');
      expect(data.load).toHaveBeenCalledTimes(2);
    });
  }

  it('R2: preserves the visible component and its draft for repeated identical versions', async () => {
    await open();
    const original = typeDraft();
    data.value = 'Unexpected reload';
    messages$.next(29);
    messages$.next(29);
    await ready();
    expectView(1, 'Standings 29');
    expect(draft()).toBe(original);
    expect(draft().value).toBe('Unsaved changes');
    expect(data.load).toHaveBeenCalledTimes(1);
  });

  it('R3: preserves the visible component on the first version with no persisted cache', async () => {
    data.value = 'Current standings';
    await open(standingsUrl, null);
    expectView(1, 'Current standings');
    const original = typeDraft();
    versionRequest.flush(30);
    await ready();
    expectView(1, 'Current standings');
    expect(draft()).toBe(original);
    expect(draft().value).toBe('Unsaved changes');
    expect(data.load).toHaveBeenCalledTimes(1);
  });

  it('R4: uses fresh data without recreation when 30 arrives before persisted 29 was delivered', async () => {
    persistVersion29();
    startClock();
    data.value = 'Standings 30';
    await open(standingsUrl, null);
    expectView(1, 'Loading standings');
    jasmine.clock().tick(2999);
    fixture!.detectChanges();
    expectView(1, 'Loading standings');
    const original = typeDraft();
    messages$.next(30);
    versionRequest.flush(30);
    stopClock();
    await ready();
    expectView(1, 'Standings 30');
    expect(draft()).toBe(original);
    expect(draft().value).toBe('Unsaved changes');
    expect(data.load).toHaveBeenCalledTimes(1);
  });

  for (const version of [30, 29]) {
    it(`R5: ${version === 30 ? 'refreshes' : 'retains'} the data in the same component when ${version} arrives after the 3000 ms cached delivery`, async () => {
      persistVersion29();
      startClock();
      data.value = 'Standings 30';
      await open(standingsUrl, null);
      jasmine.clock().tick(2999);
      fixture!.detectChanges();
      expectView(1, 'Loading standings');
      jasmine.clock().tick(1);
      fixture!.detectChanges();
      expectView(1, 'Persisted standings 29');
      const original = typeDraft();
      stopClock();

      messages$.next(version);
      versionRequest.flush(version);
      await ready();

      expectView(1, version === 30 ? 'Standings 30' : 'Persisted standings 29');
      expect(draft()).toBe(original);
      expect(draft().value).toBe('Unsaved changes');
      expect(data.load).toHaveBeenCalledTimes(version === 30 ? 1 : 0);
    });
  }

  it('R6: refreshes in place after a failed version check delivered persisted 29 and a push announces 30', async () => {
    persistVersion29();
    await open(standingsUrl, null);
    expectView(1, 'Loading standings');
    versionRequest.flush('offline', { status: 503, statusText: 'Unavailable' });
    await ready();
    expectView(1, 'Persisted standings 29');
    const original = typeDraft();
    data.value = 'Standings 30';
    messages$.next(30);
    await ready();
    expectView(1, 'Standings 30');
    expect(draft()).toBe(original);
    expect(draft().value).toBe('Unsaved changes');
    expect(data.load).toHaveBeenCalledTimes(1);
  });

  for (const path of ['form', 'parent/child']) {
    it(`R7: refreshes data and preserves typed content on ${path}, including parent drafts`, async () => {
      const url = `/${path}?season=3&draft=1#editing`;
      await open(url);
      expectView(1, 'Standings 29', url);
      const original = typeDraft();
      const parent = path === 'parent/child' ? typeDraft('Parent draft') : undefined;
      data.value = 'Standings 30';
      messages$.next(30);
      await ready();
      expectView(1, 'Standings 30', url);
      expect(draft()).toBe(original);
      expect(draft().value).toBe('Unsaved changes');
      if (parent) {
        expect(draft('Parent draft')).toBe(parent);
        expect(parent.value).toBe('Unsaved changes');
      }
    });
  }

  for (const protectedView of [false, true]) {
    it(`keeps a single fresh view when publication arrives during lazy loading${protectedView ? ' from a protected route' : ''}`, async () => {
      let finishLoading!: (component: Type<PublishViewComponent>) => void;
      let loadingStarted!: () => void;
      const started = new Promise<void>(resolve => loadingStarted = resolve);
      const loaded = new Promise<Type<PublishViewComponent>>(resolve => finishLoading = resolve);
      await open(protectedView ? '/form' : standingsUrl);
      router.resetConfig([...testRoutes, {
        path: 'lazy',
        loadComponent: () => { loadingStarted(); return loaded; }
      }]);
      const original = typeDraft();
      const navigating = router.navigateByUrl('/lazy?season=3#ranking');
      await started;
      data.value = 'Standings 30';
      messages$.next(30);
      fixture!.detectChanges();
      expect(draft()).toBe(original);
      expect(draft().value).toBe('Unsaved changes');
      finishLoading(PublishViewComponent);
      expect(await navigating).toBeTrue();
      await ready();

      expectView(2, 'Standings 30', '/lazy?season=3#ranking');
      expect(fixture!.nativeElement.querySelectorAll('[data-testid="visit"]').length).toBe(1);
      expect(fixture!.nativeElement.querySelectorAll('router-outlet').length).toBe(1);
      const lazyInstance = fixture!.debugElement.query(By.directive(PublishViewComponent)).componentInstance;
      const lazyDraft = typeDraft();
      data.value = 'Standings 31';
      messages$.next(31);
      await ready();
      expectView(2, 'Standings 31', '/lazy?season=3#ranking');
      expect(fixture!.debugElement.query(By.directive(PublishViewComponent)).componentInstance).toBe(lazyInstance);
      expect(draft()).toBe(lazyDraft);
      expect(draft().value).toBe('Unsaved changes');
    });
  }

  for (const protectedView of [false, true]) {
    it(`preserves a working outlet after a guard cancels navigation during publication${protectedView ? ' on a protected route' : ''}`, async () => {
      const guardResult = new Subject<boolean>();
      let guardStarted!: () => void;
      const started = new Promise<void>(resolve => guardStarted = resolve);
      await open(protectedView ? '/form' : standingsUrl);
      router.resetConfig([...testRoutes, {
        path: 'blocked', component: PublishViewComponent,
        canActivate: [() => { guardStarted(); return guardResult; }]
      }]);
      const original = typeDraft();
      const navigating = router.navigateByUrl('/blocked');
      await started;
      data.value = 'Standings 30';
      messages$.next(30);
      fixture!.detectChanges();
      expect(draft()).toBe(original);
      guardResult.next(false);
      guardResult.complete();
      expect(await navigating).toBeFalse();
      await ready();

      expectView(1, 'Standings 30', protectedView ? '/form' : standingsUrl);
      expect(fixture!.nativeElement.querySelectorAll('router-outlet').length).toBe(1);
      expect(draft()).toBe(original);
      expect(draft().value).toBe('Unsaved changes');
    });
  }

  // Exercise AppComponent with every real route pattern and a data-view test double.
  // Actual data views and excluded forms have their own HTTP publication contracts.
  function routePaths(table: Routes, parent = ''): string[] {
    return table.flatMap(route => {
      const path = [parent, route.path].filter(Boolean).join('/');
      return route.redirectTo !== undefined ? [] : [path, ...routePaths(route.children ?? [], path)];
    });
  }

  for (const path of routePaths(routes)) {
    it('keeps the routed instance and typed text on /' + path, async () => {
      await open();
      router.resetConfig([{ path, component: PublishViewComponent }]);
      const url = '/' + path.replace(':name', 'Gran_Premio').replace(':season', '2').replace(':token', 'test').replace('**', 'missing') + '?season=2#details';
      await router.navigateByUrl(url);
      await ready();
      const instance = fixture!.debugElement.query(By.directive(PublishViewComponent)).componentInstance;
      const original = typeDraft();
      data.value = 'Standings 30';
      cache.updateVersion(30);
      await ready();
      expect(fixture!.debugElement.query(By.directive(PublishViewComponent)).componentInstance).toBe(instance);
      expect(draft()).toBe(original);
      expect(draft().value).toBe('Unsaved changes');
      expect(text('[data-testid="standings"]')).toBe('Standings 30');
      expect(router.url).toBe(url);
    });
  }

  async function finishRealView(published = false, pending = http.match(() => true)): Promise<TestRequest[]> {
    const requests: TestRequest[] = [];
    const season = new Season(2, 'Temporada 2', 2);
    const race = new Race(17, 'Gran Premio', '', '', new Date('2026-01-01'), season, 1);
    const driver = driverPointsFixture.driver;
    const result = new Result(race, driver, new Position(1, 1, published ? 777 : 25), 1, 1);
    for (let round = 0; round < 10; round++) {
      requests.push(...pending.filter(req => !req.cancelled));
      for (const req of pending.filter(req => !req.cancelled)) {
        const path = new URL(req.request.url).pathname;
        switch (path) {
          case '/seasons/all': req.flush([season, environment.seasonActual]); break;
          case '/races/all': req.flush([race, { ...race, id: 18, name: 'Otra carrera' }]); break;
          case '/results/raceByPilots': req.flush([result]); break;
          case '/results/raceByTeams': req.flush([{ id: 1, race, results: [result], totalPoints: published ? 777 : 25, hasFastLap: true, hasPole: true }]); break;
          case '/penalties/totalPerRace': req.flush([new Penalty(1, race, driver, published ? 'Published penalty' : 'Contacto', { id: 1, severity: 'Leve' }, season)]); break;
          case '/statistics/overview': {
            const overview = statisticsFixture(Number(req.request.params.get('season')));
            if (published) overview.summary.margin = 777;
            req.flush(overview);
            break;
          }
          case '/statistics/records': {
            const records = recordsFixture();
            if (published) records.driverRecords[0].title = 'Published record';
            req.flush(records);
            break;
          }
          case '/statistics/headToHead': req.flush(headToHeadFixture(Number(req.request.params.get('season')), req.request.params.get('a')!, req.request.params.get('b')!)); break;
          default: throw new Error('Unexpected request: ' + req.request.urlWithParams);
        }
      }
      await ready();
      pending = http.match(() => true);
      if (!pending.length) return requests;
    }
    throw new Error('Real view requests did not settle');
  }

  for (const tab of ['general', 'evolucion', 'comparative', 'records']) {
    it('keeps the real /statistics ' + tab + ' tab, season, details and scroll on publication', async () => {
      await open();
      router.resetConfig([{ path: 'statistics', component: StatisticsComponent }]);
      await router.navigateByUrl('/statistics');
      await finishRealView();
      (fixture!.nativeElement.querySelector('#statistics-tab-' + tab) as HTMLButtonElement).click();
      await finishRealView();
      const selector = fixture!.debugElement.query(By.directive(SelectSeasonsComponent))?.componentInstance as SelectSeasonsComponent | undefined;
      if (selector) {
        selector.seasonForm.get('season')!.setValue(selector.seasons().find(season => season.number === 2));
        fixture!.changeDetectorRef.markForCheck();
        await finishRealView();
      }
      const instance = fixture!.debugElement.query(By.directive(StatisticsComponent)).componentInstance;
      const details = fixture!.nativeElement.querySelector('app-records details') as HTMLDetailsElement | null;
      if (details) details.open = true;
      window.scrollTo(0, 200);
      const scroll = window.scrollY;
      expect(scroll).withContext('exercise a page that is actually scrolled').toBeGreaterThan(0);
      const height = fixture!.nativeElement.getBoundingClientRect().height;
      cache.updateVersion(30);
      await ready();
      expect(fixture!.debugElement.query(By.directive(StatisticsComponent)).componentInstance).toBe(instance);
      expect(fixture!.nativeElement.querySelector('[role="tab"][aria-selected="true"]').id).toBe('statistics-tab-' + tab);
      expect(window.scrollY).toBe(scroll);
      expect(fixture!.nativeElement.getBoundingClientRect().height).toBeGreaterThanOrEqual(height);
      expect(fixture!.nativeElement.querySelector('p-skeleton')).toBeNull();
      if (details) {
        expect(fixture!.nativeElement.querySelector('app-records details')).toBe(details);
        expect(details.open).toBeTrue();
      }
      const refreshed = await finishRealView(true);
      const endpoint = tab === 'records' ? '/statistics/records' : '/statistics/overview';
      expect(refreshed.filter(req => req.request.url.endsWith(endpoint)).length).toBe(1);
      if (selector) expect((fixture!.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent).seasonForm.get('season')!.value.number).toBe(2);
      if (tab === 'records') expect(fixture!.nativeElement.querySelector('app-records')?.textContent ?? '').toContain('Published record');
      window.scrollTo(0, 0);
    });
  }

  for (const tab of [0, 1, 2]) {
    it('keeps the real /results race, season, tab ' + tab + ' and scroll on publication', async () => {
      await open();
      router.resetConfig([{ path: 'results/:name/:season', component: ResultsComponent }]);
      await router.navigateByUrl('/results/Gran_Premio/2');
      await finishRealView();
      const select = fixture!.debugElement.query(By.directive(SelectRacesComponent)).componentInstance as SelectRacesComponent;
      select.racesForm.get('race')!.setValue(select.races().find(race => race.id === 18));
      (fixture!.nativeElement.querySelector('#results-tab-' + tab) as HTMLButtonElement).click();
      await finishRealView();
      const instance = fixture!.debugElement.query(By.directive(ResultsComponent)).componentInstance;
      const season = fixture!.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
      const chosenSeason = season.seasonForm.get('season')!.value.number;
      const chosenRace = select.racesForm.get('race')!.value.id;
      window.scrollTo(0, 150);
      const scroll = window.scrollY;
      const before = text('app-results');
      cache.updateVersion(30);
      await ready();
      expect(fixture!.debugElement.query(By.directive(ResultsComponent)).componentInstance).toBe(instance);
      expect(fixture!.nativeElement.querySelector('[role="tab"][aria-selected="true"]').id).toBe('results-tab-' + tab);
      expect(text('app-results')).toBe(before);
      expect(window.scrollY).toBe(scroll);
      expect(fixture!.nativeElement.querySelector('p-skeleton')).toBeNull();
      const refreshed = await finishRealView(true);
      for (const req of refreshed.filter(req => req.request.params.has('raceId'))) expect(req.request.params.get('raceId')).toBe('18');
      expect(refreshed.filter(req => req.request.url.endsWith('/results/raceByPilots')).length).toBe(1);
      expect((fixture!.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent).seasonForm.get('season')!.value.number).toBe(chosenSeason);
      expect((fixture!.debugElement.query(By.directive(SelectRacesComponent)).componentInstance as SelectRacesComponent).racesForm.get('race')!.value.id).toBe(chosenRace);
      expect(text('app-results')).toContain(tab === 2 ? 'Published penalty' : tab === 0 ? '778' : '777');
      window.scrollTo(0, 0);
    });
  }

  it('R9: renders new HomeDrivers standings after a version push without user navigation', async () => {
    const url = '/home?season=3&view=drivers#standings';
    // Keep the initial version request pending until after the real view starts its HTTP load.
    await open(url, null);
    versionRequest.flush(29);
    const isStandings = (request: { url: string }) => request.url.endsWith('/results/totalPerDriver');
    const initial = http.expectOne(isStandings);
    expect(initial.request.params.get('season')).toBe(String(environment.seasonActual.number));
    expect(initial.request.params.get('numResults')).toBe('10');
    initial.flush([{ ...driverPointsFixture, totalPoints: 25,
      driver: { ...driverPointsFixture.driver, name: 'Previous leader' } }]);
    await ready();
    expect(text('app-home-drivers')).toContain('Previous leader');
    expect(text('app-home-drivers')).toContain('25 Puntos');
    const instance = fixture!.debugElement.query(By.directive(HomeDriversComponent)).componentInstance;

    messages$.next(30);
    await ready();
    expect(fixture!.debugElement.query(By.directive(HomeDriversComponent)).componentInstance).toBe(instance);
    expect(text('app-home-drivers')).toContain('Previous leader');
    expect(fixture!.nativeElement.querySelector('p-skeleton')).toBeNull();
    // Matching rather than throwing lets the DOM assertions also explain a missing reload.
    const refreshed = http.match(isStandings);
    expect(refreshed.length).withContext('a version push must request the standings again').toBe(1);
    for (const request of refreshed) request.flush([{ ...driverPointsFixture, totalPoints: 50,
      driver: { ...driverPointsFixture.driver, name: 'New leader' } }]);
    await ready();
    expect(text('app-home-drivers')).toContain('New leader');
    expect(text('app-home-drivers')).toContain('50 Puntos');
    expect(text('app-home-drivers')).not.toContain('Previous leader');
    expect(router.url).toBe(url);
  });
});
