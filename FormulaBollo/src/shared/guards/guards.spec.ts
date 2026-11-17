import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, convertToParamMap, Router, RouterStateSnapshot } from '@angular/router';
import { WARNING_NO_ADMIN, WARNING_NO_LOGIN } from '../../app/constants';
import { AuthJWTService } from '../services/authJWT.service';
import { MessageInfoService } from '../services/toastInfo.service';
import { adminGuard } from './AdminGuard';
import { loginGuard } from './LoginGuard';
import { fantasyTeamGuard } from './FantasyTeamGuard';
import { recoverPasswordGuard } from './RecoverPasswordGuard';

describe('Route guards', () => {
  let auth: jasmine.SpyObj<AuthJWTService>;
  let router: jasmine.SpyObj<Router>;
  let messages: jasmine.SpyObj<MessageInfoService>;

  beforeEach(() => {
    localStorage.clear();
    auth = jasmine.createSpyObj('AuthJWTService', ['isLogged', 'checkAdmin', 'checkTokenValid']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    messages = jasmine.createSpyObj('MessageInfoService', ['showError', 'showWarn']);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthJWTService, useValue: auth },
      { provide: Router, useValue: router },
      { provide: MessageInfoService, useValue: messages }
    ] });
  });
  afterEach(() => localStorage.clear());

  function run(guard: CanActivateFn, token = 'recovery-token', url = `/fantasy/recoverPassword/${token}`) {
    const params = { token };
    const route = { params, paramMap: convertToParamMap(params) } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => guard(route, { url } as RouterStateSnapshot));
  }

  it('redirects unauthenticated admin visitors to login', () => {
    auth.isLogged.and.returnValue(false);
    expect(run(adminGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/fantasy/login']);
    expect(auth.checkAdmin).not.toHaveBeenCalled();
  });

  it('requires a stored token for admin access', () => {
    auth.isLogged.and.returnValue(true);
    expect(run(adminGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/fantasy/login']);
  });

  it('warns and redirects logged-in non-admin visitors home', () => {
    localStorage.setItem('auth', 'session');
    auth.isLogged.and.returnValue(true);
    auth.checkAdmin.and.returnValue(false);
    expect(run(adminGuard)).toBeFalse();
    expect(auth.checkAdmin).toHaveBeenCalledWith('session');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(messages.showError).toHaveBeenCalledWith(WARNING_NO_ADMIN, null);
  });

  it('allows admin visitors', () => {
    localStorage.setItem('auth', 'session');
    auth.isLogged.and.returnValue(true);
    auth.checkAdmin.and.returnValue(true);
    expect(run(adminGuard)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(messages.showError).not.toHaveBeenCalled();
  });

  it('redirects logged-in login visitors home', () => {
    auth.isLogged.and.returnValue(true);
    expect(run(loginGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('allows unauthenticated login visitors', () => {
    auth.isLogged.and.returnValue(false);
    expect(run(loginGuard)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('warns and redirects unauthenticated Fantasy team visitors', () => {
    auth.isLogged.and.returnValue(false);
    expect(run(fantasyTeamGuard)).toBeFalse();
    expect(messages.showWarn).toHaveBeenCalledWith(WARNING_NO_LOGIN);
    expect(router.navigate).toHaveBeenCalledWith(['/fantasy/login']);
  });

  it('allows authenticated Fantasy team visitors', () => {
    auth.isLogged.and.returnValue(true);
    expect(run(fantasyTeamGuard)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(messages.showWarn).not.toHaveBeenCalled();
  });

  for (const suffix of ['', '?utm=1#x']) {
    it(`uses the recovery route token with URL suffix '${suffix}'`, () => {
      auth.checkTokenValid.and.returnValue(true);
      auth.isLogged.and.returnValue(false);
      expect(run(recoverPasswordGuard, 'valid-token', `/fantasy/recoverPassword/valid-token${suffix}`)).toBeTrue();
      expect(auth.checkTokenValid).toHaveBeenCalledWith('valid-token');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  }

  it('redirects recovery visitors with an invalid token', () => {
    auth.checkTokenValid.and.returnValue(false);
    expect(run(recoverPasswordGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/fantasy']);
  });

  it('redirects recovery visitors with an active session', () => {
    auth.checkTokenValid.and.returnValue(true);
    auth.isLogged.and.returnValue(true);
    expect(run(recoverPasswordGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/fantasy']);
  });
});
