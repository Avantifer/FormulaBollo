import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthJWTService } from '../services/authJWT.service';
import { MessageInfoService } from '../services/toastInfo.service';
import { WARNING_NO_ADMIN } from '../../app/constants';

export const adminGuard: CanActivateFn = () => {
  const authJWTService = inject(AuthJWTService);
  const messageInfoService = inject(MessageInfoService);
  const router = inject(Router);
  const token = localStorage.getItem('auth');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  if (authJWTService.checkAdmin(token)) {
    return true;
  }

  router.navigate(['/']);
  messageInfoService.showError(WARNING_NO_ADMIN, null);
  return false;
};
