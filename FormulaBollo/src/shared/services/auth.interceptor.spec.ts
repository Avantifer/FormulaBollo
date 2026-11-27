import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthJWTService } from './authJWT.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { adminGuard } from '../guards/AdminGuard';
import { loginGuard } from '../guards/LoginGuard';

describe('Authenticated errors and guards', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    ...provideComponentTesting(),
    provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()
  ] }));
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); });

  it('clears the session and opens Fantasy login on an authenticated 401', () => {
    localStorage.setItem('auth', 'expired');
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    TestBed.inject(HttpClient).get('/fantasy/fantasyElection', { headers: { Authorization: 'Bearer expired' } }).subscribe({ error: () => {} });
    TestBed.inject(HttpTestingController).expectOne('/fantasy/fantasyElection').flush('', { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('auth')).toBeNull();
    expect(router).toHaveBeenCalledWith(['/fantasy/login']);
  });

  it('preserves the session and does not navigate on a 401 for a different bearer token', () => {
    localStorage.setItem('auth', 'session');
    const auth = TestBed.inject(AuthJWTService);
    auth.isUserLogged = true;
    const clearSession = spyOn(auth, 'clearSession').and.callThrough();
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    TestBed.inject(HttpClient).post('/account/changePassword', { password: 'new-password' }, {
      headers: { Authorization: 'Bearer invalid-recovery-token' }
    }).subscribe({ error: () => {} });
    TestBed.inject(HttpTestingController).expectOne('/account/changePassword')
      .flush('', { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('auth')).toBe('session');
    expect(auth.isUserLogged).toBeTrue();
    expect(clearSession).not.toHaveBeenCalled();
    expect(router).not.toHaveBeenCalled();
  });

  for (const url of ['/account/changePassword', '/cache/update', '/fantasy/saveDriverTeamPoints',
    '/penalties/save', '/races/save', '/results/save', '/sprints/save']) {
    it(`ends the expired session on a 401 from ${url}`, () => {
      localStorage.setItem('auth', 'expired');
      const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      TestBed.inject(HttpClient).post(url, {}, { headers: { Authorization: 'Bearer expired' } })
        .subscribe({ error: () => {} });
      TestBed.inject(HttpTestingController).expectOne(url).flush('', { status: 401, statusText: 'Unauthorized' });
      expect(localStorage.getItem('auth')).toBeNull();
      expect(router).toHaveBeenCalledWith(['/fantasy/login']);
    });
  }

  for (const currentToken of [null, 'new-session']) {
    it(`handles a delayed 401 when the stored token becomes ${currentToken}`, () => {
      localStorage.setItem('auth', 'expired');
      const clearSession = spyOn(TestBed.inject(AuthJWTService), 'clearSession').and.callThrough();
      const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      const error = jasmine.createSpy('error');
      TestBed.inject(HttpClient).get('/fantasy/fantasyElection', { headers: { Authorization: 'Bearer expired' } })
        .subscribe({ error });
      if (currentToken === null) localStorage.removeItem('auth');
      else localStorage.setItem('auth', currentToken);
      TestBed.inject(HttpTestingController).expectOne('/fantasy/fantasyElection')
        .flush('', { status: 401, statusText: 'Unauthorized' });
      expect(error).toHaveBeenCalled();
      expect(localStorage.getItem('auth')).toBe(currentToken);
      if (currentToken === null) {
        expect(clearSession).toHaveBeenCalled();
        expect(router).toHaveBeenCalledWith(['/fantasy/login']);
      } else {
        expect(clearSession).not.toHaveBeenCalled();
        expect(router).not.toHaveBeenCalled();
      }
    });
  }

  it('preserves the session on an authenticated 403', () => {
    localStorage.setItem('auth', 'session');
    const router = spyOn(TestBed.inject(Router), 'navigate');
    TestBed.inject(HttpClient).post('/cache/update', {}, { headers: { Authorization: 'Bearer session' } })
      .subscribe({ error: () => {} });
    TestBed.inject(HttpTestingController).expectOne('/cache/update').flush('', { status: 403, statusText: 'Forbidden' });
    expect(localStorage.getItem('auth')).toBe('session');
    expect(router).not.toHaveBeenCalled();
  });

  for (const [url, headers] of [
    ['/drivers/all', {}],
    ['/account/login', { Authorization: 'Bearer session' }],
    ['/account/register', { Authorization: 'Bearer session' }]
  ] as const) {
    it(`preserves the session on a 401 from ${url}`, () => {
      localStorage.setItem('auth', 'session');
      const router = spyOn(TestBed.inject(Router), 'navigate');
      TestBed.inject(HttpClient).get(url, { headers }).subscribe({ error: () => {} });
      TestBed.inject(HttpTestingController).expectOne(url).flush('', { status: 401, statusText: 'Unauthorized' });
      expect(localStorage.getItem('auth')).toBe('session');
      expect(router).not.toHaveBeenCalled();
    });
  }

  it('uses session validation in both guards and redirects admins to the real login route', () => {
    localStorage.setItem('auth', 'broken');
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    expect(TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any))).toBeFalse();
    expect(router).toHaveBeenCalledWith(['/fantasy/login']);
    expect(TestBed.runInInjectionContext(() => loginGuard({} as any, {} as any))).toBeTrue();
    expect(TestBed.inject(AuthJWTService).isUserLogged).toBeFalse();
  });
});
