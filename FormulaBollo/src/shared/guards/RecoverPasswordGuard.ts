import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthJWTService } from '../services/authJWT.service';

export const recoverPasswordGuard: CanActivateFn = (_route, state) => {
  const authJWTService = inject(AuthJWTService);
  const token: string = state.url.split('/')[3];

  if (authJWTService.checkTokenValid(token) && !authJWTService.isLogged()) {
    return true;
  }

  inject(Router).navigate(['/fantasy']);
  return false;
};
