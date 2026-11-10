import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthJWTService } from '../services/authJWT.service';

export const loginGuard: CanActivateFn = () => {
  if (!inject(AuthJWTService).isLogged()) {
    return true;
  }

  inject(Router).navigate(['/']);
  return false;
};
