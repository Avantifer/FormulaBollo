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

  for (const [url, headers] of [
    ['/drivers/all', {}],
    ['/account/login', { Authorization: 'Bearer token' }],
    ['/account/register', { Authorization: 'Bearer token' }]
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
