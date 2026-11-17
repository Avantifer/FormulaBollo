import { TestBed } from '@angular/core/testing';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { AuthJWTService } from './authJWT.service';
import { MessageInfoService } from './toastInfo.service';

export function sessionToken(exp: number): string {
  return `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ userId: 1, sub: 'user', exp }))}.signature`;
}

describe('AuthJWTService session validation', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    JwtHelperService, { provide: JWT_OPTIONS, useValue: {} },
    { provide: MessageInfoService, useValue: { showInfo: () => {} } }
  ] }));
  afterEach(() => localStorage.clear());

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
