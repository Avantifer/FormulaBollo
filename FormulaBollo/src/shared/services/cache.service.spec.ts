import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DriverApiService } from './api/driver-api.service';
import { CacheService } from './cache.service';
import { ConfigurationApiService } from './api/configuration-api.service';
import { AuthJWTService } from './authJWT.service';
import { MessageInfoService } from './toastInfo.service';

describe('Public API cache', () => {
  let cache: CacheService;
  let drivers: DriverApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    localStorage.removeItem('apiCache');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: MessageInfoService, useValue: { showInfo: () => {} } }
    ] });
    cache = TestBed.inject(CacheService);
    drivers = TestBed.inject(DriverApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); cache.clearCache(); localStorage.clear(); jasmine.clock().uninstall(); });

  it('keeps API data in memory when storage quota is exceeded', () => {
    localStorage.setItem('apiCache', 'stale');
    spyOn(localStorage, 'setItem').and.throwError(new DOMException('Full', 'QuotaExceededError'));
    const next = jasmine.createSpy('next');
    const error = jasmine.createSpy('error');
    const data = { id: 1 };
    cache.getOrLoad('drivers', () => of(data)).subscribe({ next, error });
    expect(next).toHaveBeenCalledWith(data);
    expect(() => jasmine.clock().tick(300)).not.toThrow();
    expect(error).not.toHaveBeenCalled();
    expect(cache.getCache().get('drivers')).toBe(data);
    expect(localStorage.getItem('apiCache')).toBeNull();
  });

  it('persists several responses with a single deferred write', () => {
    cache.updateVersion(1);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    cache.getOrLoad('first', () => of(1)).subscribe();
    jasmine.clock().tick(100);
    cache.getOrLoad('second', () => of(2)).subscribe();
    jasmine.clock().tick(199);
    expect(setItem).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('apiCache')!)).toEqual({ version: 1, entries: [['first', 1], ['second', 2]] });
  });

  it('cancels a pending write when cleared and can schedule another', () => {
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    cache.getOrLoad('old', () => of(1)).subscribe();
    cache.clearCache();
    jasmine.clock().tick(300);
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('apiCache')).toBeNull();
    cache.getOrLoad('new', () => of(2)).subscribe();
    jasmine.clock().tick(300);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('removes persisted data when serialized cache is too large', () => {
    localStorage.setItem('apiCache', 'stale');
    const setItem = spyOn(localStorage, 'setItem');
    const huge = 'x'.repeat(2_000_001);
    cache.getOrLoad('huge', () => of(huge)).subscribe();
    jasmine.clock().tick(300);
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('apiCache')).toBeNull();
    expect(cache.getCache().get('huge')).toBe(huge);
  });

  it('does not throw when serialization or storage removal fails', () => {
    const circular: any = {};
    circular.self = circular;
    cache.getCache().set('circular', circular);
    spyOn(localStorage, 'removeItem').and.throwError('Storage unavailable');
    expect(() => cache.saveCache()).not.toThrow();
    expect(() => jasmine.clock().tick(300)).not.toThrow();
    expect(cache.getCache().get('circular')).toBe(circular);
  });

  it('discards legacy private entries before logout and persists only newly loaded public data', () => {
    localStorage.setItem('apiCache', JSON.stringify([
      ['fantasyElection-authenticated-1-2', 'private'],
      ['fantasyElection-authenticated-2-3', 'private'],
      ['allDrivers-1', 'old public']
    ]));
    cache = new CacheService();
    expect(cache.getCache().size).toBe(0);
    expect(localStorage.getItem('apiCache')).toBeNull();
    cache.updateVersion(1);
    cache.getOrLoad('allDrivers-1', () => of('public')).subscribe();
    TestBed.inject(AuthJWTService).logOut();
    jasmine.clock().tick(300);
    expect(Array.from(cache.getCache().entries())).toEqual([['allDrivers-1', 'public']]);
    expect(JSON.parse(localStorage.getItem('apiCache')!)).toEqual({ version: 1, entries: [['allDrivers-1', 'public']] });
  });

  it('separates full lists, pages and sizes', () => {
    drivers.getAllDrivers(1, 0, 10).subscribe();
    http.expectOne(r => r.params.get('size') === '10').flush([{ id: 1 }]);
    drivers.getAllDrivers(1).subscribe();
    http.expectOne(r => !r.params.has('size')).flush([]);
    drivers.getAllDrivers(1, 1, 10).subscribe();
    http.expectOne(r => r.params.get('page') === '1').flush([]);
    drivers.getAllDrivers(1, 0, 20).subscribe();
    http.expectOne(r => r.params.get('size') === '20').flush([]);
  });

  it('shares twenty concurrent selector requests', () => {
    let received = 0;
    for (let i = 0; i < 20; i++) drivers.getAllDrivers(1).subscribe(() => received++);
    http.expectOne(r => r.url.endsWith('/drivers/all')).flush([]);
    expect(received).toBe(20);
  });

  it('separates configuration requests by season', () => {
    const api = TestBed.inject(ConfigurationApiService);
    api.getAllConfigurations(1).subscribe();
    http.expectOne(r => r.params.get('season') === '1').flush([{ id: 1 }]);
    api.getAllConfigurations(2).subscribe();
    http.expectOne(r => r.params.get('season') === '2').flush([]);
    api.getAllConfigurations().subscribe();
    http.expectOne(r => !r.params.has('season')).flush([]);
  });

  it('allows retry after a shared request fails', () => {
    drivers.getAllDrivers(1).subscribe({ error: () => {} });
    http.expectOne(r => r.url.endsWith('/drivers/all')).flush('', { status: 500, statusText: 'Error' });
    drivers.getAllDrivers(1).subscribe();
    http.expectOne(r => r.url.endsWith('/drivers/all')).flush([]);
  });

  it('invalidates every entry in memory and storage without removing the session', () => {
    localStorage.setItem('auth', 'session');
    cache.getCache().set('PenaltiesTotalPerRace-12', [1]);
    cache.getCache().set('allDrivers-1', [1]);
    cache.saveCache();
    const activeMap = cache.getCache();
    cache.clearCache();
    expect(activeMap.size).toBe(0);
    expect(localStorage.getItem('apiCache')).toBeNull();
    expect(localStorage.getItem('auth')).toBe('session');
  });

  it('does not repopulate an invalidated cache with an older response', () => {
    drivers.getAllDrivers(1).subscribe();
    cache.clearCache();
    http.expectOne(r => r.url.endsWith('/drivers/all')).flush([{ id: 1 }]);
    expect(cache.getCache().size).toBe(0);
  });

  it('retains the active map when a component loads persisted cache again', () => {
    const activeMap = cache.getCache();
    cache.saveCache();
    expect(cache.loadCache()).toBe(activeMap);
    cache.clearCache();
    expect(cache.loadCache().size).toBe(0);
  });

  it('recovers from malformed persisted cache', () => {
    localStorage.setItem('apiCache', 'invalid json');
    expect(new CacheService().getCache().size).toBe(0);
    expect(localStorage.getItem('apiCache')).toBeNull();
  });
});

