import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { FantasyApiService } from './fantasy-api.service';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { CacheService } from '../cache.service';
import { of } from 'rxjs';

describe('Fantasy election ownership', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: provideComponentTesting() }); });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); TestBed.inject(CacheService).clearCache(); localStorage.clear(); });

  it('requests the classification once with numberSeason and caches by season and contract version', () => {
    TestBed.inject(CacheService).updateVersion(1);
    const api = TestBed.inject(FantasyApiService);
    const http = TestBed.inject(HttpTestingController);
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    const response = { season: 2, races: [], drivers: [], teams: [], entries: [] };
    api.getFantasyClasification(2).subscribe(first);
    api.getFantasyClasification(2).subscribe(second);
    const pending = http.expectOne(request => request.url.endsWith('/fantasy/clasification'));
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.keys()).toEqual(['numberSeason']);
    expect(pending.request.params.get('numberSeason')).toBe('2');
    pending.flush(response);
    expect(first).toHaveBeenCalledWith(response);
    expect(second).toHaveBeenCalledWith(response);
    expect(TestBed.inject(CacheService).getCache().get('fantasyClasification-v1-2')).toEqual(response);
    api.getFantasyClasification(2).subscribe();
    http.expectNone(() => true);
    api.getFantasyClasification(3).subscribe();
    const other = http.expectOne(request => request.url.endsWith('/fantasy/clasification'));
    expect(other.request.params.get('numberSeason')).toBe('3');
    other.flush({ ...response, season: 3 });
  });

  it('authenticates the election and separates users in the cache', () => {
    const api = TestBed.inject(FantasyApiService);
    const http = TestBed.inject(HttpTestingController);
    for (const userId of [1, 2]) {
      const token = `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ userId, exp: Date.now() / 1000 + 300 }))}.signature`;
      localStorage.setItem('auth', token);
      api.getFantasyElection(12).subscribe();
      const request = http.expectOne(r => r.url.endsWith('/fantasyElection'));
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(request.request.params.get('raceId')).toBe('12');
      expect(request.request.params.has('userId')).toBeFalse();
      request.flush({ id: userId });
    }
  });

  it('refuses to return a cached election without a valid session', () => {
    const error = jasmine.createSpy('error');
    TestBed.inject(FantasyApiService).getFantasyElection(12).subscribe({ error });
    expect(error).toHaveBeenCalled();
    TestBed.inject(HttpTestingController).expectNone(r => r.url.endsWith('/fantasyElection'));
  });
});

describe('Private fantasy election cache regressions', () => {
  let api: FantasyApiService;
  let cache: CacheService;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ providers: provideComponentTesting() });
    api = TestBed.inject(FantasyApiService);
    cache = TestBed.inject(CacheService);
    http = TestBed.inject(HttpTestingController);
    cache.updateVersion(31);
    const token = `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ userId: 1, exp: Date.now() / 1000 + 300 }))}.signature`;
    localStorage.setItem('auth', token);
  });

  afterEach(() => {
    http.verify();
    cache.clearCache();
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  it('G: leaves no personal fantasy election in memory or persisted storage after a response', () => {
    cache.getOrLoad('public-entry', () => of('public data')).subscribe();
    jasmine.clock().tick(300);
    const persisted = localStorage.getItem('apiCache');
    const next = jasmine.createSpy('next');
    api.getFantasyElection(12).subscribe(next);
    http.expectOne(r => r.url.endsWith('/fantasyElection')).flush({ id: 101 });
    expect(next).toHaveBeenCalledOnceWith({ id: 101 });
    jasmine.clock().tick(300);

    expect(Array.from(cache.getCache().entries())).toEqual([['public-entry', 'public data']]);
    expect(localStorage.getItem('apiCache')).toBe(persisted);
  });

  it('G: makes a new HTTP request for a second call for the same user and race after a response', () => {
    api.getFantasyElection(12).subscribe();
    http.expectOne(r => r.url.endsWith('/fantasyElection')).flush({ id: 101 });
    const next = jasmine.createSpy('next');
    api.getFantasyElection(12).subscribe(next);

    const request = http.expectOne(r => r.url.endsWith('/fantasyElection'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('raceId')).toBe('12');
    request.flush({ id: 102 });
    expect(next).toHaveBeenCalledOnceWith({ id: 102 });
  });
});
