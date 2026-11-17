import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';
import { AuthJWTService } from './authJWT.service';
import { MessageInfoService } from './toastInfo.service';

export function sessionToken(exp: number): string {
  return `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ userId: 1, sub: 'user', exp }))}.signature`;
}

describe('AuthJWTService session validation', () => {
  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ providers: [
    { provide: MessageInfoService, useValue: { showInfo: () => {} } }
    ] });
  });
  afterEach(() => { TestBed.inject(CacheService).clearCache(); localStorage.clear(); jasmine.clock().uninstall(); });

  for (const method of ['clearSession', 'logOut'] as const) {
    it(`${method} removes private Fantasy cache and preserves public data`, () => {
      const cache = TestBed.inject(CacheService);
      localStorage.setItem('auth', sessionToken(Date.now() / 1000 + 60));
      cache.getCache().set('fantasyElection-authenticated-1-2', { team: 1 });
      cache.getCache().set('fantasyElection-authenticated-2-3', { team: 2 });
      cache.getCache().set('allDrivers-1', [1]);
      cache.saveCache();
      jasmine.clock().tick(300);
      const auth = TestBed.inject(AuthJWTService);
      auth.isUserLogged = true;
      auth[method]();
      expect(localStorage.getItem('auth')).toBeNull();
      expect(auth.isUserLogged).toBeFalse();
      expect(Array.from(cache.getCache().keys())).toEqual(['allDrivers-1']);
      jasmine.clock().tick(300);
      expect(JSON.parse(localStorage.getItem('apiCache')!)).toEqual([['allDrivers-1', [1]]]);
    });
  }

  it('preserves identity and admin claims for valid tokens', () => {
    const auth = TestBed.inject(AuthJWTService);
    const payload = { userId: '42', sub: 'Peña', admin: true, exp: Date.now() / 1000 + 60 };
    const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));
    const token = `${btoa('{"alg":"HS256"}')}.${encoded}.signature`;
    expect(auth.checkTokenValid(token)).toBeTrue();
    expect(auth.checkAdmin(token)).toBeTrue();
    expect(auth.getIdFromToken(token)).toBe('42');
    expect(auth.getUsernameFromToken(token)).toBe('Peña');
  });

  it('returns empty identity and no admin for invalid tokens', () => {
    const auth = TestBed.inject(AuthJWTService);
    expect(auth.getIdFromToken('invalid')).toBe('');
    expect(auth.getUsernameFromToken('invalid')).toBe('');
    expect(auth.checkAdmin('invalid')).toBeFalse();
    expect(auth.checkAdmin(sessionToken(Date.now() / 1000 + 60))).toBeFalse();
  });

  it('accepts an unexpired session', () => {
    localStorage.setItem('auth', sessionToken(Date.now() / 1000 + 60));
    expect(TestBed.inject(AuthJWTService).isLogged()).toBeTrue();
  });

  for (const token of ['broken', sessionToken(1), sessionToken(NaN),
    sessionToken(Date.now() / 1000 + 60).replace(/^[^.]+/, '!invalid'),
    sessionToken(Date.now() / 1000 + 60).replace(/^[^.]+/, btoa('not json')),
    sessionToken(Date.now() / 1000 + 60).replace(/^[^.]+/, btoa('{"alg":"none"}'))
  ]) {
    it(`clears invalid session ${token.slice(0, 8)}`, () => {
      localStorage.setItem('auth', token);
      expect(TestBed.inject(AuthJWTService).isLogged()).toBeFalse();
      expect(localStorage.getItem('auth')).toBeNull();
      expect(() => TestBed.inject(AuthJWTService).checkAdmin(token)).not.toThrow();
    });
  }
});