describe('Cache version regressions', () => {
  const instances: CacheService[] = [];

  function createCache(): CacheService {
    const cache = new CacheService();
    instances.push(cache);
    return cache;
  }

  function persist(version: number, key: string, value: string): CacheService {
    const cache = createCache();
    cache.updateVersion(version);
    cache.getOrLoad(key, () => of(value)).subscribe();
    jasmine.clock().tick(300);
    return cache;
  }

  beforeEach(() => {
    jasmine.clock().install();
    localStorage.clear();
  });

  afterEach(() => {
    instances.splice(0).forEach(cache => cache.clearCache());
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  it('A: does not reload either entry persisted by a tab still holding version 30 after another tab advances to 31', () => {
    const tabA = persist(30, 'old-entry', 'version 30');
    const tabB = createCache();
    tabB.updateVersion(30);
    tabA.updateVersion(31);
    tabB.getOrLoad('late-entry', () => of('loaded by version 30 tab')).subscribe();
    jasmine.clock().tick(300);
    expect(JSON.parse(localStorage.getItem('apiCache')!).version).toBe(30);

    const reload = createCache();
    reload.updateVersion(31);
    const oldRequest = jasmine.createSpy('oldRequest').and.returnValue(of('fresh old-entry'));
    const lateRequest = jasmine.createSpy('lateRequest').and.returnValue(of('fresh late-entry'));
    const oldValue = jasmine.createSpy('oldValue');
    const lateValue = jasmine.createSpy('lateValue');
    reload.getOrLoad('old-entry', oldRequest).subscribe(oldValue);
    reload.getOrLoad('late-entry', lateRequest).subscribe(lateValue);

    expect(oldRequest).toHaveBeenCalledTimes(1);
    expect(lateRequest).toHaveBeenCalledTimes(1);
    expect(oldValue).toHaveBeenCalledOnceWith('fresh old-entry');
    expect(lateValue).toHaveBeenCalledOnceWith('fresh late-entry');
  });

  it('B: waits for a different version and emits the fresh response instead of the persisted hit while requesting misses immediately', () => {
    persist(29, 'entry', 'stale');
    const reload = createCache();
    const request = jasmine.createSpy('request').and.returnValue(of('fresh'));
    const next = jasmine.createSpy('next');
    reload.getOrLoad('entry', request).subscribe(next);
    const missingRequest = jasmine.createSpy('missingRequest').and.returnValue(of('uncached'));
    const missingValue = jasmine.createSpy('missingValue');
    reload.getOrLoad('missing', missingRequest).subscribe(missingValue);

    expect(missingRequest).toHaveBeenCalledTimes(1);
    expect(missingValue).toHaveBeenCalledOnceWith('uncached');
    expect(next).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    reload.updateVersion(30);

    expect(request).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledOnceWith('fresh');
    expect(next).not.toHaveBeenCalledWith('stale');
  });

  it('B: waits for the same version before emitting the persisted hit without making a request', () => {
    persist(29, 'entry', 'cached');
    const reload = createCache();
    const request = jasmine.createSpy('request').and.returnValue(of('fresh'));
    const next = jasmine.createSpy('next');
    reload.getOrLoad('entry', request).subscribe(next);
    jasmine.clock().tick(500);

    expect(next).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    reload.updateVersion(29);

    expect(next).toHaveBeenCalledOnceWith('cached');
    expect(request).not.toHaveBeenCalled();
  });

  it('C: emits a persisted hit at 3000 ms and nothing earlier when the server version never arrives', () => {
    persist(29, 'entry', 'cached');
    const reload = createCache();
    const request = jasmine.createSpy('request').and.returnValue(of('fresh'));
    const next = jasmine.createSpy('next');
    reload.getOrLoad('entry', request).subscribe(next);

    expect(next).not.toHaveBeenCalled();
    jasmine.clock().tick(2999);
    expect(next).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    jasmine.clock().tick(1);

    expect(next).toHaveBeenCalledOnceWith('cached');
    expect(request).not.toHaveBeenCalled();
  });

  for (const stored of [
    '', 'null',
    JSON.stringify({ entries: [['entry', 'stale']] }),
    JSON.stringify({ version: null, entries: [['entry', 'stale']] }),
    JSON.stringify({ version: '29', entries: [['entry', 'stale']] }),
    JSON.stringify({ version: -1, entries: [['entry', 'stale']] }),
    JSON.stringify({ version: 29, entries: {} }),
    JSON.stringify({ version: 29, entries: [['entry']] })
  ]) {
    it('discards an invalid persisted envelope: ' + stored, () => {
      localStorage.setItem('apiCache', stored);
      const reload = createCache();
      const request = jasmine.createSpy('request').and.returnValue(of('fresh'));
      const next = jasmine.createSpy('next');
      expect(localStorage.getItem('apiCache')).toBeNull();
      reload.getOrLoad('entry', request).subscribe(next);
      expect(request).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledOnceWith('fresh');
    });
  }

  it('gives each waiting subscriber its own 3000 ms timeout', () => {
    persist(29, 'entry', 'cached');
    const reload = createCache();
    const request = jasmine.createSpy('request').and.returnValue(of('fresh'));
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    const hit = reload.getOrLoad('entry', request);
    hit.subscribe(first);
    jasmine.clock().tick(2000);
    hit.subscribe(second);
    jasmine.clock().tick(1000);
    expect(first).toHaveBeenCalledOnceWith('cached');
    expect(second).not.toHaveBeenCalled();
    jasmine.clock().tick(1999);
    expect(second).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(second).toHaveBeenCalledOnceWith('cached');
    expect(request).not.toHaveBeenCalled();
  });

  it('shares the fresh request when version validation clears several waiting hits', () => {
    persist(29, 'entry', 'cached');
    const reload = createCache();
    const response = new Subject<string>();
    const request = jasmine.createSpy('request').and.returnValue(response);
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    reload.getOrLoad('entry', request).subscribe(first);
    reload.getOrLoad('entry', request).subscribe(second);
    reload.updateVersion(30);
    expect(request).toHaveBeenCalledTimes(1);
    response.next('fresh');
    response.complete();
    expect(first).toHaveBeenCalledOnceWith('fresh');
    expect(second).toHaveBeenCalledOnceWith('fresh');
    const later = jasmine.createSpy('later');
    reload.getOrLoad('entry', request).subscribe(later);
    expect(later).toHaveBeenCalledOnceWith('fresh');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rechecks the map after timeout and does not load for an unsubscribed waiting hit', () => {
    persist(29, 'entry', 'cached');
    const reload = createCache();
    const request = jasmine.createSpy('request').and.returnValue(of('fresh'));
    const next = jasmine.createSpy('next');
    const cancelled = jasmine.createSpy('cancelled');
    reload.getOrLoad('entry', request).subscribe(next);
    const subscription = reload.getOrLoad('entry', request).subscribe(cancelled);
    subscription.unsubscribe();
    reload.clearCache();
    jasmine.clock().tick(3000);
    expect(request).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledOnceWith('fresh');
    expect(cancelled).not.toHaveBeenCalled();
  });
});
