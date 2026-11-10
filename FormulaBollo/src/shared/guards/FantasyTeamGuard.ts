import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthJWTService } from '../services/authJWT.service';
import { MessageInfoService } from '../services/toastInfo.service';
import { WARNING_NO_LOGIN } from '../../app/constants';

export const fantasyTeamGuard: CanActivateFn = () => {
  if (inject(AuthJWTService).isLogged()) {
    return true;
  }

  inject(MessageInfoService).showWarn(WARNING_NO_LOGIN);
  inject(Router).navigate(['/fantasy/login']);
  return false;
};
