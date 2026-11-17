import { TestBed } from '@angular/core/testing';
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
    localStorage.removeItem('apiCache');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    cache = TestBed.inject(CacheService);
    drivers = TestBed.inject(DriverApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

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
