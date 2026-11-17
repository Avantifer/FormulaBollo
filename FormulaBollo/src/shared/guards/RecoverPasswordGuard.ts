import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthJWTService } from '../services/authJWT.service';

export const recoverPasswordGuard: CanActivateFn = (route, _state) => {
  const authJWTService = inject(AuthJWTService);
  const token = route.paramMap.get('token');

  if (authJWTService.checkTokenValid(token) && !authJWTService.isLogged()) {
    return true;
  }

  inject(Router).navigate(['/fantasy']);
  return false;
};
