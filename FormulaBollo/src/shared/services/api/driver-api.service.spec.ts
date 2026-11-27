import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DriverApiService } from './driver-api.service';
import { CacheService } from '../cache.service';
import { environment } from '../../../enviroments/enviroment';
import { driverPointsFixture } from '../../../testing/component-test-providers';

describe('DriverApiService team history', () => {
  it('sends the original name as a GET parameter and caches histories independently of driver info', () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(CacheService).updateVersion(1);
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(DriverApiService);
    const history = [{ season: driverPointsFixture.driver.season, team: driverPointsFixture.driver.team }];
    const name = 'Driver With Spaces & Symbols';
    const received: unknown[] = [];
    api.getTeamHistoryByDriverName(name).subscribe(value => received.push(value));
    const request = http.expectOne(req => req.url === environment.apiUrl + '/drivers/teamHistory');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('driverName')).toBe(name);
    expect(request.request.params.keys()).toEqual(['driverName']);
    request.flush(history);
    api.getTeamHistoryByDriverName(name).subscribe(value => received.push(value));
    expect(received).toEqual([history, history]);
    api.getTeamHistoryByDriverName('Other Driver').subscribe();
    http.expectOne(req => req.params.get('driverName') === 'Other Driver').flush([]);
    http.verify();
    TestBed.inject(CacheService).clearCache();
  });
});
