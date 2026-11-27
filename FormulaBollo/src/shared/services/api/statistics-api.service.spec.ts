import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../enviroments/enviroment';
import { headToHeadFixture, recordsFixture, statisticsFixture } from '../../../app/components/statistics/statistics.fixture';
import { CacheService } from '../cache.service';
import { StatisticsApiService } from './statistics-api.service';

describe('StatisticsApiService', () => {
  let service: StatisticsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(CacheService).updateVersion(1);
    service = TestBed.inject(StatisticsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(CacheService).clearCache();
  });

  it('loads records without parameters and shares pending and completed requests under statisticsRecords-v4', () => {
    const response = recordsFixture();
    const received = jasmine.createSpy('received');
    const cache = spyOn(TestBed.inject(CacheService), 'getOrLoad').and.callThrough();
    service.getRecords().subscribe(received);
    service.getRecords().subscribe(received);
    const request = http.expectOne(environment.apiUrl + '/statistics/records');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(response);
    expect(received).toHaveBeenCalledTimes(2);
    expect(received).toHaveBeenCalledWith(response);
    service.getRecords().subscribe();
    http.expectNone(() => true);
    expect(cache).toHaveBeenCalledWith('statisticsRecords-v4', jasmine.any(Function));
  });

  it('cancels records requests and allows retry after an error', () => {
    const subscription = service.getRecords().subscribe();
    const request = http.expectOne(environment.apiUrl + '/statistics/records');
    subscription.unsubscribe();
    expect(request.cancelled).toBeTrue();
    service.getRecords().subscribe({ error: () => undefined });
    http.expectOne(environment.apiUrl + '/statistics/records').flush({}, { status: 500, statusText: 'Error' });
    service.getRecords().subscribe();
    http.expectOne(environment.apiUrl + '/statistics/records').flush(recordsFixture());
  });

  it('uses the overview URL and season parameter including Total', () => {
    for (const season of [0, 1, 2, 3]) {
      const response = statisticsFixture(season);
      const received = jasmine.createSpy('received');
      service.getOverview(season).subscribe(received);
      const request = http.expectOne(environment.apiUrl + '/statistics/overview?season=' + season);
      expect(request.request.method).toBe('GET');
      request.flush(response);
      expect(received).toHaveBeenCalledOnceWith(response);
    }
  });

  it('shares pending and completed requests per season and retries failures', () => {
    service.getOverview(0).subscribe();
    service.getOverview(0).subscribe();
    http.expectOne(request => request.params.get('season') === '0').flush(statisticsFixture());
    service.getOverview(0).subscribe();
    http.expectNone(request => request.params.get('season') === '0');
    service.getOverview(2).subscribe({ error: () => undefined });
    http.expectOne(request => request.params.get('season') === '2').flush({}, { status: 500, statusText: 'Error' });
    service.getOverview(2).subscribe();
    http.expectOne(request => request.params.get('season') === '2').flush(statisticsFixture(2));
  });

  it('cancels HTTP when its last subscriber unsubscribes', () => {
    const subscription = service.getOverview(3).subscribe();
    const request = http.expectOne(request => request.params.get('season') === '3');
    subscription.unsubscribe();
    expect(request.cancelled).toBeTrue();
  });

  it('requests headToHead with season and ordered names, sharing pending and cached responses', () => {
    const response = headToHeadFixture();
    const received = jasmine.createSpy('received');
    const cache = spyOn(TestBed.inject(CacheService), 'getOrLoad').and.callThrough();
    service.getHeadToHead(3, 'Piloto 01', 'Piloto 02').subscribe(received);
    service.getHeadToHead(3, 'Piloto 01', 'Piloto 02').subscribe(received);
    const request = http.expectOne(request => request.url === environment.apiUrl + '/statistics/headToHead'
      && request.params.get('season') === '3'
      && request.params.get('a') === 'Piloto 01'
      && request.params.get('b') === 'Piloto 02');
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(received).toHaveBeenCalledTimes(2);
    expect(received).toHaveBeenCalledWith(response);
    service.getHeadToHead(3, 'Piloto 01', 'Piloto 02').subscribe();
    http.expectNone(request => request.url.endsWith('/statistics/headToHead'));
    expect(cache).toHaveBeenCalledWith('statisticsHeadToHead-v1-3-Piloto 01-Piloto 02', jasmine.any(Function));
    const cases: [number, string, string][] = [[3, 'Piloto 02', 'Piloto 01'], [2, 'Piloto 01', 'Piloto 02'], [3, 'Piloto 01', 'Piloto 03']];
    for (const [season, a, b] of cases) {
      service.getHeadToHead(season, a, b).subscribe();
      http.expectOne(request => request.url === environment.apiUrl + '/statistics/headToHead'
        && request.params.get('season') === String(season)
        && request.params.get('a') === a && request.params.get('b') === b).flush(headToHeadFixture(season, a, b));
    }
  });

  it('preserves driver names including case, spaces and special characters in HTTP params', () => {
    const a = 'SmokingWeed & +';
    const b = 'Moraga / Pe\u00f1a';
    const response = headToHeadFixture(3, a, b);
    const received = jasmine.createSpy('received');
    service.getHeadToHead(3, a, b).subscribe(received);
    const request = http.expectOne(request => request.url === environment.apiUrl + '/statistics/headToHead'
      && request.params.get('season') === '3'
      && request.params.get('a') === a && request.params.get('b') === b);
    request.flush(response);
    expect(received).toHaveBeenCalledOnceWith(response);
  });

  it('cancels pending duels and retries failed responses without caching errors', () => {
    const pending = service.getHeadToHead(3, 'Piloto 01', 'Piloto 02').subscribe();
    const cancelled = http.expectOne(request => request.url.endsWith('/statistics/headToHead'));
    pending.unsubscribe();
    expect(cancelled.cancelled).toBeTrue();
    service.getHeadToHead(3, 'Piloto 01', 'Piloto 02').subscribe({ error: () => undefined });
    http.expectOne(request => request.url.endsWith('/statistics/headToHead')).flush({}, { status: 500, statusText: 'Error' });
    service.getHeadToHead(3, 'Piloto 01', 'Piloto 02').subscribe();
    http.expectOne(request => request.url.endsWith('/statistics/headToHead')).flush(headToHeadFixture());
  });
});
