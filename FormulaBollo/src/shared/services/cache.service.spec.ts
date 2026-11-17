import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DriverApiService } from './api/driver-api.service';
import { CacheService } from './cache.service';
import { ConfigurationApiService } from './api/configuration-api.service';

describe('Public API cache', () => {
  let cache: CacheService;
  let drivers: DriverApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    localStorage.removeItem('apiCache');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
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
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    cache.getOrLoad('first', () => of(1)).subscribe();
    jasmine.clock().tick(100);
    cache.getOrLoad('second', () => of(2)).subscribe();
    jasmine.clock().tick(199);
    expect(setItem).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('apiCache')!)).toEqual([['first', 1], ['second', 2]]);
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

  it('removes only matching prefixes and persists the remaining entries', () => {
    cache.getCache().set('fantasyElection-authenticated-1-2', 'private');
    cache.getCache().set('fantasyElection-authenticated-2-3', 'private');
    cache.getCache().set('allDrivers-1', 'public');
    cache.removeByPrefix('fantasyElection-authenticated-');
    expect(Array.from(cache.getCache().keys())).toEqual(['allDrivers-1']);
    expect(localStorage.getItem('apiCache')).toBeNull();
    jasmine.clock().tick(300);
    expect(JSON.parse(localStorage.getItem('apiCache')!)).toEqual([['allDrivers-1', 'public']]);
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
  });
});
