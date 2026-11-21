import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../enviroments/enviroment';
import { statisticsFixture } from '../../../app/components/statistics/statistics.fixture';
import { CacheService } from '../cache.service';
import { StatisticsApiService } from './statistics-api.service';

describe('StatisticsApiService', () => {
  let service: StatisticsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StatisticsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(CacheService).clearCache();
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
});
