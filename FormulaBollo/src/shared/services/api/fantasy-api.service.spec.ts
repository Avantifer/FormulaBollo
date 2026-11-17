import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { FantasyApiService } from './fantasy-api.service';
import { provideComponentTesting } from '../../../testing/component-test-providers';

describe('Fantasy election ownership', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: provideComponentTesting() }); });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); });

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
